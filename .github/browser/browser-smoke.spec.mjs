import { test, expect } from '@playwright/test';

const SMOKE_ORIGIN = 'http://127.0.0.1:4173';

function collectRuntimeFailures(page) {
  const failures = [];
  const sameOrigin = (url) => {
    try { return new URL(url).origin === SMOKE_ORIGIN; }
    catch { return false; }
  };

  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    if (sameOrigin(request.url())) failures.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`);
  });
  page.on('response', (response) => {
    if (sameOrigin(response.url()) && response.status() >= 400) failures.push(`http ${response.status()}: ${response.url()}`);
  });

  return failures;
}

async function expectNoDocumentOverflow(page) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body?.scrollWidth || 0,
  }));
  expect(metrics.scrollWidth, 'document should not overflow horizontally').toBeLessThanOrEqual(metrics.viewportWidth + 2);
  expect(metrics.bodyScrollWidth, 'body should not overflow horizontally').toBeLessThanOrEqual(metrics.viewportWidth + 2);
}

async function expectInsideViewport(page, selector) {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  await expect.poll(async () => {
    const box = await locator.boundingBox();
    if (!box) return false;
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    return box.x >= -2
      && box.x + box.width <= viewport.width + 2
      && box.y >= -2
      && box.y + box.height <= viewport.height + 2;
  }, {
    message: `${selector} should settle fully inside the visual viewport`,
    timeout: 2_500,
    intervals: [50, 100, 150, 250],
  }).toBe(true);
}

async function expectAppCoversViewport(page) {
  const coverage = await page.evaluate(() => {
    const app = document.getElementById('app')?.getBoundingClientRect();
    const layer = document.querySelector('.world-layer.is-visible')?.getBoundingClientRect();
    return {
      width: innerWidth,
      height: innerHeight,
      app: app && { left: app.left, top: app.top, right: app.right, bottom: app.bottom },
      layer: layer && { left: layer.left, top: layer.top, right: layer.right, bottom: layer.bottom },
    };
  });

  expect(coverage.app, 'app shell should have a layout box').toBeTruthy();
  expect(coverage.layer, 'active background layer should have a layout box').toBeTruthy();
  expect(coverage.app.left).toBeLessThanOrEqual(2);
  expect(coverage.app.top).toBeLessThanOrEqual(2);
  expect(coverage.app.right).toBeGreaterThanOrEqual(coverage.width - 2);
  expect(coverage.app.bottom).toBeGreaterThanOrEqual(coverage.height - 2);
  expect(coverage.layer.left).toBeLessThanOrEqual(2);
  expect(coverage.layer.top).toBeLessThanOrEqual(2);
  expect(coverage.layer.right).toBeGreaterThanOrEqual(coverage.width - 2);
  expect(coverage.layer.bottom).toBeGreaterThanOrEqual(coverage.height - 2);
}

async function expectNoRuntimeFailures(page, failures, label) {
  await page.waitForTimeout(150);
  expect(failures, `${label} should have no uncaught errors, failed same-origin requests or HTTP errors`).toEqual([]);
}

test('production player shell is stable, complete and uses the custom genre artwork', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#songTitle')).not.toHaveText('');

  await expectAppCoversViewport(page);
  await expectNoDocumentOverflow(page);
  for (const selector of ['#searchButton', '#queueButton', '#playButton', '#browseButton', '#nonstopButton']) {
    await expectInsideViewport(page, selector);
  }

  const browse = page.locator('#browseButton');
  await expect(browse).toHaveAttribute('href', './catalogue/');
  await expect(browse).not.toHaveAttribute('aria-controls', /.+/);

  const genreButtons = page.locator('#genreStrip .genre-button[data-genre]');
  await expect(genreButtons).toHaveCount(6);
  const backgrounds = await genreButtons.evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundImage));
  for (const background of backgrounds) expect(background).toContain('.webp');
  const nonstopBackground = await page.locator('#nonstopButton').evaluate((button) => getComputedStyle(button).backgroundImage);
  expect(nonstopBackground).toContain('nonstop.webp');

  await expectNoRuntimeFailures(page, failures, 'player');
});

test('Search opens without clipping and closing restores focus to the opener', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  const searchButton = page.locator('#searchButton');
  await searchButton.click();

  const sheet = page.locator('#songSheet');
  await expect(sheet).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#searchInput')).toBeVisible();
  await expectInsideViewport(page, '#sheetClose');
  await expectNoDocumentOverflow(page);

  await page.locator('#sheetClose').click();
  await expect(sheet).toHaveAttribute('aria-hidden', 'true');
  await expect(searchButton).toBeFocused();
  await expectNoDocumentOverflow(page);
  await expectNoRuntimeFailures(page, failures, 'Search sheet');
});

test('Explore is reached through the production player link and renders real catalogue content', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  await Promise.all([
    page.waitForURL(/\/catalogue\/$/),
    page.locator('#browseButton').click(),
  ]);

  await expect(page.locator('#catalogueTitle')).toHaveText('Explore');
  const cards = page.locator('.collection-card');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(0);
  await expectInsideViewport(page, '.close-explore');
  await expectNoDocumentOverflow(page);
  await expectNoRuntimeFailures(page, failures, 'Explore');
});

test('Explore detail preserves keyboard focus when entering and returning', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/catalogue/');
  const firstCard = page.locator('.collection-card').first();
  await expect(firstCard).toBeVisible();
  await firstCard.focus();
  await firstCard.press('Enter');

  await expect(page.locator('#collectionDetail')).toBeVisible();
  await expect(page.locator('#detailTitle')).toBeFocused();
  await page.locator('#backToCollections').click();
  await expect(page.locator('#collectionHome')).toBeVisible();
  await expect(firstCard).toBeFocused();
  await expectNoDocumentOverflow(page);
  await expectNoRuntimeFailures(page, failures, 'Explore detail');
});

test('installed shell survives an offline reload after the service worker is ready', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one deterministic Chromium PWA contract is sufficient');
  const failures = collectRuntimeFailures(page);

  await page.goto('/');
  const serviceWorkerReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  expect(serviceWorkerReady).toBe(true);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#songTitle')).not.toHaveText('');
    await expectAppCoversViewport(page);
    await expectNoDocumentOverflow(page);
  } finally {
    await context.setOffline(false);
  }

  await expectNoRuntimeFailures(page, failures, 'offline PWA shell');
});
