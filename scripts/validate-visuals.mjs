import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const source = await readFile(path.join(root, 'visual-library.js'), 'utf8');
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const webps = [...source.matchAll(/'([0-9]{2}-[^']+\.webp)'/g)].map((match) => match[1]);
const uniqueWebps = new Set(webps);
if (uniqueWebps.size !== 15) fail(`Expected exactly 15 approved 2K WebPs in visual-library.js, found ${uniqueWebps.size}`);

for (const genre of ['traditional', 'dandiya', 'devotional', 'folk', 'sanedo', 'fusion']) {
  if (!source.includes(`${genre}: [`)) fail(`Visual library missing genre bucket: ${genre}`);
}

for (const marker of [
  'function connectionConstrained()',
  'function warmImage(url,',
  'async function promoteVisibleGenre(genreId)',
  'function scheduleRemainingArtwork()',
  'genre.id !== currentGenre',
  "backgroundQuality: '2k-webp'",
  "attributeFilter: ['data-genre']",
  'requestAnimationFrame(() => promoteVisibleGenre(requestedGenre()))',
  '2K visual library unavailable; using bundled fallback.',
]) {
  if (!source.includes(marker)) fail(`Visual lazy-loading contract missing: ${marker}`);
}

if (!source.includes('connection.saveData') || !source.includes('2g$')) {
  fail('Visual loading must detect Save-Data and 2G-class connections');
}
if (!source.includes('if (background && connectionConstrained()) return Promise.resolve(false);')) {
  fail('Constrained connections must skip speculative warming of non-visible artwork');
}
if (!source.includes('await warmImage(url, { background: true });')) {
  fail('Remaining artwork must be warmed only as background work');
}
if (!source.includes("window.addEventListener('load', afterLoad, { once: true })")) {
  fail('Speculative artwork warming must wait until after window load');
}

if (failed) process.exit(1);
console.log(`✓ ${uniqueWebps.size} approved 2K WebPs mapped across six genre worlds`);
console.log('✓ visible genre art is promoted to real 2K WebP on first paint and genre changes');
console.log('✓ the other artwork is deferred until after load/idle time');
console.log('✓ Save-Data/2G connections skip speculative background warming');
