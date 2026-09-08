import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

async function replaceOnce(file, before, after) {
  const full = path.join(root, file);
  const source = await readFile(full, 'utf8');
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`Expected marker not found in ${file}: ${before.slice(0, 90)}`);
  await writeFile(full, source.replace(before, after));
  console.log(`Updated ${file}`);
  return true;
}

await replaceOnce(
  'scripts/build-catalogue.mjs',
  'await Promise.all([\n  writeFile(resolve(root, index.generatedFiles.songs), `${JSON.stringify(songs, null, 2)}\\n`),',
  `const songsByReleaseId = new Map();\nfor (const song of songs) {\n  const list = songsByReleaseId.get(song.releaseId) || [];\n  list.push(song);\n  songsByReleaseId.set(song.releaseId, list);\n}\n\nfunction canonicalPresentationSong(song, canonicalReleaseId) {\n  const candidates = songsByReleaseId.get(canonicalReleaseId) || [];\n  if (!candidates.length) return null;\n  const trackNumber = Number(song.trackNumber);\n  if (Number.isFinite(trackNumber) && trackNumber > 0) {\n    const byTrack = candidates.find((candidate) => Number(candidate.trackNumber) === trackNumber);\n    if (byTrack) return byTrack;\n  }\n  const title = normalise(song.title);\n  const byTitle = candidates.find((candidate) => normalise(candidate.title) === title);\n  return byTitle || candidates[0] || null;\n}\n\nconst presentationSongs = songs.map((song) => {\n  const release = releasesById.get(song.releaseId);\n  const role = String(release?.presentationRole || 'catalogue');\n  if (role === 'catalogue') return song;\n  const canonicalReleaseId = String(release?.canonicalReleaseId || '').trim();\n  const canonicalSong = canonicalReleaseId ? canonicalPresentationSong(song, canonicalReleaseId) : null;\n  return {\n    ...song,\n    presentationRole: role,\n    ...(canonicalReleaseId ? { canonicalReleaseId } : {}),\n    ...(canonicalSong?.id ? { canonicalSongId: canonicalSong.id } : {}),\n    ...(release?.nonstopSetId ? { nonstopSetId: release.nonstopSetId } : {}),\n  };\n});\n\nawait Promise.all([\n  writeFile(resolve(root, index.generatedFiles.songs), \\`${'${JSON.stringify(presentationSongs, null, 2)}'}\\\\n\\`),`
);

await replaceOnce(
  'app.js',
  '  sheetTrigger: null,\n};',
  '  sheetTrigger: null,\n  presentationRedirects: new Map(),\n};'
);

await replaceOnce(
  'app.js',
  `async function fetchCatalogue() {\n  const [genresResponse, songsResponse] = await Promise.all([\n    fetch('data/genres.json', { cache: 'no-store' }),\n    fetch('data/songs.json', { cache: 'no-store' }),\n  ]);\n  if (!genresResponse.ok || !songsResponse.ok) throw new Error('Failed to load catalogue');\n  return {\n    genres: await genresResponse.json(),\n    songs: await songsResponse.json(),\n  };\n}`,
  `async function fetchCatalogue() {\n  const [genresResponse, songsResponse] = await Promise.all([\n    fetch('data/genres.json', { cache: 'no-store' }),\n    fetch('data/songs.json', { cache: 'no-store' }),\n  ]);\n  if (!genresResponse.ok || !songsResponse.ok) throw new Error('Failed to load catalogue');\n  const [genres, allSongs] = await Promise.all([genresResponse.json(), songsResponse.json()]);\n  const songs = [];\n  const presentationRedirects = new Map();\n  for (const song of allSongs) {\n    const role = String(song?.presentationRole || 'catalogue');\n    if (role === 'catalogue') songs.push(song);\n    else if (song?.id) presentationRedirects.set(song.id, song);\n  }\n  return { genres, songs, presentationRedirects };\n}`
);

await replaceOnce(
  'app.js',
  `function persistFavourites() {\n  storage.set('garba:favourites', [...state.favourites]);\n}`,
  `function persistFavourites() {\n  storage.set('garba:favourites', [...state.favourites]);\n}\n\nfunction reconcilePresentationFavourites() {\n  const visibleIds = new Set(state.songs.map((song) => song.id));\n  const next = new Set();\n  let changed = false;\n  for (const id of state.favourites) {\n    const redirect = state.presentationRedirects.get(id);\n    const mapped = redirect?.canonicalSongId || id;\n    if (visibleIds.has(mapped)) next.add(mapped);\n    if (mapped !== id || !visibleIds.has(id)) changed = true;\n  }\n  if (changed || next.size !== state.favourites.size) {\n    state.favourites = next;\n    persistFavourites();\n  }\n}`
);

await replaceOnce(
  'app.js',
  `    state.genres = next.genres;\n    state.songs = next.songs;\n    state.catalogueSignature = signature;`,
  `    state.genres = next.genres;\n    state.songs = next.songs;\n    state.presentationRedirects = next.presentationRedirects;\n    reconcilePresentationFavourites();\n    state.catalogueSignature = signature;`
);

await replaceOnce(
  'app.js',
  `  const requestedSong = params.get('song');\n  const requestedGenre = params.get('genre');\n  const pendingSongId = requestedSong && !state.songs.some((entry) => entry.id === requestedSong) ? requestedSong : null;\n\n  let song = requestedSong ? state.songs.find((entry) => entry.id === requestedSong) : null;`,
  `  let requestedSong = params.get('song');\n  const requestedGenre = params.get('genre');\n  const redirect = requestedSong ? state.presentationRedirects.get(requestedSong) : null;\n  let pendingNonstopSetId = null;\n  if (redirect?.presentationRole === 'nonstop-only' && redirect.nonstopSetId) {\n    pendingNonstopSetId = redirect.nonstopSetId;\n    const url = new URL(location.href);\n    url.searchParams.delete('song');\n    url.searchParams.set('nonstop', pendingNonstopSetId);\n    history.replaceState(history.state, '', \\`${'${url.pathname}${url.search}${url.hash}'}\\`);\n    requestedSong = redirect.canonicalSongId || null;\n  } else if (redirect?.canonicalSongId) {\n    requestedSong = redirect.canonicalSongId;\n  }\n  const pendingSongId = requestedSong && !state.songs.some((entry) => entry.id === requestedSong) ? requestedSong : null;\n\n  let song = requestedSong ? state.songs.find((entry) => entry.id === requestedSong) : null;`
);

await replaceOnce(
  'app.js',
  `    browse: params.get('browse') === '1',\n  };`,
  `    browse: params.get('browse') === '1',\n    pendingNonstopSetId,\n  };`
);

await replaceOnce(
  'app.js',
  `    state.genres = catalogue.genres;\n    state.songs = catalogue.songs;\n    state.catalogueSignature = makeCatalogueSignature(state.genres, state.songs);`,
  `    state.genres = catalogue.genres;\n    state.songs = catalogue.songs;\n    state.presentationRedirects = catalogue.presentationRedirects;\n    reconcilePresentationFavourites();\n    state.catalogueSignature = makeCatalogueSignature(state.genres, state.songs);`
);

await replaceOnce(
  'app.js',
  `    state.pendingSongId = initial.pendingSongId;\n    if (initial.browse) openSheet('all', { snap: 'full', history: false });`,
  `    state.pendingSongId = initial.pendingSongId;\n    if (initial.pendingNonstopSetId) {\n      setTimeout(() => window.GARBA_NONSTOP?.play?.(initial.pendingNonstopSetId, { quiet: true }), 0);\n    }\n    if (initial.browse) openSheet('all', { snap: 'full', history: false });`
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  `  releaseById: new Map(),\n  collections: [],`,
  `  releaseById: new Map(),\n  releaseRedirects: new Map(),\n  collections: [],`
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  `function filterToRelease(releaseId, { updateHistory = true, scroll = true } = {}) {\n  if (!state.active || state.active.id === 'search') return false;\n  const release = state.releaseById.get(releaseId);\n  const songs = state.activeSongs.filter((song)=>song.releaseId===releaseId);\n  if (!release || !songs.length) return false;\n  state.activeReleaseId = releaseId;`,
  `function filterToRelease(releaseId, { updateHistory = true, scroll = true } = {}) {\n  if (!state.active || state.active.id === 'search') return false;\n  const requestedRelease = state.releaseById.get(releaseId);\n  const resolvedReleaseId = requestedRelease?.canonicalReleaseId || releaseId;\n  const release = state.releaseById.get(resolvedReleaseId);\n  const songs = state.activeSongs.filter((song)=>song.releaseId===resolvedReleaseId);\n  if (!release || !songs.length) return false;\n  state.activeReleaseId = resolvedReleaseId;`
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  `    const nextState = { collection:state.active.id, release:releaseId };\n    const nextHash = collectionHash(state.active.id, releaseId);\n    if (history.state?.collection === state.active.id && history.state?.release === releaseId) {`,
  `    const nextState = { collection:state.active.id, release:resolvedReleaseId };\n    const nextHash = collectionHash(state.active.id, resolvedReleaseId);\n    if (history.state?.collection === state.active.id && history.state?.release === resolvedReleaseId) {`
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  `  state.songs = songs;\n  state.releases = releases;`,
  `  state.songs = songs.filter((song) => String(song?.presentationRole || 'catalogue') === 'catalogue');\n  state.releases = releases;\n  state.releaseRedirects = new Map(releases.filter((release) => release?.canonicalReleaseId).map((release) => [release.id, release.canonicalReleaseId]));`
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  `  els.count.textContent = \\`${'${songs.length.toLocaleString()} songs · ${state.releaseById.size.toLocaleString()} releases · ${state.collections.length.toLocaleString()} catalogues'}\\`;`,
  `  const visibleReleaseCount = new Set(state.songs.map((song) => song.releaseId).filter(Boolean)).size;\n  els.count.textContent = \\`${'${state.songs.length.toLocaleString()} songs · ${visibleReleaseCount.toLocaleString()} releases · ${state.collections.length.toLocaleString()} catalogues'}\\`;`
);
