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

async function expectNoRuntimeFailures(page, failures, label) {
  await page.waitForTimeout(120);
  expect(failures, `${label} should have no uncaught errors or failed same-origin requests`).toEqual([]);
}

async function expectNoDocumentOverflow(page) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    rootWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body?.scrollWidth || 0,
  }));
  expect(metrics.rootWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
}

async function expectInsideViewport(page, selector) {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  await expect.poll(async () => {
    const box = await locator.boundingBox();
    if (!box) return false;
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    return box.x >= -2 && box.y >= -2
      && box.x + box.width <= viewport.width + 2
      && box.y + box.height <= viewport.height + 2;
  }, { timeout: 2500 }).toBe(true);
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
  expect(coverage.app).toBeTruthy();
  expect(coverage.layer).toBeTruthy();
  for (const box of [coverage.app, coverage.layer]) {
    expect(box.left).toBeLessThanOrEqual(2);
    expect(box.top).toBeLessThanOrEqual(2);
    expect(box.right).toBeGreaterThanOrEqual(coverage.width - 2);
    expect(box.bottom).toBeGreaterThanOrEqual(coverage.height - 2);
  }
}

async function playerAnchors(page) {
  return page.evaluate(() => Object.fromEntries(
    ['playButton', 'progress', 'genreStrip', 'browseButton'].map((id) => {
      const rect = document.getElementById(id)?.getBoundingClientRect();
      return [id, rect ? rect.top + rect.height / 2 : null];
    }),
  ));
}

async function findSong(page, predicateSource) {
  return page.evaluate(async (source) => {
    const predicate = new Function('song', `return (${source})(song);`);
    const response = await fetch('data/songs.json', { cache: 'no-store' });
    const songs = await response.json();
    const song = songs.find(predicate);
    return song ? { id: song.id, title: song.title, artist: song.artist } : null;
  }, predicateSource);
}

test('player shell is stable, complete and responsive', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#songTitle')).not.toHaveText('');
  await expectAppCoversViewport(page);
  await expectNoDocumentOverflow(page);

  for (const selector of ['#searchButton', '#queueButton', '#playButton', '#browseButton']) {
    await expectInsideViewport(page, selector);
  }

  const browse = page.locator('#browseButton');
  await expect(browse).toHaveAttribute('href', './catalogue/');
  await expect(browse).not.toHaveAttribute('aria-controls', /.+/);

  const genres = page.locator('#genreStrip .genre-button[data-genre]');
  await expect(genres).toHaveCount(6);
  const genreBackgrounds = await genres.evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundImage));
  genreBackgrounds.forEach((background) => expect(background).toContain('.webp'));

  await page.locator('#nonstopButton').scrollIntoViewIfNeeded();
  await expectInsideViewport(page, '#nonstopButton');
  expect(await page.locator('#nonstopButton').evaluate((button) => getComputedStyle(button).backgroundImage)).toContain('nonstop.webp');
  await expectNoRuntimeFailures(page, failures, 'player shell');
});

test('song-title length cannot move the transport stack', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  await expect(page.locator('#songTitle')).not.toHaveText('');

  await page.locator('#songTitle').evaluate((node) => { node.textContent = 'A Very Long Gujarati Garba Song Title That Must Never Push Transport Controls Around'; });
  await page.waitForTimeout(100);
  const longAnchors = await playerAnchors(page);
  await expectNoDocumentOverflow(page);

  await page.locator('#songTitle').evaluate((node) => { node.textContent = 'Garba'; });
  await page.waitForTimeout(100);
  const shortAnchors = await playerAnchors(page);
  await expectNoDocumentOverflow(page);

  for (const id of Object.keys(longAnchors)) {
    expect(longAnchors[id]).not.toBeNull();
    expect(shortAnchors[id]).not.toBeNull();
    expect(Math.abs(longAnchors[id] - shortAnchors[id]), `${id} moved after title-length change`).toBeLessThanOrEqual(3);
  }
  await expectNoRuntimeFailures(page, failures, 'title stability');
});

test('Search opens without clipping and restores focus', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  const opener = page.locator('#searchButton');
  await opener.click();
  await expect(page.locator('#songSheet')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#searchInput')).toBeVisible();
  await expectInsideViewport(page, '#sheetClose');
  await expectNoDocumentOverflow(page);
  await page.locator('#sheetClose').click();
  await expect(page.locator('#songSheet')).toHaveAttribute('aria-hidden', 'true');
  await expect(opener).toBeFocused();
  await expectNoRuntimeFailures(page, failures, 'Search');
});

test('Nonstop browser is usable and restores focus on close', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  const opener = page.locator('#nonstopButton');
  await opener.scrollIntoViewIfNeeded();
  await opener.click();
  const panel = page.locator('#nonstopBrowser');
  await expect(panel).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#nonstopBrowserSearch')).toBeVisible();
  await expectInsideViewport(page, '#nonstopBrowserClose');
  await expect(page.locator('#nonstopBrowserList .nonstop-set').first()).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.locator('#nonstopBrowserClose').click();
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
  await expect(opener).toBeFocused();
  await expectNoRuntimeFailures(page, failures, 'Nonstop');
});

test('Explore opens real catalogue content and keyboard return restores focus', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  await Promise.all([
    page.waitForURL(/\/catalogue\/$/),
    page.locator('#browseButton').click(),
  ]);
  await expect(page.locator('#catalogueTitle')).toHaveText('Explore');
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
  await expectNoRuntimeFailures(page, failures, 'Explore');
});

test('provider evidence remains non-executable under YouTube-only playback', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  const pending = await findSong(page, `(song) => song.playbackSearchOnly && song.playbackSourceType === 'youtube-migration-pending'`);
  expect(pending, 'fixture should contain at least one YouTube migration-pending song').toBeTruthy();

  await page.goto(`/?song=${encodeURIComponent(pending.id)}`);
  await expect(page.locator('#songTitle')).toHaveText(pending.title);
  const youtubeButton = page.locator('#youtubeVideoButton');
  await expect(youtubeButton).toHaveClass(/is-unavailable/);
  await expect(youtubeButton).toHaveAttribute('aria-label', /not mapped/i);

  let popupOpened = false;
  page.on('popup', () => { popupOpened = true; });
  await page.locator('#playButton').click();
  await expect(page.locator('#toast')).toContainText('YouTube source not mapped yet');
  expect(popupOpened).toBe(false);
  await expect(page.locator('#youtubeStage')).toHaveCount(0);
  await expectNoRuntimeFailures(page, failures, 'YouTube migration gate');
});

test('verified YouTube songs use an explicit visible player dock', async ({ page }) => {
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  const exact = await findSong(page, `(song) => !song.playbackSearchOnly && song.playbackProvider === 'youtube' && Boolean(song.youtubeId || String(song.playbackSourceUrl || '').includes('youtu'))`);
  expect(exact, 'fixture should contain an exact YouTube song').toBeTruthy();

  await page.goto(`/?song=${encodeURIComponent(exact.id)}`);
  await expect(page.locator('#songTitle')).toHaveText(exact.title);
  const youtubeButton = page.locator('#youtubeVideoButton');
  await expect(youtubeButton).not.toHaveClass(/is-unavailable/);

  await page.locator('#playButton').click();
  await expect(page.locator('#toast')).toContainText('Tap the YouTube button');

  await page.evaluate(() => {
    let stage = document.getElementById('youtubeStage');
    if (!stage) {
      stage = document.createElement('section');
      stage.id = 'youtubeStage';
      stage.className = 'provider-dock is-youtube-release youtube-dock';
      stage.setAttribute('aria-hidden', 'true');
      document.body.append(stage);
    }
    window.GARBA_YOUTUBE_PLAYER = {
      open: async () => {
        stage.classList.add('open');
        stage.setAttribute('aria-hidden', 'false');
        return true;
      },
      close: () => {
        stage.classList.remove('open');
        stage.setAttribute('aria-hidden', 'true');
      },
    };
  });

  await youtubeButton.click();
  const stage = page.locator('#youtubeStage');
  await expect(stage).toHaveAttribute('aria-hidden', 'false');
  await expect(stage).toHaveClass(/open/);
  const box = await stage.boundingBox();
  expect(box).toBeTruthy();
  expect(box.width, 'visible YouTube player dock must be at least 200px wide').toBeGreaterThanOrEqual(200);
  expect(box.height, 'visible YouTube player dock must be at least 200px tall').toBeGreaterThanOrEqual(200);

  await youtubeButton.click();
  await expect(stage).toHaveAttribute('aria-hidden', 'true');
  await expectNoRuntimeFailures(page, failures, 'YouTube dock');
});

test('installed shell survives an offline reload', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one deterministic Chromium PWA contract is sufficient');
  const failures = collectRuntimeFailures(page);
  await page.goto('/');
  const ready = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  expect(ready).toBe(true);

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
