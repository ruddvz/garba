import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const songs = await readJson('data/songs.json');
const manifest = await readJson('data/direct-audio.json');
const songIds = new Set(songs.map((song) => song.id));
const songsById = new Map(songs.map((song) => [song.id, song]));
const tracks = manifest?.tracks || {};
const blockedProviderHosts = [
  'youtube.com', 'youtu.be', 'music.apple.com', 'itunes.apple.com', 'amazon.',
  'spotify.com', 'soundcloud.com', 'bandcamp.com', 'pixabay.com'
];
const automixFields = ['bpm', 'mixInSeconds', 'mixOutSeconds', 'transitionSeconds', 'introSilenceSeconds'];

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };
const isLocalAudioPath = (value) => /^\.?\/?assets\/audio\//.test(value);
const isHttps = (value) => /^https:\/\//i.test(value);
const finite = (value) => Number.isFinite(Number(value));

for (const [songId, entry] of Object.entries(tracks)) {
  if (!songIds.has(songId)) fail(`${songId}: direct-audio entry does not match a catalogue song`);
  if (!entry || typeof entry !== 'object') {
    fail(`${songId}: direct-audio entry must be an object`);
    continue;
  }

  const audioUrl = String(entry.audioUrl || '').trim();
  const rights = entry.rights || {};
  const proofUrl = String(rights.proofUrl || '').trim();
  const licenseName = String(rights.licenseName || '').trim();
  const rightsHolder = String(rights.rightsHolder || '').trim();
  const sha256 = String(entry.sha256 || '').trim();

  if (!audioUrl) fail(`${songId}: missing audioUrl`);
  if (audioUrl && !isHttps(audioUrl) && !isLocalAudioPath(audioUrl)) {
    fail(`${songId}: audioUrl must be HTTPS or a repository assets/audio path`);
  }
  if (blockedProviderHosts.some((host) => audioUrl.toLowerCase().includes(host))) {
    fail(`${songId}: provider/download page cannot be used as a direct audio master`);
  }
  if (rights.redistributionAuthorized !== true) fail(`${songId}: redistributionAuthorized must be true`);
  if (!rightsHolder) fail(`${songId}: missing rights.rightsHolder`);
  if (!licenseName) fail(`${songId}: missing rights.licenseName`);
  if (!proofUrl || !isHttps(proofUrl)) fail(`${songId}: rights.proofUrl must be an HTTPS evidence URL`);
  if (!String(rights.verifiedAt || '').match(/^\d{4}-\d{2}-\d{2}$/)) fail(`${songId}: rights.verifiedAt must be YYYY-MM-DD`);

  if (!/^[a-f0-9]{64}$/i.test(sha256)) {
    fail(`${songId}: sha256 is required and must be the 64-character digest of the published encoded audio bytes`);
  }

  if (entry.bpm != null && (!finite(entry.bpm) || Number(entry.bpm) < 70 || Number(entry.bpm) > 220)) {
    fail(`${songId}: bpm must be between 70 and 220 when present`);
  }
  if (entry.mixInSeconds != null && (!finite(entry.mixInSeconds) || Number(entry.mixInSeconds) < 0)) {
    fail(`${songId}: mixInSeconds must be a non-negative number`);
  }
  if (entry.mixOutSeconds != null && (!finite(entry.mixOutSeconds) || Number(entry.mixOutSeconds) <= 0)) {
    fail(`${songId}: mixOutSeconds must be a positive number`);
  }
  if (entry.transitionSeconds != null && (!finite(entry.transitionSeconds) || Number(entry.transitionSeconds) < 4 || Number(entry.transitionSeconds) > 10)) {
    fail(`${songId}: transitionSeconds must be between 4 and 10 seconds`);
  }
  if (entry.introSilenceSeconds != null && (!finite(entry.introSilenceSeconds) || Number(entry.introSilenceSeconds) < 0)) {
    fail(`${songId}: introSilenceSeconds must be a non-negative number`);
  }
  if (finite(entry.mixInSeconds) && finite(entry.mixOutSeconds) && Number(entry.mixOutSeconds) <= Number(entry.mixInSeconds)) {
    fail(`${songId}: mixOutSeconds must be later than mixInSeconds`);
  }

  const analysis = entry.automixAnalysis;
  if (analysis != null) {
    if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
      fail(`${songId}: automixAnalysis must be an object`);
    } else {
      if (![1, '1'].includes(analysis.version)) fail(`${songId}: automixAnalysis.version must be 1`);
      if (!String(analysis.engine || '').trim()) fail(`${songId}: automixAnalysis.engine is required`);
      if (!['usable', 'low-confidence', 'failed'].includes(analysis.status)) {
        fail(`${songId}: automixAnalysis.status must be usable, low-confidence or failed`);
      }
      if (!/^[a-f0-9]{64}$/i.test(String(analysis.sourceSha256 || ''))) {
        fail(`${songId}: automixAnalysis.sourceSha256 must be a SHA-256 digest`);
      } else if (sha256 && String(analysis.sourceSha256).toLowerCase() !== sha256.toLowerCase()) {
        fail(`${songId}: automixAnalysis was generated from different audio bytes than entry.sha256`);
      }
      if (analysis.tempoConfidence != null && (!finite(analysis.tempoConfidence) || Number(analysis.tempoConfidence) < 0 || Number(analysis.tempoConfidence) > 1)) {
        fail(`${songId}: automixAnalysis.tempoConfidence must be between 0 and 1`);
      }
      if (analysis.confidenceThreshold != null && (!finite(analysis.confidenceThreshold) || Number(analysis.confidenceThreshold) < 0 || Number(analysis.confidenceThreshold) > 1)) {
        fail(`${songId}: automixAnalysis.confidenceThreshold must be between 0 and 1`);
      }
      if (analysis.analysedAt && Number.isNaN(Date.parse(analysis.analysedAt))) {
        fail(`${songId}: automixAnalysis.analysedAt must be an ISO-compatible timestamp`);
      }
      if (analysis.status === 'usable') {
        for (const field of ['bpm', 'mixInSeconds', 'mixOutSeconds', 'transitionSeconds']) {
          if (!finite(entry[field])) fail(`${songId}: usable AutoMix analysis requires ${field}`);
        }
        if (
          finite(analysis.tempoConfidence)
          && finite(analysis.confidenceThreshold)
          && Number(analysis.tempoConfidence) < Number(analysis.confidenceThreshold)
        ) {
          fail(`${songId}: usable AutoMix analysis is below its recorded confidence threshold`);
        }
      }
      if (analysis.engine === 'garba-onset-autocorrelation-v1' && analysis.status !== 'usable') {
        for (const field of automixFields) {
          if (entry[field] != null) fail(`${songId}: low-confidence generated analysis must not publish operational ${field}`);
        }
      }
    }
  }

  const runtimeSong = songsById.get(songId);
  if (rights.redistributionAuthorized === true && audioUrl && runtimeSong?.audioUrl !== audioUrl) {
    fail(`${songId}: authorised direct-audio manifest entry was not promoted into data/songs.json`);
  }
  if (entry.bpm != null && Number(runtimeSong?.bpm) !== Number(entry.bpm)) {
    fail(`${songId}: runtime catalogue did not preserve direct-audio bpm metadata`);
  }
}

if (failed) process.exit(1);
console.log(`✓ ${Object.keys(tracks).length} direct-audio entries have explicit redistribution evidence and encoded-byte checksums`);
console.log('✓ authorised direct masters are promoted into the runtime catalogue before provider fallbacks');
console.log('✓ AutoMix metadata is bounded, checksum-linked and cannot publish low-confidence generated mix points');
console.log('✓ direct audio cannot silently point at YouTube, Apple Music, Amazon, Spotify, SoundCloud, Bandcamp or Pixabay pages');
