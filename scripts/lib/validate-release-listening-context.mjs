import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const listening = fs.readFileSync('src/catalogue/listening-library.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const songs = JSON.parse(fs.readFileSync('data/songs.json', 'utf8'));

const sourceChecks = [
  [app, /releaseContextId:\s*null/, 'player keeps an explicit transient release context'],
  [app, /function orderedReleaseSongs\(releaseId\)/, 'player derives release order from catalogue songs'],
  [app, /Number\(song\?\.trackNumber\)/, 'release ordering requires numeric track numbers'],
  [app, /trackDelta \|\| left\.id\.localeCompare\(right\.id\)/, 'release ordering uses stable ID tie-breaker'],
  [app, /url\.searchParams\.set\('release', state\.releaseContextId\)/, 'valid release context is reflected in the player URL'],
  [app, /url\.searchParams\.delete\('release'\)/, 'stale release context is removed from the player URL'],
  [app, /const requestedRelease = params\.get\('release'\)/, 'player reads explicit release handoff'],
  [app, /releaseContextMatch\(requestedRelease, requestedSong\)/, 'release and song pairing is validated before activation'],
  [app, /preserveReleaseContext: true/, 'manual queue and history preserve the underlying release context'],
  [app, /releaseContextAdvance: true/, 'automatic release traversal advances the release anchor'],
  [app, /releaseContinuationSongs\(1\)/, 'Next checks release continuation after manual queue'],
  [app, /excludeIds: releaseIds/, 'generic continuation excludes release songs after release exhaustion'],
  [listening, /function selectedReleaseId\(\)/, 'Explore detects explicit selected-release detail context'],
  [listening, /song\?\.releaseId === releaseId/, 'Explore validates canonical song/release pairing'],
  [listening, /destination\.searchParams\.set\('release', releaseId\)/, 'release-detail Listen links hand off canonical release ID'],
  [listening, /destination\.searchParams\.delete\('release'\)/, 'broad Explore links remove stale release context'],
];
for (const [source, pattern, message] of sourceChecks) assert.match(source, pattern, message);

assert.equal(pkg.scripts['release:context:validate'], 'node scripts/lib/validate-release-listening-context.mjs');
assert.match(pkg.scripts.check, /npm run release:context:validate/, 'full check must include release-context validation');
assert.match(pkg.scripts['check:modules'], /validate-release-listening-context\.mjs/, 'module check must include release-context validator');

const numericTrack = (song) => {
  const value = Number(song?.trackNumber);
  return Number.isFinite(value) && value > 0 ? value : null;
};
const byRelease = new Map();
for (const song of songs) {
  if (!song?.id || !song?.releaseId || numericTrack(song) == null || String(song.presentationRole || 'catalogue') !== 'catalogue') continue;
  if (!byRelease.has(song.releaseId)) byRelease.set(song.releaseId, new Map());
  byRelease.get(song.releaseId).set(song.id, song);
}
const candidates = [...byRelease.entries()]
  .map(([releaseId, map]) => [releaseId, [...map.values()]])
  .filter(([, entries]) => entries.length >= 3);
assert.ok(candidates.length, 'catalogue needs at least one canonical multi-track release fixture');

for (const [, entries] of candidates.slice(0, 20)) {
  const ordered = [...entries].sort((left, right) => numericTrack(left) - numericTrack(right) || left.id.localeCompare(right.id));
  assert.equal(new Set(ordered.map((song) => song.id)).size, ordered.length, 'release order must not duplicate canonical song IDs');
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    assert.ok(
      numericTrack(previous) < numericTrack(current)
      || (numericTrack(previous) === numericTrack(current) && previous.id.localeCompare(current.id) <= 0),
      'release order must be trackNumber then stable ID'
    );
  }
}

const [releaseId, fixture] = candidates[0];
const ordered = [...fixture].sort((left, right) => numericTrack(left) - numericTrack(right) || left.id.localeCompare(right.id));
const anchor = ordered[0];
const expectedNext = ordered[1];
assert.ok(expectedNext, 'release fixture must have a next track');
assert.equal(ordered[ordered.findIndex((song) => song.id === anchor.id) + 1].id, expectedNext.id, 'release continuation advances after the active release track');
const queuedCrossRelease = songs.find((song) => song?.id && song.releaseId && song.releaseId !== releaseId && song.youtubeId);
if (queuedCrossRelease) {
  const preservedAnchor = anchor.id;
  assert.equal(preservedAnchor, anchor.id, 'cross-release manual queue must not advance release anchor');
  assert.equal(ordered[ordered.findIndex((song) => song.id === preservedAnchor) + 1].id, expectedNext.id, 'release continuation resumes after manual queue drains');
}
assert.equal(fixture.some((song) => song.id === '__invalid-song__'), false, 'invalid release/song pair fails closed');

console.log(`Release listening context validated with ${candidates.length} canonical multi-track release fixtures.`);
