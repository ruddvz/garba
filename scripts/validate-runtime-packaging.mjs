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
const automixAudioRuntime = 'assets/runtime/automix-web-audio.js';

for (const file of runtimeFiles) {
  if (!pages.includes(file)) fail(`Pages artifact contract does not mention ${file}`);
}
if (!pages.includes('cp -R assets data _site/')) fail('Pages artifact must copy assets so the AutoMix compatibility runtime is deployed');

for (const file of ['provider-runtime.js', 'player-continuity.js', 'youtube-player-runtime.js']) {
  if (!sw.includes(`'./${file}'`)) fail(`PWA core shell does not cache ${file}`);
  if (!sw.includes(`'/${file}'`)) fail(`PWA fresh-runtime list does not include ${file}`);
}
if (!sw.includes(`'./${automixAudioRuntime}'`)) fail('PWA core shell does not cache the AutoMix compatibility runtime');
if (!sw.includes(`'/${automixAudioRuntime}'`)) fail('PWA fresh-runtime list does not include the AutoMix compatibility runtime');

for (const file of ['provider-runtime.js', 'player-continuity.js', automixAudioRuntime, 'youtube-player-runtime.js']) {
  if (!bootstrap.includes(file)) fail(`Fast bootstrap must load ${file}`);
}
const providerIndex = bootstrap.indexOf('provider-runtime.js');
const continuityIndex = bootstrap.indexOf('player-continuity.js');
const automixAudioIndex = bootstrap.indexOf(automixAudioRuntime);
const youtubeIndex = bootstrap.indexOf('youtube-player-runtime.js');
if (!(providerIndex >= 0 && continuityIndex > providerIndex && automixAudioIndex > continuityIndex && youtubeIndex > automixAudioIndex)) {
  fail('Playback runtime order must be provider-runtime.js → player-continuity.js → AutoMix audio compatibility → youtube-player-runtime.js');
}

if (/['"]\.\/styles\/[^'"]+['"]/.test(sw)) {
  fail('PWA CORE_SHELL must not precache source CSS layers that Pages does not deploy');
}
if (!sw.includes("const CACHE_NAME = `${CACHE_PREFIX}v9`")) {
  fail('PWA cache generation must be v9 after combining the domain launch refresh with the YouTube playback runtime');
}

if (failed) process.exit(1);
console.log('✓ Pages ships every direct and transitive playback runtime file');
console.log('✓ PWA precache contains the YouTube engine and AutoMix compatibility runtime');
console.log('✓ provider route safety loads before AutoMix compatibility and YouTube control');
console.log('✓ split playback runtime stays network-first across installed-app upgrades');
