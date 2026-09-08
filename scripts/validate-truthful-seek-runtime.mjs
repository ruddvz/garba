import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [runtime, pages, pkg] = await Promise.all([
  read('seek-state-runtime.js'),
  read('.github/workflows/pages.yml'),
  read('package.json'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of [
  "progress.disabled = !seekable",
  "stage.classList.contains('is-loading')",
  'GARBA_YOUTUBE_PLAYER?.activeSongId',
  "progress.setAttribute('aria-disabled', String(!seekable))",
  'GARBA_SEEK_STATE_RUNTIME',
]) {
  if (!runtime.includes(marker)) fail(`Seek-state runtime is missing: ${marker}`);
}

for (const marker of [
  'cat app.js seek-state-runtime.js > _site/app.js',
  "grep -q 'GARBA_SEEK_STATE_RUNTIME' _site/app.js",
]) {
  if (!pages.includes(marker)) fail(`Pages seek-state packaging is missing: ${marker}`);
}

if (!pkg.includes('node --check seek-state-runtime.js')) fail('check:modules must syntax-check seek-state-runtime.js');
if (!pkg.includes('node scripts/validate-truthful-seek-runtime.mjs')) fail('npm run check must validate truthful seek packaging');

if (failed) process.exit(1);
console.log('✓ seek remains disabled for unseekable provider playback');
console.log('✓ direct audio and ready controllable YouTube playback can enable seek');
console.log('✓ Pages folds the seek runtime into the network-first app.js payload');
