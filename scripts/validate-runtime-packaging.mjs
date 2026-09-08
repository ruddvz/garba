import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [pages, sw, bootstrap, socialSource, socialInjector] = await Promise.all([
  read('.github/workflows/pages.yml'),
  read('sw.js'),
  read('simple-runtime.js'),
  read('assets/social/playgarba-og-card.svg'),
  read('scripts/lib/inject-social-preview.mjs'),
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

if (/['"]\.\/styles\/[^'"]+['"]/.test(sw)) {
  fail('PWA CORE_SHELL must not precache source CSS layers that Pages does not deploy');
}
if (!sw.includes("const CACHE_NAME = `${CACHE_PREFIX}v9`")) {
  fail('PWA cache generation must be v9 after combining the domain launch refresh with the YouTube playback runtime');
}

for (const marker of [
  'assets/social/playgarba-og-card.svg',
  '_site/assets/social/garba-og-card.png',
  'convert \\',
  "identify -format '%wx%h'",
  'node scripts/lib/inject-social-preview.mjs _site/index.html',
  'summary_large_image',
]) {
  if (!pages.includes(marker)) fail(`Pages social-preview contract is missing: ${marker}`);
}

for (const marker of [
  'width="1200" height="630"',
  '>PlayGarba</text>',
  '>The open Gujarati Garba music archive</text>',
  '>playgarba.com</text>',
]) {
  if (!socialSource.includes(marker)) fail(`Social preview source is missing: ${marker}`);
}

const imageUrl = 'https://playgarba.com/assets/social/garba-og-card.png';
for (const marker of [
  imageUrl,
  'og:image',
  'og:image:width',
  'og:image:height',
  'summary_large_image',
  'twitter:image',
  'Structured-data URL anchor is missing',
]) {
  if (!socialInjector.includes(marker)) fail(`Social metadata injector is missing: ${marker}`);
}
if (socialInjector.includes('ruddvz.github.io/garba')) fail('Social metadata must not regress to the old GitHub Pages URL');

if (failed) process.exit(1);
console.log('✓ Pages ships every direct and transitive playback runtime file');
console.log('✓ PWA precache contains the YouTube engine and split playback runtime');
console.log('✓ provider route safety loads before the YouTube controllable engine');
console.log('✓ split playback runtime stays network-first across installed-app upgrades');
console.log('✓ PlayGarba social previews are generated from a reviewable 1200x630 source and injected at deploy time');
