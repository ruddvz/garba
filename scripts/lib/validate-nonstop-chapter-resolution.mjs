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
const supportedChapterStatuses = new Set([
  'published-complete',
  'source-no-published-chapters',
  'source-tracklist-no-timestamps',
]);
const terminalSourceStatus = 'youtube-source-not-found';

const unresolved = [];
const invalidMigrationStates = [];
let setCount = 0;
let youtubeSetCount = 0;
let timestamped = 0;
let explicitlyContinuous = 0;
let tracklistOnly = 0;
let auditedWithoutYoutube = 0;

// Chapter completion is only meaningful once a trustworthy YouTube master exists.
// Provider-only evidence can be considered audit-complete only after an explicit,
// terminal YouTube source search documents that no trustworthy master was found.
for (const chunkName of setsIndex.chunks || []) {
  const chunkPath = path.posix.join(setsDir, chunkName);
  const payload = await readJson(chunkPath);
  for (const set of payload.sets || []) {
    setCount += 1;
    const segments = Array.isArray(set.segments) ? set.segments : [];
    const chapterStatus = String(set.chapterStatus || '').trim();
    const sourceStatus = String(set.sourceStatus || '').trim();
    const provider = String(set.source?.provider || '').trim().toLowerCase();
    const isYoutube = provider === 'youtube' && Boolean(String(set.source?.videoId || '').trim());

    if (!isYoutube) {
      if (segments.length > 0 || supportedChapterStatuses.has(chapterStatus)) {
        invalidMigrationStates.push({ id: set.id, title: set.title, provider, chunk: chunkName });
        continue;
      }
      if (sourceStatus !== terminalSourceStatus) {
        unresolved.push({
          id: set.id,
          title: set.title,
          provider: provider || '(none)',
          videoId: '(no YouTube master)',
          chunk: chunkName,
          sourceStatus: sourceStatus || '(missing)',
        });
        continue;
      }
      auditedWithoutYoutube += 1;
      continue;
    }

    youtubeSetCount += 1;
    if (sourceStatus) {
      invalidMigrationStates.push({ id: set.id, title: set.title, provider, chunk: chunkName });
      continue;
    }

    if (segments.length > 0) {
      timestamped += 1;
      continue;
    }

    if (!supportedChapterStatuses.has(chapterStatus)) {
      unresolved.push({
        id: set.id,
        title: set.title,
        provider,
        videoId: set.source?.videoId || '(no video id)',
        chunk: chunkName,
        sourceStatus: '(not applicable)',
      });
      continue;
    }

    if (chapterStatus === 'source-tracklist-no-timestamps') tracklistOnly += 1;
    else explicitlyContinuous += 1;
  }
}

if (invalidMigrationStates.length) {
  console.error(`✗ ${invalidMigrationStates.length} Nonstop sets conflate provider source state with YouTube chapter completion:`);
  for (const set of invalidMigrationStates) console.error(`  - ${set.id} | ${set.title} | ${set.provider} | ${set.chunk}`);
}

if (unresolved.length) {
  console.error(`✗ ${unresolved.length} Nonstop sets still have actionable YouTube source/chapter backlog:`);
  for (const set of unresolved) {
    console.error(`  - ${set.id} | ${set.title} | ${set.provider} | ${set.videoId} | sourceStatus=${set.sourceStatus} | ${set.chunk}`);
  }
}

if (invalidMigrationStates.length || unresolved.length) process.exit(1);

console.log(`✓ global Nonstop evidence resolution: ${setCount}/${setCount} sets audit-complete`);
console.log(`✓ ${youtubeSetCount} sets have trustworthy YouTube masters`);
console.log(`✓ ${timestamped} YouTube sets have timestamped chapters`);
console.log(`✓ ${explicitlyContinuous} YouTube sets explicitly document sources with no published chapter starts`);
console.log(`✓ ${tracklistOnly} YouTube sets preserve source tracklists without fabricated timestamps`);
console.log(`✓ ${auditedWithoutYoutube} provider-only sets have a completed source audit with no trustworthy YouTube master found`);
console.log('✓ 0 Nonstop sets remain in youtube-migration-required backlog');
