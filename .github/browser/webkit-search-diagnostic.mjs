import { webkit } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:4173';

const variants = [
  { name: 'control-no-search', search: false, css: '' },
  { name: 'search-baseline', search: true, css: '' },
  { name: 'search-no-backdrop', search: true, css: '#songSheet{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' },
  { name: 'search-no-contain', search: true, css: '#songSheet{contain:none!important}' },
  { name: 'search-no-content-visibility', search: true, css: '#songSheet .song-row{content-visibility:visible!important;contain-intrinsic-size:auto!important}' },
  { name: 'search-no-backdrop-no-contain', search: true, css: '#songSheet{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;contain:none!important}' },
];

const results = [];

function visibleState() {
  const read = (selector) => {
    const node = document.querySelector(selector);
    if (!(node instanceof HTMLElement)) return null;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      rect: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height },
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      transform: style.transform,
      contain: style.contain,
      backdropFilter: style.backdropFilter,
      transitionProperty: style.transitionProperty,
      ariaHidden: node.getAttribute('aria-hidden'),
      dataSnap: node.getAttribute('data-snap'),
      className: node.className,
    };
  };
  return {
    sheet: read('#songSheet'),
    input: read('#searchInput'),
    close: read('#sheetClose'),
    activeId: document.activeElement?.id || '',
    catalogueReady: window.GARBA_CATALOGUE_READY === true,
  };
}

for (const variant of variants) {
  const started = Date.now();
  let browser;
  let context;
  let page;
  let disconnected = false;
  let pageClosed = false;
  const runtime = [];
  try {
    browser = await webkit.launch();
    browser.on('disconnected', () => { disconnected = true; });
    context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    page = await context.newPage();
    page.on('close', () => { pageClosed = true; });
    page.on('pageerror', (error) => runtime.push(`pageerror:${error?.message || error}`));
    page.on('console', (message) => { if (message.type() === 'error') runtime.push(`console:${message.text()}`); });
    page.on('requestfailed', (request) => {
      try {
        if (new URL(request.url()).origin === ORIGIN) runtime.push(`requestfailed:${request.url()}:${request.failure()?.errorText || ''}`);
      } catch {}
    });

    // Preserve simple-runtime's fast in-memory boot catalogue, but prevent the
    // later real full-catalogue request from completing during this diagnostic.
    await page.route('**/data/songs.json*', (route) => route.abort('failed'));
    await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#app').waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(() => document.getElementById('songTitle')?.textContent?.trim(), null, { timeout: 15_000 });
    await page.locator('#genreStrip .genre-button[data-genre-bound="true"]').first().waitFor({ state: 'visible', timeout: 15_000 });
    if (variant.css) await page.addStyleTag({ content: variant.css });

    const before = await page.evaluate(visibleState);
    if (variant.search) await page.locator('#searchButton').click();
    const after0 = await page.evaluate(visibleState);
    await page.waitForTimeout(200);
    const after200 = await page.evaluate(visibleState);
    await page.waitForTimeout(800);
    const after1000 = await page.evaluate(visibleState);
    results.push({ name: variant.name, outcome: 'responsive', elapsedMs: Date.now() - started, before, after0, after200, after1000, runtime });
  } catch (error) {
    results.push({
      name: variant.name,
      outcome: 'failed-or-stalled',
      elapsedMs: Date.now() - started,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      disconnected,
      pageClosed,
      runtime,
    });
  } finally {
    try { await context?.close(); } catch {}
    try { await browser?.close(); } catch {}
  }
  console.log(`WEBKIT_SEARCH_VARIANT ${JSON.stringify(results.at(-1))}`);
}

console.log(`WEBKIT_SEARCH_VARIANTS_FINAL ${JSON.stringify(results.map(({ name, outcome, elapsedMs, error, disconnected, pageClosed }) => ({ name, outcome, elapsedMs, error, disconnected, pageClosed })))}`);
