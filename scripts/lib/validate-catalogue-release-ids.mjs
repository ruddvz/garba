import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const index = await readJson('data/catalogue/index.json');
const releaseChunks = Array.isArray(index.releaseChunks) ? index.releaseChunks : [];
const chunkRows = await Promise.all(releaseChunks.map(async (file) => ({
  file,
  releases: await readJson(file),
})));

const seen = new Map();
const duplicates = new Map();
let releaseCount = 0;

for (const { file, releases } of chunkRows) {
  if (!Array.isArray(releases)) throw new Error(`${file} must contain a release array`);
  releaseCount += releases.length;
  for (const release of releases) {
    const id = String(release?.id || '').trim();
    if (!id) throw new Error(`${file} contains a release without an id`);
    if (seen.has(id)) {
      const files = duplicates.get(id) || [seen.get(id)];
      files.push(file);
      duplicates.set(id, files);
    } else {
      seen.set(id, file);
    }
  }
}

if (duplicates.size) {
  const detail = [...duplicates.entries()]
    .map(([id, files]) => `${id} (${[...new Set(files)].join(', ')})`)
    .join('; ');
  throw new Error(`Duplicate release IDs are not allowed: ${detail}`);
}

if (releaseCount !== index.releaseCount) {
  throw new Error(`Expected ${index.releaseCount} canonical releases, got ${releaseCount}`);
}

console.log(`✓ canonical release IDs are unique: ${releaseCount} releases across ${releaseChunks.length} chunks`);
