import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const manifestPath = path.join(root, 'data/direct-audio.json');
const SAMPLE_RATE = 11025;
const FRAME_SIZE = 1024;
const HOP_SIZE = 256;
const MIN_BPM = 70;
const MAX_BPM = 220;
const USABLE_CONFIDENCE = 0.68;
const MAX_ANALYSIS_SECONDS = 30 * 60;
const MAX_CAPTURE_BYTES = 256 * 1024 * 1024;
const ENGINE = 'garba-onset-autocorrelation-v1';

const args = process.argv.slice(2);
const write = args.includes('--write');
const force = args.includes('--force');
const help = args.includes('--help') || args.includes('-h');
const requestedIds = args.filter((arg) => !arg.startsWith('-'));

if (help) {
  console.log(`Usage: npm run automix:analyze -- [--write] [--force] [song-id ...]\n\nAnalyses only authorised entries from data/direct-audio.json.\nWithout --write it prints recommendations and leaves the manifest unchanged.\n--force permits replacing existing AutoMix fields. Human-curated fields are otherwise preserved.`);
  process.exit(0);
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

async function runCapture(command, commandArgs, { maxBytes = MAX_CAPTURE_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      try { child.kill('SIGKILL'); } catch { /* already exited */ }
      reject(error);
    };

    child.on('error', (error) => {
      if (error?.code === 'ENOENT') fail(new Error(`${command} is required for AutoMix analysis but was not found in PATH`));
      else fail(error);
    });
    child.stdout.on('data', (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxBytes) return fail(new Error(`${command} output exceeded the ${Math.round(maxBytes / 1024 / 1024)} MB safety limit`));
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= 2 * 1024 * 1024) stderr.push(chunk);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (code !== 0) {
        reject(new Error(`${command} exited with ${code}: ${Buffer.concat(stderr).toString('utf8').trim() || 'unknown error'}`));
        return;
      }
      resolve(Buffer.concat(stdout));
    });
  });
}

async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function prepareInput(songId, entry) {
  const raw = String(entry.audioUrl || '').trim();
  if (!raw) throw new Error('missing audioUrl');
  if (/^https:\/\//i.test(raw)) {
    const response = await fetch(raw, { redirect: 'follow' });
    if (!response.ok) throw new Error(`audio download returned HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const folder = await mkdtemp(path.join(tmpdir(), 'garba-automix-'));
    const file = path.join(folder, `${songId}.audio`);
    await writeFile(file, bytes);
    return { file, cleanup: () => rm(folder, { recursive: true, force: true }) };
  }

  const relative = raw.replace(/^\.\//, '').replace(/^\//, '');
  if (!relative.startsWith('assets/audio/')) throw new Error('local direct audio must live under assets/audio/');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) throw new Error('audio path escapes the repository');
  await readFile(file, { encoding: null, flag: 'r' });
  return { file, cleanup: async () => {} };
}

async function durationSeconds(file) {
  const output = await runCapture('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'json',
    file,
  ], { maxBytes: 1024 * 1024 });
  const parsed = JSON.parse(output.toString('utf8'));
  const duration = Number(parsed?.format?.duration || 0);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('ffprobe did not return a usable duration');
  if (duration > MAX_ANALYSIS_SECONDS) throw new Error(`duration ${round(duration, 1)}s exceeds the ${MAX_ANALYSIS_SECONDS}s analysis safety limit`);
  return duration;
}

async function decodeMonoFloat(file) {
  return runCapture('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', file,
    '-vn',
    '-ac', '1',
    '-ar', String(SAMPLE_RATE),
    '-f', 'f32le',
    'pipe:1',
  ]);
}

function quantile(values, q) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(Math.round((sorted.length - 1) * q), 0, sorted.length - 1);
  return sorted[index];
}

function makeEnvelope(pcm) {
  const samples = Math.floor(pcm.length / 4);
  const frameCount = Math.max(0, Math.floor((samples - FRAME_SIZE) / HOP_SIZE) + 1);
  const rms = new Float64Array(frameCount);
  const onset = new Float64Array(frameCount);
  let previousLog = Math.log(1e-8);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * HOP_SIZE;
    let sumSquares = 0;
    for (let offset = 0; offset < FRAME_SIZE; offset += 1) {
      const sample = pcm.readFloatLE((start + offset) * 4);
      if (Number.isFinite(sample)) sumSquares += sample * sample;
    }
    const value = Math.sqrt(sumSquares / FRAME_SIZE);
    rms[frame] = value;
    const logEnergy = Math.log(value + 1e-8);
    onset[frame] = Math.max(0, logEnergy - previousLog);
    previousLog = logEnergy;
  }

  return { rms, onset, frameRate: SAMPLE_RATE / HOP_SIZE };
}

function activeBounds(rms, frameRate) {
  const values = Array.from(rms);
  const max = values.reduce((best, value) => Math.max(best, value), 0);
  const floor = quantile(values, 0.2);
  const threshold = Math.max(0.0015, floor * 2.5, max * 0.045);
  const run = Math.max(2, Math.round(frameRate * 0.2));

  const activeAt = (index, direction) => {
    for (let step = 0; step < run; step += 1) {
      const position = index + step * direction;
      if (position < 0 || position >= rms.length || rms[position] < threshold) return false;
    }
    return true;
  };

  let first = 0;
  while (first < rms.length && !activeAt(first, 1)) first += 1;
  let last = rms.length - 1;
  while (last >= 0 && !activeAt(last, -1)) last -= 1;

  return {
    firstFrame: Math.min(first, Math.max(0, rms.length - 1)),
    lastFrame: Math.max(0, last),
    threshold,
  };
}

function autocorrelation(values, lag, start, end) {
  let xy = 0;
  let xx = 0;
  let yy = 0;
  for (let index = start + lag; index < end; index += 1) {
    const x = values[index];
    const y = values[index - lag];
    xy += x * y;
    xx += x * x;
    yy += y * y;
  }
  return xx > 0 && yy > 0 ? xy / Math.sqrt(xx * yy) : 0;
}

function estimateTempo(onset, frameRate, firstFrame, lastFrame) {
  const marginFrames = Math.round(frameRate * 6);
  const activeStart = Math.min(lastFrame, firstFrame + marginFrames);
  const activeEnd = Math.max(activeStart + 1, lastFrame - marginFrames);
  const maxWindowFrames = Math.round(frameRate * 180);
  const available = activeEnd - activeStart;
  const start = available > maxWindowFrames ? activeStart + Math.floor((available - maxWindowFrames) / 2) : activeStart;
  const end = available > maxWindowFrames ? start + maxWindowFrames : activeEnd;

  const window = [];
  for (let index = start; index < end; index += 1) window.push(onset[index]);
  const mean = window.reduce((sum, value) => sum + value, 0) / Math.max(1, window.length);
  const centred = new Float64Array(onset.length);
  for (let index = start; index < end; index += 1) centred[index] = Math.max(0, onset[index] - mean);

  const minLag = Math.max(2, Math.floor(frameRate * 60 / MAX_BPM));
  const maxLag = Math.max(minLag + 1, Math.ceil(frameRate * 60 / MIN_BPM));
  const candidates = [];
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    const correlation = autocorrelation(centred, lag, start, end);
    const bpm = 60 * frameRate / lag;
    if (bpm >= MIN_BPM && bpm <= MAX_BPM) candidates.push({ lag, bpm, correlation });
  }
  candidates.sort((a, b) => b.correlation - a.correlation);
  const best = candidates[0] || { lag: 0, bpm: 0, correlation: 0 };
  const second = candidates.find((candidate) => Math.abs(candidate.lag - best.lag) > 1) || { correlation: 0 };

  const periodFrames = best.lag || 1;
  let bestPhase = 0;
  let bestPhaseScore = -Infinity;
  let totalOnset = 0;
  for (let index = start; index < end; index += 1) totalOnset += centred[index];
  for (let phase = 0; phase < periodFrames; phase += 1) {
    let score = 0;
    for (let index = start + phase; index < end; index += periodFrames) score += centred[index];
    if (score > bestPhaseScore) {
      bestPhaseScore = score;
      bestPhase = phase;
    }
  }

  const phaseRegularity = totalOnset > 0 ? clamp((bestPhaseScore / totalOnset) * periodFrames, 0, 1) : 0;
  const dominance = best.correlation > 0
    ? clamp((best.correlation - second.correlation) / Math.max(0.05, 1 - second.correlation), 0, 1)
    : 0;
  const correlationQuality = clamp((best.correlation - 0.12) / 0.58, 0, 1);
  const confidence = clamp(0.58 * correlationQuality + 0.24 * dominance + 0.18 * phaseRegularity, 0, 1);

  return {
    bpm: best.bpm,
    lagFrames: best.lag,
    beatPeriodSeconds: best.lag / frameRate,
    confidence,
    correlation: best.correlation,
    dominance,
    phaseRegularity,
    phaseFrame: start + bestPhase,
  };
}

function chooseGridMixPoints({ duration, frameRate, firstFrame, lastFrame, tempo }) {
  const beat = tempo.beatPeriodSeconds;
  const transition = clamp(16 * beat, 4, 10);
  const activeStart = firstFrame / frameRate;
  const activeEnd = Math.min(duration, lastFrame / frameRate);
  const anchor = tempo.phaseFrame / frameRate;
  const bar = 4 * beat;

  const boundaryAtOrAfter = (time) => {
    const steps = Math.max(0, Math.ceil((time - anchor) / bar));
    return anchor + steps * bar;
  };
  const boundaryAtOrBefore = (time) => {
    const steps = Math.floor((time - anchor) / bar);
    return anchor + steps * bar;
  };

  let mixIn = boundaryAtOrAfter(activeStart + Math.max(0.35, beat));
  if (mixIn > Math.min(duration * 0.3, 30)) mixIn = boundaryAtOrAfter(activeStart);
  const mixOut = boundaryAtOrBefore(activeEnd - 0.15);

  return {
    transitionSeconds: transition,
    mixInSeconds: clamp(mixIn, 0, duration),
    mixOutSeconds: clamp(mixOut, 0, duration),
    introSilenceSeconds: clamp(activeStart, 0, duration),
    activeEndSeconds: activeEnd,
  };
}

function analysePcm(pcm, duration) {
  const { rms, onset, frameRate } = makeEnvelope(pcm);
  if (rms.length < frameRate * 20) return { status: 'low-confidence', reason: 'not-enough-audio' };
  const bounds = activeBounds(rms, frameRate);
  const tempo = estimateTempo(onset, frameRate, bounds.firstFrame, bounds.lastFrame);
  if (!tempo.bpm || !Number.isFinite(tempo.bpm)) return { status: 'low-confidence', reason: 'tempo-not-found' };

  const points = chooseGridMixPoints({ duration, frameRate, ...bounds, tempo });
  const enoughStructure = duration >= Math.max(30, points.transitionSeconds * 3)
    && points.mixOutSeconds - points.mixInSeconds >= points.transitionSeconds * 2;
  const usable = tempo.confidence >= USABLE_CONFIDENCE && enoughStructure;

  return {
    status: usable ? 'usable' : 'low-confidence',
    reason: usable ? null : tempo.confidence < USABLE_CONFIDENCE ? 'tempo-confidence-below-threshold' : 'insufficient-mix-room',
    bpm: round(tempo.bpm, 2),
    tempoConfidence: round(tempo.confidence, 3),
    correlation: round(tempo.correlation, 3),
    peakDominance: round(tempo.dominance, 3),
    phaseRegularity: round(tempo.phaseRegularity, 3),
    beatPeriodSeconds: round(tempo.beatPeriodSeconds, 4),
    mixInSeconds: round(points.mixInSeconds, 3),
    mixOutSeconds: round(points.mixOutSeconds, 3),
    transitionSeconds: round(points.transitionSeconds, 3),
    introSilenceSeconds: round(points.introSilenceSeconds, 3),
    activeEndSeconds: round(points.activeEndSeconds, 3),
  };
}

function hasManualMixMetadata(entry) {
  const fields = ['bpm', 'mixInSeconds', 'mixOutSeconds', 'transitionSeconds', 'introSilenceSeconds'];
  const hasFields = fields.some((field) => entry[field] != null);
  if (!hasFields) return false;
  return entry?.automixAnalysis?.engine !== ENGINE;
}

function applyAnalysis(entry, result, digest) {
  const next = { ...entry };
  next.automixAnalysis = {
    version: 1,
    engine: ENGINE,
    status: result.status,
    reason: result.reason,
    confidenceThreshold: USABLE_CONFIDENCE,
    tempoConfidence: result.tempoConfidence ?? 0,
    correlation: result.correlation ?? 0,
    peakDominance: result.peakDominance ?? 0,
    phaseRegularity: result.phaseRegularity ?? 0,
    sourceSha256: digest,
    analysedAt: new Date().toISOString(),
  };

  if (result.status === 'usable') {
    next.bpm = result.bpm;
    next.mixInSeconds = result.mixInSeconds;
    next.mixOutSeconds = result.mixOutSeconds;
    next.transitionSeconds = result.transitionSeconds;
    next.introSilenceSeconds = result.introSilenceSeconds;
  } else if (entry?.automixAnalysis?.engine === ENGINE) {
    delete next.bpm;
    delete next.mixInSeconds;
    delete next.mixOutSeconds;
    delete next.transitionSeconds;
    delete next.introSilenceSeconds;
  }
  return next;
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const tracks = manifest?.tracks && typeof manifest.tracks === 'object' ? manifest.tracks : {};
const ids = requestedIds.length ? requestedIds : Object.keys(tracks);
const missingIds = ids.filter((id) => !tracks[id]);
if (missingIds.length) throw new Error(`Unknown direct-audio song id(s): ${missingIds.join(', ')}`);

const selected = ids.filter((id) => tracks[id]?.rights?.redistributionAuthorized === true);
if (!selected.length) {
  console.log('No authorised direct-audio tracks to analyse. AutoMix will continue using its safe fallback until cleared masters are added.');
  process.exit(0);
}

let changed = false;
let usableCount = 0;
let lowConfidenceCount = 0;
let skippedCount = 0;
for (const songId of selected) {
  const entry = tracks[songId];
  if (hasManualMixMetadata(entry) && !force) {
    skippedCount += 1;
    console.log(`${songId}: skipped because manual AutoMix metadata already exists. Use --force only after reviewing it.`);
    continue;
  }

  let prepared;
  try {
    prepared = await prepareInput(songId, entry);
    const digest = await sha256(prepared.file);
    if (digest.toLowerCase() !== String(entry.sha256 || '').toLowerCase()) {
      throw new Error(`SHA-256 mismatch. Manifest has ${entry.sha256 || '(missing)'}, source bytes are ${digest}`);
    }
    const duration = await durationSeconds(prepared.file);
    const pcm = await decodeMonoFloat(prepared.file);
    const result = analysePcm(pcm, duration);
    const report = {
      songId,
      durationSeconds: round(duration, 3),
      ...result,
    };
    console.log(JSON.stringify(report));

    if (result.status === 'usable') usableCount += 1;
    else lowConfidenceCount += 1;

    if (write) {
      manifest.tracks[songId] = applyAnalysis(entry, result, digest);
      changed = true;
    }
  } catch (error) {
    lowConfidenceCount += 1;
    console.error(`${songId}: analysis failed: ${error.message}`);
    if (write) {
      const digest = String(entry.sha256 || '').toLowerCase();
      manifest.tracks[songId] = {
        ...entry,
        automixAnalysis: {
          version: 1,
          engine: ENGINE,
          status: 'failed',
          reason: error.message,
          confidenceThreshold: USABLE_CONFIDENCE,
          sourceSha256: digest,
          analysedAt: new Date().toISOString(),
        },
      };
      changed = true;
    }
  } finally {
    await prepared?.cleanup?.();
  }
}

if (write && changed) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Updated ${path.relative(root, manifestPath)}.`);
} else if (!write) {
  console.log('Dry run only. Re-run with --write after reviewing the recommendations.');
}

console.log(`AutoMix analysis: ${usableCount} usable, ${lowConfidenceCount} low-confidence/failed, ${skippedCount} preserved manual entries.`);
