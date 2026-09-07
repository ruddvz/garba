import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await read(file));
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const [songs, coverage, simple, app] = await Promise.all([
  readJson('data/songs.json'),
  readJson('data/playback-coverage.json'),
  read('simple-runtime.js'),
  read('app.js'),
]);

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

const missing = songs.filter((song) => !song.audioUrl && (!song.playbackProvider || !song.playbackSourceUrl));
const chapterRoutes = songs.filter((song) => song.playbackSourceType === 'verified-performance-chapter');
const exactTrackRoutes = songs.filter((song) => song.playbackSourceType === 'verified-track-source');
const misclassifiedExactTracks = songs.filter((song) => song.playbackSourceType === 'verified-release-source' && isExactTrackUrl(song));
const brokenChapters = chapterRoutes.filter((song) => song.playbackProvider !== 'youtube' || !song.youtubeId || !Number.isFinite(Number(song.youtubeStartSeconds)) || Number(song.youtubeStartSeconds) < 0);
const providers = new Map();
for (const song of songs) {
  if (!song.playbackProvider) continue;
  providers.set(song.playbackProvider, (providers.get(song.playbackProvider) || 0) + 1);
}

if (missing.length) fail(`${missing.length} generated songs are missing runtime provider fields (first: ${missing.slice(0, 5).map((song) => song.id).join(', ')})`);
if (brokenChapters.length) fail(`${brokenChapters.length} performance-chapter routes lost their YouTube ID or start time`);
if (misclassifiedExactTracks.length) fail(`${misclassifiedExactTracks.length} exact provider track URLs are still labelled as release-level fallbacks`);
if (coverage.songCount !== songs.length) fail(`Playback coverage songCount ${coverage.songCount} does not match ${songs.length} generated songs`);
if (coverage.unresolvedWithoutVerifiedReleaseSource !== 0) fail(`Playback coverage still reports ${coverage.unresolvedWithoutVerifiedReleaseSource} unresolved songs`);

for (const marker of [
  'song?.youtubeStartSeconds',
  "params.set('start'",
  "song.playbackSourceType === 'verified-release-source'",
  "song.playbackSourceType === 'verified-performance-chapter'",
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
console.log(`✓ all ${songs.length} generated songs carry a direct or provider playback route`);
console.log(`✓ ${chapterRoutes.length} verified live/performance routes preserve their mapped chapter start`);
console.log(`✓ ${exactTrackRoutes.length} exact provider track URLs are distinguished from release-level fallbacks`);
console.log(`✓ provider distribution: ${[...providers.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}=${count}`).join(', ')}`);
console.log('✓ blank Search avoids building the full catalogue DOM and broad queries cap rendered rows at 160');
console.log('✓ the advertised / keyboard shortcut opens Search');
