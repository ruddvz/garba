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
const manifests = await Promise.all(configured.filter(Boolean).map((file) => readJson(file)));
const sources = Object.assign({}, ...manifests.map((manifest) => manifest?.songSources || {}));

let localAudio = 0;
let exactProvider = 0;
let verifiedReleaseFallback = 0;
const unrouted = [];
const invalidRoutes = [];
const providers = new Map();

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
  providers.set(provider, (providers.get(provider) || 0) + 1);

  if (!provider) invalidRoutes.push(`${song.id}: missing provider`);
  if (sourceUrl && !/^https:\/\//.test(sourceUrl)) invalidRoutes.push(`${song.id}: non-HTTPS sourceUrl`);
  if (!sourceUrl && !youtubeVideo) invalidRoutes.push(`${song.id}: provider route has no sourceUrl/videoId`);

  if (source.sourceType === 'verified-release-source') verifiedReleaseFallback += 1;
  else exactProvider += 1;
}

if (unrouted.length) fail(`${unrouted.length} songs have no direct/provider route: ${unrouted.slice(0, 8).join(', ')}`);
for (const route of invalidRoutes.slice(0, 20)) fail(`Invalid playback route: ${route}`);
if (invalidRoutes.length > 20) fail(`${invalidRoutes.length - 20} additional invalid playback routes`);

if (coverage.songCount !== songs.length) fail(`Playback coverage songCount ${coverage.songCount} does not match ${songs.length}`);
if (coverage.localAudio !== localAudio) fail(`Coverage localAudio ${coverage.localAudio} does not match ${localAudio}`);
if (coverage.explicitProvider !== exactProvider) fail(`Coverage explicitProvider ${coverage.explicitProvider} does not match ${exactProvider}`);
if (coverage.verifiedReleaseFallback !== verifiedReleaseFallback) fail(`Coverage verifiedReleaseFallback ${coverage.verifiedReleaseFallback} does not match ${verifiedReleaseFallback}`);
if (coverage.unresolvedWithoutVerifiedReleaseSource !== 0) fail(`Playback coverage still has ${coverage.unresolvedWithoutVerifiedReleaseSource} unresolved songs`);
if (localAudio + exactProvider + verifiedReleaseFallback !== songs.length) fail('Playback route totals do not cover the full song catalogue');

const core = await readFile(path.join(root, 'playback-bridge.js'), 'utf8');
for (const marker of ['playYouTube(source)', 'playSpotify(source)', 'stopImmediatePropagation', 'provider-dock']) {
  if (!core.includes(marker)) fail(`playback-bridge.js missing in-app core marker: ${marker}`);
}

const routes = await readFile(path.join(root, 'playback-routes.js'), 'utf8');
for (const marker of [
  'appleMusicEmbedUrl', "source?.provider === 'apple-music'", 'openExternalSource',
  'provider-external-action', 'garbaRouteBypass', 'GARBA_PLAYBACK_ROUTES',
  'verified-release-source',
]) {
  if (!routes.includes(marker)) fail(`playback-routes.js missing provider coverage marker: ${marker}`);
}
if (routes.includes('window.open(') || core.includes('window.open(')) fail('Playback routing must not force popups with window.open');

const html = await readFile(path.join(root, 'index.html'), 'utf8');
const routeIndex = html.indexOf('src="playback-routes.js"');
const bridgeIndex = html.indexOf('src="playback-bridge.js"');
if (routeIndex < 0) fail('index.html must load playback-routes.js');
if (bridgeIndex < 0 || routeIndex > bridgeIndex) fail('playback-routes.js must load before playback-bridge.js so unsupported providers can be intercepted first');

const css = await readFile(path.join(root, 'styles/part-7.css'), 'utf8');
for (const marker of ['.playback-status', '.provider-dock.is-apple', '.provider-external-action']) {
  if (!css.includes(marker)) fail(`Final player CSS missing provider coverage marker: ${marker}`);
}

const sw = await readFile(path.join(root, 'sw.js'), 'utf8');
for (const file of [
  './playback-routes.js',
  './data/songs.json',
  './data/playback-sources-generated.json',
  './data/playback-coverage.json',
]) {
  if (!sw.includes(file)) fail(`Service worker must precache playback runtime dependency: ${file}`);
}

if (failed) process.exit(1);
console.log(`✓ ${songs.length}/${songs.length} songs have an actionable provider route`);
console.log(`✓ exact/direct provider mappings: ${localAudio + exactProvider}`);
console.log(`✓ verified release fallbacks: ${verifiedReleaseFallback}`);
console.log(`✓ providers routed: ${[...providers.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(', ')}`);
console.log('✓ YouTube/Spotify stay in the core player; Apple Music embeds in-app; other verified providers degrade to a clear source action');
console.log('✓ provider status distinguishes exact sources from release-level fallbacks');
console.log('✓ offline PWA shell includes generated songs and playback routing data');
