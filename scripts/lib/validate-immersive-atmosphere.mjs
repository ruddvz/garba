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
console.log('✓ Garba Atmosphere runtime, source policy, visible boot path and PWA packaging are coherent');
