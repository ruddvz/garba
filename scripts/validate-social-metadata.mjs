import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const indexPath = path.join(root, 'index.html');
const imagePath = path.join(root, 'assets/social/garba-og-card.jpg');
const imageUrl = 'https://playgarba.com/assets/social/garba-og-card.jpg';

const index = await readFile(indexPath, 'utf8');
const image = await readFile(imagePath);
const imageStat = await stat(imagePath);
let failed = false;

function fail(message) {
  console.error(`✗ ${message}`);
  failed = true;
}

for (const marker of [
  `<meta property="og:image" content="${imageUrl}" />`,
  `<meta property="og:image:secure_url" content="${imageUrl}" />`,
  '<meta property="og:image:type" content="image/jpeg" />',
  '<meta property="og:image:width" content="1200" />',
  '<meta property="og:image:height" content="630" />',
  '<meta property="og:image:alt" content="PlayGarba, the open Gujarati Garba music archive" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  `<meta name="twitter:image" content="${imageUrl}" />`,
  '<meta name="twitter:image:alt" content="PlayGarba, the open Gujarati Garba music archive" />',
  `"image": "${imageUrl}"`,
]) {
  if (!index.includes(marker)) fail(`Missing social metadata marker: ${marker}`);
}

if (!index.includes('<link rel="canonical" href="https://playgarba.com/" />')) fail('Canonical URL must remain https://playgarba.com/');
if (!index.includes('<meta property="og:url" content="https://playgarba.com/" />')) fail('Open Graph URL must remain https://playgarba.com/');
if (!index.includes('<meta property="og:site_name" content="PlayGarba" />')) fail('Open Graph site name must remain PlayGarba');
if (index.includes('ruddvz.github.io/garba')) fail('Production social metadata must not regress to the old GitHub Pages URL');
if (imageStat.size < 10_000) fail(`Social card is unexpectedly small (${imageStat.size} bytes)`);
if (image[0] !== 0xff || image[1] !== 0xd8 || image.at(-2) !== 0xff || image.at(-1) !== 0xd9) fail('Social card must be a complete JPEG');

if (failed) process.exit(1);
console.log(`✓ PlayGarba social preview metadata points to ${imageUrl}`);
console.log(`✓ social card is present as a complete ${Math.round(imageStat.size / 1024)} KB JPEG`);
