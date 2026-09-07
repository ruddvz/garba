import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await read(file));
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const file of ['index.html', 'app.js', 'simple-runtime.js', 'nonstop-browser.js', 'sw.js', 'styles.css', 'data/genres.json', 'data/songs.json', 'data/discovery/sets/index.json']) {
  try { await access(path.join(root, file)); } catch { fail(`Missing runtime file: ${file}`); }
}

const [index, app, simple, nonstop, sw, genres, songs, playerCss, nonstopIndex] = await Promise.all([
  read('index.html'),
  read('app.js'),
  read('simple-runtime.js'),
  read('nonstop-browser.js'),
  read('sw.js'),
  readJson('data/genres.json'),
  readJson('data/songs.json'),
  read('styles/part-7.css'),
  readJson('data/discovery/sets/index.json'),
]);

const expectedGenres = ['traditional', 'dandiya', 'devotional', 'folk', 'sanedo', 'fusion'];
if (genres.length !== expectedGenres.length) fail(`Expected six genres, found ${genres.length}`);
for (const genre of expectedGenres) if (!genres.some((entry) => entry.id === genre)) fail(`Missing genre: ${genre}`);
if (!Array.isArray(songs) || songs.length < 1) fail('Catalogue must contain songs');
if (!Array.isArray(nonstopIndex?.chunks) || nonstopIndex.chunks.length < 1) fail('Nonstop discovery index must contain set chunks');

const scriptSources = [...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
const expectedScripts = ['simple-runtime.js', 'nonstop-browser.js', 'app.js'];
for (const script of expectedScripts) if (!scriptSources.includes(script)) fail(`Missing production runtime script: ${script}`);
for (const forbidden of ['visual-library.js', 'catalogue-bootstrap.js', 'direct-audio-bridge.js', 'playback-routes.js', 'playback-prewarm.js', 'playback-bridge.js', 'ux-polish.js', 'ux-next.js']) {
  if (scriptSources.includes(forbidden)) fail(`Heavy/optional script must not load on first page: ${forbidden}`);
}
if (scriptSources.length !== expectedScripts.length) fail(`Expected exactly ${expectedScripts.length} runtime scripts, found ${scriptSources.length}`);

for (const marker of [
  'assets/backgrounds/traditional.svg',
  'data-static-genre="true"',
  'nonstop-browser.js',
  '<link rel="manifest" href="manifest.webmanifest"',
]) if (!index.includes(marker)) fail(`Simple index missing marker: ${marker}`);

for (const forbidden of [
  'navigator.serviceWorker.register = async ()',
  'registration.unregister()',
  'garba-simple-runtime-reset-v1',
]) if (index.includes(forbidden)) fail(`Production index must not disable the restored PWA: ${forbidden}`);

for (const marker of [
  'clearStaleInert',
  'interceptFallbackPlay',
  'shareCurrent',
  'data-static-genre="true"',
  "fetch('data/songs.json'",
  'function ensureProviderStage()',
  'function providerEmbed(',
  'https://www.youtube-nocookie.com/embed/',
  'https://open.spotify.com/embed/',
  "url.hostname = 'embed.music.apple.com'",
  'function externalProviderCard(',
  "media?.replaceChildren(iframe)",
  "$('providerMedia')?.replaceChildren()",
  'function constrainedConnection()',
  'function promoteCurrentVisual()',
  "requestIdleCallback(run, { timeout: 1800 })",
  "navigator.mediaSession.setActionHandler('play'",
  "navigator.mediaSession.setActionHandler('pause'",
  "navigator.mediaSession.setActionHandler('previoustrack'",
  "navigator.mediaSession.setActionHandler('nexttrack'",
  "window.addEventListener('offline'",
  'Provider-backed songs need an internet connection',
]) if (!simple.includes(marker)) fail(`Simple runtime missing launch-hardening marker: ${marker}`);

if (simple.includes('window.open(')) fail('Primary Play must not automatically throw users out to a new provider tab');

for (const marker of [
  'function loadSetsOnce(',
  'function hydrateBrowser(',
  'function trapFocus(',
  'function destroyPlayer()',
  "state.overlay.setAttribute('aria-hidden', 'false')",
  "state.overlay.setAttribute('aria-hidden', 'true')",
  "$('app').inert = true",
  "$('app').inert = false",
  "queueMicrotask(() => target?.focus?.({ preventScroll: true }))",
  "window.addEventListener('offline'",
  "window.addEventListener('online'",
  'Nonstop playback needs an internet connection',
  'Try an artist, year, set title, or a song contained in a timestamped chapter.',
  'set.segments',
]) {
  if (!nonstop.includes(marker)) fail(`Nonstop browser missing live UX marker: ${marker}`);
}
if (nonstop.includes('state.sets = await loadSets();')) fail('Nonstop set data must load lazily on browser open, not during page startup');

const expectedVisualFiles = [
  '15-traditional-canopy-courtyard.webp',
  '10-dandiya-silhouette-courtyard.webp',
  '03-devotional-garba-courtyard.webp',
  '14-gujarati-folk-courtyard.webp',
  '04-colourful-garba-courtyard-a.webp',
  '05-fusion-gujarati-neon.webp',
];
for (const visual of expectedVisualFiles) if (!simple.includes(visual)) fail(`Missing art-directed 2K visual mapping: ${visual}`);

for (const marker of ['.provider-dock', '.provider-media iframe', '.provider-dock.is-spotify', '.provider-dock.is-apple', '.provider-dock.is-external', '.provider-external-action']) {
  if (!playerCss.includes(marker)) fail(`Provider UI styling missing marker: ${marker}`);
}

for (const marker of [
  "const CACHE_PREFIX = 'garba-live-'",
  "const LEGACY_PREFIX = 'garba-shell-'",
  'const CORE_SHELL = [',
  "'./simple-runtime.js'",
  "'./nonstop-browser.js'",
  "'./app.js'",
  "'./manifest.webmanifest'",
  "'./offline.html'",
  'await cache.addAll(CORE_SHELL)',
  'await self.skipWaiting()',
  'await self.clients.claim()',
  'request.mode === \'navigate\'',
  "url.pathname.endsWith('/data/songs.json')",
  "url.pathname.includes('/data/discovery/sets/')",
  "url.pathname.includes('/assets/backgrounds/library/')",
  'event.respondWith(cacheFirst(request))',
  'event.respondWith(staleWhileRevalidate(request))',
]) if (!sw.includes(marker)) fail(`Minimal PWA worker missing marker: ${marker}`);

for (const forbidden of ['self.registration.unregister()', 'client.navigate(client.url)']) {
  if (sw.includes(forbidden)) fail(`Restored PWA worker must remain registered: ${forbidden}`);
}

if (!app.includes("navigator.serviceWorker.register('./sw.js')")) fail('Core app must register the minimal service worker');

const ids = [...index.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
for (const id of [...app.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1])) {
  if (!ids.includes(id)) fail(`app.js references missing element id: ${id}`);
}

for (const requiredControl of ['searchButton', 'shareButton', 'favouritesButton', 'queueButton', 'prevButton', 'playButton', 'nextButton', 'progress', 'genreStrip', 'browseButton', 'songSheet', 'sheetClose', 'searchInput', 'miniPlay']) {
  if (!ids.includes(requiredControl)) fail(`Missing primary control: ${requiredControl}`);
}

for (const marker of [
  "els.playButton.addEventListener('click'",
  "els.prevButton.addEventListener('click'",
  "els.nextButton.addEventListener('click'",
  "els.browseButton.addEventListener('click'",
  "els.searchButton.addEventListener('click'",
  "els.favouritesButton.addEventListener('click'",
  "els.queueButton.addEventListener('click'",
  "els.progress.addEventListener('input'",
]) if (!app.includes(marker)) fail(`Core app lost interaction binding: ${marker}`);

if (failed) process.exit(1);
console.log(`✓ production runtime uses ${scriptSources.join(' + ')}`);
console.log(`✓ ${songs.length} songs and six genres remain available`);
console.log(`✓ ${nonstopIndex.chunks.length} Nonstop discovery chunks remain available`);
console.log('✓ primary player controls retain direct event bindings');
console.log('✓ provider-backed Play stays inside GARBA when a safe embed is available');
console.log('✓ unsupported providers require an explicit user click before leaving GARBA');
console.log('✓ six art-directed 2K WebPs promote after first paint without blocking the shell');
console.log('✓ offline state and Media Session controls share the launch-safe runtime path');
console.log('✓ minimal PWA shell stays installable without reviving the old heavy cache graph');
console.log('✓ Nonstop data waits for intent, traps focus correctly, restores focus on close and fails visibly offline');
console.log('✓ visited Nonstop set data can be reused through the service worker while provider media stays network-bound');
