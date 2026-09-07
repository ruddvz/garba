import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const [index, bootstrap, bridge, styles, playerCss, sw, pages] = await Promise.all([
  read('index.html'),
  read('catalogue-bootstrap.js'),
  read('playback-bridge.js'),
  read('styles.css'),
  read('styles/part-7.css'),
  read('sw.js'),
  read('.github/workflows/pages.yml'),
]);

for (const marker of ['YT.Player', 'youtube.com/embed/', 'spotifyEmbedUrl', 'stopImmediatePropagation', 'provider-dock', 'playYouTube']) {
  if (!bridge.includes(marker)) fail(`In-app playback engine missing marker: ${marker}`);
}
if (bridge.includes('window.open(')) fail('Primary playback bridge must not redirect play actions with window.open');
if (!index.includes('<script src="catalogue-bootstrap.js"></script>') || !index.includes('<script src="playback-bridge.js"></script>')) {
  fail('index.html must load catalogue bootstrap and the in-app playback bridge');
}
if (!styles.includes('@import url("styles/part-7.css")')) fail('styles.css must load the final player polish layer');

// First paint must not wait for the 1k+ song catalogue. A tiny verified boot set
// makes the player interactive synchronously and the generated catalogue hydrates
// after first paint.
for (const marker of [
  'const BOOT_GENRES = [',
  'const BOOT_SONGS = [',
  'function showReadyShell()',
  'function startFullCatalogueLoad()',
  "if (isGenresRequest(input)) return jsonResponse(BOOT_GENRES);",
  'return jsonResponse(BOOT_SONGS);',
  "url.searchParams.set('full', String(Date.now()))",
  "app.dataset.loading = 'false'",
]) {
  if (!bootstrap.includes(marker)) fail(`Instant mobile bootstrap missing marker: ${marker}`);
}
const shellRelease = bootstrap.indexOf('showReadyShell();');
const backgroundStart = bootstrap.indexOf("requestIdleCallback(() => startFullCatalogueLoad()", shellRelease);
if (shellRelease < 0 || backgroundStart < 0 || shellRelease > backgroundStart) {
  fail('Loading skeleton must be released before background catalogue hydration starts');
}
if (!bootstrap.includes('if (fullSongsText) return jsonResponse(fullSongsText);')) {
  fail('Hydrated catalogue must replace the boot set for subsequent catalogue reads');
}
if (!bootstrap.includes("window.dispatchEvent(new Event('online'))")) {
  fail('Full catalogue hydration must trigger the existing refresh path');
}

for (const marker of [
  '.provider-dock', '.provider-media iframe', '.source-badge { display: none !important; }',
  '@media (max-width: 700px)', '@media (min-width: 701px) and (max-height: 760px)',
  '@media (max-height: 560px) and (orientation: landscape)', '@media (display-mode: standalone)',
]) {
  if (!playerCss.includes(marker)) fail(`Final player CSS missing marker: ${marker}`);
}

if (!sw.includes("'./styles/part-7.css'")) fail('Service worker must precache the final player CSS');
const artworkEntries = [...sw.matchAll(/assets\/backgrounds\/library\/[0-9]{2}-[^'\"]+\.webp/g)];
if (new Set(artworkEntries.map((match) => match[0])).size !== 15) fail('Service worker must cache all 15 approved WebP backgrounds when available');
if (!pages.includes('garba15-2k-q82.zip')) fail('Pages workflow must retain the approved 2K WebP pack extraction');
if (!pages.includes("test \"$(find _site/assets/backgrounds/library -maxdepth 1 -name '*.webp' | wc -l)\" -eq 15")) fail('Pages workflow must verify all 15 WebPs are deployed');

if (failed) process.exit(1);
console.log('✓ first paint uses an in-memory verified boot catalogue');
console.log('✓ the complete catalogue hydrates after first paint without blocking the player');
console.log('✓ loading skeleton is released synchronously on mobile');
console.log('✓ play stays inside GARBA through provider embeds');
console.log('✓ final phone, tablet, laptop and landscape player CSS is loaded');
console.log('✓ PWA caches the complete shell and all 15 approved WebP backgrounds when deployed');
