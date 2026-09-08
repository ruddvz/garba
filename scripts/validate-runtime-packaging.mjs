import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [pages, sw, bootstrap, index, socialCard] = await Promise.all([
  read('.github/workflows/pages.yml'),
  read('sw.js'),
  read('simple-runtime.js'),
  read('index.html'),
  readFile(path.join(root, 'assets/social/garba-og-card.jpg')),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };
const runtimeFiles = [
  'simple-runtime.js',
  'provider-runtime.js',
  'player-continuity.js',
  'nonstop-browser.js',
  'app.js',
  'sw.js',
];

for (const file of runtimeFiles) {
  if (!pages.includes(file)) fail(`Pages artifact contract does not mention ${file}`);
}

for (const file of ['provider-runtime.js', 'player-continuity.js']) {
  if (!sw.includes(`'./${file}'`)) fail(`PWA core shell does not cache ${file}`);
  if (!sw.includes(`'/${file}'`)) fail(`PWA fresh-runtime list does not include ${file}`);
}

if (!bootstrap.includes('provider-runtime.js') || !bootstrap.includes('player-continuity.js')) {
  fail('Fast bootstrap must load both provider-runtime.js and player-continuity.js');
}
if (bootstrap.indexOf('player-continuity.js') < bootstrap.indexOf('provider-runtime.js')) {
  fail('player-continuity.js must load after provider-runtime.js');
}

if (/['"]\.\/styles\/[^'"]+['"]/.test(sw)) {
  fail('PWA CORE_SHELL must not precache source CSS layers that Pages does not deploy');
}
if (!sw.includes("const CACHE_NAME = `${CACHE_PREFIX}v7`")) {
  fail('PWA cache generation must be v7 after the split-runtime packaging repair');
}

const socialImageUrl = 'https://playgarba.com/assets/social/garba-og-card.jpg';
for (const marker of [
  `<meta property="og:image" content="${socialImageUrl}" />`,
  `<meta property="og:image:secure_url" content="${socialImageUrl}" />`,
  '<meta property="og:image:type" content="image/jpeg" />',
  '<meta property="og:image:width" content="1200" />',
  '<meta property="og:image:height" content="630" />',
  '<meta property="og:image:alt" content="PlayGarba, the open Gujarati Garba music archive" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  `<meta name="twitter:image" content="${socialImageUrl}" />`,
  '<meta name="twitter:image:alt" content="PlayGarba, the open Gujarati Garba music archive" />',
  `"image": "${socialImageUrl}"`,
]) {
  if (!index.includes(marker)) fail(`Social preview metadata missing marker: ${marker}`);
}
if (!index.includes('<link rel="canonical" href="https://playgarba.com/" />')) fail('Canonical URL must remain https://playgarba.com/');
if (!index.includes('<meta property="og:url" content="https://playgarba.com/" />')) fail('Open Graph URL must remain https://playgarba.com/');
if (index.includes('ruddvz.github.io/garba')) fail('Production social metadata must not regress to the old GitHub Pages URL');
if (socialCard.length < 10_000) fail(`Social card is unexpectedly small (${socialCard.length} bytes)`);
if (socialCard[0] !== 0xff || socialCard[1] !== 0xd8 || socialCard.at(-2) !== 0xff || socialCard.at(-1) !== 0xd9) fail('Social card must be a complete JPEG');

if (failed) process.exit(1);
console.log('✓ Pages ships every direct and transitive playback runtime file');
console.log('✓ PWA precache contains only deployed shell assets and includes the split playback runtime');
console.log('✓ split playback runtime stays network-first across installed-app upgrades');
console.log('✓ PlayGarba ships a complete large-image social preview with canonical production URLs');
