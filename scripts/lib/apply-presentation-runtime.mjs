import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const block = (lines) => lines.join('\n');

async function replaceOnce(file, before, after) {
  const full = path.join(root, file);
  const source = await readFile(full, 'utf8');
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`Expected marker not found in ${file}: ${before.slice(0, 90)}`);
  await writeFile(full, source.replace(before, after));
  console.log(`Updated ${file}`);
  return true;
}

const buildBefore = 'await Promise.all([\n  writeFile(resolve(root, index.generatedFiles.songs), `${JSON.stringify(songs, null, 2)}\\n`),';
const buildAfter = block([
  'const songsByReleaseId = new Map();',
  'for (const song of songs) {',
  '  const list = songsByReleaseId.get(song.releaseId) || [];',
  '  list.push(song);',
  '  songsByReleaseId.set(song.releaseId, list);',
  '}',
  '',
  'function canonicalPresentationSong(song, canonicalReleaseId) {',
  '  const candidates = songsByReleaseId.get(canonicalReleaseId) || [];',
  '  if (!candidates.length) return null;',
  '  const trackNumber = Number(song.trackNumber);',
  '  if (Number.isFinite(trackNumber) && trackNumber > 0) {',
  '    const byTrack = candidates.find((candidate) => Number(candidate.trackNumber) === trackNumber);',
  '    if (byTrack) return byTrack;',
  '  }',
  '  const title = normalise(song.title);',
  '  const byTitle = candidates.find((candidate) => normalise(candidate.title) === title);',
  '  return byTitle || candidates[0] || null;',
  '}',
  '',
  'const presentationSongs = songs.map((song) => {',
  '  const release = releasesById.get(song.releaseId);',
  "  const role = String(release?.presentationRole || 'catalogue');",
  "  if (role === 'catalogue') return song;",
  "  const canonicalReleaseId = String(release?.canonicalReleaseId || '').trim();",
  '  const canonicalSong = canonicalReleaseId ? canonicalPresentationSong(song, canonicalReleaseId) : null;',
  '  return {',
  '    ...song,',
  '    presentationRole: role,',
  '    ...(canonicalReleaseId ? { canonicalReleaseId } : {}),',
  '    ...(canonicalSong?.id ? { canonicalSongId: canonicalSong.id } : {}),',
  '    ...(release?.nonstopSetId ? { nonstopSetId: release.nonstopSetId } : {}),',
  '  };',
  '});',
  '',
  'await Promise.all([',
  "  writeFile(resolve(root, index.generatedFiles.songs), JSON.stringify(presentationSongs, null, 2) + '\\n'),",
]);
await replaceOnce('scripts/build-catalogue.mjs', buildBefore, buildAfter);

await replaceOnce(
  'app.js',
  block(['  sheetTrigger: null,', '};']),
  block(['  sheetTrigger: null,', '  presentationRedirects: new Map(),', '};'])
);

const fetchBefore = block([
  'async function fetchCatalogue() {',
  '  const [genresResponse, songsResponse] = await Promise.all([',
  "    fetch('data/genres.json', { cache: 'no-store' }),",
  "    fetch('data/songs.json', { cache: 'no-store' }),",
  '  ]);',
  "  if (!genresResponse.ok || !songsResponse.ok) throw new Error('Failed to load catalogue');",
  '  return {',
  '    genres: await genresResponse.json(),',
  '    songs: await songsResponse.json(),',
  '  };',
  '}',
]);
const fetchAfter = block([
  'async function fetchCatalogue() {',
  '  const [genresResponse, songsResponse] = await Promise.all([',
  "    fetch('data/genres.json', { cache: 'no-store' }),",
  "    fetch('data/songs.json', { cache: 'no-store' }),",
  '  ]);',
  "  if (!genresResponse.ok || !songsResponse.ok) throw new Error('Failed to load catalogue');",
  '  const [genres, allSongs] = await Promise.all([genresResponse.json(), songsResponse.json()]);',
  '  const songs = [];',
  '  const presentationRedirects = new Map();',
  '  for (const song of allSongs) {',
  "    const role = String(song?.presentationRole || 'catalogue');",
  "    if (role === 'catalogue') songs.push(song);",
  '    else if (song?.id) presentationRedirects.set(song.id, song);',
  '  }',
  '  return { genres, songs, presentationRedirects };',
  '}',
]);
await replaceOnce('app.js', fetchBefore, fetchAfter);

await replaceOnce(
  'app.js',
  block([
    'function persistFavourites() {',
    "  storage.set('garba:favourites', [...state.favourites]);",
    '}',
  ]),
  block([
    'function persistFavourites() {',
    "  storage.set('garba:favourites', [...state.favourites]);",
    '}',
    '',
    'function reconcilePresentationFavourites() {',
    '  const visibleIds = new Set(state.songs.map((song) => song.id));',
    '  const next = new Set();',
    '  let changed = false;',
    '  for (const id of state.favourites) {',
    '    const redirect = state.presentationRedirects.get(id);',
    '    const mapped = redirect?.canonicalSongId || id;',
    '    if (visibleIds.has(mapped)) next.add(mapped);',
    '    if (mapped !== id || !visibleIds.has(id)) changed = true;',
    '  }',
    '  if (changed || next.size !== state.favourites.size) {',
    '    state.favourites = next;',
    '    persistFavourites();',
    '  }',
    '}',
  ])
);

await replaceOnce(
  'app.js',
  block([
    '    state.genres = next.genres;',
    '    state.songs = next.songs;',
    '    state.catalogueSignature = signature;',
  ]),
  block([
    '    state.genres = next.genres;',
    '    state.songs = next.songs;',
    '    state.presentationRedirects = next.presentationRedirects;',
    '    reconcilePresentationFavourites();',
    '    state.catalogueSignature = signature;',
  ])
);

await replaceOnce(
  'app.js',
  block([
    "  const requestedSong = params.get('song');",
    "  const requestedGenre = params.get('genre');",
    '  const pendingSongId = requestedSong && !state.songs.some((entry) => entry.id === requestedSong) ? requestedSong : null;',
    '',
    '  let song = requestedSong ? state.songs.find((entry) => entry.id === requestedSong) : null;',
  ]),
  block([
    "  let requestedSong = params.get('song');",
    "  const requestedGenre = params.get('genre');",
    '  const redirect = requestedSong ? state.presentationRedirects.get(requestedSong) : null;',
    '  let pendingNonstopSetId = null;',
    "  if (redirect?.presentationRole === 'nonstop-only' && redirect.nonstopSetId) {",
    '    pendingNonstopSetId = redirect.nonstopSetId;',
    '    const url = new URL(location.href);',
    "    url.searchParams.delete('song');",
    "    url.searchParams.set('nonstop', pendingNonstopSetId);",
    "    history.replaceState(history.state, '', url.pathname + url.search + url.hash);",
    '    requestedSong = redirect.canonicalSongId || null;',
    '  } else if (redirect?.canonicalSongId) {',
    '    requestedSong = redirect.canonicalSongId;',
    '  }',
    '  const pendingSongId = requestedSong && !state.songs.some((entry) => entry.id === requestedSong) ? requestedSong : null;',
    '',
    '  let song = requestedSong ? state.songs.find((entry) => entry.id === requestedSong) : null;',
  ])
);

await replaceOnce(
  'app.js',
  block(["    browse: params.get('browse') === '1',", '  };']),
  block(["    browse: params.get('browse') === '1',", '    pendingNonstopSetId,', '  };'])
);

await replaceOnce(
  'app.js',
  block([
    '    state.genres = catalogue.genres;',
    '    state.songs = catalogue.songs;',
    '    state.catalogueSignature = makeCatalogueSignature(state.genres, state.songs);',
  ]),
  block([
    '    state.genres = catalogue.genres;',
    '    state.songs = catalogue.songs;',
    '    state.presentationRedirects = catalogue.presentationRedirects;',
    '    reconcilePresentationFavourites();',
    '    state.catalogueSignature = makeCatalogueSignature(state.genres, state.songs);',
  ])
);

await replaceOnce(
  'app.js',
  block([
    '    state.pendingSongId = initial.pendingSongId;',
    "    if (initial.browse) openSheet('all', { snap: 'full', history: false });",
  ]),
  block([
    '    state.pendingSongId = initial.pendingSongId;',
    '    if (initial.pendingNonstopSetId) {',
    '      setTimeout(() => window.GARBA_NONSTOP?.play?.(initial.pendingNonstopSetId, { quiet: true }), 0);',
    '    }',
    "    if (initial.browse) openSheet('all', { snap: 'full', history: false });",
  ])
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  block(['  releaseById: new Map(),', '  collections: [],']),
  block(['  releaseById: new Map(),', '  releaseRedirects: new Map(),', '  collections: [],'])
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  block([
    'function filterToRelease(releaseId, { updateHistory = true, scroll = true } = {}) {',
    "  if (!state.active || state.active.id === 'search') return false;",
    '  const release = state.releaseById.get(releaseId);',
    '  const songs = state.activeSongs.filter((song)=>song.releaseId===releaseId);',
    '  if (!release || !songs.length) return false;',
    '  state.activeReleaseId = releaseId;',
  ]),
  block([
    'function filterToRelease(releaseId, { updateHistory = true, scroll = true } = {}) {',
    "  if (!state.active || state.active.id === 'search') return false;",
    '  const requestedRelease = state.releaseById.get(releaseId);',
    '  const resolvedReleaseId = requestedRelease?.canonicalReleaseId || releaseId;',
    '  const release = state.releaseById.get(resolvedReleaseId);',
    '  const songs = state.activeSongs.filter((song)=>song.releaseId===resolvedReleaseId);',
    '  if (!release || !songs.length) return false;',
    '  state.activeReleaseId = resolvedReleaseId;',
  ])
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  block([
    '    const nextState = { collection:state.active.id, release:releaseId };',
    '    const nextHash = collectionHash(state.active.id, releaseId);',
    '    if (history.state?.collection === state.active.id && history.state?.release === releaseId) {',
  ]),
  block([
    '    const nextState = { collection:state.active.id, release:resolvedReleaseId };',
    '    const nextHash = collectionHash(state.active.id, resolvedReleaseId);',
    '    if (history.state?.collection === state.active.id && history.state?.release === resolvedReleaseId) {',
  ])
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  block(['  state.songs = songs;', '  state.releases = releases;']),
  block([
    "  state.songs = songs.filter((song) => String(song?.presentationRole || 'catalogue') === 'catalogue');",
    '  state.releases = releases;',
    '  state.releaseRedirects = new Map(releases.filter((release) => release?.canonicalReleaseId).map((release) => [release.id, release.canonicalReleaseId]));',
  ])
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  '  els.count.textContent = `${songs.length.toLocaleString()} songs · ${state.releaseById.size.toLocaleString()} releases · ${state.collections.length.toLocaleString()} catalogues`;',
  block([
    '  const visibleReleaseCount = new Set(state.songs.map((song) => song.releaseId).filter(Boolean)).size;',
    "  els.count.textContent = state.songs.length.toLocaleString() + ' songs · ' + visibleReleaseCount.toLocaleString() + ' releases · ' + state.collections.length.toLocaleString() + ' catalogues';",
  ])
);
