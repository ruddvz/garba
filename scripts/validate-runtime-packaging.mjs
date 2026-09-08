import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const socialChunkFiles = Array.from({ length: 7 }, (_, index) => `.github/assets/playgarba-og-card.b64.${String(index + 1).padStart(2, '0')}`);
const [pages, sw, bootstrap, index, socialChunks] = await Promise.all([
  read('.github/workflows/pages.yml'),
  read('sw.js'),
  read('simple-runtime.js'),
  read('index.html'),
  Promise.all(socialChunkFiles.map(read)),
]);
const socialCardBase64 = socialChunks.join('').replace(/\s+/g, '');
const socialCard = Buffer.from(socialCardBase64, 'base64');

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
if (!index.includes('<meta property="og:site_name" content="PlayGarba" />')) fail('Open Graph site name must remain PlayGarba');
if (index.includes('ruddvz.github.io/garba')) fail('Production social metadata must not regress to the old GitHub Pages URL');

for (const marker of [
  '.github/assets/playgarba-og-card.b64.*',
  '_site/assets/social/garba-og-card.jpg',
  'base64 --decode',
]) {
  if (!pages.includes(marker)) fail(`Pages social-card build contract missing marker: ${marker}`);
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if (sofMarkers.has(marker) && length >= 7) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  return null;
}

if (socialCardBase64.length !== 37140) fail(`Social card source length drifted (${socialCardBase64.length} base64 characters)`);
if (socialCard.length !== 27853) fail(`Social card byte length drifted (${socialCard.length} bytes)`);
if (socialCard[0] !== 0xff || socialCard[1] !== 0xd8 || socialCard.at(-2) !== 0xff || socialCard.at(-1) !== 0xd9) fail('Social card must be a complete JPEG');
const dimensions = jpegDimensions(socialCard);
if (!dimensions || dimensions.width !== 1200 || dimensions.height !== 630) {
  fail(`Social card must remain 1200x630, found ${dimensions ? `${dimensions.width}x${dimensions.height}` : 'unreadable dimensions'}`);
}

if (failed) process.exit(1);
console.log('✓ Pages ships every direct and transitive playback runtime file');
console.log('✓ PWA precache contains only deployed shell assets and includes the split playback runtime');
console.log('✓ split playback runtime stays network-first across installed-app upgrades');
console.log('✓ PlayGarba ships a complete 1200x630 large-image social preview with canonical production URLs');
