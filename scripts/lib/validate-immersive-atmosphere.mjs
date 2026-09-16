import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');

const [runtime, manifestText, provider, sw] = await Promise.all([
  read('assets/runtime/immersive-atmosphere.js'),
  read('data/atmosphere-sources.json'),
  read('provider-runtime.js'),
  read('sw.js'),
]);

const manifest = JSON.parse(manifestText);
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of [
  'GARBA_ATMOSPHERE',
  'HRTF',
  'createDynamicsCompressor',
  'prefers-reduced-motion: reduce',
  'constrainedConnection',
  "app.classList.contains('is-playing')",
  'document.hidden',
  'garba:atmosphere-change',
  "aria-modal', 'true'",
  'setBackgroundInert',
  'Immersive 360°',
  'Courtyard',
  'Live Ground',
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
  'if (!profile?.crowd || constrainedConnection()) return;',
  "state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return;",
]) {
  if (!runtime.includes(marker)) fail(`Compact Atmosphere/Test contract is missing: ${marker}`);
}

for (const retired of [
  'Place a subtle venue layer beneath the song',
  'Live Ground can add a very quiet public-domain',
  'Paused with the music',
  '>Headphones<',
]) {
  if (runtime.includes(retired)) fail(`Retired Atmosphere panel copy returned: ${retired}`);
}
if (runtime.includes('state.previewActive || constrainedConnection()')) {
  fail('Test preview must not suppress the selected crowd bed');
}
if (/\bIndoor\b|\bOutdoor\b/.test(runtime)) {
  fail('Provider-backed playback must not expose fake source-processing Soundstage modes');
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

if (manifest.version !== '1.1.0') fail('Atmosphere source manifest version must be 1.1.0');
if (manifest.runtimePolicy?.allowRemoteOnDataSaver !== false) fail('Remote Atmosphere audio must stay disabled on Data Saver');
if (manifest.runtimePolicy?.requireNoEmbeddedMusic !== true) fail('Atmosphere remote sources must reject embedded music');
if (manifest.runtimePolicy?.fallback !== 'procedural-local-scene') fail('Atmosphere must retain its procedural local fallback');

const enabledSources = Array.isArray(manifest.sources) ? manifest.sources.filter((source) => source.enabled) : [];
if (!enabledSources.length) fail('At least one enabled Atmosphere ambience source is required');
for (const source of enabledSources) {
  if (source.license !== 'public-domain') fail(`Enabled Atmosphere source ${source.id} must be public-domain`);
  if (source.containsMusic !== false) fail(`Enabled Atmosphere source ${source.id} must explicitly contain no music`);
  if (!/^https:\/\//.test(source.audioUrl || '')) fail(`Enabled Atmosphere source ${source.id} must use HTTPS`);
}

for (const marker of [
  "'./assets/runtime/immersive-atmosphere.js'",
  "'/assets/runtime/immersive-atmosphere.js'",
]) {
  if (!sw.includes(marker)) fail(`PWA Atmosphere packaging is missing: ${marker}`);
}

if (failed) process.exit(1);
console.log('✓ Garba Atmosphere compact UI, Test playback, source policy, visible boot path and PWA packaging are coherent');
