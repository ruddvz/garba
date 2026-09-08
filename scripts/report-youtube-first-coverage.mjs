import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const songs = JSON.parse(await readFile(path.join(root, 'data/songs.json'), 'utf8'));

const counters = {
  catalogue: songs.length,
  directAudio: 0,
  youtubeExact: 0,
  youtubeChaptered: 0,
  youtubeUntimestamped: 0,
  youtubeUnchapteredManual: 0,
  youtubeReferenceOnly: 0,
  providerFallback: 0,
  noPlaybackRoute: 0,
};
const byGenre = new Map();
const youtubeSourceTypes = new Map();

function looksYoutube(song) {
  const provider = String(song.playbackProvider || '').toLowerCase();
  const url = String(song.playbackSourceUrl || '').toLowerCase();
  return Boolean(song.youtubeId || provider === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be'));
}

function hasMappedYoutubeStart(song) {
  return Number.isFinite(Number(song.youtubeStartSeconds)) && Number(song.youtubeStartSeconds) >= 0;
}

function bucket(song) {
  if (song.audioUrl) return 'directAudio';
  if (looksYoutube(song)) {
    if (song.playbackSearchOnly || song.playbackSourceType === 'verified-release-track-reference') return 'youtubeReferenceOnly';
    if (song.playbackSourceType === 'verified-unchaptered-youtube-release') return 'youtubeUnchapteredManual';
    if (song.youtubeId || String(song.playbackSourceUrl || '').trim()) return 'youtubeExact';
  }
  if (song.playbackSourceUrl || song.playbackProvider) return 'providerFallback';
  return 'noPlaybackRoute';
}

for (const song of songs) {
  const key = bucket(song);
  counters[key] += 1;
  if (looksYoutube(song)) {
    const sourceType = song.playbackSourceType || 'unspecified';
    youtubeSourceTypes.set(sourceType, (youtubeSourceTypes.get(sourceType) || 0) + 1);
  }
  if (key === 'youtubeExact') {
    if (hasMappedYoutubeStart(song)) counters.youtubeChaptered += 1;
    else counters.youtubeUntimestamped += 1;
  }

  const genre = song.genre || 'unknown';
  if (!byGenre.has(genre)) byGenre.set(genre, { total: 0, direct: 0, youtube: 0, fallback: 0, unavailable: 0 });
  const row = byGenre.get(genre);
  row.total += 1;
  if (key === 'directAudio') row.direct += 1;
  else if (key === 'youtubeExact') row.youtube += 1;
  else if (key === 'noPlaybackRoute') row.unavailable += 1;
  else row.fallback += 1;
}

const oneTap = counters.directAudio + counters.youtubeExact;
const percent = counters.catalogue ? oneTap / counters.catalogue * 100 : 0;
const report = {
  generatedAt: new Date().toISOString(),
  ...counters,
  oneTapPlayable: oneTap,
  oneTapCoveragePercent: Number(percent.toFixed(1)),
  youtubeSourceTypes: Object.fromEntries([...youtubeSourceTypes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  genres: Object.fromEntries([...byGenre.entries()].sort(([a], [b]) => a.localeCompare(b))),
  policy: {
    directAudio: 'Rights-cleared GARBA-hosted audio.',
    youtubeExact: 'YouTube route currently controllable by the official IFrame Player API after generated route-truth classification.',
    youtubeChaptered: 'Controllable YouTube route with an explicit mapped start second, including zero.',
    youtubeUntimestamped: 'Controllable YouTube route without a mapped start; inspect source type before calling it exact-song evidence.',
    youtubeUnchapteredManual: 'Verified multi-song YouTube release without an exact song timestamp; never auto-claimed as the selected track.',
    youtubeReferenceOnly: 'YouTube evidence/reference that is not safe for exact autoplay.',
    providerFallback: 'Apple Music, Spotify or another verified provider route requiring its own player/action.',
  },
};

console.log(JSON.stringify(report, null, 2));
console.error(`YouTube-first one-tap coverage: ${oneTap}/${counters.catalogue} (${percent.toFixed(1)}%)`);
console.error(`Controllable YouTube routes: ${counters.youtubeExact} (${counters.youtubeChaptered} with mapped starts, ${counters.youtubeUntimestamped} without)`);
console.error(`Other provider/manual fallbacks: ${counters.providerFallback + counters.youtubeUnchapteredManual + counters.youtubeReferenceOnly}`);
console.error(`No playback route: ${counters.noPlaybackRoute}`);
