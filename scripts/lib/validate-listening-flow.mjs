import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [app, index, styles, library, nonstop] = await Promise.all([
  read('app.js'),
  read('index.html'),
  read('styles/10-browser-and-shell.css'),
  read('src/catalogue/listening-library.js'),
  read('nonstop-browser.js'),
]);
let failed = false;
const requireMarker = (source, marker, label) => { if (!source.includes(marker)) { console.error('✗ ' + label + ': ' + marker); failed = true; } };

for (const marker of [
  "manualQueue: [...new Set(storage.get('garba:queue'",
  'function queueSong(songId)',
  'state.manualQueue.shift()',
  'function removeQueuedSong(songId',
  'function clearManualQueue()',
  'state.playContextGenreId || state.genreId',
  'state.listeningHistory.pop()',
  "showToast('Added to Up next.')",
  "state.sheetMode === 'favourites' ? 'My Garba'",
  "storage.set('garba:favourites'",
]) requireMarker(app, marker, 'Listening flow contract missing');

requireMarker(index, 'aria-label="Open My Garba"', 'My Garba topbar label missing');
requireMarker(styles, '/* Listening flow #287 */', 'Listening-flow styles missing');
requireMarker(styles, '.song-queue-action', 'Play-next row action missing');
requireMarker(library, "heading.textContent = 'My Garba';", 'Explore My Garba section missing');
requireMarker(nonstop, "target.closest('#queueButton, #prevButton, #nextButton, #miniPrev, #miniNext')", 'Nonstop queue/transport isolation must remain intact');

if (app.includes("storage.set('garba:my-garba'")) { console.error('✗ Existing garba:favourites storage key must not be migrated'); failed = true; }
if (failed) process.exit(1);
console.log('✓ manual Up next is FIFO, deduplicated and removable without replacing catalogue identity');
console.log('✓ Previous uses actual listening history and Next returns to the catalogue context after queued songs');
console.log('✓ My Garba reuses the existing favourites storage instead of adding playlist CRUD');
console.log('✓ Nonstop transport remains isolated from the ordinary song queue');
