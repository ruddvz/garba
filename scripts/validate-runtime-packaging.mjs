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
  'youtube-player-runtime.js',
  'nonstop-browser.js',
  'app.js',
  'sw.js',
];

for (const file of runtimeFiles) {
  if (!pages.includes(file)) fail(`Pages artifact contract does not mention ${file}`);
}

for (const file of ['provider-runtime.js', 'player-continuity.js', 'youtube-player-runtime.js']) {
  if (!sw.includes(`'./${file}'`)) fail(`PWA core shell does not cache ${file}`);
  if (!sw.includes(`'/${file}'`)) fail(`PWA fresh-runtime list does not include ${file}`);
}

for (const file of ['provider-runtime.js', 'player-continuity.js', 'youtube-player-runtime.js']) {
  if (!bootstrap.includes(file)) fail(`Fast bootstrap must load ${file}`);
}
const providerIndex = bootstrap.indexOf('provider-runtime.js');
const continuityIndex = bootstrap.indexOf('player-continuity.js');
const youtubeIndex = bootstrap.indexOf('youtube-player-runtime.js');
if (!(providerIndex >= 0 && continuityIndex > providerIndex && youtubeIndex > continuityIndex)) {
  fail('Playback runtime order must be provider-runtime.js → player-continuity.js → youtube-player-runtime.js');
}

const q90Pack = 'garba15-2048-q90.zip';
const q90Sha = '4690046d30ecd5400b3fc953a2a93f877d64921a69955d2b5dc6aa0bd65a769d';
const legacyPack = 'garba15-2k.zip';
const q82Pack = 'garba15-2k-q82.zip';
for (const marker of [q90Pack, q90Sha, legacyPack, q82Pack, 'Deploying visual pack: $PACK']) {
  if (!pages.includes(marker)) fail(`Pages visual-pack contract is missing ${marker}`);
}
const q90Index = pages.indexOf(q90Pack);
const legacyIndex = pages.indexOf(legacyPack);
const q82Index = pages.indexOf(q82Pack);
if (!(q90Index >= 0 && legacyIndex > q90Index && q82Index > legacyIndex)) {
  fail('Pages must prefer Q90, then current 2K, then named Q82 fallback');
}
if (!pages.includes("rm -f _site/assets/backgrounds/library/*.webp")) {
  fail('Pages must clear stale extracted WebPs before unpacking the selected visual pack');
}
if (!pages.includes("test \"$WEBP_COUNT\" -eq 15")) {
  fail('Pages must require exactly 15 extracted WebPs');
}
if (!pages.includes("file \"$image\" | grep -q 'Web/P image'")) {
  fail('Pages must validate every extracted artwork file as WebP data');
}
if (!pages.includes('rm -f _site/assets/backgrounds/garba15-*.zip')) {
  fail('Pages must remove source visual-pack archives from the public artifact');
}

if (/['"]\.\/styles\/[^'"]+['"]/.test(sw)) {
  fail('PWA CORE_SHELL must not precache source CSS layers that Pages does not deploy');
}
if (!sw.includes("const CACHE_NAME = `${CACHE_PREFIX}v9`")) {
  fail('PWA cache generation must be v9 after combining the domain launch refresh with the YouTube playback runtime');
}

if (failed) process.exit(1);
console.log('✓ Pages ships every direct and transitive playback runtime file');
console.log('✓ PWA precache contains the YouTube engine and split playback runtime');
console.log('✓ provider route safety loads before the YouTube controllable engine');
console.log('✓ split playback runtime stays network-first across installed-app upgrades');
console.log('✓ Pages prefers the checksum-pinned Q90 visual pack and keeps legacy packs as fallback only');
console.log('✓ Pages verifies exactly 15 WebPs and strips source visual-pack ZIPs');
