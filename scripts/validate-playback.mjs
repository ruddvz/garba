import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const index = await readJson('data/catalogue/index.json');
const songs = await readJson(index.generatedFiles.songs);
const coverage = await readJson(index.generatedFiles.playbackCoverage);
const configured = Array.isArray(index.playbackSources) ? index.playbackSources : [index.playbackSources];
const manifests = await Promise.all(configured.filter(Boolean).map(readJson));
const sources = Object.assign({}, ...manifests.map((manifest) => manifest?.songSources || {}));

let directAudio = 0;
let songLevelProvider = 0;
let verifiedReleaseFallback = 0;
const releaseProviders = new Map();
const unrouted = [];
const invalid = [];

for (const song of songs) {
  if (song.audioUrl) {
    directAudio += 1;
    if (!/^https:\/\//.test(song.audioUrl)) invalid.push(`${song.id}: non-HTTPS audioUrl`);
    continue;
  }

  const source = sources[song.id];
  if (!source) {
    unrouted.push(song.id);
    continue;
  }

  const provider = String(source.provider || '').trim();
  const sourceUrl = String(source.sourceUrl || '').trim();
  const sourceType = String(source.sourceType || '').trim();
  const youtubeVideo = provider === 'youtube' && String(source.videoId || '').trim();

  if (!provider) invalid.push(`${song.id}: missing provider`);
  if (sourceUrl && !/^https:\/\//.test(sourceUrl)) invalid.push(`${song.id}: non-HTTPS sourceUrl`);
  if (!sourceUrl && !youtubeVideo) invalid.push(`${song.id}: route has no sourceUrl/videoId`);

  if (sourceType === 'verified-release-source') {
    verifiedReleaseFallback += 1;
    releaseProviders.set(provider, (releaseProviders.get(provider) || 0) + 1);
  } else {
    songLevelProvider += 1;
  }
}

if (unrouted.length) fail(`${unrouted.length} songs have no provider/discovery route: ${unrouted.slice(0, 8).join(', ')}`);
for (const route of invalid.slice(0, 20)) fail(`Invalid playback route: ${route}`);
if (invalid.length > 20) fail(`${invalid.length - 20} additional invalid routes`);

if (coverage.songCount !== songs.length) fail(`Playback coverage songCount ${coverage.songCount} does not match ${songs.length}`);
if (coverage.localAudio !== directAudio) fail(`Coverage localAudio ${coverage.localAudio} does not match ${directAudio}`);
if (coverage.explicitProvider !== songLevelProvider) fail(`Coverage explicitProvider ${coverage.explicitProvider} does not match ${songLevelProvider}`);
if (coverage.verifiedReleaseFallback !== verifiedReleaseFallback) fail(`Coverage verifiedReleaseFallback ${coverage.verifiedReleaseFallback} does not match ${verifiedReleaseFallback}`);
if (coverage.unresolvedWithoutVerifiedReleaseSource !== 0) fail(`Playback coverage still has ${coverage.unresolvedWithoutVerifiedReleaseSource} unresolved songs`);
if (directAudio + songLevelProvider + verifiedReleaseFallback !== songs.length) fail('Playback route totals do not cover the full song catalogue');

const bridge = await readFile(path.join(root, 'playback-bridge.js'), 'utf8');
for (const marker of ['isReleaseFallback', 'openVerifiedRelease', 'appleMusicEmbedUrl', 'Verified release', 'performanceFallback']) {
  if (!bridge.includes(marker)) fail(`playback-bridge.js missing playback truth marker: ${marker}`);
}
const status = await readFile(path.join(root, 'playback-status.js'), 'utf8');
for (const marker of ['playbackSources', 'verified-release-source', 'Verified release', 'data-playback-kind', 'GARBA_PLAYBACK_STATUS']) {
  if (!status.includes(marker)) fail(`playback-status.js missing route-status marker: ${marker}`);
}
const html = await readFile(path.join(root, 'index.html'), 'utf8');
if (!html.includes('src="playback-status.js"')) fail('index.html must load playback-status.js');
const sw = await readFile(path.join(root, 'sw.js'), 'utf8');
for (const file of ['./playback-status.js', './data/songs.json', './data/playback-sources-generated.json', './data/playback-coverage.json']) {
  if (!sw.includes(file)) fail(`Service worker must precache route dependency: ${file}`);
}

if (failed) process.exit(1);
console.log(`✓ ${songs.length}/${songs.length} songs have a direct, song-level provider, or verified-release route`);
console.log(`✓ direct/song-level provider routes: ${directAudio + songLevelProvider}`);
console.log(`✓ verified release fallbacks: ${verifiedReleaseFallback}`);
console.log(`✓ release fallback providers: ${[...releaseProviders.entries()].sort().map(([provider, count]) => `${provider}=${count}`).join(', ')}`);
console.log('✓ release-level sources are labelled as release navigation, not song-specific playback');
console.log('✓ installed PWA caches generated route metadata for truthful offline status');
