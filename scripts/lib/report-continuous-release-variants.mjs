import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const index = await readJson('data/catalogue/index.json');

const normalise = (value = '') => String(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\u0a80-\u0aff]+/g, ' ')
  .trim();

const releases = [];
for (const sourceChunk of index.releaseChunks || []) {
  for (const release of await readJson(sourceChunk)) releases.push({ ...release, sourceChunk });
}

const songCounts = new Map();
for (const sourceChunk of index.songChunks || []) {
  for (const song of await readJson(sourceChunk)) {
    songCounts.set(song.releaseId, (songCounts.get(song.releaseId) || 0) + 1);
  }
}

const groups = new Map();
for (const release of releases) {
  const key = normalise(release.title);
  if (!key) continue;
  const group = groups.get(key) || [];
  group.push(release);
  groups.set(key, group);
}

const collisions = [...groups.entries()]
  .filter(([, group]) => group.length > 1 && group.some((release) =>
    String(release.entryType || '').includes('continuous')
    || String(release.audioAvailability || '').includes('continuous')
    || release.sources?.some((source) => String(source.kind || '').includes('continuous'))
  ))
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

console.log(`Continuous release presentation audit: ${collisions.length} same-title collision groups`);
for (const [titleKey, group] of collisions) {
  console.log(`\n### ${group[0]?.title || titleKey}`);
  for (const release of group.sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    const youtube = (release.sources || [])
      .filter((source) => String(source.platform || '').toLowerCase() === 'youtube')
      .map((source) => `${source.kind || 'youtube'}=${source.url}`)
      .join(' | ');
    console.log([
      `- ${release.id}`,
      `entryType=${release.entryType || 'unknown'}`,
      `declaredSongs=${release.songCount ?? 'unknown'}`,
      `canonicalSongs=${songCounts.get(release.id) || 0}`,
      `year=${release.originalReleaseYear || release.releaseDate || 'unknown'}`,
      `source=${release.sourceChunk}`,
      youtube ? `youtube=${youtube}` : 'youtube=none',
    ].join(' | '));
  }
}
