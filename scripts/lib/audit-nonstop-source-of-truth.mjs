import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const legacy = await readJson('data/nonstop.json');
const index = await readJson('data/discovery/sets/index.json');
const setPayloads = await Promise.all((index.chunks || []).map((chunk) => readJson(path.posix.join('data/discovery/sets', chunk))));
const discovery = setPayloads.flatMap((payload) => Array.isArray(payload?.sets) ? payload.sets : []);

const discoveryByVideo = new Map();
for (const set of discovery) {
  const videoId = String(set?.source?.videoId || '').trim();
  if (!videoId) continue;
  const list = discoveryByVideo.get(videoId) || [];
  list.push(set);
  discoveryByVideo.set(videoId, list);
}

const legacyYoutube = legacy.filter((set) => String(set?.provider || '').toLowerCase() === 'youtube' && set.videoId);
const legacyNonYoutube = legacy.filter((set) => String(set?.provider || '').toLowerCase() !== 'youtube');
const missing = legacyYoutube.filter((set) => !discoveryByVideo.has(String(set.videoId).trim()));
const matched = legacyYoutube.filter((set) => discoveryByVideo.has(String(set.videoId).trim()));
const duplicateDiscoveryVideos = [...discoveryByVideo.entries()].filter(([, sets]) => sets.length > 1);

console.log(`Legacy Nonstop rows: ${legacy.length}`);
console.log(`Legacy YouTube rows: ${legacyYoutube.length}`);
console.log(`Legacy non-YouTube rows: ${legacyNonYoutube.length}`);
console.log(`Discovery sets: ${discovery.length}`);
console.log(`Legacy YouTube rows already represented in discovery by videoId: ${matched.length}`);
console.log(`Legacy YouTube rows missing from discovery: ${missing.length}`);
console.log(`Discovery videoIds represented by multiple set IDs: ${duplicateDiscoveryVideos.length}`);

if (missing.length) {
  console.log('\nMissing legacy YouTube masters:');
  for (const set of missing) console.log(`  ${set.id} | ${set.videoId} | ${set.title}`);
}
if (legacyNonYoutube.length) {
  console.log('\nLegacy non-YouTube rows (must remain provenance only, not listening masters):');
  for (const set of legacyNonYoutube) console.log(`  ${set.id} | ${set.provider} | ${set.title}`);
}
if (duplicateDiscoveryVideos.length) {
  console.log('\nDiscovery duplicate video identities:');
  for (const [videoId, sets] of duplicateDiscoveryVideos) console.log(`  ${videoId} | ${sets.map((set) => set.id).join(', ')}`);
}
