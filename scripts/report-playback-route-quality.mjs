import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const [songs, releases] = await Promise.all([
  readJson('data/songs.json'),
  readJson('data/releases.json'),
]);
const releasesById = new Map(releases.map((release) => [release.id, release]));
const releaseTitleCounts = new Map();
for (const release of releases) {
  const title = String(release?.title || '').trim();
  if (!title) continue;
  releaseTitleCounts.set(title, (releaseTitleCounts.get(title) || 0) + 1);
}

function exactSelection(song) {
  if (song.audioUrl) return true;
  if (song.playbackSourceType === 'verified-track-source') return true;
  if (song.playbackSourceType === 'verified-single-release-source') return true;
  return song.playbackProvider === 'youtube'
    && song.youtubeId
    && Number.isFinite(Number(song.youtubeStartSeconds))
    && Number(song.youtubeStartSeconds) >= 0
    && song.playbackSourceType !== 'verified-release-track-reference'
    && song.playbackSourceType !== 'verified-unchaptered-youtube-release';
}

function releaseDisplayTitle(release, releaseId) {
  const title = release?.title || releaseId;
  return releaseTitleCounts.get(title) > 1 ? `${title} [${releaseId}]` : title;
}

const exact = songs.filter(exactSelection);
const fallbacks = songs.filter((song) => !exactSelection(song));
const references = fallbacks.filter((song) => song.playbackSourceType === 'verified-release-track-reference');

const groups = new Map();
for (const song of fallbacks) {
  const releaseId = song.releaseId || '(no release)';
  const key = `${releaseId}\u0000${song.playbackProvider || 'unknown'}\u0000${song.playbackSourceType || 'unknown'}`;
  const group = groups.get(key) || {
    releaseId,
    provider: song.playbackProvider || 'unknown',
    sourceType: song.playbackSourceType || 'unknown',
    songs: [],
  };
  group.songs.push(song);
  groups.set(key, group);
}

const ranked = [...groups.values()]
  .map((group) => {
    const release = releasesById.get(group.releaseId);
    return {
      ...group,
      releaseTitle: releaseDisplayTitle(release, group.releaseId),
      releaseArtist: release?.artist || '',
      label: release?.label || null,
      count: group.songs.length,
    };
  })
  .sort((a, b) => b.count - a.count || a.releaseTitle.localeCompare(b.releaseTitle));

console.log(`GARBA playback route quality · ${songs.length} songs`);
console.log(`Exact selection: ${exact.length}`);
console.log(`Release/provider fallback: ${fallbacks.length}`);
console.log(`Reference-track safety blocks: ${references.length}`);
console.log('');
console.log('Highest-impact fallback batches:');
for (const group of ranked.slice(0, 30)) {
  const label = group.label ? ` · ${group.label}` : '';
  console.log(`${String(group.count).padStart(3)} · ${group.releaseTitle} · ${group.provider} · ${group.sourceType}${label}`);
}

console.log('');
console.log('Reference-track batches needing exact song mapping or a proper release source:');
for (const group of ranked.filter((entry) => entry.sourceType === 'verified-release-track-reference')) {
  console.log(`${String(group.count).padStart(3)} · ${group.releaseTitle} · ${group.provider} · ${group.releaseArtist}`);
}
