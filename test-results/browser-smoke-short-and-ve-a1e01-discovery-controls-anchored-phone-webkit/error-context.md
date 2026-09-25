# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-smoke.spec.mjs >> short and very long song titles keep transport and discovery controls anchored
- Location: .github/browser/browser-smoke.spec.mjs:190:1

# Error details

```
Error: title-geometry player should have no uncaught errors, failed same-origin requests or HTTP errors

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "http 404: http://127.0.0.1:4173/assets/backgrounds/library/11-master-dark-courtyard.webp",
+   "console: Failed to load resource: the server responded with a status of 404 (Not Found)",
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to player" [ref=e2]:
    - /url: "#mainPlayer"
  - generic [ref=e3]:
    - banner [ref=e7]:
      - link "PlayGarba home" [ref=e8]:
        - /url: ./
        - text: PlayGarba
      - navigation "Player tools" [ref=e9]:
        - button "Search songs" [ref=e10] [cursor=pointer]
        - button "Open Up next, 9+ songs shown" [ref=e14] [cursor=pointer]
        - 'button "Garba Atmosphere: Off" [ref=e18] [cursor=pointer]'
    - main [ref=e22]:
      - region "Now playing" [ref=e23]:
        - heading "Ochhav Theme" [level=1] [ref=e24]
        - paragraph [ref=e26]: Asha Bhosle & Ashit Desai
      - region "Playback controls" [ref=e27]:
        - button "Toggle shuffle" [ref=e28] [cursor=pointer]
        - button "Previous song" [ref=e31] [cursor=pointer]
        - button "Play" [ref=e34] [cursor=pointer]
        - button "Next song" [ref=e37] [cursor=pointer]
        - button "Save Ochhav Theme to My Garba" [ref=e40] [cursor=pointer]
      - button "Tune into 24/7 Live Garba Radio" [ref=e44] [cursor=pointer]:
        - generic [ref=e48]: 24/7 LIVE
      - region "Playback progress" [ref=e49]:
        - generic [ref=e50]: 0:00
        - slider "Seek" [ref=e51] [cursor=pointer]: "0"
        - generic [ref=e52]: "--:--"
      - navigation "Genres" [ref=e53]:
        - button "Browse Nonstop Garba" [ref=e54] [cursor=pointer]:
          - generic [ref=e55]: Nonstop
        - button "Traditional" [ref=e56] [cursor=pointer]
        - button "Dandiya" [ref=e58] [cursor=pointer]
        - button "Devotional" [ref=e60] [cursor=pointer]
        - button "Folk" [ref=e62] [cursor=pointer]
        - button "Sanedo" [ref=e64] [cursor=pointer]
        - button "Fusion" [ref=e66] [cursor=pointer]
      - link "Explore PlayGarba catalogue" [ref=e69] [cursor=pointer]:
        - /url: ./explore/
        - generic [ref=e70]: Explore
      - generic "Streaming via YouTube" [ref=e73]:
        - generic [ref=e74]: Streaming via
        - generic [ref=e75]: YouTube
    - status
```

# Test source

```ts
  9   |     && startedGeneration < currentGeneration;
  10  | }
  11  |
  12  | function collectRuntimeFailures(page) {
  13  |   const failures = [];
  14  |   const requestGenerations = new WeakMap();
  15  |   let documentGeneration = 0;
  16  |   const sameOrigin = (url) => {
  17  |     try { return new URL(url).origin === SMOKE_ORIGIN; }
  18  |     catch { return false; }
  19  |   };
  20  |
  21  |   page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  22  |   page.on('console', (message) => {
  23  |     if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  24  |   });
  25  |   page.on('request', (request) => {
  26  |     if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentGeneration += 1;
  27  |     requestGenerations.set(request, documentGeneration);
  28  |   });
  29  |   page.on('requestfailed', (request) => {
  30  |     if (!sameOrigin(request.url())) return;
  31  |     const errorText = request.failure()?.errorText || '';
  32  |     const startedGeneration = requestGenerations.get(request) ?? documentGeneration;
  33  |     if (isSupersededDocumentImageAbort({
  34  |       resourceType: request.resourceType(),
  35  |       errorText,
  36  |       startedGeneration,
  37  |       currentGeneration: documentGeneration,
  38  |     })) return;
  39  |     failures.push(`requestfailed: ${request.method()} ${request.url()} ${errorText}`);
  40  |   });
  41  |   page.on('response', (response) => {
  42  |     if (sameOrigin(response.url()) && response.status() >= 400) failures.push(`http ${response.status()}: ${response.url()}`);
  43  |   });
  44  |
  45  |   return failures;
  46  | }
  47  |
  48  | function isExpectedOfflineNetworkFailure(failure) {
  49  |   if (failure.startsWith('pageerror:')) return false;
  50  |   if (failure === 'console: Failed to load resource: net::ERR_INTERNET_DISCONNECTED') return true;
  51  |   return failure.startsWith('requestfailed:') && failure.includes('net::ERR_INTERNET_DISCONNECTED');
  52  | }
  53  |
  54  | async function expectNoDocumentOverflow(page) {
  55  |   const metrics = await page.evaluate(() => ({
  56  |     viewportWidth: window.innerWidth,
  57  |     scrollWidth: document.documentElement.scrollWidth,
  58  |     bodyScrollWidth: document.body?.scrollWidth || 0,
  59  |   }));
  60  |   expect(metrics.scrollWidth, 'document should not overflow horizontally').toBeLessThanOrEqual(metrics.viewportWidth + 2);
  61  |   expect(metrics.bodyScrollWidth, 'body should not overflow horizontally').toBeLessThanOrEqual(metrics.viewportWidth + 2);
  62  | }
  63  |
  64  | async function expectInsideViewport(page, selector) {
  65  |   const locator = page.locator(selector);
  66  |   await expect(locator).toBeVisible();
  67  |   await expect.poll(async () => {
  68  |     const box = await locator.boundingBox();
  69  |     if (!box) return false;
  70  |     const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  71  |     return box.x >= -2
  72  |       && box.x + box.width <= viewport.width + 2
  73  |       && box.y >= -2
  74  |       && box.y + box.height <= viewport.height + 2;
  75  |   }, {
  76  |     message: `${selector} should settle fully inside the visual viewport`,
  77  |     timeout: 2_500,
  78  |     intervals: [50, 100, 150, 250],
  79  |   }).toBe(true);
  80  | }
  81  |
  82  | async function expectAppCoversViewport(page) {
  83  |   const coverage = await page.evaluate(() => {
  84  |     const app = document.getElementById('app')?.getBoundingClientRect();
  85  |     const layer = document.querySelector('.world-layer.is-visible')?.getBoundingClientRect();
  86  |     return {
  87  |       width: innerWidth,
  88  |       height: innerHeight,
  89  |       app: app && { left: app.left, top: app.top, right: app.right, bottom: app.bottom },
  90  |       layer: layer && { left: layer.left, top: layer.top, right: layer.right, bottom: layer.bottom },
  91  |     };
  92  |   });
  93  |
  94  |   expect(coverage.app, 'app shell should have a layout box').toBeTruthy();
  95  |   expect(coverage.layer, 'active background layer should have a layout box').toBeTruthy();
  96  |   expect(coverage.app.left).toBeLessThanOrEqual(2);
  97  |   expect(coverage.app.top).toBeLessThanOrEqual(2);
  98  |   expect(coverage.app.right).toBeGreaterThanOrEqual(coverage.width - 2);
  99  |   expect(coverage.app.bottom).toBeGreaterThanOrEqual(coverage.height - 2);
  100 |   expect(coverage.layer.left).toBeLessThanOrEqual(2);
  101 |   expect(coverage.layer.top).toBeLessThanOrEqual(2);
  102 |   expect(coverage.layer.right).toBeGreaterThanOrEqual(coverage.width - 2);
  103 |   expect(coverage.layer.bottom).toBeGreaterThanOrEqual(coverage.height - 2);
  104 | }
  105 |
  106 | async function expectNoRuntimeFailures(page, failures, label, { ignoreFailure = null } = {}) {
  107 |   await page.waitForTimeout(150);
  108 |   const unexpectedFailures = ignoreFailure ? failures.filter((failure) => !ignoreFailure(failure)) : failures;
> 109 |   expect(unexpectedFailures, `${label} should have no uncaught errors, failed same-origin requests or HTTP errors`).toEqual([]);
      |                                                                                                                     ^ Error: title-geometry player should have no uncaught errors, failed same-origin requests or HTTP errors
  110 | }
  111 |
  112 | async function expectPlayerReady(page) {
  113 |   await expect(page.locator('#app')).toBeVisible();
  114 |   await expect(page.locator('#songTitle')).not.toHaveText('', { timeout: 15_000 });
  115 |   await expect(page.locator('#genreStrip .genre-button[data-genre-bound="true"]').first()).toBeVisible({ timeout: 15_000 });
  116 | }
  117 |
  118 | async function measureTitleGeometry(page, title) {
  119 |   return page.evaluate((nextTitle) => {
  120 |     const trackBlock = document.querySelector('.track-block');
  121 |     const songTitle = document.getElementById('songTitle');
  122 |     if (!(trackBlock instanceof HTMLElement) || !(songTitle instanceof HTMLElement)) {
  123 |       throw new Error('Player title geometry target is missing');
  124 |     }
  125 |
  126 |     songTitle.textContent = nextTitle;
  127 |     const titleLength = [...nextTitle].length;
  128 |     trackBlock.classList.toggle('is-long-title', titleLength > 28);
  129 |     trackBlock.classList.toggle('is-very-long-title', titleLength > 44);
  130 |
  131 |     const anchors = {};
  132 |     for (const id of ['playButton', 'progress', 'genreStrip', 'browseButton']) {
  133 |       const rect = document.getElementById(id)?.getBoundingClientRect();
  134 |       anchors[id] = rect ? { top: rect.top, centerY: rect.top + rect.height / 2 } : null;
  135 |     }
  136 |
  137 |     return {
  138 |       title: songTitle.textContent,
  139 |       viewportWidth: window.innerWidth,
  140 |       scrollWidth: document.documentElement.scrollWidth,
  141 |       bodyScrollWidth: document.body?.scrollWidth || 0,
  142 |       anchors,
  143 |     };
  144 |   }, title);
  145 | }
  146 |
  147 | function expectTitleGeometryNoOverflow(metrics, label) {
  148 |   expect(metrics.scrollWidth, `${label} should not overflow the document horizontally`).toBeLessThanOrEqual(metrics.viewportWidth + 2);
  149 |   expect(metrics.bodyScrollWidth, `${label} should not overflow the body horizontally`).toBeLessThanOrEqual(metrics.viewportWidth + 2);
  150 | }
  151 |
  152 | function expectStablePlayerAnchors(longTitleAnchors, shortTitleAnchors) {
  153 |   for (const id of ['playButton', 'progress', 'genreStrip', 'browseButton']) {
  154 |     expect(longTitleAnchors[id], `${id} should exist for the long title`).toBeTruthy();
  155 |     expect(shortTitleAnchors[id], `${id} should exist for the short title`).toBeTruthy();
  156 |     const centerDelta = Math.abs(longTitleAnchors[id].centerY - shortTitleAnchors[id].centerY);
  157 |     expect(centerDelta, `${id} should not jump vertically when song-title length changes`).toBeLessThanOrEqual(3);
  158 |   }
  159 | }
  160 |
  161 | test('production player shell is stable, complete and uses the custom genre artwork', async ({ page }) => {
  162 |   const failures = collectRuntimeFailures(page);
  163 |   await page.goto('/', { waitUntil: 'domcontentloaded' });
  164 |   await expectPlayerReady(page);
  165 |
  166 |   await expectAppCoversViewport(page);
  167 |   await expectNoDocumentOverflow(page);
  168 |   for (const selector of ['#searchButton', '#queueButton', '#playButton', '#browseButton']) {
  169 |     await expectInsideViewport(page, selector);
  170 |   }
  171 |
  172 |   const browse = page.locator('#browseButton');
  173 |   await expect(browse).toHaveAttribute('href', './explore/');
  174 |   await expect(browse).not.toHaveAttribute('aria-controls', /.+/);
  175 |
  176 |   const genreButtons = page.locator('#genreStrip .genre-button[data-genre]');
  177 |   await expect(genreButtons).toHaveCount(6);
  178 |   const backgrounds = await genreButtons.evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundImage));
  179 |   for (const background of backgrounds) expect(background).toContain('.webp');
  180 |
  181 |   const nonstopButton = page.locator('#nonstopButton');
  182 |   await nonstopButton.scrollIntoViewIfNeeded();
  183 |   await expectInsideViewport(page, '#nonstopButton');
  184 |   const nonstopBackground = await nonstopButton.evaluate((button) => getComputedStyle(button).backgroundImage);
  185 |   expect(nonstopBackground).toContain('nonstop.webp');
  186 |
  187 |   await expectNoRuntimeFailures(page, failures, 'player');
  188 | });
  189 |
  190 | test('short and very long song titles keep transport and discovery controls anchored', async ({ page }) => {
  191 |   const failures = collectRuntimeFailures(page);
  192 |   await page.goto('/', { waitUntil: 'domcontentloaded' });
  193 |   await expectPlayerReady(page);
  194 |
  195 |   const longTitle = 'Non Stop Bollywood Dandiya Garbe Ki Raat Hai 2014';
  196 |   const shortTitle = 'Ochhav Theme';
  197 |
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
```