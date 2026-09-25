import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const exists = async (file) => { try { await access(path.join(root, file)); return true; } catch { return false; } };

const [runtime, manifestText, provider, sw] = await Promise.all([
  read('assets/runtime/immersive-atmosphere.js'),
  read('data/atmosphere-sources.json'),
  read('provider-runtime.js'),
  read('sw.js'),
]);

const manifest = JSON.parse(manifestText);
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

// Engine, player integration and accessibility contract
for (const marker of [
  'GARBA_ATMOSPHERE',
  'GARBA_ATMOSPHERE_ENGINE',
  'HRTF',
  'createConvolver',
  'createDynamicsCompressor',
  'prefers-reduced-motion: reduce',
  'constrainedConnection',
  "app.classList.contains('is-playing')",
  'document.hidden',
  'garba:atmosphere-change',
  "aria-modal', 'true'",
  'setBackgroundInert',
  'navigator.audioSession',
  'Party plot',
  'Sheri',
  'Hall',
  'Full circle',
  'Tap the beat',
  'Be tali',
  'Tran tali',
]) {
  if (!runtime.includes(marker)) fail(`Atmosphere runtime is missing: ${marker}`);
}

for (const marker of [
  '<h2 id="atmosphereTitle">Garba Atmosphere</h2>',
  'class="atmosphere-test"',
  'aria-label="Test Garba Atmosphere"',
  'class="atmosphere-headphone-icon"',
  'class="atmosphere-status" role="status" aria-live="polite"',
  '.atmosphere-status{position:absolute!important;width:1px!important;',
  'type="range" min="5" max="100" step="5"',
  'setTimeout(() => stopPreview({ announce: false }), 6000)',
  'if (state.previewActive) { stopPreview(); return; }',
  'if (active) stopPreview({ announce: false });',
  "state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return 0;",
]) {
  if (!runtime.includes(marker)) fail(`Compact Atmosphere/Test contract is missing: ${marker}`);
}

// Truthfulness: the song is never processed, and the panel says so.
if (!runtime.includes('The song itself plays as YouTube sends it.')) {
  fail('Atmosphere panel must say the song itself is not processed');
}
if (/\bIndoor\b|\bOutdoor\b|Acoustic Space|Soundstage/.test(runtime)) {
  fail('Provider-backed playback must not expose fake source-processing Soundstage modes');
}
if (/youtubeStage[^\n]*createMediaElementSource|createMediaElementSource\([^)]*youtube/i.test(runtime)) {
  fail('Atmosphere must not attempt to process the YouTube player');
}

// Rhythm: claps are synthesised and follow the listener's taps, never a looped recording.
for (const retired of ['rhythmic-clapping.ogg', 'ground-applause.ogg', 'Palmas', '160 BPM']) {
  if (runtime.includes(retired)) fail(`Retired Atmosphere recording is referenced by the runtime: ${retired}`);
}
for (const marker of ['function buildClap(', 'function buildStick(', 'function schedule(until)', 'async function registerTap()', 'setTempo(bpm, firstBeat)']) {
  if (!runtime.includes(marker)) fail(`Beat-locked synthesis contract is missing: ${marker}`);
}
if (/setTimeout\([^)]*playTransient|Math\.random\(\) < 0\.35 \? 'applause'/.test(runtime)) {
  fail('Claps and sticks must be scheduled on the beat, not at random intervals');
}

for (const retired of [
  'Place a subtle venue layer beneath the song',
  'Live Ground can add a very quiet public-domain',
  'Paused with the music',
  '>Headphones<',
]) {
  if (runtime.includes(retired)) fail(`Retired Atmosphere panel copy returned: ${retired}`);
}

const setModeStart = runtime.indexOf('async function setMode(');
const syncPlaybackStart = runtime.indexOf('function syncPlaybackState()', setModeStart);
if (setModeStart < 0 || syncPlaybackStart <= setModeStart) {
  fail('Atmosphere mode/playback synchronisation functions are missing');
} else {
  const setModeSource = runtime.slice(setModeStart, syncPlaybackStart);
  if (setModeSource.includes('previewCurrentMode(')) {
    fail('Selecting an Atmosphere mode while paused must not auto-preview it');
  }
  if (!setModeSource.includes('if (state.playbackActive) await buildScene({ smooth: true });\n    else scheduleIdleSuspend();')) {
    fail('Mode selection must follow real playback and otherwise stay quiet');
  }
}

const syncPlaybackSource = syncPlaybackStart >= 0
  ? runtime.slice(syncPlaybackStart, runtime.indexOf('function trustedPlaybackUnlock(', syncPlaybackStart))
  : '';
if (!syncPlaybackSource.includes('} else if (!state.previewActive) {\n      applyMasterLevel({ quick: true });\n      scheduleIdleSuspend();')) {
  fail('Ordinary pause must silence Atmosphere unless an explicit Test is active');
}

for (const marker of [
  'function loadAtmosphereRuntime()',
  "script.src = 'assets/runtime/immersive-atmosphere.js'",
  'loadAtmosphereRuntime();',
]) {
  if (!provider.includes(marker)) fail(`Playback bootstrap is missing Atmosphere loader: ${marker}`);
}

// Source manifest
if (manifest.version !== '2.0.0') fail('Atmosphere source manifest version must be 2.0.0');
if (manifest.runtimePolicy?.allowRemoteOnDataSaver !== false) fail('Remote Atmosphere audio must stay disabled on Data Saver');
if (manifest.runtimePolicy?.requireNoEmbeddedMusic !== true) fail('Atmosphere sources must reject embedded music');
if (manifest.runtimePolicy?.fallback !== 'procedural-local-scene') fail('Atmosphere must retain its procedural local fallback');
if (manifest.runtimePolicy?.songProcessing !== 'none') fail('Atmosphere manifest must declare that songs are not processed');

const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
const enabledSources = sources.filter((source) => source.enabled);
if (!enabledSources.length) fail('At least one enabled Atmosphere ambience source is required');
const localOrHttps = (url) => /^https:\/\//.test(url) || /^assets\/audio\/[a-z0-9-]+\.(ogg|m4a)$/.test(url);
for (const source of enabledSources) {
  if (source.license !== 'public-domain') fail(`Enabled Atmosphere source ${source.id} must be public-domain`);
  if (source.containsMusic !== false) fail(`Enabled Atmosphere source ${source.id} must explicitly contain no music`);
  if (!/^https:\/\//.test(source.sourcePage || '')) fail(`Enabled Atmosphere source ${source.id} must cite its source page`);
  const urls = [source.audioUrl, ...(source.files || []).map((file) => file.url)].filter(Boolean);
  if (!urls.length) fail(`Enabled Atmosphere source ${source.id} has no audio file`);
  for (const url of urls) {
    if (!localOrHttps(url)) fail(`Atmosphere source ${source.id} must use HTTPS or a bundled assets/audio file: ${url}`);
    if (!/^https:/.test(url) && !await exists(url)) fail(`Atmosphere source ${source.id} file is missing: ${url}`);
  }
}
for (const source of sources.filter((item) => item.license !== 'public-domain')) {
  if (source.enabled) fail(`Non-public-domain Atmosphere source ${source.id} must stay disabled`);
}

for (const marker of [
  "'./assets/runtime/immersive-atmosphere.js'",
  "'/assets/runtime/immersive-atmosphere.js'",
]) {
  if (!sw.includes(marker)) fail(`PWA Atmosphere packaging is missing: ${marker}`);
}
// Anything sw.js precaches must still exist, or the service worker install fails.
for (const match of sw.matchAll(/'\.\/(assets\/audio\/[^']+)'/g)) {
  if (!await exists(match[1])) fail(`sw.js precaches a missing Atmosphere file: ${match[1]}`);
}

if (failed) process.exit(1);
console.log('✓ Garba Atmosphere venues, beat-locked claps, truthful copy, public-domain sources and PWA packaging are coherent');
