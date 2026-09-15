import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { webkit } from '@playwright/test';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const BASE_URL = process.env.DIAGNOSTIC_BASE_URL || 'http://127.0.0.1:4177';
const OUTPUT_PATH = process.env.DIAGNOSTIC_OUTPUT || 'webkit-search-evaluate-diagnostic.json';
const SAMPLE_DIR = process.env.DIAGNOSTIC_SAMPLE_DIR || 'webkit-search-evaluate-samples';
const REVISION = process.env.DIAGNOSTIC_REVISION || process.env.GITHUB_SHA || null;
const PLAYWRIGHT_VERSION = process.env.PLAYWRIGHT_VERSION || null;
const SAMPLE_TIMEOUT_MS = Number(process.env.DIAGNOSTIC_SAMPLE_TIMEOUT_MS || 45_000);
const VIEWPORT = Object.freeze({ width: 1440, height: 900 });
const PROBES = Object.freeze([
  'trivial',
  'dom-lookup',
  'viewport',
  'computed-style',
  'bounding-rect',
  'strict-predicate',
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

function installPageDiagnostics(page, result, journey) {
  const stamp = (kind, detail = null) => {
    result.events.push({ at: new Date().toISOString(), journey, kind, detail });
  };

  page.on('crash', () => stamp('page-crash'));
  page.on('close', () => stamp('page-close'));
  page.on('pageerror', (error) => stamp('pageerror', errorText(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') stamp('console-error', message.text());
  });
}

async function waitForPlayerReady(page) {
  await page.waitForFunction(() => {
    const title = document.querySelector('#songTitle')?.textContent?.trim();
    const genre = document.querySelector('#genreStrip .genre-button[data-genre-bound="true"]');
    return Boolean(title && genre);
  }, null, { timeout: 15_000 });
}

async function pageSideGeometry(page, selector) {
  return page.evaluate((targetSelector) => {
    const node = document.querySelector(targetSelector);
    if (!(node instanceof Element) || !node.isConnected) return { ok: false, reason: 'missing-or-disconnected' };

    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const viewport = window.visualViewport
      ? {
          left: window.visualViewport.offsetLeft,
          top: window.visualViewport.offsetTop,
          width: window.visualViewport.width,
          height: window.visualViewport.height,
        }
      : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const values = [rect.left, rect.top, rect.right, rect.bottom, rect.width, rect.height,
      viewport.left, viewport.top, viewport.width, viewport.height];
    const finite = values.every(Number.isFinite);
    const rendered = finite
      && rect.width > 0
      && rect.height > 0
      && node.getClientRects().length > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && style.visibility !== 'collapse'
      && Number(style.opacity) > 0;
    const contained = rendered
      && rect.left >= viewport.left - 2
      && rect.top >= viewport.top - 2
      && rect.right <= viewport.left + viewport.width + 2
      && rect.bottom <= viewport.top + viewport.height + 2;

    return {
      ok: contained,
      rendered,
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      viewport,
    };
  }, selector);
}

async function runPlayerShellPrefix(browser, result, outputPath) {
  checkpoint(result, outputPath, 'prefix-player-shell-context');
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await context.newPage();
  installPageDiagnostics(page, result, 'player-shell');

  try {
    checkpoint(result, outputPath, 'prefix-player-shell-navigate');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await waitForPlayerReady(page);

    checkpoint(result, outputPath, 'prefix-player-shell-app-geometry');
    await page.evaluate(() => {
      const app = document.getElementById('app')?.getBoundingClientRect();
      const layer = document.querySelector('.world-layer.is-visible')?.getBoundingClientRect();
      return {
        app: app && [app.left, app.top, app.right, app.bottom],
        layer: layer && [layer.left, layer.top, layer.right, layer.bottom],
        innerWidth,
        innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    for (const selector of ['#searchButton', '#queueButton', '#playButton', '#browseButton']) {
      checkpoint(result, outputPath, `prefix-player-shell-geometry:${selector}`);
      await pageSideGeometry(page, selector);
    }

    checkpoint(result, outputPath, 'prefix-player-shell-nonstop-scroll');
    await page.locator('#nonstopButton').scrollIntoViewIfNeeded();
    await pageSideGeometry(page, '#nonstopButton');
    checkpoint(result, outputPath, 'prefix-player-shell-complete');
  } finally {
    await context.close().catch(() => {});
  }
}

async function runTitlePrefix(browser, result, outputPath) {
  checkpoint(result, outputPath, 'prefix-title-context');
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await context.newPage();
  installPageDiagnostics(page, result, 'title-geometry');

  const measure = (nextTitle) => page.evaluate((title) => {
    const trackBlock = document.querySelector('.track-block');
    const songTitle = document.getElementById('songTitle');
    if (!(trackBlock instanceof HTMLElement) || !(songTitle instanceof HTMLElement)) {
      throw new Error('Player title geometry target is missing');
    }
    songTitle.textContent = title;
    const titleLength = [...title].length;
    trackBlock.classList.toggle('is-long-title', titleLength > 28);
    trackBlock.classList.toggle('is-very-long-title', titleLength > 44);
    return {
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      anchors: ['playButton', 'progress', 'genreStrip', 'browseButton'].map((id) => {
        const rect = document.getElementById(id)?.getBoundingClientRect();
        return rect ? [id, rect.top, rect.height] : [id, null, null];
      }),
    };
  }, nextTitle);

  try {
    checkpoint(result, outputPath, 'prefix-title-navigate');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await waitForPlayerReady(page);

    checkpoint(result, outputPath, 'prefix-title-long');
    await measure('Non Stop Bollywood Dandiya Garbe Ki Raat Hai 2014');
    checkpoint(result, outputPath, 'prefix-title-short');
    await measure('Ochhav Theme');
    checkpoint(result, outputPath, 'prefix-title-complete');
  } finally {
    await context.close().catch(() => {});
  }
}

async function runProbe(page, probe) {
  if (probe === 'trivial') {
    return page.evaluate(() => 1);
  }
  if (probe === 'dom-lookup') {
    return page.evaluate(() => ({
      closeId: document.getElementById('sheetClose')?.id || null,
      sheetAriaHidden: document.getElementById('songSheet')?.getAttribute('aria-hidden') || null,
    }));
  }
  if (probe === 'viewport') {
    return page.evaluate(() => ({
      innerWidth,
      innerHeight,
      visualViewport: window.visualViewport
        ? {
            width: window.visualViewport.width,
            height: window.visualViewport.height,
            offsetLeft: window.visualViewport.offsetLeft,
            offsetTop: window.visualViewport.offsetTop,
            scale: window.visualViewport.scale,
          }
        : null,
    }));
  }
  if (probe === 'computed-style') {
    return page.evaluate(() => {
      const close = document.getElementById('sheetClose');
      if (!(close instanceof HTMLElement)) return null;
      const style = getComputedStyle(close);
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        transform: style.transform,
        transitionProperty: style.transitionProperty,
        transitionDuration: style.transitionDuration,
      };
    });
  }
  if (probe === 'bounding-rect') {
    return page.evaluate(() => {
      const rect = document.getElementById('sheetClose')?.getBoundingClientRect();
      return rect ? {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      } : null;
    });
  }
  if (probe === 'strict-predicate') {
    return pageSideGeometry(page, '#sheetClose');
  }
  throw new Error(`Unknown probe: ${probe}`);
}

async function runChild(probe, outputPath) {
  if (!PROBES.includes(probe)) throw new Error(`Unsupported probe: ${probe}`);

  const result = {
    schema: 'playgarba-webkit-search-evaluate-sample/v1',
    probe,
    revision: REVISION,
    playwrightVersion: PLAYWRIGHT_VERSION,
    nodeVersion: process.version,
    platform: process.platform,
    viewport: VIEWPORT,
    baseUrl: BASE_URL,
    status: 'starting',
    stage: 'starting',
    browserVersion: null,
    probeElapsedMs: null,
    probeResult: null,
    error: null,
    events: [],
  };
  writeJson(outputPath, result);

  const browser = await webkit.launch({ headless: true });
  result.browserVersion = browser.version();
  checkpoint(result, outputPath, 'browser-launched');

  try {
    await runPlayerShellPrefix(browser, result, outputPath);
    await runTitlePrefix(browser, result, outputPath);

    checkpoint(result, outputPath, 'search-context');
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, serviceWorkers: 'block' });
    const page = await context.newPage();
    installPageDiagnostics(page, result, 'search');

    try {
      checkpoint(result, outputPath, 'search-navigate');
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await waitForPlayerReady(page);

      checkpoint(result, outputPath, 'search-open-click');
      await page.locator('#searchButton').click({ timeout: 8_000 });
      await page.waitForFunction(() => {
        const sheet = document.getElementById('songSheet');
        const input = document.getElementById('searchInput');
        return sheet?.getAttribute('aria-hidden') === 'false'
          && input instanceof HTMLElement
          && getComputedStyle(input).display !== 'none'
          && getComputedStyle(input).visibility !== 'hidden';
      }, null, { timeout: 8_000 });

      checkpoint(result, outputPath, `probe-ready:${probe}`);
      const startedAt = Date.now();
      result.probeResult = await runProbe(page, probe);
      result.probeElapsedMs = Date.now() - startedAt;
      result.status = 'probe-returned';
      checkpoint(result, outputPath, `probe-returned:${probe}`);
    } finally {
      await context.close().catch(() => {});
    }
  } catch (error) {
    result.status = 'error';
    result.error = errorText(error);
    checkpoint(result, outputPath, 'error');
  } finally {
    await browser.close().catch(() => {});
  }

  writeJson(outputPath, result);
}

async function runIsolatedProbe(probe) {
  const outputPath = path.join(SAMPLE_DIR, `${probe}.json`);
  fs.rmSync(outputPath, { force: true });

  const detached = process.platform !== 'win32';
  const child = spawn(process.execPath, [SCRIPT_PATH, '--probe', probe, outputPath], {
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
      schema: 'playgarba-webkit-search-evaluate-sample/v1',
      probe,
      status: 'no-sample-output',
      stage: 'unknown',
    };
  }

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

function classify(samples) {
  const prefixTimeout = samples.find((sample) => sample.process?.timedOut && !String(sample.stage || '').startsWith('probe-ready:'));
  if (prefixTimeout) {
    return {
      kind: 'serial-prefix-stall',
      probe: prefixTimeout.probe,
      stage: prefixTimeout.stage,
      message: 'The WebKit process stopped returning before the target probe, so the shared serial prefix itself is sufficient to reproduce the liveness failure.',
    };
  }

  const probeTimeout = samples.find((sample) => sample.process?.timedOut && String(sample.stage || '').startsWith('probe-ready:'));
  if (probeTimeout) {
    return {
      kind: 'page-evaluate-stall-reproduced',
      probe: probeTimeout.probe,
      stage: probeTimeout.stage,
      message: `The first isolated probe that did not return was ${probeTimeout.probe}.`,
    };
  }

  const failed = samples.find((sample) => sample.status !== 'probe-returned');
  if (failed) {
    return {
      kind: 'diagnostic-error',
      probe: failed.probe,
      stage: failed.stage,
      message: 'A bounded diagnostic sample failed without an outer-process timeout. Inspect its error and event evidence.',
    };
  }

  return {
    kind: 'no-reproduction',
    probe: null,
    stage: null,
    message: 'All isolated page-side probes returned after the exact serial prefix in this diagnostic run.',
  };
}

async function runParent() {
  fs.rmSync(SAMPLE_DIR, { recursive: true, force: true });
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });

  const summary = {
    schema: 'playgarba-webkit-search-evaluate-diagnostic/v1',
    issue: 1478,
    refs: [969, 1188, 1189],
    revision: REVISION,
    playwrightVersion: PLAYWRIGHT_VERSION,
    sampleTimeoutMs: SAMPLE_TIMEOUT_MS,
    viewport: VIEWPORT,
    probeOrder: PROBES,
    startedAt: new Date().toISOString(),
    completedAt: null,
    classification: null,
    samples: [],
  };
  writeJson(OUTPUT_PATH, summary);

  for (const probe of PROBES) {
    const sample = await runIsolatedProbe(probe);
    summary.samples.push(sample);
    writeJson(OUTPUT_PATH, summary);
  }

  summary.classification = classify(summary.samples);
  summary.completedAt = new Date().toISOString();
  writeJson(OUTPUT_PATH, summary);

  console.log(JSON.stringify({
    classification: summary.classification,
    samples: summary.samples.map((sample) => ({
      probe: sample.probe,
      status: sample.status,
      stage: sample.stage,
      timedOut: sample.process?.timedOut || false,
      elapsedMs: sample.probeElapsedMs,
    })),
  }, null, 2));
}

if (process.argv[2] === '--probe') {
  const [, , , probe, outputPath] = process.argv;
  if (!probe || !outputPath) throw new Error('Usage: --probe <probe> <outputPath>');
  await runChild(probe, outputPath);
} else {
  await runParent();
}
