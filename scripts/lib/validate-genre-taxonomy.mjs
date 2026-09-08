import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { loadDiscoverySets } from './load-discovery-sets.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await read(file));

const [genres, taxonomy, index, playerRuntime, catalogueRuntime] = await Promise.all([
  readJson('data/genres.json'),
  readJson('data/taxonomy.json'),
  readJson('data/catalogue/index.json'),
  read('app.js'),
  read('src/catalogue/catalogue.js'),
]);
const songParts = await Promise.all((index.songChunks || []).map(readJson));
const songs = songParts.flat();
const { sets: nonstop } = await loadDiscoverySets(root, index);

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

let secondaryTaxonomySongs = 0;
let secondaryTaxonomyTags = 0;
for (const song of songs) {
  if (!visualIds.has(song.genre)) fail(`Song ${song.id} has unknown visual genre ${JSON.stringify(song.genre)}`);
  if (!song.category || !taxonomyById.has(song.category)) {
    fail(`Song ${song.id} has unknown or missing primary category ${JSON.stringify(song.category)}`);
  } else {
    const expected = taxonomyById.get(song.category)?.visualGenre;
    if (expected !== song.genre) {
      fail(`Song ${song.id} primary category ${song.category} maps to ${expected}, but visual genre is ${song.genre}`);
    }
  }

  if (song.taxonomyStyles == null) continue;
  if (!Array.isArray(song.taxonomyStyles)) {
    fail(`Song ${song.id} taxonomyStyles must be an array when present`);
    continue;
  }

  const seen = new Set();
  for (const style of song.taxonomyStyles) {
    if (!taxonomyById.has(style)) fail(`Song ${song.id} has unknown secondary taxonomy style ${JSON.stringify(style)}`);
    if (style === song.category) fail(`Song ${song.id} repeats primary category ${style} in taxonomyStyles[]`);
    if (seen.has(style)) fail(`Song ${song.id} repeats secondary taxonomy style ${style}`);
    seen.add(style);
  }
  if (seen.size) {
    secondaryTaxonomySongs += 1;
    secondaryTaxonomyTags += seen.size;
  }
}

let discoveryGenreTags = 0;
let discoveryStyleTags = 0;
let discoveryCategoryTags = 0;
for (const set of nonstop) {
  const setGenres = Array.isArray(set.genres) ? set.genres : [];
  for (const genre of setGenres) {
    discoveryGenreTags += 1;
    if (!visualIds.has(genre)) fail(`Nonstop set ${set.id} mixes non-visual token ${JSON.stringify(genre)} into genres[]`);
  }
  const styles = Array.isArray(set.styles) ? set.styles : [];
  for (const style of styles) {
    discoveryStyleTags += 1;
    if (!taxonomyById.has(style)) fail(`Nonstop set ${set.id} has unknown taxonomy style ${JSON.stringify(style)}`);
  }
  for (const category of Array.isArray(set.categories) ? set.categories : []) {
    discoveryCategoryTags += 1;
    if (!visualIds.has(category) && !taxonomyById.has(category)) {
      fail(`Nonstop set ${set.id} has unknown discovery category ${JSON.stringify(category)}`);
    }
  }
}

if (!playerRuntime.includes('song.taxonomyStyles')) {
  fail('Main player search must index taxonomyStyles[]');
}
if (!catalogueRuntime.includes('song.taxonomyStyles')) {
  fail('Explore search must index taxonomyStyles[]');
}

if (failed) process.exit(1);
console.log(`✓ ${visualIds.size} visual worlds and ${taxonomyById.size} music taxonomy categories have clean IDs and mappings`);
console.log(`✓ ${songs.length} canonical songs have primary taxonomy categories aligned with their visual worlds`);
console.log(`✓ ${secondaryTaxonomySongs} songs preserve ${secondaryTaxonomyTags} secondary taxonomy classifications without overloading the primary category`);
console.log(`✓ ${nonstop.length} canonical discovery Nonstop sets keep ${discoveryGenreTags} genre tags, ${discoveryStyleTags} style tags, and ${discoveryCategoryTags} browse categories inside known visual/taxonomy IDs`);
console.log('✓ main player and Explore search index secondary taxonomy styles');
