import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [pages, sw, bootstrap, manifest, socialSource, socialInjector] = await Promise.all([
  read('.github/workflows/pages.yml'),
  read('sw.js'),
  read('simple-runtime.js'),
  read('manifest.webmanifest'),
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

for (const marker of [
  'librsvg2-bin',
  'webp',
  'fonts-gfs-didot',
  '04-colourful-garba-courtyard-a.webp',
  'dwebp "$OG_BACKGROUND"',
  '_site/assets/social/playgarba-og-card.svg',
  '_site/assets/social/garba-og-card.png',
  'rsvg-convert -w 1200 -h 630',
  'PNG image data, 1200 x 630',
  'node scripts/lib/inject-social-preview.mjs _site',
  'SOCIAL_META_COUNT',
  'summary_large_image',
]) {
  if (!pages.includes(marker)) fail(`Pages social-preview contract is missing: ${marker}`);
}
for (const marker of [
  'width="1200" height="630"',
  'href="og-background.png"',
  'font-family="GFS Didot',
  'id="text-backdrop"',
  'feDropShadow',
  '>PlayGarba.com</text>',
  '>All Garba there is in the world.</text>',
]) {
  if (!socialSource.includes(marker)) fail(`Social preview source is missing: ${marker}`);
}
const imageUrl = 'https://playgarba.com/assets/social/garba-og-card.png';
for (const marker of [
  imageUrl,
  'GARBA · Gujarati Garba, beautifully played',
  'collectHtmlFiles',
  'og:image',
  'og:image:width',
  'og:image:height',
  'summary_large_image',
  'twitter:image',
]) {
  if (!socialInjector.includes(marker)) fail(`Social metadata injector is missing: ${marker}`);
}
if (socialInjector.includes('ruddvz.github.io/garba')) fail('Social metadata must not regress to the old GitHub Pages URL');

const pwaIcons = [
  ['assets/icons/icon-192.png', '192x192', 'any'],
  ['assets/icons/icon-512.png', '512x512', 'any'],
  ['assets/icons/maskable-192.png', '192x192', 'maskable'],
  ['assets/icons/maskable-512.png', '512x512', 'maskable'],
];
for (const [src, sizes, purpose] of pwaIcons) {
  for (const marker of [src, `\"sizes\": \"${sizes}\"`, `\"purpose\": \"${purpose}\"`]) {
    if (!manifest.includes(marker)) fail(`PWA manifest is missing icon contract marker: ${marker}`);
  }
  if (!sw.includes(`'./${src}'`)) fail(`PWA core shell does not cache ${src}`);
}
for (const marker of [
  'rsvg-convert -w 192 -h 192 assets/icons/icon.svg',
  'rsvg-convert -w 512 -h 512 assets/icons/icon.svg',
  'rsvg-convert -w 192 -h 192 assets/icons/maskable.svg',
  'rsvg-convert -w 512 -h 512 assets/icons/maskable.svg',
  'PWA 192 icon is invalid',
  'PWA 512 icon is invalid',
  'Maskable 192 icon is invalid',
  'Maskable 512 icon is invalid',
]) {
  if (!pages.includes(marker)) fail(`Pages PWA-icon contract is missing: ${marker}`);
}

for (const marker of [
  'src/catalogue/index.html _site/catalogue/index.html',
  'src/catalogue/catalogue.css _site/catalogue/catalogue.css',
  'src/catalogue/catalogue.js _site/catalogue/catalogue.js',
]) {
  if (!pages.includes(marker)) fail(`Pages Explore contract is missing: ${marker}`);
}
for (const marker of [
  "'./catalogue/'",
  "'./catalogue/index.html'",
  "'./catalogue/catalogue.css'",
  "'./catalogue/catalogue.js'",
  "'/catalogue/catalogue.css'",
  "'/catalogue/catalogue.js'",
  'const isCatalogueNavigation = (pathname) =>',
  "pathname.endsWith('/catalogue/')",
  "const fallback = isCatalogueNavigation(url.pathname) ? './catalogue/index.html' : './index.html';",
  "const isJsonData = (pathname) => pathname.includes('/data/') && pathname.endsWith('.json');",
  'if (isJsonData(url.pathname)) {',
]) {
  if (!sw.includes(marker)) fail(`Explore PWA/offline contract is missing: ${marker}`);
}

if (/['"]\.\/styles\/[^'"]+['"]/.test(sw)) {
  fail('PWA CORE_SHELL must not precache source CSS layers that Pages does not deploy');
}
if (!sw.includes("const CACHE_NAME = `${CACHE_PREFIX}v12`")) {
  fail('PWA cache generation must be v12 after making Explore shell/data routing offline-safe');
}

if (failed) process.exit(1);
console.log('✓ Pages ships every direct and transitive playback runtime file');
console.log('✓ PWA precache contains the YouTube engine and split playback runtime');
console.log('✓ provider route safety loads before the YouTube controllable engine');
console.log('✓ split playback runtime stays network-first across installed-app upgrades');
console.log('✓ Pages prefers the checksum-pinned Q90 visual pack and keeps legacy packs as fallback only');
console.log('✓ Pages verifies exactly 15 WebPs and strips source visual-pack ZIPs');
console.log('✓ Universal PlayGarba social preview uses the approved courtyard artwork and renders at 1200x630');
console.log('✓ PlayGarba ships regular and maskable 192/512 PWA icons and precaches the full install-icon matrix');
console.log('✓ Explore shell is precached, has its own offline navigation fallback, and visited catalogue JSON stays fresh online with cached offline fallback');
