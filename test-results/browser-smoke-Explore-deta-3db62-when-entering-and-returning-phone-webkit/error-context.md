# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-smoke.spec.mjs >> Explore detail preserves keyboard focus when entering and returning
- Location: .github/browser/browser-smoke.spec.mjs:294:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.collection-card').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.collection-card').first() with timeout 8000ms
  - waiting for locator('.collection-card').first()

```

# Test source

```ts
  198 |   const longTitleGeometry = await measureTitleGeometry(page, longTitle);
  199 |   expect(longTitleGeometry.title).toBe(longTitle);
  200 |   expectTitleGeometryNoOverflow(longTitleGeometry, 'very-long title state');
  201 |
  202 |   const shortTitleGeometry = await measureTitleGeometry(page, shortTitle);
  203 |   expect(shortTitleGeometry.title).toBe(shortTitle);
  204 |   expectTitleGeometryNoOverflow(shortTitleGeometry, 'short title state');
  205 |
  206 |   expectStablePlayerAnchors(longTitleGeometry.anchors, shortTitleGeometry.anchors);
  207 |   await expectNoRuntimeFailures(page, failures, 'title-geometry player');
  208 | });
  209 |
  210 | test('Search opens without clipping and closing restores focus to the opener', async ({ page }) => {
  211 |   const failures = collectRuntimeFailures(page);
  212 |   await page.goto('/', { waitUntil: 'domcontentloaded' });
  213 |   await expectPlayerReady(page);
  214 |   const searchButton = page.locator('#searchButton');
  215 |   await searchButton.click();
  216 |
  217 |   const sheet = page.locator('#songSheet');
  218 |   await expect(sheet).toHaveAttribute('aria-hidden', 'false');
  219 |   await expect(page.locator('#searchInput')).toBeVisible();
  220 |   await expectInsideViewport(page, '#sheetClose');
  221 |   await expectNoDocumentOverflow(page);
  222 |
  223 |   await page.locator('#sheetClose').click();
  224 |   await expect(sheet).toHaveAttribute('aria-hidden', 'true');
  225 |   await expect(searchButton).toBeFocused();
  226 |   await expectNoDocumentOverflow(page);
  227 |   await expectNoRuntimeFailures(page, failures, 'Search sheet');
  228 | });
  229 |
  230 | test('Nonstop browser is reachable, keyboard-safe, populated and restores focus when closed', async ({ page }) => {
  231 |   const failures = collectRuntimeFailures(page);
  232 |   await page.goto('/', { waitUntil: 'domcontentloaded' });
  233 |   await expectPlayerReady(page);
  234 |
  235 |   const nonstopButton = page.locator('#nonstopButton');
  236 |   await nonstopButton.scrollIntoViewIfNeeded();
  237 |   await expectInsideViewport(page, '#nonstopButton');
  238 |   await nonstopButton.click();
  239 |
  240 |   const panel = page.locator('#nonstopBrowser');
  241 |   const search = page.locator('#nonstopBrowserSearch');
  242 |   await expect(panel).toHaveAttribute('aria-hidden', 'false');
  243 |   await expect(panel).toBeFocused();
  244 |   await expect(search).toBeVisible();
  245 |   await expect(search).toHaveAttribute('aria-label', 'Search Nonstop Garba');
  246 |   await panel.press('Tab');
  247 |   await expect(search).toBeFocused();
  248 |   await expectInsideViewport(page, '#nonstopBrowserClose');
  249 |
  250 |   const sets = page.locator('#nonstopBrowserList .nonstop-set');
  251 |   const firstSet = sets.first();
  252 |   await expect(firstSet).toBeVisible();
  253 |   expect(await sets.count()).toBeGreaterThan(0);
  254 |   await expect(firstSet.locator('.nonstop-set-title')).toHaveText(/\S/);
  255 |   await expect(firstSet.locator('.nonstop-set-meta')).toHaveText(/\S/);
  256 |   await expect(firstSet).toHaveAttribute('aria-label', /^(?:Currently playing|Play),\s+\S/);
  257 |
  258 |   const duration = firstSet.locator('.nonstop-set-duration');
  259 |   await expect(duration).toBeVisible();
  260 |   await expect(duration).toHaveAttribute('aria-hidden', 'true');
  261 |   const durationText = (await duration.textContent() || '').trim();
  262 |   if (durationText) expect(durationText).toMatch(/^(?:\d+:\d{2}|\d+:\d{2}:\d{2})$/);
  263 |
  264 |   await expect(firstSet.locator('.nonstop-set-recording, .nonstop-set-badge')).toHaveCount(0);
  265 |   await expect(page.locator('#nonstopBrowserSummary')).toHaveCount(0);
  266 |   await expectNoDocumentOverflow(page);
  267 |
  268 |   await page.locator('#nonstopBrowserClose').click();
  269 |   await expect(panel).toHaveAttribute('aria-hidden', 'true');
  270 |   await expect(nonstopButton).toBeFocused();
  271 |   await expectNoDocumentOverflow(page);
  272 |   await expectNoRuntimeFailures(page, failures, 'Nonstop browser');
  273 | });
  274 |
  275 | test('Explore is reached through the production player link and renders real catalogue content', async ({ page }) => {
  276 |   const failures = collectRuntimeFailures(page);
  277 |   await page.goto('/', { waitUntil: 'domcontentloaded' });
  278 |   await expectPlayerReady(page);
  279 |   // Navigation commit establishes the document boundary; visible Explore UI establishes readiness.
  280 |   await Promise.all([
  281 |     page.waitForURL(/\/explore\/$/, { waitUntil: 'commit' }),
  282 |     page.locator('#browseButton').click(),
  283 |   ]);
  284 |
  285 |   await expect(page.locator('#catalogueTitle')).toHaveText('Explore');
  286 |   const cards = page.locator('.collection-card');
  287 |   await expect(cards.first()).toBeVisible();
  288 |   expect(await cards.count()).toBeGreaterThan(0);
  289 |   await expectInsideViewport(page, '.close-explore');
  290 |   await expectNoDocumentOverflow(page);
  291 |   await expectNoRuntimeFailures(page, failures, 'Explore');
  292 | });
  293 |
  294 | test('Explore detail preserves keyboard focus when entering and returning', async ({ page }) => {
  295 |   const failures = collectRuntimeFailures(page);
  296 |   await page.goto('/explore/', { waitUntil: 'commit' });
  297 |   const firstCard = page.locator('.collection-card').first();
> 298 |   await expect(firstCard).toBeVisible();
      |                           ^ Error: expect(locator).toBeVisible() failed
  299 |   await firstCard.focus();
  300 |   await firstCard.press('Enter');
  301 |
  302 |   await expect(page.locator('#collectionDetail')).toBeVisible();
  303 |   await expect(page.locator('#detailTitle')).toBeFocused();
  304 |   await page.locator('#backToCollections').click();
  305 |   await expect(page.locator('#collectionHome')).toBeVisible();
  306 |   await expect(firstCard).toBeFocused();
  307 |   await expectNoDocumentOverflow(page);
  308 |   await expectNoRuntimeFailures(page, failures, 'Explore detail');
  309 | });
  310 |
  311 | test('active-document same-origin image request failures remain blocking', async ({ page }, testInfo) => {
  312 |   test.skip(testInfo.project.name !== 'desktop-chromium', 'one deterministic Chromium classifier regression is sufficient');
  313 |   const failures = collectRuntimeFailures(page);
  314 |   const probeUrl = `${SMOKE_ORIGIN}/__browser-smoke/active-document-image.webp`;
  315 |
  316 |   expect(isSupersededDocumentImageAbort({
  317 |     resourceType: 'image',
  318 |     errorText: 'net::ERR_ABORTED',
  319 |     startedGeneration: 1,
  320 |     currentGeneration: 2,
  321 |   })).toBe(true);
  322 |   expect(isSupersededDocumentImageAbort({
  323 |     resourceType: 'image',
  324 |     errorText: 'net::ERR_ABORTED',
  325 |     startedGeneration: 2,
  326 |     currentGeneration: 2,
  327 |   })).toBe(false);
  328 |   expect(isSupersededDocumentImageAbort({
  329 |     resourceType: 'script',
  330 |     errorText: 'net::ERR_ABORTED',
  331 |     startedGeneration: 1,
  332 |     currentGeneration: 2,
  333 |   })).toBe(false);
  334 |
  335 |   await page.route(probeUrl, (route) => route.abort('failed'));
  336 |   await page.goto('/', { waitUntil: 'domcontentloaded' });
  337 |   await expectPlayerReady(page);
  338 |   await page.evaluate((url) => new Promise((resolve) => {
  339 |     const image = new Image();
  340 |     image.onload = image.onerror = resolve;
  341 |     image.src = url;
  342 |   }), probeUrl);
  343 |
  344 |   await expect.poll(() => failures.some((failure) => failure.startsWith('requestfailed: GET') && failure.includes('/__browser-smoke/active-document-image.webp'))).toBe(true);
  345 | });
  346 |
  347 | test('installed shell survives an offline reload after the service worker is ready', async ({ page, context }, testInfo) => {
  348 |   test.skip(testInfo.project.name !== 'desktop-chromium', 'one deterministic Chromium PWA contract is sufficient');
  349 |   const failures = collectRuntimeFailures(page);
  350 |
  351 |   await page.goto('/', { waitUntil: 'domcontentloaded' });
  352 |   await expectPlayerReady(page);
  353 |   const serviceWorkerReady = await page.evaluate(async () => {
  354 |     if (!('serviceWorker' in navigator)) return false;
  355 |     await navigator.serviceWorker.ready;
  356 |     return true;
  357 |   });
  358 |   expect(serviceWorkerReady).toBe(true);
  359 |
  360 |   await context.setOffline(true);
  361 |   try {
  362 |     await page.reload({ waitUntil: 'domcontentloaded' });
  363 |     await expectPlayerReady(page);
  364 |     await expectAppCoversViewport(page);
  365 |     await expectNoDocumentOverflow(page);
  366 |   } finally {
  367 |     await context.setOffline(false);
  368 |   }
  369 |
  370 |   await expectNoRuntimeFailures(page, failures, 'offline PWA shell', { ignoreFailure: isExpectedOfflineNetworkFailure });
  371 | });
  372 |
```