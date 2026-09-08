import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');

const [runtime, manifestText, pages, pkg, docsIndex, productDoc] = await Promise.all([
  read('assets/runtime/immersive-atmosphere.js'),
  read('data/atmosphere-sources.json'),
  read('.github/workflows/pages.yml'),
  read('package.json'),
  read('docs/README.md'),
  read('docs/product/immersive-atmosphere.md'),
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
]) {
  if (!runtime.includes(marker)) fail(`Atmosphere runtime is missing: ${marker}`);
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
  'assets/runtime/immersive-atmosphere.js',
  "grep -q 'GARBA_ATMOSPHERE' _site/app.js",
]) {
  if (!pages.includes(marker)) fail(`Pages Atmosphere packaging is missing: ${marker}`);
}

if (!pkg.includes('node --check assets/runtime/immersive-atmosphere.js')) fail('check:modules must syntax-check the Atmosphere runtime');
if (!pkg.includes('node scripts/lib/validate-immersive-atmosphere.mjs')) fail('npm run check must validate Atmosphere');
if (!docsIndex.includes('product/immersive-atmosphere.md')) fail('Atmosphere product documentation must be indexed');
for (const marker of ['Immersive 360°', 'Data Saver', 'HRTF', 'public-domain']) {
  if (!productDoc.includes(marker)) fail(`Atmosphere product documentation is missing: ${marker}`);
}

if (failed) process.exit(1);
console.log('✓ Garba Atmosphere runtime, provenance, UX and production packaging are coherent');
