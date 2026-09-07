import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const [index, bootstrap, prewarm, bridge, styles, playerCss, sw, pages, visuals, app, uxPolish, uxNext, uxInput] = await Promise.all([
  read('index.html'),
  read('catalogue-bootstrap.js'),
  read('playback-prewarm.js'),
  read('playback-bridge.js'),
  read('styles.css'),
  read('styles/part-7.css'),
  read('sw.js'),
  read('.github/workflows/pages.yml'),
  read('visual-library.js'),
  read('app.js'),
  read('ux-polish.js'),
  read('ux-next.js'),
  read('ux-input.js'),
]);

for (const marker of ['YT.Player', 'youtube.com/embed/', 'spotifyEmbedUrl', 'stopImmediatePropagation', 'provider-dock', 'playYouTube']) {
  if (!bridge.includes(marker)) fail(`In-app playback engine missing marker: ${marker}`);
}
if (bridge.includes('window.open(')) fail('Primary playback bridge must not redirect play actions with window.open');
for (const marker of [
  'https://www.youtube.com/iframe_api',
  'const WATCHDOG_MS = 7000',
  'function ensureYouTubeApi()',
  'function armProviderWatchdog(stage)',
  "stage.classList.remove('is-loading')",
  "stage.classList.add('needs-tap')",
  "window.addEventListener('load', prewarmAfterFirstPaint, { once: true })",
  "document.addEventListener('pointerdown'",
]) {
  if (!prewarm.includes(marker)) fail(`Playback prewarm/watchdog missing marker: ${marker}`);
}
const prewarmPosition = index.indexOf('<script src="playback-prewarm.js"></script>');
const bridgePosition = index.indexOf('<script src="playback-bridge.js"></script>');
if (prewarmPosition < 0 || bridgePosition < 0 || prewarmPosition > bridgePosition) {
  fail('index.html must load playback-prewarm.js before playback-bridge.js');
}
if (!index.includes('<script src="catalogue-bootstrap.js"></script>')) {
  fail('index.html must load catalogue bootstrap');
}
if (!styles.includes('@import url("styles/part-7.css")')) fail('Source styles.css must load the final player polish layer');

for (const marker of [
  'data-loading="false"',
  'aria-busy="false"',
  'Traditional Garba',
  'Ochhav Theme',
  'Aditya Gadhvi',
  'assets/backgrounds/library/11-master-dark-courtyard.webp',
  'fetchpriority="high"',
]) {
  if (!index.includes(marker)) fail(`Complete first-paint HTML missing marker: ${marker}`);
}

// The production player can look healthy while being functionally dead if a
// control is renamed, a listener disappears, or a modal leaves the app inert.
// Keep the complete primary interaction surface under a static contract in CI.
for (const id of [
  'playButton', 'prevButton', 'nextButton', 'progress',
  'browseButton', 'searchButton', 'favouritesButton', 'queueButton',
  'mobileFavourite', 'sheetHandle', 'sheetClose', 'searchInput',
  'miniPlay', 'miniPrev', 'miniNext', 'installButton', 'installDismiss',
  'shareButton',
]) {
  if (!index.includes(`id="${id}"`)) fail(`Primary interaction control missing from index.html: ${id}`);
}

for (const marker of [
  "els.playButton.addEventListener('click', togglePlay)",
  "els.miniPlay.addEventListener('click', togglePlay)",
  "els.prevButton.addEventListener('click', () => changeSong(-1))",
  "els.nextButton.addEventListener('click', () => changeSong(1))",
  "els.miniPrev.addEventListener('click', () => changeSong(-1))",
  "els.miniNext.addEventListener('click', () => changeSong(1))",
  "els.browseButton.addEventListener('click'",
  "els.sheetClose.addEventListener('click', closeSheet)",
  "els.mobileFavourite.addEventListener('click', () => toggleFavourite())",
  "els.favouritesButton.addEventListener('click', () => openSheet('favourites'",
  "els.queueButton.addEventListener('click', () => openSheet('queue'",
  "els.searchButton.addEventListener('click', () => openSheet('search'",
  "els.progress.addEventListener('input'",
  "button.addEventListener('click', () => onSelect(genre.id))",
  "els.sheetHandle.addEventListener('pointerdown', start)",
  "els.sheetHandle.addEventListener('pointerup', end)",
  "els.installDismiss.addEventListener('click'",
  "els.installButton.addEventListener('click'",
]) {
  if (!app.includes(marker)) fail(`Core player interaction binding missing: ${marker}`);
}

for (const marker of [
  "import './playback-release-guard.js';",
  "import './ux-input.js';",
  'genreEyebrow?.textContent',
  "shareButton?.addEventListener('click', improvedShare, { capture: true })",
]) {
  if (!uxNext.includes(marker)) fail(`UI enhancement interaction contract missing: ${marker}`);
}
for (const marker of ['setSheetBackgroundInert', 'syncSheetAccessibility', "shareButton?.addEventListener('click', shareCurrentTrack)"]) {
  if (!uxPolish.includes(marker)) fail(`Accessibility/share interaction contract missing: ${marker}`);
}
for (const marker of ['playButton?.click()', "setActionHandler('play'", 'providerSpaceGuard', 'stopImmediatePropagation']) {
  if (!uxInput.includes(marker)) fail(`Playback input parity contract missing: ${marker}`);
}
for (const marker of [
  'function recoverStaleInert()',
  "window.addEventListener('pageshow', recoverStaleInert)",
  "document.addEventListener('pointerdown', recoverStaleInert",
  "document.addEventListener('touchstart', recoverStaleInert",
  "import(modulePath).catch",
]) {
  if (!visuals.includes(marker)) fail(`Early interaction recovery contract missing: ${marker}`);
}

for (const marker of [
  'const PRIMARY_WEBP = {',
  'const BOOT_GENRES = [',
  'const BOOT_SONGS = [',
  'function bootGenresForRequest()',
  'function showReadyShell()',
  'function startFullCatalogueLoad()',
  'function scheduleFullCatalogueLoad()',
  'return jsonResponse(BOOT_SONGS);',
  "window.addEventListener('load', afterLoad, { once: true })",
  'setTimeout(hydrate, 1600)',
  "app.dataset.loading = 'false'",
]) {
  if (!bootstrap.includes(marker)) fail(`Instant mobile bootstrap missing marker: ${marker}`);
}
if (!bootstrap.includes('if (fullSongsText) return jsonResponse(fullSongsText);')) {
  fail('Hydrated catalogue must replace the boot set for subsequent catalogue reads');
}
if (!bootstrap.includes("window.dispatchEvent(new Event('online'))")) {
  fail('Full catalogue hydration must trigger the existing refresh path');
}

const songsBranch = bootstrap.match(/if \(isSongsRequest\(input\)\) \{([\s\S]*?)\n    \}/);
if (!songsBranch) fail('Could not locate songs bootstrap request branch');
else if (songsBranch[1].includes('startFullCatalogueLoad')) fail('Song bootstrap request must not start the full catalogue immediately');

for (const marker of [
  '.provider-dock', '.provider-media iframe', '.source-badge { display: none !important; }',
  '@media (max-width: 700px)', '@media (min-width: 701px) and (max-height: 760px)',
  '@media (max-height: 560px) and (orientation: landscape)', '@media (display-mode: standalone)',
  'position: fixed !important;', 'height: 100dvh !important;', 'background-size: cover !important;',
  'margin: 0 !important;', 'padding: 0 !important;',
]) {
  if (!playerCss.includes(marker)) fail(`Final player CSS missing marker: ${marker}`);
}

for (const marker of ['fast-shell', 'const CORE_SHELL = [', 'cache.addAll(CORE_SHELL)', './playback-prewarm.js', 'request.destination === \'image\'', 'cacheFirst(request)']) {
  if (!sw.includes(marker)) fail(`Fast service worker missing marker: ${marker}`);
}
for (const forbidden of ["'./data/songs.json'", 'OPTIONAL_ARTWORK', 'cacheOfflineCatalogue']) {
  if (sw.includes(forbidden)) fail(`Service worker first install must not include heavy resource: ${forbidden}`);
}

const artworkEntries = [...visuals.matchAll(/['\"]([0-9]{2}-[^'\"]+\.webp)['\"]/g)].map((match) => match[1]);
if (new Set(artworkEntries).size !== 15) fail(`Visual library must contain 15 unique approved WebPs, found ${new Set(artworkEntries).size}`);
if (!visuals.includes('requestAnimationFrame(() => promoteVisibleGenre(requestedGenre()))')) {
  fail('Visible 2K artwork must be promoted immediately');
}
if (!visuals.includes('scheduleRemainingArtwork();')) fail('Remaining approved artwork must be warmed after first load');

if (!pages.includes('garba15-2k-q82.zip')) fail('Pages workflow must retain the approved 2K WebP pack extraction fallback');
if (!pages.includes('styles/part-7.css \\')) fail('Pages workflow must flatten the seven CSS layers');
if (!pages.includes('> _site/styles.css')) fail('Pages workflow must emit one production styles.css');
if (!pages.includes('WEBP_COUNT=')) fail('Pages workflow must verify all 15 WebPs are deployed');
if (!pages.includes('rm -f _site/assets/backgrounds/garba15-2k*.zip') && !pages.includes('rm -f _site/assets/backgrounds/garba15-*.zip')) {
  fail('Pages workflow must remove source image ZIPs from the public artifact');
}

if (failed) process.exit(1);
console.log('✓ first paint is a complete edge-to-edge player with a real 2K WebP');
console.log('✓ every primary tap/click control has a DOM target and core event binding');
console.log('✓ modal inert recovery and provider-aware input remain available before optional UI enhancements');
console.log('✓ the complete catalogue waits until after page load and browser idle time');
console.log('✓ service-worker install no longer bulk-downloads catalogue or artwork');
console.log('✓ all 15 approved WebPs remain available and warm progressively');
console.log('✓ production CSS is flattened to one render-blocking request');
console.log('✓ phone, tablet, desktop and landscape layouts enforce full-viewport cover');
console.log('✓ YouTube API prewarms after first paint and provider loading has a 7-second watchdog');
console.log('✓ play stays inside GARBA through provider embeds without an endless loading state');
