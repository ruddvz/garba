import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { webkit } from '@playwright/test';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const BASE_URL = process.env.DIAGNOSTIC_BASE_URL || 'http://127.0.0.1:4178';
const OUTPUT_PATH = process.env.DIAGNOSTIC_OUTPUT || 'webkit-search-layout-read-bisect.json';
const SAMPLE_DIR = process.env.DIAGNOSTIC_SAMPLE_DIR || 'webkit-search-layout-read-samples';
const REVISION = process.env.DIAGNOSTIC_REVISION || process.env.GITHUB_SHA || null;
const PLAYWRIGHT_VERSION = process.env.PLAYWRIGHT_VERSION || null;
const SAMPLE_TIMEOUT_MS = Number(process.env.DIAGNOSTIC_SAMPLE_TIMEOUT_MS || 30_000);
const ATTEMPTS = Number(process.env.DIAGNOSTIC_ATTEMPTS || 2);
const VIEWPORT = Object.freeze({ width: 1440, height: 900 });

const PROBES = Object.freeze([
  'trivial',
  'dom-lookup',
  'idle-500ms',
  'inner-size',
  'visual-viewport',
  'style-display',
  'style-visibility',
  'style-opacity',
  'style-transform',
  'style-transition-duration',
  'offset-size',
  'client-rects-length',
  'bounding-rect',
  'control-style-display',
  'control-bounding-rect',
]);

function writeJson(filePath, value) {
  const absolutePath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = `${absolutePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporaryPath, absolutePath);
}

function errorText(error) {
  return String(error?.stack || error?.message || error || 'unknown error');
}

function checkpoint(result, outputPath, stage, extra = {}) {
  result.stage = stage;
  result.lastCheckpointAt = new Date().toISOString();
  Object.assign(result, extra);
  writeJson(outputPath, result);
}

function installPageDiagnostics(page, result) {
  const add = (kind, detail = null) => {
    result.events.push({ at: new Date().toISOString(), kind, detail });
  };

  page.on('crash', () => add('page-crash'));
  page.on('close', () => add('page-close'));
  page.on('pageerror', (error) => add('pageerror', errorText(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') add('console-error', message.text());
  });
}

async function waitForShellReady(page) {
  await page.waitForFunction(() => Boolean(
    document.querySelector('#songTitle')?.textContent?.trim()
    && document.getElementById('searchButton')
    && document.getElementById('songSheet')
    && document.getElementById('sheetClose')
    && document.getElementById('searchInput')
  ), null, { timeout: 15_000 });
}

async function openSearchWithoutLayoutRead(page, result, outputPath) {
  checkpoint(result, outputPath, 'search-click');
  await page.locator('#searchButton').click({ timeout: 8_000 });

  checkpoint(result, outputPath, 'search-readiness');
  await page.waitForFunction(() => {
    const sheet = document.getElementById('songSheet');
    const input = document.getElementById('searchInput');
    const close = document.getElementById('sheetClose');
    return sheet?.getAttribute('aria-hidden') === 'false'
      && input instanceof HTMLElement
      && close instanceof HTMLElement
      && close.isConnected;
  }, null, { timeout: 8_000 });
}

function selectorForProbe(probe) {
  return probe.startsWith('control-') ? '#searchButton' : '#sheetClose';
}

async function runProbe(page, probe) {
  const selector = selectorForProbe(probe);

  if (probe === 'trivial') return page.evaluate(() => 1);
  if (probe === 'dom-lookup') {
    return page.evaluate(() => ({
      sheetHidden: document.getElementById('songSheet')?.getAttribute('aria-hidden') ?? null,
      closeConnected: Boolean(document.getElementById('sheetClose')?.isConnected),
      activeId: document.activeElement?.id || null,
    }));
  }
  if (probe === 'idle-500ms') {
    await page.waitForTimeout(500);
    return page.evaluate(() => ({ alive: true, closeConnected: Boolean(document.getElementById('sheetClose')?.isConnected) }));
  }
  if (probe === 'inner-size') {
    return page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  }
  if (probe === 'visual-viewport') {
    return page.evaluate(() => window.visualViewport ? {
      width: window.visualViewport.width,
      height: window.visualViewport.height,
      offsetLeft: window.visualViewport.offsetLeft,
      offsetTop: window.visualViewport.offsetTop,
      scale: window.visualViewport.scale,
    } : null);
  }
  if (probe === 'style-display' || probe === 'control-style-display') {
    return page.evaluate((target) => {
      const node = document.querySelector(target);
      return node instanceof Element ? getComputedStyle(node).display : null;
    }, selector);
  }
  if (probe === 'style-visibility') {
    return page.evaluate((target) => {
      const node = document.querySelector(target);
      return node instanceof Element ? getComputedStyle(node).visibility : null;
    }, selector);
  }
  if (probe === 'style-opacity') {
    return page.evaluate((target) => {
      const node = document.querySelector(target);
      return node instanceof Element ? getComputedStyle(node).opacity : null;
    }, selector);
  }
  if (probe === 'style-transform') {
    return page.evaluate((target) => {
      const node = document.querySelector(target);
      return node instanceof Element ? getComputedStyle(node).transform : null;
    }, selector);
  }
  if (probe === 'style-transition-duration') {
    return page.evaluate((target) => {
      const node = document.querySelector(target);
      return node instanceof Element ? getComputedStyle(node).transitionDuration : null;
    }, selector);
  }
  if (probe === 'offset-size') {
    return page.evaluate((target) => {
      const node = document.querySelector(target);
      return node instanceof HTMLElement ? { width: node.offsetWidth, height: node.offsetHeight } : null;
    }, selector);
  }
  if (probe === 'client-rects-length') {
    return page.evaluate((target) => {
      const node = document.querySelector(target);
      return node instanceof Element ? node.getClientRects().length : null;
    }, selector);
  }
  if (probe === 'bounding-rect' || probe === 'control-bounding-rect') {
    return page.evaluate((target) => {
      const node = document.querySelector(target);
      if (!(node instanceof Element)) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    }, selector);
  }

  throw new Error(`Unknown probe: ${probe}`);
}

function deriveStatus(result, error = null) {
  if (!error) return 'probe-returned';
  if (result.events.some((event) => event.kind === 'page-crash')) return 'page-crash';
  if (result.stage === 'search-readiness') return 'search-readiness-error';
  if (result.stage?.startsWith('probe-ready:')) return 'probe-error';
  return 'setup-error';
}

async function runChild(probe, attempt, outputPath) {
  if (!PROBES.includes(probe)) throw new Error(`Unsupported probe: ${probe}`);

  const result = {
    schema: 'playgarba-webkit-search-layout-read-sample/v1',
    issue: 1508,
    probe,
    attempt,
    revision: REVISION,
    playwrightVersion: PLAYWRIGHT_VERSION,
    nodeVersion: process.version,
    platform: process.platform,
    viewport: VIEWPORT,
    baseUrl: BASE_URL,
    browserVersion: null,
    status: 'starting',
    stage: 'starting',
    elapsedMs: null,
    probeResult: null,
    error: null,
    events: [],
  };
  writeJson(outputPath, result);

  let browser;
  try {
    browser = await webkit.launch({ headless: true });
    result.browserVersion = browser.version();
    checkpoint(result, outputPath, 'browser-launched');

    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    installPageDiagnostics(page, result);

    try {
      checkpoint(result, outputPath, 'navigate');
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await waitForShellReady(page);
      await openSearchWithoutLayoutRead(page, result, outputPath);

      checkpoint(result, outputPath, `probe-ready:${probe}`);
      const startedAt = Date.now();
      result.probeResult = await runProbe(page, probe);
      result.elapsedMs = Date.now() - startedAt;
      result.status = 'probe-returned';
      checkpoint(result, outputPath, `probe-returned:${probe}`);
    } finally {
      await context.close().catch(() => {});
    }
  } catch (error) {
    result.error = errorText(error);
    result.status = deriveStatus(result, error);
    checkpoint(result, outputPath, `failed:${result.status}`);
  } finally {
    await browser?.close().catch(() => {});
  }

  writeJson(outputPath, result);
}

async function runIsolatedSample(probe, attempt) {
  const outputPath = path.join(SAMPLE_DIR, `${probe}-attempt-${attempt}.json`);
  fs.rmSync(outputPath, { force: true });

  const detached = process.platform !== 'win32';
  const child = spawn(process.execPath, [SCRIPT_PATH, '--probe', probe, String(attempt), outputPath], {
    env: process.env,
    detached,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      if (detached && child.pid) process.kill(-child.pid, 'SIGKILL');
      else child.kill('SIGKILL');
    } catch {}
  }, SAMPLE_TIMEOUT_MS);

  const exit = await new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));
  clearTimeout(timer);

  let sample;
  try {
    sample = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  } catch {
    sample = {
      schema: 'playgarba-webkit-search-layout-read-sample/v1',
      probe,
      attempt,
      status: 'no-sample-output',
      stage: 'unknown',
      events: [],
    };
  }

  if (timedOut) sample.status = String(sample.stage || '').startsWith('probe-ready:') ? 'probe-timeout' : 'setup-timeout';

  return {
    ...sample,
    process: {
      timedOut,
      timeoutMs: SAMPLE_TIMEOUT_MS,
      exitCode: exit.code,
      signal: exit.signal,
      stdout: stdout.slice(-2_000),
      stderr: stderr.slice(-4_000),
    },
  };
}

function summarise(samples) {
  return PROBES.map((probe) => {
    const matching = samples.filter((sample) => sample.probe === probe);
    const counts = {};
    for (const sample of matching) counts[sample.status] = (counts[sample.status] || 0) + 1;
    return {
      probe,
      attempts: matching.length,
      counts,
      elapsedMs: matching.filter((sample) => Number.isFinite(sample.elapsedMs)).map((sample) => sample.elapsedMs),
    };
  });
}

function classify(summary) {
  const controls = new Set(['trivial', 'dom-lookup', 'idle-500ms', 'inner-size', 'visual-viewport']);
  const crashAssociated = summary.filter((row) => (row.counts['page-crash'] || 0) > 0 || (row.counts['probe-timeout'] || 0) > 0);
  const firstLayoutCrash = crashAssociated.find((row) => !controls.has(row.probe));
  const readinessUnstable = summary.some((row) => (row.counts['search-readiness-error'] || 0) > 0 || (row.counts['setup-timeout'] || 0) > 0);

  if (firstLayoutCrash) {
    return {
      kind: 'layout-read-crash-associated',
      firstProbe: firstLayoutCrash.probe,
      readinessUnstable,
      message: `At least one isolated attempt crashed or timed out during layout/style probe ${firstLayoutCrash.probe}. Inspect per-attempt evidence before inferring causality.`,
    };
  }
  if (crashAssociated.length) {
    return {
      kind: 'control-or-liveness-failure',
      firstProbe: crashAssociated[0].probe,
      readinessUnstable,
      message: 'A non-layout control probe crashed or timed out, so the renderer/liveness fault is broader than a specific style/layout read in this run.',
    };
  }
  if (readinessUnstable) {
    return {
      kind: 'search-readiness-instability-only',
      firstProbe: null,
      readinessUnstable: true,
      message: 'No requested probe crashed, but at least one isolated sample failed before reaching its probe during Search-open readiness.',
    };
  }
  return {
    kind: 'no-reproduction',
    firstProbe: null,
    readinessUnstable: false,
    message: 'All isolated attempts reached and returned from their requested probe without page crash or outer timeout.',
  };
}

async function runParent() {
  fs.rmSync(SAMPLE_DIR, { recursive: true, force: true });
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });

  const output = {
    schema: 'playgarba-webkit-search-layout-read-bisect/v1',
    issue: 1508,
    refs: [969, 1478, 1322],
    revision: REVISION,
    playwrightVersion: PLAYWRIGHT_VERSION,
    attemptsPerProbe: ATTEMPTS,
    sampleTimeoutMs: SAMPLE_TIMEOUT_MS,
    viewport: VIEWPORT,
    probeOrder: PROBES,
    startedAt: new Date().toISOString(),
    completedAt: null,
    classification: null,
    summary: [],
    samples: [],
  };
  writeJson(OUTPUT_PATH, output);

  for (const probe of PROBES) {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      const sample = await runIsolatedSample(probe, attempt);
      output.samples.push(sample);
      output.summary = summarise(output.samples);
      writeJson(OUTPUT_PATH, output);
    }
  }

  output.summary = summarise(output.samples);
  output.classification = classify(output.summary);
  output.completedAt = new Date().toISOString();
  writeJson(OUTPUT_PATH, output);

  console.log(JSON.stringify({
    classification: output.classification,
    summary: output.summary,
  }, null, 2));
}

if (process.argv[2] === '--probe') {
  const [, , , probe, attemptText, outputPath] = process.argv;
  if (!probe || !attemptText || !outputPath) throw new Error('Usage: --probe <probe> <attempt> <outputPath>');
  await runChild(probe, Number(attemptText), outputPath);
} else {
  await runParent();
}
