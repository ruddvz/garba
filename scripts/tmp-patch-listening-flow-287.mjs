import { readFile, writeFile } from 'node:fs/promises';

async function text(path) { return readFile(path, 'utf8'); }
async function save(path, value) { await writeFile(path, value, 'utf8'); }

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

let app = await text('app.js');

app = replaceOnce(app,
`  favourites: new Set(storage.get('garba:favourites', [])),\n  playing: false,`,
`  favourites: new Set(storage.get('garba:favourites', [])),\n  manualQueue: [...new Set(storage.get('garba:queue', []).filter((id) => typeof id === 'string'))].slice(0, 30),\n  listeningHistory: [],\n  playContextGenreId: 'traditional',\n  playContextSongId: null,\n  playing: false,`,
'state queue/history');

app = replaceOnce(app,
`function persistFavourites() {\n  storage.set('garba:favourites', [...state.favourites]);\n}\n\nfunction persistSession() {`,
`function persistFavourites() {\n  storage.set('garba:favourites', [...state.favourites]);\n}\n\nfunction persistManualQueue() {\n  storage.set('garba:queue', state.manualQueue);\n}\n\nfunction sanitiseManualQueue() {\n  const known = new Set(state.songs.map((song) => song.id));\n  const next = [];\n  const seen = new Set();\n  for (const id of state.manualQueue) {\n    if (!known.has(id) || id === state.songId || seen.has(id)) continue;\n    seen.add(id);\n    next.push(id);\n    if (next.length >= 30) break;\n  }\n  const changed = next.length !== state.manualQueue.length || next.some((id, index) => id !== state.manualQueue[index]);\n  state.manualQueue = next;\n  if (changed) persistManualQueue();\n}\n\nfunction persistSession() {`,
'queue persistence');

app = replaceOnce(app,
`function getUpNextSongs() {\n  const list = songsForGenre(state.genreId);\n  if (!list.length) return [];\n  const currentIndex = list.findIndex((song) => song.id === state.songId);\n  if (currentIndex < 0) return list.slice(0, 12);\n  return [...list.slice(currentIndex + 1), ...list.slice(0, currentIndex)].slice(0, 12);\n}\n\nfunction updateQueueBadge() {\n  const count = getUpNextSongs().length;\n  els.queueBadge.textContent = count > 9 ? '9+' : String(count);\n  els.queueBadge.classList.toggle('show', count > 0 && !mobileQuery.matches);\n}`,
`function automaticUpNextSongs(limit = 12) {\n  const genreId = state.playContextGenreId || state.genreId;\n  const list = songsForGenre(genreId);\n  if (!list.length) return [];\n  const anchorId = state.playContextSongId || state.songId;\n  const currentIndex = list.findIndex((song) => song.id === anchorId);\n  if (currentIndex < 0) return list.slice(0, limit);\n  return [...list.slice(currentIndex + 1), ...list.slice(0, currentIndex)].slice(0, limit);\n}\n\nfunction manualQueueSongs() {\n  sanitiseManualQueue();\n  const byId = new Map(state.songs.map((song) => [song.id, song]));\n  return state.manualQueue.map((id) => byId.get(id)).filter(Boolean);\n}\n\nfunction getUpNextSongs() {\n  const queued = manualQueueSongs();\n  const queuedIds = new Set(queued.map((song) => song.id));\n  const automatic = automaticUpNextSongs(12).filter((song) => song.id !== state.songId && !queuedIds.has(song.id));\n  return [...queued, ...automatic].slice(0, Math.max(12, queued.length + Math.min(8, automatic.length)));\n}\n\nfunction queueSong(songId) {\n  if (!songId || songId === state.songId) {\n    showToast('That song is already playing.');\n    return;\n  }\n  if (!state.songs.some((song) => song.id === songId)) return;\n  if (state.manualQueue.includes(songId)) {\n    showToast('Already in Up next.');\n    return;\n  }\n  state.manualQueue.push(songId);\n  state.manualQueue = state.manualQueue.slice(0, 30);\n  persistManualQueue();\n  updateQueueBadge();\n  if (state.sheetMode === 'queue') renderSheet();\n  showToast('Added to Up next.');\n}\n\nfunction removeQueuedSong(songId, { announce = true } = {}) {\n  const before = state.manualQueue.length;\n  state.manualQueue = state.manualQueue.filter((id) => id !== songId);\n  if (state.manualQueue.length === before) return false;\n  persistManualQueue();\n  updateQueueBadge();\n  if (state.sheetMode === 'queue') renderSheet();\n  if (announce) showToast('Removed from Up next.');\n  return true;\n}\n\nfunction clearManualQueue() {\n  if (!state.manualQueue.length) return;\n  state.manualQueue = [];\n  persistManualQueue();\n  updateQueueBadge();\n  if (state.sheetMode === 'queue') renderSheet();\n  showToast('Up next cleared.');\n}\n\nfunction updateQueueBadge() {\n  const manualCount = manualQueueSongs().length;\n  const count = getUpNextSongs().length;\n  els.queueBadge.textContent = manualCount ? (manualCount > 9 ? '9+' : String(manualCount)) : (count > 9 ? '9+' : String(count));\n  els.queueBadge.classList.toggle('show', count > 0 && !mobileQuery.matches);\n  els.queueButton.dataset.manualCount = String(manualCount);\n}`,
'contextual queue');

app = replaceOnce(app,
`async function selectSong(songId, options = {}) {\n  const song = state.songs.find((entry) => entry.id === songId);\n  if (!song) return;\n\n  if (!options.initial) state.pendingSongId = null;`,
`async function selectSong(songId, options = {}) {\n  const song = state.songs.find((entry) => entry.id === songId);\n  if (!song) return;\n\n  if (!options.initial) state.pendingSongId = null;\n\n  const previousSongId = state.songId;\n  if (previousSongId && previousSongId !== song.id && !options.initial && !options.fromHistory) {\n    state.listeningHistory.push(previousSongId);\n    state.listeningHistory = state.listeningHistory.slice(-40);\n  }\n  if (options.consumeQueued) removeQueuedSong(song.id, { announce: false });`,
'selection history');

app = replaceOnce(app,
`    state.songId = song.id;\n    state.genreId = song.genre;\n    state.sheetFilter = song.genre;\n    configureAudio(song, restoreElapsed);`,
`    state.songId = song.id;\n    state.genreId = song.genre;\n    state.sheetFilter = song.genre;\n    if (!options.preserveContext) {\n      state.playContextGenreId = song.genre;\n      state.playContextSongId = song.id;\n    }\n    configureAudio(song, restoreElapsed);`,
'context anchor update');

app = replaceOnce(app,
`  els.sheetTitle.textContent = state.sheetMode === 'favourites' ? 'Favourites' : state.sheetMode === 'queue' ? 'Up next' : state.sheetMode === 'search' ? 'Search' : 'Songs';`,
`  els.sheetTitle.textContent = state.sheetMode === 'favourites' ? 'My Garba' : state.sheetMode === 'queue' ? 'Up next' : state.sheetMode === 'search' ? 'Search' : 'Songs';`,
'My Garba title');

app = replaceOnce(app,
`    } else {\n      els.sheetSummary.textContent = \`${'${state.sheetMatchCount.toLocaleString()} ${state.sheetMatchCount === 1 ? \'song\' : \'songs\'}'}\`;\n    }`,
`    } else if (state.sheetMode === 'queue') {\n      const queued = manualQueueSongs().length;\n      const continuing = Math.max(0, songs.length - queued);\n      els.sheetSummary.textContent = queued ? \`${'${queued} queued · ${continuing} continue'}\` : \`${'${continuing} continue'}\`;\n    } else {\n      els.sheetSummary.textContent = \`${'${state.sheetMatchCount.toLocaleString()} ${state.sheetMatchCount === 1 ? \'song\' : \'songs\'}'}\`;\n    }`,
'queue summary');

app = replaceOnce(app,
`    if (state.sheetMode === 'favourites') {\n      strong.textContent = 'No favourites yet';\n      copy.textContent = 'Tap the heart beside a song to keep it here.';`,
`    if (state.sheetMode === 'favourites') {\n      strong.textContent = 'My Garba is empty';\n      copy.textContent = 'Tap the heart beside a song to save it here.';`,
'My Garba empty');

app = replaceOnce(app,
`  const fragment = document.createDocumentFragment();\n  songs.forEach((song, index) => {`,
`  const fragment = document.createDocumentFragment();\n  const queuedIds = new Set(state.manualQueue);\n  let continuationLabelAdded = false;\n  if (state.sheetMode === 'queue' && state.manualQueue.length) {\n    const toolbar = document.createElement('div');\n    toolbar.className = 'queue-toolbar';\n    const label = document.createElement('span');\n    label.textContent = 'Queued';\n    const clear = document.createElement('button');\n    clear.type = 'button';\n    clear.className = 'queue-clear';\n    clear.textContent = 'Clear';\n    clear.addEventListener('click', clearManualQueue);\n    toolbar.append(label, clear);\n    fragment.append(toolbar);\n  }\n  songs.forEach((song, index) => {\n    const queued = state.sheetMode === 'queue' && queuedIds.has(song.id);\n    if (state.sheetMode === 'queue' && state.manualQueue.length && !queued && !continuationLabelAdded) {\n      continuationLabelAdded = true;\n      const label = document.createElement('div');\n      label.className = 'queue-section-label';\n      label.textContent = 'Continue playing';\n      fragment.append(label);\n    }`,
'queue grouping');

app = replaceOnce(app,
`    copy.append(title, artist);\n    copy.addEventListener('click', () => selectSong(song.id, { keepSheet: true }));\n\n    const duration = document.createElement('span');`,
`    copy.append(title, artist);\n    copy.addEventListener('click', () => selectSong(song.id, {\n      keepSheet: true,\n      preserveContext: queued,\n      consumeQueued: queued,\n    }));\n\n    const duration = document.createElement('span');`,
'queued row play now');

app = replaceOnce(app,
`    const favourite = document.createElement('button');\n    favourite.type = 'button';\n    favourite.className = \`heart-button song-favourite${'${state.favourites.has(song.id) ? \' active\' : \'\'}'}\`;\n    favourite.setAttribute('aria-label', state.favourites.has(song.id) ? \`Remove ${'${song.title}'} from favourites\` : \`Add ${'${song.title}'} to favourites\`);\n    favourite.setAttribute('aria-pressed', String(state.favourites.has(song.id)));\n    favourite.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 5.9l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.3 1-1a5.5 5.5 0 0 0 0-7.8Z"></path></svg>';\n    favourite.addEventListener('click', () => toggleFavourite(song.id));\n\n    row.append(idx, copy, duration, favourite);`,
`    const queueAction = document.createElement('button');\n    queueAction.type = 'button';\n    queueAction.className = 'song-queue-action';\n    queueAction.setAttribute('aria-label', queued ? \`Remove ${'${song.title}'} from Up next\` : \`Play ${'${song.title}'} next\`);\n    queueAction.title = queued ? 'Remove from Up next' : 'Play next';\n    queueAction.innerHTML = queued\n      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"></path></svg>'\n      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h8M5 12h8M5 17h5"></path><path d="M17 8v9M13.5 13.5 17 17l3.5-3.5"></path></svg>';\n    queueAction.addEventListener('click', () => queued ? removeQueuedSong(song.id) : queueSong(song.id));\n\n    const favourite = document.createElement('button');\n    favourite.type = 'button';\n    favourite.className = \`heart-button song-favourite${'${state.favourites.has(song.id) ? \' active\' : \'\'}'}\`;\n    favourite.setAttribute('aria-label', state.favourites.has(song.id) ? \`Remove ${'${song.title}'} from My Garba\` : \`Save ${'${song.title}'} to My Garba\`);\n    favourite.setAttribute('aria-pressed', String(state.favourites.has(song.id)));\n    favourite.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 5.9l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.3 1-1a5.5 5.5 0 0 0 0-7.8Z"></path></svg>';\n    favourite.addEventListener('click', () => toggleFavourite(song.id));\n\n    row.classList.toggle('manually-queued', queued);\n    row.append(idx, copy, duration, queueAction, favourite);`,
'row queue action');

app = replaceOnce(app,
`  showToast(willAdd ? 'Added to favourites.' : 'Removed from favourites.');`,
`  showToast(willAdd ? 'Saved to My Garba.' : 'Removed from My Garba.');`,
'My Garba toast');

app = replaceOnce(app,
`function changeSong(direction) {\n  const list = songsForGenre(state.genreId);\n  if (!list.length) return;\n  let index = list.findIndex((song) => song.id === state.songId);\n  index = index < 0 ? 0 : (index + direction + list.length) % list.length;\n  selectSong(list[index].id, { keepSheet: true, preservePlayback: true });\n}`,
`function changeSong(direction) {\n  if (direction < 0 && state.listeningHistory.length) {\n    const previousId = state.listeningHistory.pop();\n    if (previousId) {\n      selectSong(previousId, { keepSheet: true, preservePlayback: true, fromHistory: true });\n      return;\n    }\n  }\n\n  if (direction > 0) {\n    sanitiseManualQueue();\n    const queuedId = state.manualQueue.shift();\n    if (queuedId) {\n      persistManualQueue();\n      selectSong(queuedId, { keepSheet: true, preservePlayback: true, preserveContext: true });\n      return;\n    }\n  }\n\n  const genreId = state.playContextGenreId || state.genreId;\n  const list = songsForGenre(genreId);\n  if (!list.length) return;\n  const anchorId = state.playContextSongId || state.songId;\n  let index = list.findIndex((song) => song.id === anchorId);\n  index = index < 0 ? 0 : (index + direction + list.length) % list.length;\n  selectSong(list[index].id, { keepSheet: true, preservePlayback: true });\n}`,
'Next FIFO Previous history');

app = replaceOnce(app,
`    state.songs = next.songs;\n    state.catalogueSignature = signature;`,
`    state.songs = next.songs;\n    sanitiseManualQueue();\n    state.catalogueSignature = signature;`,
'queue hydration');

await save('app.js', app);

let index = await text('index.html');
index = replaceOnce(index,
`<button class="icon-button desktop-only" id="favouritesButton" type="button" aria-label="Show favourites" title="Favourites">`,
`<button class="icon-button desktop-only" id="favouritesButton" type="button" aria-label="Open My Garba" title="My Garba">`,
'My Garba topbar label');
await save('index.html', index);

let runtime = await text('simple-runtime.js');
runtime = runtime
  .replace("favouriteButton.setAttribute('aria-label', `${saved ? 'Remove' : 'Add'} ${title} ${saved ? 'from' : 'to'} favourites`);", "favouriteButton.setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${title} ${saved ? 'from' : 'to'} My Garba`);")
  .replace("queueButton.setAttribute('aria-label', badge ? `Show queue, ${badge} songs up next` : 'Show queue');", "queueButton.setAttribute('aria-label', badge ? `Open Up next, ${badge} songs shown` : 'Open Up next');");
await save('simple-runtime.js', runtime);

let library = await text('src/catalogue/listening-library.js');
library = library
  .replace("heading.textContent = 'Your listening';", "heading.textContent = 'My Garba';")
  .replace("? 'Pick up where you left off, then revisit songs you saved.'\n    : 'Songs you saved in the PlayGarba player.';", "? 'Continue where you left off, then return to songs you saved.'\n    : 'Songs you saved with the heart in PlayGarba.';")
  .replace("kicker.textContent = kind === 'continue' ? 'Continue listening' : 'Favourite';", "kicker.textContent = kind === 'continue' ? 'Continue listening' : 'Saved';")
  .replace("link.setAttribute('aria-label', `${kind === 'continue' ? 'Continue listening to' : 'Listen to favourite'} ${song.title} by ${song.artist}`);", "link.setAttribute('aria-label', `${kind === 'continue' ? 'Continue listening to' : 'Listen to saved song'} ${song.title} by ${song.artist}`);");
await save('src/catalogue/listening-library.js', library);

let styles = await text('styles/10-browser-and-shell.css');
if (!styles.includes('/* Listening flow #287 */')) styles += `\n\n/* Listening flow #287 */\n.song-row{grid-template-columns:34px minmax(0,1fr) 56px 36px 40px}\n.song-queue-action{display:grid;place-items:center;width:34px;height:34px;justify-self:center;border:1px solid rgba(246,236,215,.10);border-radius:999px;background:rgba(246,236,215,.035);color:rgba(246,236,215,.58);cursor:pointer;transition:opacity .16s ease,color .16s ease,border-color .16s ease,background .16s ease}\n.song-queue-action svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round}\n.song-queue-action:hover,.song-queue-action:focus-visible{color:var(--ivory);border-color:color-mix(in srgb,var(--accent) 36%,rgba(246,236,215,.12));background:color-mix(in srgb,var(--accent) 9%,rgba(246,236,215,.045))}\n.song-row.manually-queued .song-index{color:var(--accent)}\n.queue-toolbar,.queue-section-label{position:sticky;z-index:2;display:flex;align-items:center;justify-content:space-between;min-height:38px;background:linear-gradient(to bottom,var(--panel) 72%,color-mix(in srgb,var(--panel) 88%,transparent));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:rgba(246,236,215,.58);font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}\n.queue-toolbar{top:0;border-bottom:1px solid rgba(246,236,215,.08)}\n.queue-section-label{top:0;justify-content:flex-start;border-top:1px solid rgba(246,236,215,.08)}\n.queue-clear{min-height:32px;padding:0 11px;border:1px solid rgba(246,236,215,.10);border-radius:999px;background:transparent;color:rgba(246,236,215,.68);font:inherit;font-size:11px;letter-spacing:0;text-transform:none;cursor:pointer}\n.queue-clear:hover,.queue-clear:focus-visible{color:var(--ivory);border-color:rgba(246,236,215,.24)}\n@media(hover:hover) and (pointer:fine){.song-row:not(:hover):not(:focus-within) .song-queue-action{opacity:.28}}\n@media(max-width:700px){.song-row{grid-template-columns:28px minmax(0,1fr) 36px 38px;gap:8px}.song-duration{display:none}.song-queue-action{width:34px;height:34px}.queue-toolbar,.queue-section-label{min-height:36px}}\n@media(prefers-reduced-motion:reduce){.song-queue-action{transition:none!important}}\n`;
await save('styles/10-browser-and-shell.css', styles);

const validator = `import { readFile } from 'node:fs/promises';\nimport path from 'node:path';\nimport process from 'node:process';\n\nconst root = path.resolve(import.meta.dirname, '../..');\nconst read = (file) => readFile(path.join(root, file), 'utf8');\nconst [app, index, styles, library, nonstop] = await Promise.all([\n  read('app.js'),\n  read('index.html'),\n  read('styles/10-browser-and-shell.css'),\n  read('src/catalogue/listening-library.js'),\n  read('nonstop-browser.js'),\n]);\nlet failed = false;\nconst requireMarker = (source, marker, label) => { if (!source.includes(marker)) { console.error('✗ ' + label + ': ' + marker); failed = true; } };\n\nfor (const marker of [\n  "manualQueue: [...new Set(storage.get('garba:queue'",\n  'function queueSong(songId)',\n  'state.manualQueue.shift()',\n  'function removeQueuedSong(songId',\n  'function clearManualQueue()',\n  'state.playContextGenreId || state.genreId',\n  'state.listeningHistory.pop()',\n  "showToast('Added to Up next.')",\n  "state.sheetMode === 'favourites' ? 'My Garba'",\n  "storage.set('garba:favourites'",\n]) requireMarker(app, marker, 'Listening flow contract missing');\n\nrequireMarker(index, 'aria-label="Open My Garba"', 'My Garba topbar label missing');\nrequireMarker(styles, '/* Listening flow #287 */', 'Listening-flow styles missing');\nrequireMarker(styles, '.song-queue-action', 'Play-next row action missing');\nrequireMarker(library, "heading.textContent = 'My Garba';", 'Explore My Garba section missing');\nrequireMarker(nonstop, "target.closest('#queueButton, #prevButton, #nextButton, #miniPrev, #miniNext')", 'Nonstop queue/transport isolation must remain intact');\n\nif (app.includes("storage.set('garba:my-garba'")) { console.error('✗ Existing garba:favourites storage key must not be migrated'); failed = true; }\nif (failed) process.exit(1);\nconsole.log('✓ manual Up next is FIFO, deduplicated and removable without replacing catalogue identity');\nconsole.log('✓ Previous uses actual listening history and Next returns to the catalogue context after queued songs');\nconsole.log('✓ My Garba reuses the existing favourites storage instead of adding playlist CRUD');\nconsole.log('✓ Nonstop transport remains isolated from the ordinary song queue');\n`;
await save('scripts/lib/validate-listening-flow.mjs', validator);

let pkg = JSON.parse(await text('package.json'));
pkg.scripts['listening:flow:validate'] = 'node scripts/lib/validate-listening-flow.mjs';
pkg.scripts['check:modules'] += ' && node --check scripts/lib/validate-listening-flow.mjs';
pkg.scripts.check = pkg.scripts.check.replace('npm run nonstop:transport:validate &&', 'npm run nonstop:transport:validate && npm run listening:flow:validate &&');
await save('package.json', JSON.stringify(pkg, null, 2) + '\n');

console.log('Listening flow #287 patch applied.');
