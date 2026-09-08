import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const catalogueIndex = await readJson('data/catalogue/index.json');
const setsIndexPath = catalogueIndex.discovery?.setsIndex;

if (!setsIndexPath) {
  console.error('✗ catalogue discovery manifest does not define setsIndex');
  process.exit(1);
}

const setsIndex = await readJson(setsIndexPath);
const setsDir = path.posix.dirname(setsIndexPath);
const supportedStatuses = new Set([
  'published-complete',
  'source-no-published-chapters',
  'source-tracklist-no-timestamps',
]);

const unresolved = [];
let setCount = 0;
let timestamped = 0;
let explicitlyContinuous = 0;
let tracklistOnly = 0;

for (const chunkName of setsIndex.chunks || []) {
  const chunkPath = path.posix.join(setsDir, chunkName);
  const payload = await readJson(chunkPath);
  for (const set of payload.sets || []) {
    setCount += 1;
    const segments = Array.isArray(set.segments) ? set.segments : [];
    const status = String(set.chapterStatus || '').trim();

    if (segments.length > 0) {
      timestamped += 1;
      continue;
    }

    if (!supportedStatuses.has(status)) {
      unresolved.push({
        id: set.id || '(missing id)',
        title: set.title || '(missing title)',
        videoId: set.source?.videoId || '(no video id)',
        chunk: chunkName,
      });
      continue;
    }

    if (status === 'source-tracklist-no-timestamps') tracklistOnly += 1;
    else explicitlyContinuous += 1;
  }
}

if (unresolved.length) {
  console.error(`✗ ${unresolved.length} Nonstop sets still have no timestamped chapters and no explicit source-evidence resolution:`);
  for (const set of unresolved) {
    console.error(`  - ${set.id} | ${set.title} | YouTube ${set.videoId} | ${set.chunk}`);
  }
  process.exit(1);
}

console.log(`✓ global Nonstop chapter resolution: ${setCount}/${setCount} sets resolved`);
console.log(`✓ ${timestamped} sets have timestamped chapters`);
console.log(`✓ ${explicitlyContinuous} sets explicitly document sources with no published chapter starts`);
console.log(`✓ ${tracklistOnly} sets preserve source tracklists without fabricated timestamps`);
