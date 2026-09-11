import { webkit, expect } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:4173';
const variant = process.env.SEARCH_DIAG_VARIANT || 'unknown';
const runtime = [];

const browser = await webkit.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();

page.on('pageerror', (error) => {
  const entry = `pageerror:${error?.message || error}`;
  runtime.push(entry);
  console.log(`SEARCH_DIAG_RUNTIME ${JSON.stringify({ variant, entry })}`);
});
page.on('console', (message) => {
  const text = message.text();
  if (text.startsWith('__GARBA_SEARCH_DIAG__')) {
    console.log(`SEARCH_DIAG_PAGE ${JSON.stringify({ variant, payload: text.slice('__GARBA_SEARCH_DIAG__'.length) })}`);
    return;
  }
  if (message.type() === 'error') {
    const entry = `console:${text}`;
    runtime.push(entry);
    console.log(`SEARCH_DIAG_RUNTIME ${JSON.stringify({ variant, entry })}`);
  }
});
page.on('crash', () => console.log(`SEARCH_DIAG_EVENT ${JSON.stringify({ variant, event: 'page-crash' })}`));
page.on('close', () => console.log(`SEARCH_DIAG_EVENT ${JSON.stringify({ variant, event: 'page-close' })}`));

await page.addInitScript(() => {
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const nativeFocus = HTMLElement.prototype.focus;
  const pending = new Map();

  const emit = (kind, data = {}) => {
    console.log(`__GARBA_SEARCH_DIAG__${JSON.stringify({ kind, t: performance.now(), ...data })}`);
  };
  const activeId = () => document.activeElement instanceof HTMLElement ? document.activeElement.id || document.activeElement.tagName : '';
  const relevantTimer = (delay, source) => Number(delay) === 150
    || Number(delay) === 80
    || /searchFocus|searchInput|sheetTrigger/.test(source);

  window.setTimeout = function patchedSetTimeout(callback, delay = 0, ...args) {
    const source = typeof callback === 'function' ? Function.prototype.toString.call(callback) : String(callback);
    let timerId;
    const wrapped = typeof callback === 'function'
      ? function wrappedTimeout(...callbackArgs) {
          const key = String(timerId);
          if (relevantTimer(delay, source)) emit('timer-fire', { id: key, delay: Number(delay), activeId: activeId(), source: source.slice(0, 220) });
          pending.delete(key);
          return callback.apply(this, callbackArgs);
        }
      : callback;
    timerId = nativeSetTimeout(wrapped, delay, ...args);
    const key = String(timerId);
    pending.set(key, { delay: Number(delay), source: source.slice(0, 220) });
    if (relevantTimer(delay, source)) emit('timer-set', { id: key, delay: Number(delay), activeId: activeId(), source: source.slice(0, 220) });
    return timerId;
  };

  window.clearTimeout = function patchedClearTimeout(timerId) {
    const key = String(timerId);
    const timer = pending.get(key);
    if (timer && relevantTimer(timer.delay, timer.source)) emit('timer-clear', { id: key, delay: timer.delay, activeId: activeId(), source: timer.source });
    pending.delete(key);
    return nativeClearTimeout(timerId);
  };

  HTMLElement.prototype.focus = function patchedFocus(...args) {
    const interesting = this.id === 'searchInput' || this.id === 'searchButton';
    if (interesting) emit('focus-before', { targetId: this.id, activeId: activeId() });
    const result = nativeFocus.apply(this, args);
    if (interesting) emit('focus-after', { targetId: this.id, activeId: activeId() });
    return result;
  };

  window.__GARBA_SEARCH_DIAG__ = { pending, emit };
});

function installSnapshotProbe() {
  const diag = window.__GARBA_SEARCH_DIAG__;
  const rectOf = (node) => {
    if (!(node instanceof HTMLElement)) return null;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      connected: node.isConnected,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      transform: style.transform,
      transitionProperty: style.transitionProperty,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      clientRects: node.getClientRects().length,
      disabled: 'disabled' in node ? Boolean(node.disabled) : undefined,
    };
  };
  const snapshot = (label) => {
    const sheet = document.getElementById('songSheet');
    const app = document.getElementById('app');
    const input = document.getElementById('searchInput');
    const close = document.getElementById('sheetClose');
    const relevantPending = [...diag.pending.entries()]
      .filter(([, timer]) => timer.delay === 150 || timer.delay === 80 || /searchFocus|searchInput|sheetTrigger/.test(timer.source))
      .map(([id, timer]) => ({ id, ...timer }));
    const viewport = window.visualViewport
      ? { left: window.visualViewport.offsetLeft, top: window.visualViewport.offsetTop, width: window.visualViewport.width, height: window.visualViewport.height }
      : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    diag.emit('snapshot', {
      label,
      sheet: {
        ariaHidden: sheet?.getAttribute('aria-hidden') ?? null,
        dataSnap: sheet?.getAttribute('data-snap') ?? null,
        className: sheet?.className ?? null,
        geometry: rectOf(sheet),
      },
      appSheetSnap: app?.dataset?.sheetSnap ?? null,
      input: rectOf(input),
      close: rectOf(close),
      activeElement: document.activeElement instanceof HTMLElement ? { id: document.activeElement.id, tag: document.activeElement.tagName } : null,
      pendingTimers: relevantPending,
      viewport,
    });
  };
  diag.snapshot = snapshot;
  const sheet = document.getElementById('songSheet');
  const button = document.getElementById('searchButton');
  snapshot('before-click');
  button?.addEventListener('click', () => snapshot('search-click-capture'), { capture: true });
  button?.addEventListener('click', () => snapshot('search-click-bubble-after-app'));
  if (sheet) {
    new MutationObserver((records) => snapshot(`sheet-mutation:${records.map((record) => record.attributeName).join(',')}`))
      .observe(sheet, { attributes: true, attributeFilter: ['aria-hidden', 'data-snap', 'class'] });
  }
}

let outcome = 'unknown';
try {
  await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#songTitle')).not.toHaveText('', { timeout: 15_000 });
  await expect(page.locator('#genreStrip .genre-button[data-genre-bound="true"]').first()).toBeVisible({ timeout: 15_000 });
  await page.evaluate(installSnapshotProbe);

  await page.locator('#searchButton').click();
  console.log(`SEARCH_DIAG_STEP ${JSON.stringify({ variant, step: 'search-click-returned' })}`);

  await expect(page.locator('#songSheet')).toHaveAttribute('aria-hidden', 'false');
  console.log(`SEARCH_DIAG_STEP ${JSON.stringify({ variant, step: 'sheet-open-confirmed' })}`);

  await expect(page.locator('#searchInput')).toBeVisible();
  console.log(`SEARCH_DIAG_STEP ${JSON.stringify({ variant, step: 'search-input-visible' })}`);
  await page.evaluate(() => window.__GARBA_SEARCH_DIAG__?.snapshot?.('after-visible'));

  await page.locator('#sheetClose').click();
  await expect(page.locator('#songSheet')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#searchButton')).toBeFocused();
  await page.evaluate(() => window.__GARBA_SEARCH_DIAG__?.snapshot?.('after-close-focus'));
  outcome = 'journey-passed';
} catch (error) {
  outcome = 'journey-failed';
  console.log(`SEARCH_DIAG_FAILURE ${JSON.stringify({ variant, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) })}`);
  try { await page.evaluate(() => window.__GARBA_SEARCH_DIAG__?.snapshot?.('failure-final-snapshot')); } catch (snapshotError) {
    console.log(`SEARCH_DIAG_FAILURE_SNAPSHOT ${JSON.stringify({ variant, error: snapshotError instanceof Error ? `${snapshotError.name}: ${snapshotError.message}` : String(snapshotError) })}`);
  }
} finally {
  console.log(`SEARCH_DIAG_FINAL ${JSON.stringify({ variant, outcome, runtime })}`);
  try { await context.close(); } catch {}
  try { await browser.close(); } catch {}
}

if (outcome !== 'journey-passed') process.exitCode = 1;
