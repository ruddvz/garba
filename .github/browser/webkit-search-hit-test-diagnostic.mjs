import fs from 'node:fs';
import { webkit } from '@playwright/test';

const baseUrl = process.env.DIAGNOSTIC_BASE_URL || 'http://127.0.0.1:4175';
const outputPath = process.env.DIAGNOSTIC_OUTPUT || 'webkit-search-hit-test-diagnostic.json';

function cleanClassName(value) {
  return typeof value === 'string' ? value : String(value || '');
}

const browser = await webkit.launch({ headless: true });
const result = {
  schema: 'playgarba-webkit-search-hit-test/v1',
  baseUrl,
  browser: 'webkit',
  viewport: { width: 1440, height: 900 },
  opened: false,
  snapshots: {},
  domClick: null,
  playwrightClick: null,
};

try {
  const context = await browser.newContext({
    viewport: result.viewport,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const runtimeFailures = [];
  page.on('pageerror', (error) => runtimeFailures.push(`pageerror: ${error.message}`));

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#searchButton').waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator('#searchButton').click();
  await page.locator('#songSheet[aria-hidden="false"]').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('#searchInput').waitFor({ state: 'visible', timeout: 10_000 });
  result.opened = true;

  const capture = async (label) => {
    result.snapshots[label] = await page.evaluate(() => {
      const close = document.querySelector('#sheetClose');
      const sheet = document.querySelector('#songSheet');
      const search = document.querySelector('#searchInput');
      const header = close?.closest('header, .sheet-header, .browser-header, [class*="header"]') || close?.parentElement || null;
      if (!(close instanceof HTMLElement)) return { error: 'missing #sheetClose' };

      const rect = close.getBoundingClientRect();
      const styleOf = (node) => {
        if (!(node instanceof Element)) return null;
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return {
          tag: node.tagName.toLowerCase(),
          id: node.id || null,
          className: typeof node.className === 'string' ? node.className : String(node.className || ''),
          rect: { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height },
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          position: style.position,
          zIndex: style.zIndex,
          transform: style.transform,
          backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none',
          contain: style.contain,
          isolation: style.isolation,
        };
      };
      const points = [
        ['center', rect.left + rect.width / 2, rect.top + rect.height / 2],
        ['top-left-inset', rect.left + Math.min(4, Math.max(1, rect.width / 4)), rect.top + Math.min(4, Math.max(1, rect.height / 4))],
        ['top-right-inset', rect.right - Math.min(4, Math.max(1, rect.width / 4)), rect.top + Math.min(4, Math.max(1, rect.height / 4))],
        ['bottom-left-inset', rect.left + Math.min(4, Math.max(1, rect.width / 4)), rect.bottom - Math.min(4, Math.max(1, rect.height / 4))],
        ['bottom-right-inset', rect.right - Math.min(4, Math.max(1, rect.width / 4)), rect.bottom - Math.min(4, Math.max(1, rect.height / 4))],
      ];
      const hitTests = Object.fromEntries(points.map(([name, x, y]) => {
        const stack = document.elementsFromPoint(x, y).slice(0, 12).map(styleOf);
        return [name, {
          x,
          y,
          top: styleOf(document.elementFromPoint(x, y)),
          stack,
          closeInStack: document.elementsFromPoint(x, y).includes(close),
        }];
      }));

      return {
        activeElement: styleOf(document.activeElement),
        close: styleOf(close),
        sheet: styleOf(sheet),
        header: styleOf(header),
        search: styleOf(search),
        sheetAriaHidden: sheet?.getAttribute('aria-hidden') ?? null,
        bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
        documentPointerEvents: getComputedStyle(document.documentElement).pointerEvents,
        hitTests,
      };
    });
  };

  await capture('beforeDomClick');
  const domBefore = await page.locator('#songSheet').getAttribute('aria-hidden');
  const domDispatched = await page.evaluate(() => {
    const close = document.querySelector('#sheetClose');
    if (!(close instanceof HTMLElement)) return false;
    close.click();
    return true;
  });
  await page.waitForTimeout(250);
  const domAfter = await page.locator('#songSheet').getAttribute('aria-hidden');
  result.domClick = { dispatched: domDispatched, ariaHiddenBefore: domBefore, ariaHiddenAfter: domAfter, closed: domAfter === 'true' };

  if (domAfter === 'true') {
    await page.locator('#searchButton').click();
    await page.locator('#songSheet[aria-hidden="false"]').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('#searchInput').waitFor({ state: 'visible', timeout: 10_000 });
  }

  await capture('beforePlaywrightClick');
  const playwrightBefore = await page.locator('#songSheet').getAttribute('aria-hidden');
  const startedAt = Date.now();
  let clickError = null;
  try {
    await page.locator('#sheetClose').click({ timeout: 5_000 });
  } catch (error) {
    clickError = String(error?.message || error);
  }
  const elapsedMs = Date.now() - startedAt;
  const playwrightAfter = await page.locator('#songSheet').getAttribute('aria-hidden').catch(() => null);
  result.playwrightClick = {
    ariaHiddenBefore: playwrightBefore,
    ariaHiddenAfter: playwrightAfter,
    closed: playwrightAfter === 'true',
    elapsedMs,
    error: clickError,
  };
  if (playwrightAfter === 'false') await capture('afterFailedPlaywrightClick');
  result.runtimeFailures = runtimeFailures;

  await context.close();
} finally {
  await browser.close();
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

if (!result.opened) process.exitCode = 1;
