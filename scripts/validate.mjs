import { readFile, access, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const genres = await readJson('data/genres.json');
const songs = await readJson('data/songs.json');
const manifest = await readJson('manifest.webmanifest');
const expectedGenres = ['traditional', 'dandiya', 'devotional', 'folk', 'sanedo', 'fusion'];
const ids = new Set(genres.map((genre) => genre.id));
let failed = false;

const fail = (message) => { console.error(`✗ ${message}`); failed = true; };
const checkFile = async (file) => {
  try { await access(path.join(root, file)); return true; }
  catch { fail(`Missing file: ${file}`); return false; }
};

for (const file of [
  'index.html', 'styles.css', 'styles/part-4.css', 'styles/part-5.css', 'styles/part-6.css', 'styles/part-7.css',
  'app.js', 'visual-library.js', 'catalogue-bootstrap.js', 'player-engine.js',
  'ux-polish.js', 'ux-next.js', 'sw.js', 'offline.html', 'manifest.webmanifest',
  'assets/icons/apple-touch-icon.png', 'assets/icons/icon-192.png',
]) await checkFile(file);

for (const expected of expectedGenres) if (!ids.has(expected)) fail(`Missing genre: ${expected}`);
if (genres.length !== expectedGenres.length) fail(`Expected ${expectedGenres.length} genres, found ${genres.length}`);

let backgroundBytes = 0;
for (const genre of genres) {
  if (!genre.id || !genre.name || !genre.label) fail(`Incomplete genre entry: ${JSON.stringify(genre)}`);
  const backgroundPath = path.join(root, genre.background || '');
  try {
    const info = await stat(backgroundPath);
    backgroundBytes += info.size;
  } catch {
    fail(`Missing background: ${genre.background}`);
  }
  if (!/^#[0-9a-f]{6}$/i.test(genre.accent || '')) fail(`Invalid accent for ${genre.id}`);
  if (!/\.(?:webp|svg)$/i.test(genre.background || '')) fail(`Production background should be WebP or self-contained SVG: ${genre.id}`);
}

const songIds = new Set();
for (const song of songs) {
  if (!song.id) fail('Song missing id');
  if (songIds.has(song.id)) fail(`Duplicate song id: ${song.id}`);
  songIds.add(song.id);
  if (!ids.has(song.genre)) fail(`Unknown genre on ${song.id}: ${song.genre}`);
  if (!song.title || !song.artist) fail(`Missing title/artist on ${song.id}`);
  if (song.durationSeconds != null && (!Number.isFinite(song.durationSeconds) || song.durationSeconds < 0)) fail(`Invalid durationSeconds on ${song.id}`);
  if (song.audioUrl && !/^https:\/\//.test(song.audioUrl)) fail(`audioUrl must be HTTPS for ${song.id}`);
  if (song.youtubeId != null && typeof song.youtubeId !== 'string') fail(`youtubeId must be a string or null on ${song.id}`);
}

if (manifest.name !== 'GARBA' || manifest.short_name !== 'GARBA') fail('Manifest app name must be GARBA');
if (manifest.display !== 'standalone') fail('Manifest display must be standalone');
if (!Array.isArray(manifest.icons) || manifest.icons.length < 3) fail('Manifest needs PNG, scalable and maskable icons');
for (const icon of manifest.icons || []) await checkFile(icon.src);
const png192 = (manifest.icons || []).find((icon) => icon.src === 'assets/icons/icon-192.png');
if (!png192 || png192.sizes !== '192x192' || png192.type !== 'image/png') fail('Manifest must expose the native 192x192 PNG launcher icon');

const index = await readFile(path.join(root, 'index.html'), 'utf8');
const appJs = await readFile(path.join(root, 'app.js'), 'utf8');
const polishJs = await readFile(path.join(root, 'ux-polish.js'), 'utf8');
const nextJs = await readFile(path.join(root, 'ux-next.js'), 'utf8');
const visualJs = await readFile(path.join(root, 'visual-library.js'), 'utf8');
const playerJs = await readFile(path.join(root, 'player-engine.js'), 'utf8');
const htmlIds = [...index.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateHtmlIds = htmlIds.filter((id, position) => htmlIds.indexOf(id) !== position);
if (duplicateHtmlIds.length) fail(`Duplicate HTML ids: ${[...new Set(duplicateHtmlIds)].join(', ')}`);
const referencedIds = [...appJs.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]);
for (const id of referencedIds) if (!htmlIds.includes(id)) fail(`app.js references missing element id: ${id}`);

for (const marker of [
  'rel="manifest"', 'viewport-fit=cover', 'apple-mobile-web-app-capable', 'name="referrer"',
  'rel="apple-touch-icon"', 'assets/icons/apple-touch-icon.png', 'assets/icons/icon-192.png',
  'visual-library.js', 'catalogue-bootstrap.js', 'player-engine.js', 'ux-polish.js', 'ux-next.js',
  'id="browseActions"', 'data-loading="true"',
]) {
  if (!index.includes(marker)) fail(`index.html missing required marker: ${marker}`);
}
if (index.includes('preload" as="image" href="assets/backgrounds/library/')) {
  fail('Do not preload an optional 2K library asset before deployment extraction');
}
if (!visualJs.includes('2K visual library unavailable; using bundled fallback.')) fail('visual-library.js must retain a safe fallback path');
if (!visualJs.includes("get('scene')")) fail('visual-library.js should keep stable genre defaults with opt-in approved scene variants');
for (const marker of ['setupProviderAccessibility', 'syncSheetAccessibility', 'showCatalogueFailure', 'syncDurationTruth', 'search-awaiting-query']) {
  if (!polishJs.includes(marker)) fail(`UX polish missing required follow-up behavior: ${marker}`);
}
for (const marker of ['renderEnhancedSearch', 'syncThemeColor', 'syncMediaArtwork', 'dataSaver']) {
  if (!nextJs.toLowerCase().includes(marker.toLowerCase())) fail(`Next UX layer missing required behavior: ${marker}`);
}
for (const marker of ['youtube.com/embed/', 'enablejsapi', 'playsinline', 'strict-origin-when-cross-origin', 'onAutoplayBlocked', 'provider-dock']) {
  if (!playerJs.includes(marker)) fail(`Player engine missing required in-app provider behavior: ${marker}`);
}
if (playerJs.includes('window.open(') || playerJs.includes('youtube.com/results?search_query')) {
  fail('Player should not kick normal playback out to provider search/windows');
}

const cssEntry = await readFile(path.join(root, 'styles.css'), 'utf8');
const cssImports = [...cssEntry.matchAll(/@import url\("([^"]+)"\)/g)].map((match) => match[1]);
const css = cssEntry + (await Promise.all(cssImports.map((file) => readFile(path.join(root, file), 'utf8')))).join('\n');
for (const importPath of ['styles/part-4.css', 'styles/part-5.css', 'styles/part-6.css', 'styles/part-7.css']) {
  if (!cssImports.includes(importPath)) fail(`styles.css must load ${importPath}`);
}
if (/\.(?:jpe?g)(?:["'?)\s]|$)/i.test(index + appJs + polishJs + nextJs + visualJs + playerJs + css)) fail('Production UI still references a JPG/JPEG asset');
for (const marker of [
  '@media (max-width: 700px)', '@media (min-width: 701px) and (max-width: 1100px)',
  '@media (max-height: 560px) and (orientation: landscape)', '@media (display-mode: standalone)',
  'prefers-reduced-motion', '.retry-catalogue', '.search-empty-prompt', '.enhanced-search-row', '.provider-dock',
]) if (!css.includes(marker)) fail(`Responsive/PWA CSS marker missing: ${marker}`);

const sw = await readFile(path.join(root, 'sw.js'), 'utf8');
for (const genre of genres) if (!sw.includes(`./${genre.background}`)) fail(`Service worker does not precache ${genre.background}`);
for (const file of [
  './styles/part-4.css', './styles/part-5.css', './styles/part-6.css', './styles/part-7.css',
  './ux-polish.js', './ux-next.js', './visual-library.js', './player-engine.js',
  './assets/icons/apple-touch-icon.png', './assets/icons/icon-192.png', './data/taxonomy.json',
]) {
  if (!sw.includes(file)) fail(`Service worker does not precache ${file}`);
}
if (!(sw.includes("url.pathname.includes('/data/')") && sw.includes("url.pathname.endsWith('.json')") && sw.includes('networkFirst(request)'))) {
  fail('Service worker should network-first all JSON catalogue/discovery data');
}
if (!sw.includes("request.destination === 'script'") || !sw.includes('networkFirst(request)')) fail('Installed PWA should network-first scripts/styles for fixes');
if (!sw.includes('11-master-dark-courtyard.webp')) fail('Installed PWA should opportunistically cache the approved 2K visual library');

const backgroundMb = backgroundBytes / 1024 / 1024;
if (backgroundMb > 1.5) fail(`Bundled fallback background payload is ${backgroundMb.toFixed(2)} MB; keep installation lightweight`);

if (failed) process.exit(1);
console.log(`✓ ${genres.length} genres`);
console.log(`✓ ${songs.length} catalogue rows`);
console.log('✓ minimal in-app provider player with visible provider-backed playback');
console.log('✓ PWA shell, launcher icons, offline catalogue support and approved 2K visual cache');
console.log('✓ responsive breakpoints: phone, tablet, laptop, desktop and short landscape');
console.log('✓ rich search, accessibility, media artwork, dynamic theme and data-saver states');
console.log(`✓ bundled fallback background payload: ${backgroundMb.toFixed(2)} MB`);
