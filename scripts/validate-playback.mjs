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

const runtime = await readFile(path.join(root, 'playback-status.js'), 'utf8');
for (const marker of ['playbackSources', 'verified-release-source', 'Verified release', 'data-playback-provider', 'GARBA_PLAYBACK_STATUS']) {
  if (!runtime.includes(marker)) fail(`playback-status.js missing route-truth marker: ${marker}`);
}

const html = await readFile(path.join(root, 'index.html'), 'utf8');
if (!html.includes('src="playback-status.js"')) fail('index.html must load playback-status.js');

const sw = await readFile(path.join(root, 'sw.js'), 'utf8');
for (const file of [
  './playback-status.js',
  './data/songs.json',
  './data/playback-sources-generated.json',
  './data/playback-coverage.json',
]) {
  if (!sw.includes(file)) fail(`Service worker must precache playback runtime dependency: ${file}`);
}

if (failed) process.exit(1);
console.log(`✓ ${songs.length}/${songs.length} songs have an actionable playback route`);
console.log(`✓ exact/direct provider mappings: ${localAudio + exactProvider}`);
console.log(`✓ verified release fallbacks: ${verifiedReleaseFallback}`);
console.log('✓ provider status distinguishes exact sources from release-level fallbacks');
console.log('✓ offline PWA shell includes generated songs and playback routing data');
