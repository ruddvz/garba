import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { webkit } from '@playwright/test';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const OUTPUT_PATH = process.env.DIAGNOSTIC_OUTPUT || 'webkit-search-hit-test-diagnostic.json';
const SAMPLE_DIR = process.env.DIAGNOSTIC_SAMPLE_DIR || 'webkit-search-hit-test-samples';
const PINNED_857_SHA = process.env.PINNED_857_SHA || null;
const SAMPLE_TIMEOUT_MS = 25_000;
const VIEWPORT = Object.freeze({ width: 1440, height: 900 });
const VARIANTS = Object.freeze({
  'main-control': process.env.MAIN_BASE_URL || 'http://127.0.0.1:4175',
  '857-candidate': process.env.CANDIDATE_BASE_URL || 'http://127.0.0.1:4176',
});
const MODES = Object.freeze(['dom-click', 'keyboard-enter', 'keyboard-space', 'playwright-click']);

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
  if (!baseUrl || !MODES.includes(mode)) {
    throw new Error(`invalid sample: ${variant}/${mode}`);
  }

  const result = {
    schema: 'playgarba-webkit-search-hit-test-sample/v2',
    variant,
    mode,
    baseUrl,
    pinned857Sha: PINNED_857_SHA,
    browser: 'webkit',
    viewport: VIEWPORT,
    status: 'starting',
    setupError: null,
    actionError: null,
    crashed: false,
    crashEvents: [],
    runtimeFailures: [],
    consoleErrors: [],
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
    page.setDefaultTimeout(8_000);

    page.on('crash', () => {
      result.crashed = true;
      result.crashEvents.push({ at: Date.now(), kind: 'page-crash' });
      writeJson(outputPath, result);
    });
    page.on('pageerror', (error) => {
      result.runtimeFailures.push(errorText(error));
    });
    page.on('console', (message) => {
      if (message.type() === 'error') result.consoleErrors.push(message.text());
    });

    try {
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.locator('#searchButton').waitFor({ state: 'visible', timeout: 12_000 });
      await page.locator('#searchButton').click({ timeout: 8_000 });
      await page.waitForFunction(() => document.querySelector('#songSheet')?.getAttribute('aria-hidden') === 'false', null, { timeout: 8_000 });
      await sleep(600);
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
      writeJson(outputPath, result);
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
      } else if (mode === 'playwright-click') {
        await page.locator('#sheetClose').click({ timeout: 5_000 });
        result.actionReturned = true;
      }
    } catch (error) {
      result.actionError = errorText(error);
    }
    result.actionElapsedMs = Date.now() - startedAt;
    await sleep(300);

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

  const exit = await new Promise((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer);

  let sample = null;
  try {
    sample = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  } catch {
    sample = {
      schema: 'playgarba-webkit-search-hit-test-sample/v2',
      variant,
      mode,
      status: 'no-sample-output',
    };
  }

  return {
    ...sample,
    process: {
      timedOut,
      timeoutMs: SAMPLE_TIMEOUT_MS,
      exitCode: exit.code,
      signal: exit.signal,
      stdout: stdout.slice(-4_000),
      stderr: stderr.slice(-8_000),
    },
  };
}

function closes(sample) {
  return Boolean(sample?.closed || sample?.afterAction?.sheetAriaHidden === 'true');
}

function classifyVariant(samples) {
  const byMode = Object.fromEntries(samples.map((sample) => [sample.mode, sample]));
  const representative = samples.find((sample) => sample.preAction)?.preAction || null;
  const setupFailures = samples.filter((sample) => sample.setupError || !sample.preAction);

  if (!representative) return 'setup_failure';
  if (samples.some((sample) => sample.crashed)) return 'renderer_crash';
  if (!representative.rendered) return 'visibility_or_rendering_failure';
  if (!representative.innerContained || !representative.visualContained) return 'geometry_or_compositor_containment';

  const hitTests = Object.values(representative.hitTests || {});
  if (hitTests.length && hitTests.some((hit) => !hit.closeInStack)) return 'hit_test_interceptor_or_stacking';

  const domCloses = closes(byMode['dom-click']);
  const enterCloses = closes(byMode['keyboard-enter']);
  const spaceCloses = closes(byMode['keyboard-space']);
  const playwrightCloses = closes(byMode['playwright-click']);
  const playwrightTimedOut = Boolean(byMode['playwright-click']?.process?.timedOut);

  if (domCloses && (enterCloses || spaceCloses) && playwrightTimedOut) {
    return 'playwright_webkit_protocol_or_actionability_stall';
  }
  if (domCloses && (enterCloses || spaceCloses) && !playwrightCloses) {
    return 'playwright_actionability_only_failure';
  }
  if (!domCloses) return 'product_close_handler_or_dom_state_failure';
  if (!enterCloses && !spaceCloses) return 'keyboard_activation_failure';
  if (playwrightCloses && setupFailures.length === 0) return 'no_reproduction';
  return 'mixed_or_inconclusive';
}

async function parentRun() {
  fs.rmSync(SAMPLE_DIR, { recursive: true, force: true });
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });

  const result = {
    schema: 'playgarba-webkit-search-hit-test/v2',
    generatedAt: new Date().toISOString(),
    pinned857Sha: PINNED_857_SHA,
    viewport: VIEWPORT,
    browser: 'webkit',
    forcedReducedMotion: false,
    sampleIsolation: 'fresh browser/context/page per variant and activation mode',
    variants: {},
  };

  for (const [variant, baseUrl] of Object.entries(VARIANTS)) {
    const samples = [];
    for (const mode of MODES) {
      const sample = await runIsolatedSample(variant, mode);
      samples.push(sample);
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
    candidatePreActionCaptured: Boolean(candidate?.samples?.some((sample) => sample.preAction)),
  };
  writeJson(OUTPUT_PATH, result);
  console.log(JSON.stringify(result.summary, null, 2));

  if (!result.summary.candidatePreActionCaptured) {
    console.error('Diagnostic could not reach a pre-action Search state for the pinned #857 candidate.');
    process.exitCode = 1;
  }
}

if (process.argv[2] === '--sample') {
  const [, , , variant, mode, outputPath] = process.argv;
  try {
    await childSample(variant, mode, outputPath);
  } catch (error) {
    const failed = {
      schema: 'playgarba-webkit-search-hit-test-sample/v2',
      variant,
      mode,
      status: 'fatal-error',
      fatalError: errorText(error),
    };
    writeJson(outputPath, failed);
    process.exitCode = 1;
  }
} else {
  await parentRun();
}
