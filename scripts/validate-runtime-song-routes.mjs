import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await read(file));
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const [songs, coverage, simple] = await Promise.all([
  readJson('data/songs.json'),
  readJson('data/playback-coverage.json'),
  read('simple-runtime.js'),
]);

const missing = songs.filter((song) => !song.audioUrl && (!song.playbackProvider || !song.playbackSourceUrl));
const chapterRoutes = songs.filter((song) => song.playbackSourceType === 'verified-performance-chapter');
const brokenChapters = chapterRoutes.filter((song) => song.playbackProvider !== 'youtube' || !song.youtubeId || !Number.isFinite(Number(song.youtubeStartSeconds)) || Number(song.youtubeStartSeconds) < 0);
const providers = new Map();
for (const song of songs) {
  if (!song.playbackProvider) continue;
  providers.set(song.playbackProvider, (providers.get(song.playbackProvider) || 0) + 1);
}

if (missing.length) fail(`${missing.length} generated songs are missing runtime provider fields (first: ${missing.slice(0, 5).map((song) => song.id).join(', ')})`);
if (brokenChapters.length) fail(`${brokenChapters.length} performance-chapter routes lost their YouTube ID or start time`);
if (coverage.songCount !== songs.length) fail(`Playback coverage songCount ${coverage.songCount} does not match ${songs.length} generated songs`);
if (coverage.unresolvedWithoutVerifiedReleaseSource !== 0) fail(`Playback coverage still reports ${coverage.unresolvedWithoutVerifiedReleaseSource} unresolved songs`);

for (const marker of [
  'song?.youtubeStartSeconds',
  "params.set('start'",
  "song.playbackSourceType === 'verified-release-source'",
  "song.playbackSourceType === 'verified-performance-chapter'",
]) if (!simple.includes(marker)) fail(`Simple runtime missing enriched-route marker: ${marker}`);

if (failed) process.exit(1);
console.log(`✓ all ${songs.length} generated songs carry a direct or provider playback route`);
console.log(`✓ ${chapterRoutes.length} verified live/performance routes preserve their mapped chapter start`);
console.log(`✓ provider distribution: ${[...providers.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}=${count}`).join(', ')}`);
