import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const appRoot = path.join(root, 'src/pga/app');
const browserMode = process.argv.includes('--browser');

const requiredFiles = [
  'index.html',
  'app.css',
  'app.js',
  'sw.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

function read(relativePath, encoding = 'utf8') {
  return fs.readFileSync(path.join(appRoot, relativePath), encoding);
}

function assertPng(relativePath, expectedWidth, expectedHeight) {
  const data = read(relativePath, null);
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${relativePath} must be PNG`);
  assert.equal(data.readUInt32BE(16), expectedWidth, `${relativePath} width`);
  assert.equal(data.readUInt32BE(20), expectedHeight, `${relativePath} height`);
}

function validateStaticContract() {
  for (const relativePath of requiredFiles) {
    const absolute = path.join(appRoot, relativePath);
    assert.ok(fs.existsSync(absolute), `missing ${relativePath}`);
    assert.ok(fs.statSync(absolute).size > 0, `empty ${relativePath}`);
  }

  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name, 'PlayGarba Admin');
  assert.equal(manifest.short_name, 'PGA');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color.toLowerCase(), '#151412');
  assert.equal(manifest.background_color.toLowerCase(), '#151412');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');

  const iconKeys = new Set(manifest.icons.map((icon) => `${icon.sizes}:${icon.purpose || 'any'}`));
  assert.ok(iconKeys.has('192x192:any'), 'manifest needs 192 regular icon');
  assert.ok(iconKeys.has('512x512:any'), 'manifest needs 512 regular icon');
  assert.ok(iconKeys.has('192x192:maskable'), 'manifest needs 192 maskable icon');
  assert.ok(iconKeys.has('512x512:maskable'), 'manifest needs 512 maskable icon');

  assertPng('icons/icon-192.png', 192, 192);
  assertPng('icons/icon-512.png', 512, 512);
  assertPng('icons/maskable-192.png', 192, 192);
  assertPng('icons/maskable-512.png', 512, 512);
  assertPng('icons/apple-touch-icon.png', 180, 180);

  const html = read('index.html');
  assert.match(html, /<meta name="robots" content="noindex,nofollow,noarchive">/, 'PGA shell must stay out of public indexing');
  assert.match(html, /class="skip-link" href="#main"/, 'keyboard skip link missing');
  assert.match(html, /<main id="main" tabindex="-1">/, 'focusable main landmark missing');
  assert.match(html, /aria-label="Primary"/, 'primary navigation landmark missing');
  assert.match(html, /No data yet/, 'truthful no-data state missing');
  assert.match(html, /Unknown is never converted to zero or healthy\./, 'unknown-state truth rule missing');
  assert.doesNotMatch(html, /BookPhysio|physiotherap/i, 'PGA shell must not inherit BookPhysio copy');

  const navValues = [...html.matchAll(/data-nav="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(navValues)].sort(), ['audience', 'health', 'home', 'listening', 'more'], 'PGA must expose exactly five primary destinations');

  const css = read('app.css');
  assert.match(css, /env\(safe-area-inset-top/, 'top safe area missing');
  assert.match(css, /env\(safe-area-inset-bottom/, 'bottom safe area missing');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'reduced-motion support missing');
  assert.match(css, /@media \(prefers-contrast: more\)/, 'increased-contrast support missing');
  assert.match(css, /@media \(forced-colors: active\)/, 'forced-colors support missing');
  assert.match(css, /@media \(min-width: 980px\)/, 'desktop adaptation missing');
  assert.doesNotMatch(css, /transition\s*:\s*all\b/, 'transition: all is prohibited');

  const js = read('app.js');
  for (const state of ['loading', 'offline', 'stale', 'error', 'auth-expired']) {
    assert.ok(js.includes(`${state}:`) || js.includes(`'${state}':`), `boundary state ${state} missing`);
  }
  assert.match(js, /heading\.focus\(\{ preventScroll: true \}\)/, 'navigation must move focus to the new view heading');
  assert.match(js, /location\.hostname === 'localhost'/, 'test fixture API must be localhost-only');

  const sw = read('sw.js');
  assert.match(sw, /const CACHE_PREFIX = 'pga-shell-'/, 'PGA needs a separate cache namespace');
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/, 'private API exclusion missing');
  assert.match(sw, /accept\.includes\('application\/json'\)/, 'JSON private-data cache exclusion missing');
  assert.doesNotMatch(sw, /skipWaiting\s*\(/, 'PGA install must not force-update active sessions');

  console.log('✓ PGA static shell contract');
}

async function validateBrowserContract() {
  const { chromium, webkit } = await import('@playwright/test');
  const baseUrl = process.env.PGA_BASE_URL || 'http://127.0.0.1:4174';
  const fixtureOrigin = new URL(baseUrl).origin;
  const protectedAggregatePaths = new Set(['/api/audience', '/api/listening']);
  const unavailableAggregate = JSON.stringify({
    status: 'unavailable',
    generatedAt: null,
    dataThrough: null,
    data: null,
  });
  const engines = [
    ['chromium', chromium],
    ['webkit', webkit],
  ];
  const viewports = [
    ['iphone-portrait', { width: 390, height: 844 }],
    ['android-portrait', { width: 412, height: 915 }],
    ['tablet', { width: 1024, height: 768 }],
    ['desktop', { width: 1440, height: 900 }],
  ];

  for (const [engineName, engine] of engines) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const [viewportName, viewport] of viewports) {
        // This shell-only fixture mocks protected aggregates at the page layer.
        // Block service workers so WebKit cannot bypass those deterministic mocks;
        // real PGA service-worker behavior remains covered by the PWA contract checks.
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
        const page = await context.newPage();
        const failures = [];

        await page.route('**/api/**', async (route) => {
          const url = new URL(route.request().url());
          if (url.origin !== fixtureOrigin || !protectedAggregatePaths.has(url.pathname)) {
            await route.continue();
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'cache-control': 'no-store' },
            body: unavailableAggregate,
          });
        });

        page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
        page.on('response', (response) => {
          if (response.url().startsWith(baseUrl) && response.status() >= 400) failures.push(`http ${response.status()}: ${response.url()}`);
        });

        await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-view="home"]:not([hidden])');
        const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.ok(dimensions.scrollWidth <= dimensions.width, `${engineName}/${viewportName} has horizontal overflow: ${dimensions.scrollWidth} > ${dimensions.width}`);

        const navRoot = viewport.width >= 980 ? '.side-nav' : '.bottom-nav';
        for (const view of ['audience', 'listening', 'health', 'more', 'home']) {
          await page.locator(`${navRoot} [data-nav="${view}"]`).click();
          const section = page.locator(`[data-view="${view}"]`);
          await section.waitFor({ state: 'visible' });
          assert.equal(await section.getAttribute('hidden'), null, `${engineName}/${viewportName}/${view} stayed hidden`);
          const focusedHeading = await page.evaluate(() => document.activeElement?.tagName === 'H1' ? document.activeElement.textContent : null);
          assert.ok(focusedHeading, `${engineName}/${viewportName}/${view} did not focus its heading`);
        }

        await page.evaluate(() => window.PGA_TEST.setBoundary('auth-expired'));
        await page.waitForSelector('#boundary:not([hidden])');
        assert.match(await page.locator('#boundaryTitle').textContent(), /Access expired/);

        await context.setOffline(true);
        await page.evaluate(() => window.dispatchEvent(new Event('offline')));
        assert.match(await page.locator('#boundaryTitle').textContent(), /Offline/);
        await context.setOffline(false);

        assert.deepEqual(failures, [], `${engineName}/${viewportName} emitted runtime failures`);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }

  console.log('✓ PGA Chromium/WebKit responsive shell contract');
}

validateStaticContract();
if (browserMode) await validateBrowserContract();
