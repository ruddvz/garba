import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const [songs, releases] = await Promise.all([
  readJson('data/songs.json'),
  readJson('data/releases.json'),
]);

const releaseById = new Map(releases.map((release) => [release.id, release]));
const releaseFallbacks = songs.filter((song) => song.playbackSourceType === 'verified-release-source');

function frictionTier(song) {
  if (song.audioUrl) return 'rights-cleared-direct';
  if (song.playbackProvider === 'youtube') {
    if (song.playbackSourceType === 'verified-unchaptered-youtube-release') return 'public-full-release-not-exact';
    return 'public-in-app';
  }
  if (['soundcloud', 'bandcamp'].includes(song.playbackProvider)) return 'public-provider';
  if (['spotify', 'apple-music'].includes(song.playbackProvider)) return 'account-or-subscription-risk';
  if (['amazon-music', 'external', 'qobuz'].includes(song.playbackProvider)) return 'external-high-friction';
  return 'other-provider';
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item) || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

const friction = countBy(songs, frictionTier);
const fallbackProviders = countBy(releaseFallbacks, (song) => song.playbackProvider);
const fallbackLabels = countBy(releaseFallbacks, (song) => releaseById.get(song.releaseId)?.label || 'unknown');
const fallbackReleases = countBy(releaseFallbacks, (song) => {
  const release = releaseById.get(song.releaseId);
  return release ? `${release.title} · ${release.artist} · ${release.label || 'unknown label'} · ${release.id}` : song.releaseId;
});

console.log(`GARBA playback friction report · ${songs.length} songs`);
console.log(`Genuine release-level fallbacks: ${releaseFallbacks.length}`);
console.log('');
console.log('Runtime friction tiers:');
for (const [name, count] of friction) console.log(`${String(count).padStart(4)} · ${name}`);
console.log('');
console.log('Release-level fallbacks by provider:');
for (const [name, count] of fallbackProviders) console.log(`${String(count).padStart(4)} · ${name}`);
console.log('');
console.log('Top release-level fallback labels:');
for (const [name, count] of fallbackLabels.slice(0, 25)) console.log(`${String(count).padStart(4)} · ${name}`);
console.log('');
console.log('Top release-level fallback releases:');
for (const [name, count] of fallbackReleases.slice(0, 35)) console.log(`${String(count).padStart(4)} · ${name}`);
