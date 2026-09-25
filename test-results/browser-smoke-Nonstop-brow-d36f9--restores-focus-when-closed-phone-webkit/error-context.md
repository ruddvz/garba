# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-smoke.spec.mjs >> Nonstop browser is reachable, keyboard-safe, populated and restores focus when closed
- Location: .github/browser/browser-smoke.spec.mjs:230:1

# Error details

```
Error: Nonstop browser should have no uncaught errors, failed same-origin requests or HTTP errors

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
- generic [ref=e1]:
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
        - heading "Jivan Ji" [level=1] [ref=e24]
        - paragraph [ref=e26]: Kirtidan Gadhvi
      - region "Playback controls" [ref=e27]:
        - button "Toggle shuffle" [ref=e28] [cursor=pointer]
        - button "Previous song" [ref=e31] [cursor=pointer]
        - button "Play" [ref=e34] [cursor=pointer]
        - button "Next song" [ref=e37] [cursor=pointer]
        - button "Save Jivan Ji to My Garba" [ref=e40] [cursor=pointer]
      - button "Tune into 24/7 Live Garba Radio" [ref=e44] [cursor=pointer]:
        - generic [ref=e48]: 24/7 LIVE
      - region "Playback progress" [ref=e49]:
        - generic [ref=e50]: 0:00
        - slider "Seek" [ref=e51] [cursor=pointer]: "0"
        - generic [ref=e52]: "--:--"
      - navigation "Genres" [ref=e53]:
        - button "Browse Nonstop Garba" [active] [ref=e54] [cursor=pointer]:
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
  - dialog [aria-hidden]:
    - banner:
      - heading [level=2]: Nonstop Garba
      - searchbox
      - button: ×
    - navigation:
      - button [pressed]: All 72
      - button: Ramzat 11
      - button: Rangtaali 4
      - button: Taal 4
      - button: Tahukar 11
      - button: Shakti 5
      - button: Traditional 57
      - button: Dandiya / Raas 21
      - button: Devotional 38
      - button: Folk / Lok 12
      - button: Sanedo 2
      - button: Fusion 9
      - button: Live 2
      - button: More 5
    - generic:
      - button:
        - generic:
          - generic: Navrangi 2.0 - Nonstop Navratri Garba 2025
          - generic: Kinjal Dave · 2025
        - generic [aria-hidden]: 38:36
      - button:
        - generic:
          - generic: Navratri 3.0 - Non Stop Garba
          - generic: Alpa Patel · 2025
        - generic [aria-hidden]: 39:46
      - button:
        - generic:
          - generic: Nortani Raat | Nonstop Garba
          - generic: Kirtidan Gadhvi · Anita Pandit · 2025
        - generic [aria-hidden]: 33:10
      - button:
        - generic:
          - generic: Rangili Ramzat 6 (2 Taali Garba)
          - generic: Gaman Santhal · Kajal Maheriya · Kirtidan Gadhvi · 2025
        - generic [aria-hidden]: 1:08:55
      - button:
        - generic:
          - generic: Rangili Ramzat 7 | 2 Taali Garba
          - generic: Kirtidan Gadhvi · Kajal Maheriya · Dharmesh Barot · Rashmita Rabari · 2025
        - generic [aria-hidden]: 1:01:34
      - button:
        - generic:
          - generic: Rangili Ramzat 8 | 2 Taali Garba
          - generic: Umesh Barot · Osman Mir · Kirtidan Gadhvi · Rashmita Rabari · 2025
        - generic [aria-hidden]: 51:14
      - button:
        - generic:
          - generic: Rankar - Navratri 2025 Nonstop Garba
          - generic: Dhara Shah · 2025
        - generic [aria-hidden]: 35:54
      - button:
        - generic:
          - generic: Taal 4.0 | Nonstop Garba 2025
          - generic: Geeta Rabari · 2025
        - generic [aria-hidden]: 53:58
      - button:
        - generic:
          - generic: Rutvi Ni Ramzat 3.0 (NonStop Garba)
          - generic: Rutvi Pandya · 2024
        - generic [aria-hidden]: 38:46
      - button:
        - generic:
          - generic: Tahukar 11 | Nonstop Garba
          - generic: Kirtidan Gadhvi · 2024
      - button:
        - generic:
          - generic: Zankaar 3.0 | Nonstop Garba
          - generic: Geeta Rabari · 2024
        - generic [aria-hidden]: 1:03:04
      - button:
        - generic:
          - generic: Aadhyashakti | Nonstop Garba
          - generic: Kaushal Pithadiya · 2023
        - generic [aria-hidden]: 28:58
      - button:
        - generic:
          - generic: Garbe Ghoome | Non Stop Garba 2023
          - generic: Parth Oza · Maulik Mehta · 2023
      - button:
        - generic:
          - generic: Ochhav | Non-Stop Gujarati Garba & Lok Geet 2023
          - generic: Aditya Gadhvi · 2023
        - generic [aria-hidden]: 47:12
      - button:
        - generic:
          - generic: Raas Utsav - Special Nonstop Garba 2023
          - generic: Rajesh Ahir · Sabhiben Ahir · 2023
        - generic [aria-hidden]: 31:45
      - button:
        - generic:
          - generic: Shakti 3.23 - Non Stop Garba
          - generic: Aishwarya Majmudar · 2023
      - button:
        - generic:
          - generic: Taal 3.0 | Navratri Nonstop Garba 2023
          - generic: Geeta Rabari · 2023
        - generic [aria-hidden]: 47:48
      - button:
        - generic:
          - generic: Zankaar 2.0 | Nonstop Garba
          - generic: Geeta Rabari · 2023
      - button:
        - generic:
          - generic: Rutvi Ni Ramzat | Non-Stop Garba 2022
          - generic: Rutvi Pandya · 2022
        - generic [aria-hidden]: 37:54
      - button:
        - generic:
          - generic: Taal 2.0 - Non Stop Garba
          - generic: Geeta Rabari · 2022
        - generic [aria-hidden]: 52:40
      - button:
        - generic:
          - generic: Tahukar 10 | NonStop Garba
          - generic: Kirtidan Gadhvi · 2022
        - generic [aria-hidden]: 29:05
      - button:
        - generic:
          - generic: Koyaldi 1.0 | Nonstop Garba
          - generic: Kairavi Buch · 2021
        - generic [aria-hidden]: 29:37
      - button:
        - generic:
          - generic: Rangrasiya Nonstop Raas, Vol.1
          - generic: Atul Purohit · Jigna Dashputre · 2021
        - generic [aria-hidden]: 42:59
      - button:
        - generic:
          - generic: Taal - Non Stop Garba
          - generic: Geeta Rabari · 2021
        - generic [aria-hidden]: 51:56
      - button:
        - generic:
          - generic: Tahukar 9 | NonStop Garba
          - generic: Kirtidan Gadhvi · 2021
        - generic [aria-hidden]: 28:12
      - button:
        - generic:
          - generic: Tahukar 8 - Nonstop Garba
          - generic: Kirtidan Gadhvi · Nisha Barot · 2020
      - button:
        - generic:
          - generic: Tahukar 7 - Nonstop Garba
          - generic: Kirtidan Gadhvi · 2019
        - generic [aria-hidden]: 44:11
      - button:
        - generic:
          - generic: Shakti - Non Stop Garba
          - generic: Aishwarya Majmudar · Himanshu Chauhan · 2018
        - generic [aria-hidden]: 1:08:51
      - button:
        - generic:
          - generic: Araj | Nonstop Garba 2025
          - generic: Rishikesh Gadhvi · 2025
        - generic [aria-hidden]: 40:00
      - button:
        - generic:
          - generic: Khamkaro 2.0 - Non Stop Garba
          - generic: Jigardan Gadhavi · Maulik Mehta · 2024
        - generic [aria-hidden]: 34:11
      - button:
        - generic:
          - generic: Garba Ni Ramzat 4.0
          - generic: Pooja Kalyani · Maulik Mehta · 2025
        - generic [aria-hidden]: 47:33
      - button:
        - generic:
          - generic: Shakti 5.25 - Nonstop Garba
          - generic: Aishwarya Majmudar · 2025
        - generic [aria-hidden]: 44:42
      - button:
        - generic:
          - generic: Tahukar 2 - Nonstop Garba
          - generic: Kirtidan Gadhvi · 2025
      - button:
        - generic:
          - generic: GARBA ROOM - Nonstop EDM Garba
          - generic: Geeta Rabari · Laxmi Gadhavi · Kushal Chokshi · 2024
        - generic [aria-hidden]: 43:50
      - button:
        - generic:
          - generic: Meldi Maa No Rankar | Nonstop Garba
          - generic: Aditya Gadhvi · 2024
      - button:
        - generic:
          - generic: Ramzat 5 | Non Stop Garba
          - generic: Bhoomi Trivedi · Geeta Rabari · Hariom Gadhavi · 2024
        - generic [aria-hidden]: 58:55
      - button:
        - generic:
          - generic: Rangtaali 4 - Raas Garba 2024
          - generic: Aishwarya Majmudar · Jigardan Gadhavi · Rajbha Gadhvi GIR · Maulik Mehta · 2024
        - generic [aria-hidden]: 1:00:38
      - button:
        - generic:
          - generic: Shakti 4.24 - Nonstop Dandiya
          - generic: Aishwarya Majmudar · 2024
        - generic [aria-hidden]: 54:38
      - button:
        - generic:
          - generic: Taalratri 2.0 - Garba Nonstop Hits 2024
          - generic: Meet Jain · 2024
      - button:
        - generic:
          - generic: Falguni Pathak Non Stop Garba Vol. 2
          - generic: Falguni Pathak · 2023
        - generic [aria-hidden]: 37:21
      - button:
        - generic:
          - generic: Pop Skope Dandiya 2 / Non Stop Garba
          - generic: Vinay Nayak · Trupti Gadhvi · Khushbu Asodiya · Pravin Ravat · Savan Bharwad · Rohan Ajani · Abhishek Gadhvi · 2023
        - generic [aria-hidden]: 59:49
      - button:
        - generic:
          - generic: Tahukar 5 - Nonstop Garba
          - generic: Kirtidan Gadhvi · 2023
      - button:
        - generic:
          - generic: Non Stop Garba by Falguni Pathak
          - generic: Falguni Pathak · 2022
        - generic [aria-hidden]: 1:16:00
      - button:
        - generic:
          - generic: Shakti-2 NonStop Garba
          - generic: Rushabh Ahir · Santvani Trivedi · 2022
        - generic [aria-hidden]: 46:04
      - button:
        - generic:
          - generic: Tahukar 3 - Nonstop Garba
          - generic: Kirtidan Gadhvi · 2022
      - button:
        - generic:
          - generic: Tahukar 4 - Nonstop Garba
          - generic: Kirtidan Gadhvi · 2022
      - button:
        - generic:
          - generic: Trupti Na Taale | Navratri Special Nonstop Garba 2022
          - generic: Trupti Gadhvi · 2022
        - generic [aria-hidden]: 28:24
      - button:
        - generic:
          - generic: Chalo Ramiye - NonStop Garba
          - generic: Divya Kumar · Priya Saraiya · Jigardan Gadhavi · Ishani Dave · 2021
        - generic [aria-hidden]: 29:08
      - button:
        - generic:
          - generic: Mandavadi - Nonstop Garba
          - generic: Geeta Rabari · Devraj Gadhavi · Vandana Gadhavi · 2021
        - generic [aria-hidden]: 54:27
      - button:
        - generic:
          - generic: Deshi Sanedo - Non Stop
          - generic: Jayesh Barot · 2020
      - button:
        - generic:
          - generic: Non Stop Garba Mix by DJ Rink
          - generic: Various Artists · DJ Rink · 2020
        - generic [aria-hidden]: 29:12
      - button:
        - generic:
          - generic: Ramzat 4 - Non Stop Garba
          - generic: Bhoomi Trivedi · Jigardan Gadhavi · Meet Mehta · 2020
        - generic [aria-hidden]: 58:25
      - button:
        - generic:
          - generic: Rangtaali 3 - Nonstop Raas
          - generic: Himali V Naik · Aditya Gadhvi · Geeta Rabari · Himanshu Barot · 2020
        - generic [aria-hidden]: 1:04:59
      - button:
        - generic:
          - generic: Pop Skope Disco Dandiya | Navratri Special Non Stop Garba
          - generic: Gaman Santhal · Nitin Barot · Vinay Nayak · Vijay Jornang · Yash Barot · Sonu Charan · Divya Chaudhary · Trupti Gadhvi · Goral Trivedi · Sonam Parmar · Swati Kapadiya · 2019
        - generic [aria-hidden]: 58:53
      - button:
        - generic:
          - generic: Ramzat 3 - Non Stop Garba
          - generic: Osman Mir · Bhoomi Trivedi · Himanshu Chauhan · 2019
        - generic [aria-hidden]: 1:06:51
      - button:
        - generic:
          - generic: Rangtaali 2 - Non Stop Garba
          - generic: Aishwarya Majmudar · Jigardan Gadhavi · 2019
        - generic [aria-hidden]: 1:05:44
      - button:
        - generic:
          - generic: Tahukar 1 - Nonstop Garba
          - generic: Kirtidan Gadhvi · 2019
      - button:
        - generic:
          - generic: Ramzat 2 - Non Stop Trantaali Garba
          - generic: Pamela Jain · Jigardan Gadhavi · Abhita Patel · Aditya Gadhvi · 2018
        - generic [aria-hidden]: 1:08:46
      - button:
        - generic:
          - generic: Tahukar 6 - Navratri Nonstop
          - generic: Kirtidan Gadhvi · 2018
      - button:
        - generic:
          - generic: Ramzat - Non Stop Garba
          - generic: Osman Mir · Bhoomi Trivedi · Himanshu Chauhan · Veera Raval · 2017
        - generic [aria-hidden]: 1:09:19
      - button:
        - generic:
          - generic: Rangtaali - Non Stop Garba
          - generic: Aishwarya Majmudar · 2017
        - generic [aria-hidden]: 1:09:42
      - button:
        - generic:
          - generic: Tophani Sanedo - Non Stop Gujarati Garba
          - generic: Mahesh Singh Chauhan · 2017
      - button:
        - generic:
          - generic: Kum Kum Na Pagla - Traditional Garba Jukebox
          - generic: Balraj Shastri · 2016
        - generic [aria-hidden]: 48:14
      - button:
        - generic:
          - generic: Dhaa Gujarati 21 Nonstop Dandiya | Part 1
          - generic: Falguni Pathak · Rupal Joshi · Vinod Shah · Anil Desai · 2013
        - generic [aria-hidden]: 28:53
      - button:
        - generic:
          - generic: Dhaa Gujarati 21 Nonstop Dandiya | Part 2
          - generic: Falguni Pathak · Rupal Joshi · Vinod Shah · Anil Desai · 2013
        - generic [aria-hidden]: 26:57
      - button:
        - generic:
          - generic: Maadi Tara Mandiriye | Nonstop Dandiya Mix
          - generic: Falguni Pathak · Sudesh Bhosle · 2000
        - generic [aria-hidden]: 59:44
      - button:
        - generic:
          - generic: Jignesh Barot Garba | Navratri 2025 | Day 1
          - generic: Jignesh Barot · 2025
      - button:
        - generic:
          - generic: Jordar DJ Garba | 2022 Non Stop Garba
          - generic: Gaman Santhal · Kajal Maheriya · 2022
      - button:
        - generic:
          - generic: Garbi 2 | Non Stop Garba 2025
          - generic: Hardik Dave · Rahul Munjariya · 2025
        - generic [aria-hidden]: 1:00:10
      - button:
        - generic:
          - generic: Garbi Non Stop Album
          - generic: Hardik Dave · Rahul Munjariya · 2024
        - generic [aria-hidden]: 25:51
      - button:
        - generic:
          - generic: Garba Ni Ramzat 2.0
          - generic: Pooja Kalyani · 2023
        - generic [aria-hidden]: 10:52
      - button:
        - generic:
          - generic: Garba Ni Ramzat
          - generic: Pooja Kalyani · Hariom Gadhvi · 2021
        - generic [aria-hidden]: 6:38
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
      |                                                                                                                     ^ Error: Nonstop browser should have no uncaught errors, failed same-origin requests or HTTP errors
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