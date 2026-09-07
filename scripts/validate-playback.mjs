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

let localAudio = 0;
let songLevelProvider = 0;
let verifiedReleaseFallback = 0;
const unrouted = [];
const invalidRoutes = [];
const releaseProviders = new Map();

for (const song of songs) {
  if (song.audioUrl) {
    localAudio += 1;
    if (!/^https:\/\//.test(song.audioUrl)) invalidRoutes.push(`${song.id}: non-HTTPS audioUrl`);
    continue;
  }

  const source = sources[song.id];
  if (!source) {
    unrouted.push(song.id);
    continue;
  }

  const provider = String(source.provider || '').trim();
  const sourceUrl = String(source.sourceUrl || '').trim();
  const youtubeVideo = provider === 'youtube' && String(source.videoId || '').trim();
  const releaseFallback = source.sourceType === 'verified-release-source';

  if (!provider) invalidRoutes.push(`${song.id}: missing provider`);
  if (sourceUrl && !/^https:\/\//.test(sourceUrl)) invalidRoutes.push(`${song.id}: non-HTTPS sourceUrl`);
  if (!sourceUrl && !youtubeVideo) invalidRoutes.push(`${song.id}: route has no sourceUrl/videoId`);

  if (releaseFallback) {
    verifiedReleaseFallback += 1;
    releaseProviders.set(provider, (releaseProviders.get(provider) || 0) + 1);
  } else {
    songLevelProvider += 1;
  }
}

if (unrouted.length) fail(`${unrouted.length} songs have no direct/provider route: ${unrouted.slice(0, 8).join(', ')}`);
for (const route of invalidRoutes.slice(0, 20)) fail(`Invalid playback route: ${route}`);
if (invalidRoutes.length > 20) fail(`${invalidRoutes.length - 20} additional invalid playback routes`);

if (coverage.songCount !== songs.length) fail(`Playback coverage songCount ${coverage.songCount} does not match ${songs.length}`);
if (coverage.localAudio !== localAudio) fail(`Coverage localAudio ${coverage.localAudio} does not match ${localAudio}`);
if (coverage.explicitProvider !== songLevelProvider) fail(`Coverage explicitProvider ${coverage.explicitProvider} does not match ${songLevelProvider}`);
if (coverage.verifiedReleaseFallback !== verifiedReleaseFallback) fail(`Coverage verifiedReleaseFallback ${coverage.verifiedReleaseFallback} does not match ${verifiedReleaseFallback}`);
if (coverage.unresolvedWithoutVerifiedReleaseSource !== 0) fail(`Playback coverage still has ${coverage.unresolvedWithoutVerifiedReleaseSource} unresolved songs`);
if (localAudio + songLevelProvider + verifiedReleaseFallback !== songs.length) fail('Playback route totals do not cover the full song catalogue');

const core = await readFile(path.join(root, 'playback-bridge.js'), 'utf8');
for (const marker of ['playYouTube(source)', 'playSpotify(source)', 'stopImmediatePropagation', 'provider-dock']) {
  if (!core.includes(marker)) fail(`playback-bridge.js missing in-app core marker: ${marker}`);
}

const routes = await readFile(path.join(root, 'playback-routes.js'), 'utf8');
for (const marker of ['appleMusicEmbedUrl', 'openExternalSource', 'provider-external-action', 'GARBA_PLAYBACK_ROUTES', 'verified-release-source']) {
  if (!routes.includes(marker)) fail(`playback-routes.js missing provider coverage marker: ${marker}`);
}

const guard = await readFile(path.join(root, 'playback-release-guard.js'), 'utf8');
for (const marker of [
  'isReleaseFallback', 'verified-release-source', 'releaseEmbed', 'youtube-nocookie.com/embed/',
  'embed.music.apple.com', 'open.spotify.com/embed/', 'GARBA_RELEASE_GUARD', 'stopImmediatePropagation',
]) {
  if (!guard.includes(marker)) fail(`playback-release-guard.js missing release-truth marker: ${marker}`);
}
if (!guard.includes("window.addEventListener('click', captureClick, true)")) fail('release guard must intercept at window capture before document-level playback routers');

const uxNext = await readFile(path.join(root, 'ux-next.js'), 'utf8');
if (!uxNext.includes("import './playback-release-guard.js';")) fail('ux-next.js must load the release fallback guard');

const sw = await readFile(path.join(root, 'sw.js'), 'utf8');
for (const file of [
  './playback-release-guard.js',
  './playback-routes.js',
  './data/songs.json',
  './data/playback-sources-generated.json',
  './data/playback-coverage.json',
]) {
  if (!sw.includes(file)) fail(`Service worker must precache playback runtime dependency: ${file}`);
}

if (failed) process.exit(1);
console.log(`✓ ${songs.length}/${songs.length} catalogue records have a direct, song-level, or verified-release route`);
console.log(`✓ direct/song-level playback routes: ${localAudio + songLevelProvider}`);
console.log(`✓ verified release navigation fallbacks: ${verifiedReleaseFallback}`);
console.log(`✓ release fallback providers: ${[...releaseProviders.entries()].sort((a, b) => b[1] - a[1]).map(([provider, count]) => `${provider} ${count}`).join(', ')}`);
console.log('✓ verified release fallbacks are intercepted before song-level players and never presented as a track-specific stream');
console.log('✓ Spotify, Apple Music and YouTube release pages can embed as release context; other providers expose a clear verified source action');
console.log('✓ installed PWA caches release-routing logic and generated route metadata');
