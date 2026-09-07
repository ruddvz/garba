import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await read(file));
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const file of ['index.html', 'app.js', 'simple-runtime.js', 'styles.css', 'data/genres.json', 'data/songs.json']) {
  try { await access(path.join(root, file)); } catch { fail(`Missing runtime file: ${file}`); }
}

const [index, app, simple, genres, songs] = await Promise.all([
  read('index.html'),
  read('app.js'),
  read('simple-runtime.js'),
  readJson('data/genres.json'),
  readJson('data/songs.json'),
]);

const expectedGenres = ['traditional', 'dandiya', 'devotional', 'folk', 'sanedo', 'fusion'];
if (genres.length !== expectedGenres.length) fail(`Expected six genres, found ${genres.length}`);
for (const genre of expectedGenres) if (!genres.some((entry) => entry.id === genre)) fail(`Missing genre: ${genre}`);
if (!Array.isArray(songs) || songs.length < 1) fail('Catalogue must contain songs');

const scriptSources = [...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
const expectedScripts = ['simple-runtime.js', 'app.js'];
for (const script of expectedScripts) if (!scriptSources.includes(script)) fail(`Missing production runtime script: ${script}`);
for (const forbidden of ['visual-library.js', 'catalogue-bootstrap.js', 'direct-audio-bridge.js', 'playback-routes.js', 'playback-prewarm.js', 'playback-bridge.js', 'nonstop-browser.js', 'ux-polish.js', 'ux-next.js']) {
  if (scriptSources.includes(forbidden)) fail(`Heavy/optional script must not load on first page: ${forbidden}`);
}
if (scriptSources.length !== expectedScripts.length) fail(`Expected exactly ${expectedScripts.length} runtime scripts, found ${scriptSources.length}`);

for (const marker of [
  'assets/backgrounds/traditional.svg',
  'data-static-genre="true"',
  "navigator.serviceWorker.register = async ()",
  "registration.unregister()",
  "name.startsWith('garba-shell-')",
]) if (!index.includes(marker)) fail(`Simple index missing marker: ${marker}`);

for (const marker of [
  'clearStaleInert',
  'interceptFallbackPlay',
  'shareCurrent',
  'data-static-genre="true"',
  "fetch('data/songs.json'",
]) if (!simple.includes(marker)) fail(`Simple runtime missing interaction marker: ${marker}`);

const ids = [...index.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
for (const id of [...app.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1])) {
  if (!ids.includes(id)) fail(`app.js references missing element id: ${id}`);
}

for (const requiredControl of ['searchButton', 'shareButton', 'favouritesButton', 'queueButton', 'prevButton', 'playButton', 'nextButton', 'progress', 'genreStrip', 'browseButton', 'songSheet', 'sheetClose', 'searchInput', 'miniPlay']) {
  if (!ids.includes(requiredControl)) fail(`Missing primary control: ${requiredControl}`);
}

for (const marker of [
  "els.playButton.addEventListener('click'",
  "els.prevButton.addEventListener('click'",
  "els.nextButton.addEventListener('click'",
  "els.browseButton.addEventListener('click'",
  "els.searchButton.addEventListener('click'",
  "els.favouritesButton.addEventListener('click'",
  "els.queueButton.addEventListener('click'",
  "els.progress.addEventListener('input'",
]) if (!app.includes(marker)) fail(`Core app lost interaction binding: ${marker}`);

if (failed) process.exit(1);
console.log(`✓ simple production runtime uses only ${scriptSources.join(' + ')}`);
console.log(`✓ ${songs.length} songs and six genres remain available`);
console.log('✓ stale service-worker caches are retired on first visit');
console.log('✓ primary player controls retain direct event bindings');
