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

for (const file of ['index.html', 'styles.css', 'app.js', 'catalogue-bootstrap.js', 'playback-bridge.js', 'sw.js', 'offline.html', 'manifest.webmanifest']) await checkFile(file);

for (const expected of expectedGenres) {
  if (!ids.has(expected)) fail(`Missing genre: ${expected}`);
}
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
if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) fail('Manifest needs standard and maskable icons');
for (const icon of manifest.icons || []) await checkFile(icon.src);

const index = await readFile(path.join(root, 'index.html'), 'utf8');
const appJs = await readFile(path.join(root, 'app.js'), 'utf8');
const htmlIds = [...index.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateHtmlIds = htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index);
if (duplicateHtmlIds.length) fail(`Duplicate HTML ids: ${[...new Set(duplicateHtmlIds)].join(', ')}`);
const referencedIds = [...appJs.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]);
for (const id of referencedIds) if (!htmlIds.includes(id)) fail(`app.js references missing element id: ${id}`);
if (!index.includes('rel="manifest"')) fail('index.html is missing manifest link');
if (!index.includes('viewport-fit=cover')) fail('index.html must support safe-area insets');
if (!index.includes('apple-mobile-web-app-capable')) fail('index.html is missing iOS PWA metadata');
if (!index.includes('catalogue-bootstrap.js')) fail('index.html must load the chunked catalogue bootstrap');
if (!index.includes('playback-bridge.js')) fail('index.html must load provider playback bridge');

const cssEntry = await readFile(path.join(root, 'styles.css'), 'utf8');
const cssImports = [...cssEntry.matchAll(/@import url\("([^"]+)"\)/g)].map((match) => match[1]);
const css = cssEntry + (await Promise.all(cssImports.map((file) => readFile(path.join(root, file), 'utf8')))).join('\n');
if (/\.(?:jpe?g)(?:["'?)\s]|$)/i.test(index + appJs + css)) fail('Production UI still references a JPG/JPEG asset');
for (const marker of ['@media (max-width: 700px)', '@media (min-width: 701px) and (max-width: 1100px)', '@media (max-height: 560px) and (orientation: landscape)', '@media (display-mode: standalone)', 'prefers-reduced-motion']) {
  if (!css.includes(marker)) fail(`Responsive/PWA CSS marker missing: ${marker}`);
}

const sw = await readFile(path.join(root, 'sw.js'), 'utf8');
for (const genre of genres) {
  if (!sw.includes(`./${genre.background}`)) fail(`Service worker does not precache ${genre.background}`);
}
if (!(sw.includes("url.pathname.includes('/data/')") && sw.includes("url.pathname.endsWith('.json')") && sw.includes('networkFirst(request)'))) {
  fail('Service worker should network-first all JSON catalogue/discovery data');
}

const backgroundMb = backgroundBytes / 1024 / 1024;
if (backgroundMb > 1.5) fail(`Background payload is ${backgroundMb.toFixed(2)} MB; keep the six production worlds below 1.5 MB total`);

if (failed) process.exit(1);
console.log(`✓ ${genres.length} genres`);
console.log(`✓ ${songs.length} catalogue rows`);
console.log(`✓ PWA shell, manifest and icons`);
console.log(`✓ responsive breakpoints: phone, tablet, desktop, short landscape`);
console.log(`✓ production background payload: ${backgroundMb.toFixed(2)} MB`);
