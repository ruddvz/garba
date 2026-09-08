import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const [index, taxonomy] = await Promise.all([
  readJson('data/catalogue/index.json'),
  readJson('data/taxonomy.json'),
]);

const taxonomyById = new Map(taxonomy.map((entry) => [entry.id, entry]));
const primaryCategoryByVisualGenre = {
  traditional: 'traditional-garba',
  dandiya: 'raas-dandiya',
  devotional: 'mataji-devotional',
  folk: 'folk-lokgeet',
  fusion: 'electronic-fusion',
  sanedo: 'sanedo',
};

let changedSongs = 0;
let changedFiles = 0;
const transitions = new Map();

for (const sourceChunk of index.songChunks || []) {
  const file = path.join(root, sourceChunk);
  const songs = JSON.parse(await readFile(file, 'utf8'));
  let fileChanged = false;

  for (const song of songs) {
    const taxonomyEntry = song.category ? taxonomyById.get(song.category) : null;
    const expectedGenre = taxonomyEntry?.visualGenre || null;
    if (!expectedGenre || expectedGenre === song.genre) continue;

    const primaryCategory = primaryCategoryByVisualGenre[song.genre];
    if (!primaryCategory || !taxonomyById.has(primaryCategory)) {
      throw new Error(`No primary taxonomy category is configured for visual genre ${JSON.stringify(song.genre)} on ${song.id}`);
    }

    const displacedCategory = song.category;
    const taxonomyStyles = Array.isArray(song.taxonomyStyles) ? song.taxonomyStyles : [];
    song.category = primaryCategory;
    song.taxonomyStyles = [...new Set([...taxonomyStyles, displacedCategory])]
      .filter((value) => value && value !== primaryCategory);

    const transition = `${song.genre}: ${displacedCategory} -> ${primaryCategory}`;
    transitions.set(transition, (transitions.get(transition) || 0) + 1);
    changedSongs += 1;
    fileChanged = true;
  }

  if (fileChanged) {
    await writeFile(file, `${JSON.stringify(songs)}\n`);
    changedFiles += 1;
  }
}

console.log(`Migrated ${changedSongs} songs across ${changedFiles} canonical song shards.`);
for (const [transition, count] of [...transitions.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
  console.log(`- ${count} · ${transition}`);
}
