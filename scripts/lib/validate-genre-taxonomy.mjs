import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const [genres, taxonomy, nonstop, index] = await Promise.all([
  readJson('data/genres.json'),
  readJson('data/taxonomy.json'),
  readJson('data/nonstop.json'),
  readJson('data/catalogue/index.json'),
]);
const songParts = await Promise.all((index.songChunks || []).map(readJson));
const songs = songParts.flat();

let failed = false;
const fail = (message) => {
  console.error(`✗ ${message}`);
  failed = true;
};

const visualIds = new Set(genres.map((genre) => String(genre.id || '').trim()).filter(Boolean));
const taxonomyById = new Map(taxonomy.map((entry) => [String(entry.id || '').trim(), entry]));

if (visualIds.size !== genres.length) fail('Visual genre IDs must be unique and non-empty');
if (taxonomyById.size !== taxonomy.length) fail('Music taxonomy IDs must be unique and non-empty');

for (const entry of taxonomy) {
  if (!visualIds.has(entry.visualGenre)) {
    fail(`Taxonomy ${entry.id} maps to unknown visual genre ${JSON.stringify(entry.visualGenre)}`);
  }
}

let categoryVisualMismatches = 0;
const mismatchExamples = [];
for (const song of songs) {
  if (!visualIds.has(song.genre)) fail(`Song ${song.id} has unknown visual genre ${JSON.stringify(song.genre)}`);
  if (song.category && !taxonomyById.has(song.category)) fail(`Song ${song.id} has unknown category ${JSON.stringify(song.category)}`);
  const expected = song.category ? taxonomyById.get(song.category)?.visualGenre : null;
  if (expected && expected !== song.genre) {
    categoryVisualMismatches += 1;
    if (mismatchExamples.length < 12) mismatchExamples.push(`${song.id}: ${song.category} -> ${expected}, currently ${song.genre}`);
  }
}

for (const set of nonstop) {
  const setGenres = Array.isArray(set.genres) ? set.genres : [];
  for (const genre of setGenres) {
    if (!visualIds.has(genre)) fail(`Nonstop set ${set.id} mixes non-visual token ${JSON.stringify(genre)} into genres[]`);
  }
  const styles = Array.isArray(set.styles) ? set.styles : [];
  for (const style of styles) {
    if (!taxonomyById.has(style)) fail(`Nonstop set ${set.id} has unknown taxonomy style ${JSON.stringify(style)}`);
  }
}

if (failed) process.exit(1);
console.log(`✓ ${visualIds.size} visual worlds and ${taxonomyById.size} music taxonomy categories have clean IDs and mappings`);
console.log(`✓ ${songs.length} canonical songs use known visual genres and taxonomy categories`);
console.log(`✓ ${nonstop.length} Nonstop entries keep genres[] visual-only; finer classifications live in styles[]`);
if (categoryVisualMismatches) {
  console.log(`△ ${categoryVisualMismatches} song rows use a visual genre different from their primary taxonomy mapping. These need a catalogue-content audit, not automatic rewriting.`);
  for (const example of mismatchExamples) console.log(`  - ${example}`);
} else {
  console.log('✓ song primary taxonomy categories agree with their visual worlds');
}
