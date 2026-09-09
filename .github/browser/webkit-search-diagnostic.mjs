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
      const animations = node.getAnimations().map((animation) => {
        let keyframes = [];
        try { keyframes = animation.effect?.getKeyframes?.() || []; } catch {}
        let timing = null;
        try { timing = animation.effect?.getTiming?.() || null; } catch {}
        return {
          type: animation.constructor?.name || '',
          playState: animation.playState,
          currentTime: animation.currentTime,
          startTime: animation.startTime,
          playbackRate: animation.playbackRate,
          id: animation.id || '',
          transitionProperty: animation.transitionProperty || null,
          timing,
          keyframes,
        };
      });
      return {
        selector,
        rect: {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        attributes: {
          ariaHidden: node.getAttribute('aria-hidden'),
          dataSnap: node.getAttribute('data-snap'),
          hidden: node.hidden,
          className: node.className,
        },
        inline: {
          transform: node.style.transform,
          transition: node.style.transition,
        },
        style: {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          position: style.position,
          transform: style.transform,
          inset: style.inset,
          width: style.width,
          height: style.height,
          contain: style.contain,
          backdropFilter: style.backdropFilter,
          transitionProperty: style.transitionProperty,
          transitionDuration: style.transitionDuration,
          transitionDelay: style.transitionDelay,
          transitionTimingFunction: style.transitionTimingFunction,
        },
        animations,
      };
    };

    const app = document.getElementById('app');
    const active = document.activeElement;
    return {
      label: snapshotLabel,
      viewport: {
        innerWidth,
        innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
      },
      appSheetSnap: app?.getAttribute('data-sheet-snap') || null,
      sheet: read('#songSheet'),
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
  await snapshot('after-click-0ms');
  await page.waitForTimeout(50);
  await snapshot('after-click-50ms');
  await page.waitForTimeout(150);
  await snapshot('after-click-200ms');

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
      sheetSnap: sheet?.getAttribute('data-snap') || null,
      appSheetSnap: document.getElementById('app')?.getAttribute('data-sheet-snap') || null,
      inputVisible: visible(input),
      closeVisible: visible(close),
      activeId: document.activeElement?.id || '',
    };
  });

  print('final', finalState);
  print('runtime', runtime);
  if (!finalState.sheetOpen || !finalState.inputVisible || !finalState.closeVisible) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
