import { webkit } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:4173';

function serializeError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

const browser = await webkit.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const runtime = [];

page.on('pageerror', (error) => runtime.push(`pageerror: ${serializeError(error)}`));
page.on('console', (message) => {
  if (message.type() === 'error') runtime.push(`console: ${message.text()}`);
});
page.on('requestfailed', (request) => {
  try {
    if (new URL(request.url()).origin === ORIGIN) {
      runtime.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`);
    }
  } catch {}
});

function print(label, value) {
  console.log(`WEBKIT_SEARCH_DIAGNOSTIC ${label} ${JSON.stringify(value)}`);
}

async function snapshot(label) {
  const value = await page.evaluate((snapshotLabel) => {
    const read = (selector) => {
      const node = document.querySelector(selector);
      if (!(node instanceof HTMLElement)) return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const centerX = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2));
      const centerY = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
      return {
        selector,
        rect: {
          x: rect.x,
          y: rect.y,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        client: { width: node.clientWidth, height: node.clientHeight },
        offset: { width: node.offsetWidth, height: node.offsetHeight },
        attributes: {
          ariaHidden: node.getAttribute('aria-hidden'),
          hidden: node.hidden,
          className: node.className,
        },
        style: {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          position: style.position,
          zIndex: style.zIndex,
          transform: style.transform,
          translate: style.translate,
          inset: style.inset,
          top: style.top,
          right: style.right,
          bottom: style.bottom,
          left: style.left,
          width: style.width,
          height: style.height,
          minWidth: style.minWidth,
          minHeight: style.minHeight,
          overflow: style.overflow,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          contain: style.contain,
          isolation: style.isolation,
          pointerEvents: style.pointerEvents,
          backdropFilter: style.backdropFilter,
          webkitBackdropFilter: style.getPropertyValue('-webkit-backdrop-filter'),
        },
        centerHit: document.elementFromPoint(centerX, centerY)?.id || document.elementFromPoint(centerX, centerY)?.className || null,
      };
    };

    const active = document.activeElement;
    return {
      label: snapshotLabel,
      viewport: {
        innerWidth,
        innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        bodyWidth: document.body?.scrollWidth || 0,
        bodyHeight: document.body?.scrollHeight || 0,
        visual: window.visualViewport ? {
          width: window.visualViewport.width,
          height: window.visualViewport.height,
          offsetLeft: window.visualViewport.offsetLeft,
          offsetTop: window.visualViewport.offsetTop,
          scale: window.visualViewport.scale,
        } : null,
      },
      app: read('#app'),
      sheet: read('#songSheet'),
      header: read('#songSheet .sheet-header'),
      searchField: read('#songSheet .search-field'),
      searchInput: read('#searchInput'),
      close: read('#sheetClose'),
      activeElement: active instanceof HTMLElement ? {
        id: active.id,
        className: active.className,
        tagName: active.tagName,
      } : null,
    };
  }, label);
  print(label, value);
  return value;
}

try {
  await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#app').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForFunction(() => document.getElementById('songTitle')?.textContent?.trim(), null, { timeout: 15_000 });
  await page.locator('#genreStrip .genre-button[data-genre-bound="true"]').first().waitFor({ state: 'visible', timeout: 15_000 });

  await snapshot('before-click');
  await page.locator('#searchButton').click();

  for (const [label, delay] of [
    ['after-click-0ms', 0],
    ['after-click-50ms', 50],
    ['after-click-200ms', 150],
    ['after-click-500ms', 300],
    ['after-click-1200ms', 700],
    ['after-click-3000ms', 1800],
  ]) {
    if (delay) await page.waitForTimeout(delay);
    await snapshot(label);
  }

  const finalState = await page.evaluate(() => {
    const sheet = document.getElementById('songSheet');
    const input = document.getElementById('searchInput');
    const close = document.getElementById('sheetClose');
    const visible = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number.parseFloat(style.opacity || '1') > 0
        && rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < innerWidth
        && rect.top < innerHeight;
    };
    return {
      sheetOpen: sheet?.getAttribute('aria-hidden') === 'false',
      inputVisible: visible(input),
      closeVisible: visible(close),
      activeId: document.activeElement?.id || '',
    };
  });

  print('final', finalState);
  print('runtime', runtime);
} finally {
  await context.close();
  await browser.close();
}
