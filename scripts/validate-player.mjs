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

// First paint must use the generated single-file catalogue. Rebuilding 50+ song
// chunks before rendering caused iOS Safari to remain behind the loading skeleton.
for (const marker of ['fastGeneratedSongs', 'loadJsonBatched', 'installLoadingGuard', 'fetchWithTimeout(input, init, 8000)']) {
  if (!bootstrap.includes(marker)) fail(`Mobile first-load guard missing marker: ${marker}`);
}
const fastPath = bootstrap.indexOf('const fast = await fastGeneratedSongs(input, init)');
const chunkPath = bootstrap.indexOf('const songs = await loadSongsFromChunks()');
if (fastPath < 0 || chunkPath < 0 || fastPath > chunkPath) fail('Generated songs.json must be attempted before chunk reconstruction');
if (!bootstrap.includes("app.dataset.loading = 'false'")) fail('Catalogue bootstrap must be able to dismiss the loading skeleton independently');

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
console.log('✓ first paint uses generated songs.json before bounded chunk fallback');
console.log('✓ loading skeleton has an independent mobile-safe release guard');
console.log('✓ play stays inside GARBA through provider embeds');
console.log('✓ final phone, tablet, laptop and landscape player CSS is loaded');
console.log('✓ PWA caches the complete shell and all 15 approved WebP backgrounds when deployed');
