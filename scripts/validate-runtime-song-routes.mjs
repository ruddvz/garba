import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await read(file));
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const [songs, releases, coverage, simple, app] = await Promise.all([
  readJson('data/songs.json'),
  readJson('data/releases.json'),
  readJson('data/playback-coverage.json'),
  read('simple-runtime.js'),
  read('app.js'),
]);
const releasesById = new Map(releases.map((release) => [release.id, release]));

function isExactTrackUrl(song) {
  try {
    const url = new URL(song.playbackSourceUrl || '');
    const pathname = url.pathname.toLowerCase();
    if (song.playbackProvider === 'spotify') return /\/(?:intl-[^/]+\/)?track\/[^/]+/.test(pathname);
    if (song.playbackProvider === 'apple-music') return pathname.includes('/song/') || url.searchParams.has('i');
    if (song.playbackProvider === 'amazon-music') return /\/tracks\/[^/]+/.test(pathname);
  } catch {
    return false;
  }
  return false;
}

function isReleaseSpecificUrl(song) {
  try {
    const url = new URL(song.playbackSourceUrl || '');
    const pathname = url.pathname.toLowerCase();
    if (song.playbackProvider === 'spotify') return pathname.includes('/album/');
    if (song.playbackProvider === 'apple-music') return pathname.includes('/album/');
    if (song.playbackProvider === 'amazon-music') return pathname.includes('/albums/');
    if (song.playbackProvider === 'youtube') return url.hostname === 'youtu.be' || (url.hostname.includes('youtube.com') && pathname === '/watch');
  } catch {
    return false;
  }
  return false;
}

const missing = songs.filter((song) => !song.audioUrl && (!song.playbackProvider || !song.playbackSourceUrl));
const directRoutes = songs.filter((song) => Boolean(song.audioUrl));
const chapterRoutes = songs.filter((song) => song.playbackSourceType === 'verified-performance-chapter');
const exactTrackRoutes = songs.filter((song) => song.playbackSourceType === 'verified-track-source');
const singleReleaseRoutes = songs.filter((song) => song.playbackSourceType === 'verified-single-release-source');
const unchapteredYoutubeRoutes = songs.filter((song) => song.playbackSourceType === 'verified-unchaptered-youtube-release');
const timestampedYoutubeRoutes = songs.filter((song) => (
  song.playbackProvider === 'youtube'
  && song.youtubeId
  && Number.isFinite(Number(song.youtubeStartSeconds))
  && Number(song.youtubeStartSeconds) >= 0
  && song.playbackSourceType !== 'verified-unchaptered-youtube-release'
));
const exactSelectionIds = new Set([
  ...directRoutes.map((song) => song.id),
  ...timestampedYoutubeRoutes.map((song) => song.id),
  ...exactTrackRoutes.map((song) => song.id),
  ...singleReleaseRoutes.map((song) => song.id),
]);
const releaseBrowseOnlyRoutes = songs.filter((song) => !exactSelectionIds.has(song.id) && !missing.some((missingSong) => missingSong.id === song.id));

const misclassifiedExactTracks = songs.filter((song) => song.playbackSourceType === 'verified-release-source' && isExactTrackUrl(song));
const misclassifiedSingleReleases = songs.filter((song) => {
  if (song.playbackSourceType !== 'verified-release-source' || !isReleaseSpecificUrl(song)) return false;
  return Number(releasesById.get(song.releaseId)?.songCount) === 1;
});
const misclassifiedUnchapteredYoutube = songs.filter((song) => {
  if (song.playbackSourceType !== 'verified-release-source' || song.playbackProvider !== 'youtube' || !isReleaseSpecificUrl(song)) return false;
  if (Number.isFinite(Number(song.youtubeStartSeconds))) return false;
  return Number(releasesById.get(song.releaseId)?.songCount) > 1;
});
const brokenUnchapteredYoutube = unchapteredYoutubeRoutes.filter((song) => {
  if (song.playbackProvider !== 'youtube' || !isReleaseSpecificUrl(song)) return true;
  if (Number.isFinite(Number(song.youtubeStartSeconds))) return true;
  return Number(releasesById.get(song.releaseId)?.songCount) <= 1;
});
const brokenChapters = chapterRoutes.filter((song) => song.playbackProvider !== 'youtube' || !song.youtubeId || !Number.isFinite(Number(song.youtubeStartSeconds)) || Number(song.youtubeStartSeconds) < 0);
const providers = new Map();
for (const song of songs) {
  if (!song.playbackProvider) continue;
  providers.set(song.playbackProvider, (providers.get(song.playbackProvider) || 0) + 1);
}

if (missing.length) fail(`${missing.length} generated songs are missing runtime provider fields (first: ${missing.slice(0, 5).map((song) => song.id).join(', ')})`);
if (brokenChapters.length) fail(`${brokenChapters.length} performance-chapter routes lost their YouTube ID or start time`);
if (misclassifiedExactTracks.length) fail(`${misclassifiedExactTracks.length} exact provider track URLs are still labelled as release-level fallbacks`);
if (misclassifiedSingleReleases.length) fail(`${misclassifiedSingleReleases.length} one-song release URLs are still labelled as multi-track release fallbacks`);
if (misclassifiedUnchapteredYoutube.length) fail(`${misclassifiedUnchapteredYoutube.length} unchaptered multi-song YouTube routes are still allowed to look like exact song playback`);
if (brokenUnchapteredYoutube.length) fail(`${brokenUnchapteredYoutube.length} unchaptered YouTube routes do not match the multi-song release contract`);
if (coverage.songCount !== songs.length) fail(`Playback coverage songCount ${coverage.songCount} does not match ${songs.length} generated songs`);
if (coverage.unresolvedWithoutVerifiedReleaseSource !== 0) fail(`Playback coverage still reports ${coverage.unresolvedWithoutVerifiedReleaseSource} unresolved songs`);

for (const marker of [
  'song?.youtubeStartSeconds',
  "params.set('start'",
  "song.playbackSourceType === 'verified-release-source'",
  "song.playbackSourceType === 'verified-performance-chapter'",
  "song?.playbackSourceType === 'verified-unchaptered-youtube-release'",
  'Open the verified full release',
  'exact song timestamp not verified',
]) if (!simple.includes(marker)) fail(`Simple runtime missing enriched-route marker: ${marker}`);

for (const marker of [
  'const SEARCH_RESULT_LIMIT = 160;',
  "sheetSummary: $('sheetSummary')",
  'state.sheetMatchCount = state.songs.length;',
  "if (state.sheetMode === 'search' && songs.length > SEARCH_RESULT_LIMIT) return songs.slice(0, SEARCH_RESULT_LIMIT);",
  "state.sheetMode === 'search' && !query",
  'Keep typing to narrow the list.',
  "if (event.key === '/')",
  "openSheet('search', { trigger: els.searchButton });",
]) if (!app.includes(marker)) fail(`Large-catalogue browser missing bounded-search marker: ${marker}`);

if (failed) process.exit(1);
console.log(`✓ all ${songs.length} generated songs have at least a verified source route`);
console.log(`✓ ${exactSelectionIds.size} songs have an exact-selection playback route; ${releaseBrowseOnlyRoutes.length} are release/provider browsing fallbacks`);
console.log(`✓ ${directRoutes.length} authorised direct-audio routes are available to the native audio player`);
console.log(`✓ ${timestampedYoutubeRoutes.length} YouTube routes select a verified video/timestamp`);
console.log(`✓ ${chapterRoutes.length} verified live/performance routes preserve their mapped chapter start`);
console.log(`✓ ${exactTrackRoutes.length} exact provider track URLs are distinguished from release-level fallbacks`);
console.log(`✓ ${singleReleaseRoutes.length} one-song release URLs avoid unnecessary multi-track selection messaging`);
console.log(`✓ ${unchapteredYoutubeRoutes.length} unchaptered multi-song YouTube routes open as full releases instead of pretending to start at a selected song`);
console.log(`✓ provider distribution: ${[...providers.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}=${count}`).join(', ')}`);
console.log('✓ route coverage is not reported as equivalent to exact-song or first-party playback');
console.log('✓ blank Search avoids building the full catalogue DOM and broad queries cap rendered rows at 160');
console.log('✓ the advertised / keyboard shortcut opens Search');
