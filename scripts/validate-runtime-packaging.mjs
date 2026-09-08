import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [pages, sw, bootstrap] = await Promise.all([
  read('.github/workflows/pages.yml'),
  read('sw.js'),
  read('simple-runtime.js'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };
const runtimeFiles = [
  'simple-runtime.js',
  'provider-runtime.js',
  'player-continuity.js',
  'nonstop-browser.js',
  'app.js',
  'sw.js',
];

for (const file of runtimeFiles) {
  if (!pages.includes(file)) fail(`Pages artifact contract does not mention ${file}`);
}

for (const file of ['provider-runtime.js', 'player-continuity.js']) {
  if (!sw.includes(`'./${file}'`)) fail(`PWA core shell does not cache ${file}`);
  if (!sw.includes(`'/${file}'`)) fail(`PWA fresh-runtime list does not include ${file}`);
}

if (!bootstrap.includes('provider-runtime.js') || !bootstrap.includes('player-continuity.js')) {
  fail('Fast bootstrap must load both provider-runtime.js and player-continuity.js');
}
if (bootstrap.indexOf('player-continuity.js') < bootstrap.indexOf('provider-runtime.js')) {
  fail('player-continuity.js must load after provider-runtime.js');
}

if (/['"]\.\/styles\/[^'"]+['"]/.test(sw)) {
  fail('PWA CORE_SHELL must not precache source CSS layers that Pages does not deploy');
}
if (!sw.includes("const CACHE_NAME = `${CACHE_PREFIX}v8`")) {
  fail('PWA cache generation must be v8 after the player-runtime cache refresh');
}

if (failed) process.exit(1);
console.log('✓ Pages ships every direct and transitive playback runtime file');
console.log('✓ PWA precache contains only deployed shell assets and includes the split playback runtime');
console.log('✓ split playback runtime stays network-first across installed-app upgrades');
