import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const [index, bridge, styles, playerCss, sw, pages] = await Promise.all([
  read('index.html'),
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
if (!index.includes('<script src="playback-bridge.js"></script>')) fail('index.html must load the in-app playback bridge');
if (!styles.includes('@import url("styles/part-7.css")')) fail('styles.css must load the final player polish layer');

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
if (!pages.includes("garba15-2k-q82.zip")) fail('Pages workflow must retain the approved 2K WebP pack extraction');
if (!pages.includes("test \"$(find _site/assets/backgrounds/library -maxdepth 1 -name '*.webp' | wc -l)\" -eq 15")) fail('Pages workflow must verify all 15 WebPs are deployed');

if (failed) process.exit(1);
console.log('✓ play stays inside GARBA through provider embeds');
console.log('✓ final phone, tablet, laptop and landscape player CSS is loaded');
console.log('✓ PWA caches the complete shell and all 15 approved WebP backgrounds when deployed');
