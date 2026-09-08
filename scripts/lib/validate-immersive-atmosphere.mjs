import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [runtime, manifestText, bootstrap, sw, packageText] = await Promise.all([
  read('assets/runtime/immersive-atmosphere.js'),
  read('data/atmosphere-sources.json'),
  read('simple-runtime.js'),
  read('sw.js'),
  read('package.json'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of [
  "const STORAGE_KEY = 'garba:atmosphere';",
  "label: 'Courtyard'",
  "label: 'Live Ground'",
  "label: 'Immersive 360°'",
  "panner.panningModel = hrtf ? 'HRTF' : 'equalpower'",
  'createNoiseBuffer',
  'playStick',
  'playClap',
  'startOrbit',
  'data/atmosphere-sources.json',
  'window.GARBA_ATMOSPHERE',
  "get spatialModel() { return state.mode === 'immersive' ? 'HRTF' : 'stereo-plus-spatial-events'; }",
]) {
  if (!runtime.includes(marker)) fail(`Immersive atmosphere runtime missing marker: ${marker}`);
}

if (!runtime.includes("sourceMeta.license !== 'public-domain'")) {
  fail('Remote atmosphere audio must be gated to public-domain source metadata');
}
if (!runtime.includes("if (!buffer && generation === state.generation) setStatus('Using offline spatial ambience. Crowd bed could not load.')")) {
  fail('Remote crowd failure must fall back to local spatial ambience');
}
if (!runtime.includes("document.addEventListener('visibilitychange', applyMasterLevel)")) {
  fail('Atmosphere must mute when the page is hidden');
}

let manifest;
try { manifest = JSON.parse(manifestText); }
catch { fail('data/atmosphere-sources.json must be valid JSON'); manifest = {}; }
const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
const crowd = sources.find((source) => source.enabled && source.role === 'crowd-bed');
if (!crowd) fail('Atmosphere source manifest must contain one enabled crowd bed');
if (crowd?.license !== 'public-domain') fail('Enabled crowd bed must be public domain');
if (crowd && crowd.channels !== 2) fail('Enabled crowd bed must be stereo');
if (crowd && !String(crowd.sourcePage || '').startsWith('https://commons.wikimedia.org/')) fail('Crowd-bed provenance must link to its Commons source page');
if (crowd && !String(crowd.audioUrl || '').startsWith('https://upload.wikimedia.org/')) fail('Crowd-bed audio URL must point to the verified Wikimedia media host');

const runtimeName = 'assets/runtime/immersive-atmosphere.js';
if (!bootstrap.includes(runtimeName)) fail('Fast bootstrap must load the immersive atmosphere runtime');
if (!sw.includes(`'./${runtimeName}'`)) fail('PWA core shell must cache the immersive atmosphere runtime');
if (!sw.includes(`'/${runtimeName}'`)) fail('PWA fresh-runtime list must keep the atmosphere runtime network-first');

const packageJson = JSON.parse(packageText);
const scripts = packageJson.scripts || {};
if (!scripts['check:modules']?.includes(runtimeName)) fail('check:modules must syntax-check immersive-atmosphere.js');
if (!scripts.check?.includes('scripts/lib/validate-immersive-atmosphere.mjs')) fail('npm run check must validate immersive atmosphere');

if (failed) process.exit(1);
console.log('✓ Garba Atmosphere exposes Off, Courtyard, Live Ground and HRTF Immersive 360° modes');
console.log('✓ public-domain stereo crowd provenance is explicit and remote failure falls back offline');
console.log('✓ atmosphere runtime is packaged into the fast bootstrap and installed PWA shell');
