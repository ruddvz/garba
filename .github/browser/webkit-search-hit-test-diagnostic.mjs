import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { webkit } from '@playwright/test';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const OUTPUT_PATH = process.env.DIAGNOSTIC_OUTPUT || 'webkit-search-hit-test-diagnostic.json';
const SAMPLE_DIR = process.env.DIAGNOSTIC_SAMPLE_DIR || 'webkit-search-hit-test-samples';
const PINNED_857_SHA = process.env.PINNED_857_SHA || null;
const SAMPLE_TIMEOUT_MS = 24_000;
const VIEWPORT = Object.freeze({ width: 1440, height: 900 });
const VARIANTS = Object.freeze({
  'main-control': process.env.MAIN_BASE_URL || 'http://127.0.0.1:4175',
  '857-candidate': process.env.CANDIDATE_BASE_URL || 'http://127.0.0.1:4176',
});
const MODES = Object.freeze([
  'dom-click',
  'keyboard-enter',
  'keyboard-space',
  'mouse-click',
  'playwright-click',
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function errorText(error) {
  return String(error?.stack || error?.message || error || 'unknown error');
}

function compactError(error) {
  return error ? String(error).split('\n').slice(0, 4).join(' | ').slice(0, 700) : null;
}

function checkpoint(result, outputPath, stage) {
  result.setupStage = stage;
  writeJson(outputPath, result);
}

async function captureState(page) {
  return page.evaluate(() => {
    const close = document.querySelector('#sheetClose');
    const sheet = document.querySelector('#songSheet');
    const search = document.querySelector('#searchInput');
    const header = close?.closest('header, .sheet-header, .browser-header, [class*="header"]') || close?.parentElement || null;

    const nodeInfo = (node) => {
      if (!(node instanceof Element)) return null;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        tag: node.tagName.toLowerCase(),
        id: node.id || null,
        className: typeof node.className === 'string' ? node.className : String(node.className || ''),
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        position: style.position,
        zIndex: style.zIndex,
        transform: style.transform,
        transitionProperty: style.transitionProperty,
        transitionDuration: style.transitionDuration,
        transitionDelay: style.transitionDelay,
        backdropFilter: style.backdropFilter || 'none',
        webkitBackdropFilter: style.webkitBackdropFilter || 'none',
        contain: style.contain,
        contentVisibility: style.contentVisibility,
        isolation: style.isolation,
        willChange: style.willChange,
        clientRects: node.getClientRects().length,
      };
    };

    const closeInfo = nodeInfo(close);
    const rect = closeInfo?.rect || null;
    const visual = window.visualViewport
      ? {
          width: window.visualViewport.width,
          height: window.visualViewport.height,
          offsetLeft: window.visualViewport.offsetLeft,
          offsetTop: window.visualViewport.offsetTop,
          scale: window.visualViewport.scale,
        }
      : null;

    const finiteRect = Boolean(rect && [
      rect.left,
      rect.top,
      rect.right,
      rect.bottom,
      rect.width,
      rect.height,
    ].every(Number.isFinite));
    const rendered = Boolean(
      finiteRect
      && rect.width > 0
      && rect.height > 0
      && closeInfo.clientRects > 0
      && closeInfo.display !== 'none'
      && closeInfo.visibility !== 'hidden'
      && closeInfo.visibility !== 'collapse'
      && Number(closeInfo.opacity) > 0,
    );
    const innerContained = Boolean(
      finiteRect
      && rect.left >= -2
      && rect.top >= -2
      && rect.right <= innerWidth + 2
      && rect.bottom <= innerHeight + 2,
    );
    const visualContained = Boolean(
      finiteRect
      && visual
      && rect.left >= visual.offsetLeft - 2
      && rect.top >= visual.offsetTop - 2
      && rect.right <= visual.offsetLeft + visual.width + 2
      && rect.bottom <= visual.offsetTop + visual.height + 2,
    );

    const inset = (size) => Math.min(6, Math.max(1, size / 4));
    const points = finiteRect
      ? [
          ['center', rect.left + rect.width / 2, rect.top + rect.height / 2],
          ['top-left-inset', rect.left + inset(rect.width), rect.top + inset(rect.height)],
          ['top-right-inset', rect.right - inset(rect.width), rect.top + inset(rect.height)],
          ['bottom-left-inset', rect.left + inset(rect.width), rect.bottom - inset(rect.height)],
          ['bottom-right-inset', rect.right - inset(rect.width), rect.bottom - inset(rect.height)],
        ]
      : [];

    const hitTests = Object.fromEntries(points.map(([label, x, y]) => {
      const stackNodes = document.elementsFromPoint(x, y).slice(0, 12);
      return [label, {
        x,
        y,
        top: nodeInfo(document.elementFromPoint(x, y)),
        stack: stackNodes.map(nodeInfo),
        closeInStack: close instanceof Element && stackNodes.includes(close),
        closeIsTop: close instanceof Element && stackNodes[0] === close,
      }];
    }));

    return {
      url: location.href,
      viewport: {
        innerWidth,
        innerHeight,
        devicePixelRatio,
        visualViewport: visual,
        documentScrollWidth: document.documentElement.scrollWidth,
        documentScrollHeight: document.documentElement.scrollHeight,
        bodyScrollWidth: document.body?.scrollWidth ?? null,
        bodyScrollHeight: document.body?.scrollHeight ?? null,
      },
      close: closeInfo,
      sheet: nodeInfo(sheet),
      header: nodeInfo(header),
      search: nodeInfo(search),
      activeElement: nodeInfo(document.activeElement),
      sheetAriaHidden: sheet?.getAttribute('aria-hidden') ?? null,
      sheetClasses: sheet instanceof Element ? [...sheet.classList] : [],
      bodyClasses: [...document.body.classList],
      documentClasses: [...document.documentElement.classList],
      rendered,
      innerContained,
      visualContained,
      hitTests,
      closeClickCount: Number(window.__webkitHitTestDiagnostic?.closeClicks || 0),
      keyEvents: Array.isArray(window.__webkitHitTestDiagnostic?.keys)
        ? [...window.__webkitHitTestDiagnostic.keys]
        : [],
    };
  });
}

async function childSample(variant, mode, outputPath) {
  const baseUrl = VARIANTS[variant];
  if (!baseUrl || !MODES.includes(mode)) throw new Error(`invalid sample: ${variant}/${mode}`);

  const result = {
    schema: 'playgarba-webkit-search-hit-test-sample/v3',
    variant,
    mode,
    baseUrl,
    pinned857Sha: PINNED_857_SHA,
    browser: 'webkit',
    viewport: VIEWPORT,
    status: 'starting',
    setupStage: 'starting',
    setupError: null,
    actionError: null,
    crashed: false,
    crashEvents: [],
    runtimeFailures: [],
    consoleErrors: [],
    httpErrors: [],
    preAction: null,
    afterAction: null,
    actionElapsedMs: null,
    actionReturned: false,
    closed: false,
  };
  writeJson(outputPath, result);

  const browser = await webkit.launch({ headless: true });
  let context;
  try {
    context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(6_000);

    page.on('crash', () => {
      result.crashed = true;
      result.crashEvents.push({ at: Date.now(), stage: result.setupStage, kind: 'page-crash' });
      writeJson(outputPath, result);
    });
    page.on('pageerror', (error) => result.runtimeFailures.push(errorText(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') result.consoleErrors.push(message.text());
    });
    page.on('response', (response) => {
      if (response.url().startsWith(baseUrl) && response.status() >= 400) {
        result.httpErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    try {
      checkpoint(result, outputPath, 'navigating');
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 10_000 });
      checkpoint(result, outputPath, 'dom-loaded');

      // Match the shared browser gate's readiness boundary before touching Search.
      await page.waitForFunction(() => {
        const title = document.querySelector('#songTitle')?.textContent?.trim();
        const genre = document.querySelector('#genreStrip .genre-button[data-genre-bound="true"]');
        return Boolean(title && genre);
      }, null, { timeout: 10_000 });
      checkpoint(result, outputPath, 'player-ready');

      // Setup must not use Playwright actionability. This diagnostic is specifically
      // classifying the close control after Search is already open.
      const openedFromDom = await page.evaluate(() => {
        const button = document.querySelector('#searchButton');
        if (!(button instanceof HTMLElement)) return false;
        button.click();
        return true;
      });
      if (!openedFromDom) throw new Error('search_opener_missing');
      checkpoint(result, outputPath, 'search-dom-click-dispatched');

      await page.waitForFunction(() => {
        const sheet = document.querySelector('#songSheet');
        const input = document.querySelector('#searchInput');
        if (!(sheet instanceof HTMLElement) || !(input instanceof HTMLElement)) return false;
        const style = getComputedStyle(input);
        return sheet.getAttribute('aria-hidden') === 'false'
          && style.display !== 'none'
          && style.visibility !== 'hidden';
      }, null, { timeout: 5_000 });
      checkpoint(result, outputPath, 'search-open');

      await sleep(500);
      await page.evaluate(() => {
        const close = document.querySelector('#sheetClose');
        window.__webkitHitTestDiagnostic = { closeClicks: 0, keys: [] };
        if (close instanceof HTMLElement) {
          close.addEventListener('click', () => {
            window.__webkitHitTestDiagnostic.closeClicks += 1;
          }, true);
          close.addEventListener('keydown', (event) => {
            window.__webkitHitTestDiagnostic.keys.push({ key: event.key, code: event.code });
          }, true);
        }
      });
      result.preAction = await captureState(page);
      result.status = 'pre-action-captured';
      checkpoint(result, outputPath, 'pre-action-captured');
    } catch (error) {
      result.setupError = errorText(error);
      result.status = 'setup-failed';
      writeJson(outputPath, result);
      return;
    }

    const startedAt = Date.now();
    try {
      if (mode === 'dom-click') {
        result.actionReturned = await page.evaluate(() => {
          const close = document.querySelector('#sheetClose');
          if (!(close instanceof HTMLElement)) return false;
          close.click();
          return true;
        });
      } else if (mode === 'keyboard-enter' || mode === 'keyboard-space') {
        await page.evaluate(() => {
          const close = document.querySelector('#sheetClose');
          if (close instanceof HTMLElement) close.focus();
        });
        await page.keyboard.press(mode === 'keyboard-enter' ? 'Enter' : 'Space');
        result.actionReturned = true;
      } else if (mode === 'mouse-click') {
        const rect = result.preAction?.close?.rect;
        if (!rect || !(rect.width > 0) || !(rect.height > 0)) throw new Error('close_geometry_missing');
        await page.mouse.click(rect.left + rect.width / 2, rect.top + rect.height / 2);
        result.actionReturned = true;
      } else if (mode === 'playwright-click') {
        await page.locator('#sheetClose').click({ timeout: 5_000 });
        result.actionReturned = true;
      }
    } catch (error) {
      result.actionError = errorText(error);
    }
    result.actionElapsedMs = Date.now() - startedAt;
    await sleep(250);

    try {
      result.afterAction = await captureState(page);
      result.closed = result.afterAction?.sheetAriaHidden === 'true';
    } catch (error) {
      result.actionError = result.actionError || errorText(error);
    }
    result.status = result.closed ? 'closed' : 'action-complete';
    writeJson(outputPath, result);
  } finally {
    await context?.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function runIsolatedSample(variant, mode) {
  const outputPath = path.join(SAMPLE_DIR, `${variant}-${mode}.json`);
  fs.rmSync(outputPath, { force: true });

  const child = spawn(process.execPath, [SCRIPT_PATH, '--sample', variant, mode, outputPath], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, SAMPLE_TIMEOUT_MS);

  const exit = await new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));
  clearTimeout(timer);

  let sample;
  try {
    sample = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  } catch {
    sample = {
      schema: 'playgarba-webkit-search-hit-test-sample/v3',
      variant,
      mode,
      status: 'no-sample-output',
      setupStage: 'unknown',
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

function closes(sample) {
  return Boolean(sample?.closed || sample?.afterAction?.sheetAriaHidden === 'true');
}

function classifyVariant(samples) {
  const byMode = Object.fromEntries(samples.map((sample) => [sample.mode, sample]));
  const representative = samples.find((sample) => sample.preAction)?.preAction || null;
  const setupCrashes = samples.filter((sample) => sample.crashed && !sample.preAction);

  if (!representative) return setupCrashes.length ? 'renderer_crash_during_search_open' : 'setup_failure';
  if (!representative.rendered) return 'visibility_or_rendering_failure';
  if (!representative.innerContained || !representative.visualContained) return 'geometry_or_compositor_containment';

  const hitTests = Object.values(representative.hitTests || {});
  if (hitTests.length && hitTests.some((hit) => !hit.closeInStack)) return 'hit_test_interceptor_or_stacking';

  const domCloses = closes(byMode['dom-click']);
  const enterCloses = closes(byMode['keyboard-enter']);
  const spaceCloses = closes(byMode['keyboard-space']);
  const mouseCloses = closes(byMode['mouse-click']);
  const playwrightCloses = closes(byMode['playwright-click']);
  const playwrightTimedOut = Boolean(byMode['playwright-click']?.process?.timedOut);

  if (setupCrashes.length) return 'mixed_search_open_renderer_instability';
  if (domCloses && (enterCloses || spaceCloses) && mouseCloses && playwrightTimedOut) {
    return 'playwright_webkit_protocol_or_actionability_stall';
  }
  if (domCloses && (enterCloses || spaceCloses) && mouseCloses && !playwrightCloses) {
    return 'playwright_locator_actionability_only_failure';
  }
  if (!domCloses) return 'product_close_handler_or_dom_state_failure';
  if (!enterCloses && !spaceCloses) return 'keyboard_activation_failure';
  if (!mouseCloses) return 'pointer_hit_test_or_protocol_failure';
  if (playwrightCloses) return 'no_reproduction';
  return 'mixed_or_inconclusive';
}

function sampleSummary(sample) {
  const center = sample.preAction?.hitTests?.center;
  return {
    mode: sample.mode,
    status: sample.status,
    setupStage: sample.setupStage,
    setupError: compactError(sample.setupError),
    actionError: compactError(sample.actionError),
    timedOut: Boolean(sample.process?.timedOut),
    crashed: Boolean(sample.crashed),
    preAction: Boolean(sample.preAction),
    rendered: sample.preAction?.rendered ?? null,
    contained: sample.preAction ? Boolean(sample.preAction.innerContained && sample.preAction.visualContained) : null,
    centerTop: center?.top ? `${center.top.tag}#${center.top.id || ''}.${center.top.className || ''}` : null,
    closeInCenterStack: center?.closeInStack ?? null,
    closeIsCenterTop: center?.closeIsTop ?? null,
    closed: closes(sample),
    actionElapsedMs: sample.actionElapsedMs,
  };
}

async function parentRun() {
  fs.rmSync(SAMPLE_DIR, { recursive: true, force: true });
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });

  const result = {
    schema: 'playgarba-webkit-search-hit-test/v3',
    generatedAt: new Date().toISOString(),
    pinned857Sha: PINNED_857_SHA,
    viewport: VIEWPORT,
    browser: 'webkit',
    forcedReducedMotion: false,
    searchSetupActivation: 'page-side HTMLElement.click()',
    sampleIsolation: 'fresh browser/context/page per variant and activation mode',
    variants: {},
  };

  for (const [variant, baseUrl] of Object.entries(VARIANTS)) {
    const samples = [];
    for (const mode of MODES) {
      const sample = await runIsolatedSample(variant, mode);
      samples.push(sample);
      console.log(JSON.stringify({ variant, ...sampleSummary(sample) }));
    }
    result.variants[variant] = {
      baseUrl,
      classification: classifyVariant(samples),
      samples,
    };
    writeJson(OUTPUT_PATH, result);
  }

  const candidate = result.variants['857-candidate'];
  result.summary = {
    mainControl: result.variants['main-control']?.classification || null,
    candidate857: candidate?.classification || null,
    mainPreActionSamples: result.variants['main-control']?.samples?.filter((sample) => sample.preAction).length || 0,
    candidatePreActionSamples: candidate?.samples?.filter((sample) => sample.preAction).length || 0,
  };
  writeJson(OUTPUT_PATH, result);
  console.log(JSON.stringify(result.summary, null, 2));

  if (result.summary.mainPreActionSamples === 0 || result.summary.candidatePreActionSamples === 0) {
    console.error('Diagnostic did not reach a pre-action Search state for both variants. Inspect setupStage evidence.');
    process.exitCode = 1;
  }
}

if (process.argv[2] === '--sample') {
  const [, , , variant, mode, outputPath] = process.argv;
  try {
    await childSample(variant, mode, outputPath);
  } catch (error) {
    writeJson(outputPath, {
      schema: 'playgarba-webkit-search-hit-test-sample/v3',
      variant,
      mode,
      status: 'fatal-error',
      setupStage: 'fatal-error',
      fatalError: errorText(error),
    });
    process.exitCode = 1;
  }
} else {
  await parentRun();
}
