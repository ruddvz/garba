async function fetchCatalogue() {
  const genresResponse = await fetch('data/genres.json', { cache: 'no-store' });
  if (!genresResponse.ok) throw new Error('Failed to load visual genres');

  let songsResponse = await fetch('data/songs.json', { cache: 'no-store' });
  if (!songsResponse.ok) {
    songsResponse = await fetch('data/ui-demo-songs.json', { cache: 'no-store' });
  }
  if (!songsResponse.ok) throw new Error('Failed to load song catalogue');

  return {
    genres: await genresResponse.json(),
    songs: await songsResponse.json(),
  };
}

function makeCatalogueSignature(genres, songs) {
  return JSON.stringify({
    genres: genres.map((genre) => [genre.id, genre.label, genre.background, genre.accent]),
    songs: songs.map((song) => [song.id, song.title, song.artist, song.genre, song.durationSeconds, song.audioUrl, song.youtubeId]),
  });
}

async function refreshCatalogue({ quiet = false } = {}) {
  try {
    const next = await fetchCatalogue();
    const signature = makeCatalogueSignature(next.genres, next.songs);
    const changed = state.catalogueSignature && signature !== state.catalogueSignature;
    state.genres = next.genres;
    state.songs = next.songs;
    state.catalogueSignature = signature;
    state.catalogueLoadedAt = Date.now();

    let song = currentSong();
    let genre = currentGenre();
    if (!genre) {
      genre = state.genres.find((entry) => entry.id === 'traditional') || state.genres[0];
      state.genreId = genre?.id || state.genreId;
    }
    if (!song) {
      song = state.songs.find((entry) => entry.genre === state.genreId) || state.songs[0];
      if (song) {
        state.songId = song.id;
        state.genreId = song.genre;
        state.sheetFilter = song.genre;
        state.duration = song.durationSeconds || 0;
        state.elapsed = 0;
      }
    }

    const activeGenre = currentGenre();
    if (activeGenre) {
      setAccent(activeGenre.accent);
      preloadBackgrounds();
    }
    renderPlayer();
    syncGenreStrips({ smooth: false });
    renderSheet();
    if (changed && !quiet) showToast('Song catalogue updated.');
  } catch (error) {
    if (!quiet) console.warn('Catalogue refresh failed', error);
  }
}

function resolveInitialState() {
  const params = new URLSearchParams(location.search);
  const session = storage.get('garba:session', {});
  const requestedSong = params.get('song');
  const requestedGenre = params.get('genre');

  let song = requestedSong ? state.songs.find((entry) => entry.id === requestedSong) : null;
  if (!song && session.songId) song = state.songs.find((entry) => entry.id === session.songId);

  let genre = requestedGenre ? state.genres.find((entry) => entry.id === requestedGenre) : null;
  if (!genre && song) genre = state.genres.find((entry) => entry.id === song.genre);
  if (!genre && session.genreId) genre = state.genres.find((entry) => entry.id === session.genreId);
  if (!genre) genre = state.genres.find((entry) => entry.id === 'traditional') || state.genres[0];

  if (!song || song.genre !== genre.id) song = state.songs.find((entry) => entry.genre === genre.id) || state.songs[0];
  return { genre, song, elapsed: Number(session.elapsed || 0), browse: params.get('browse') === '1' };
}

async function init() {
  try {
    const catalogue = await fetchCatalogue();
    state.genres = catalogue.genres;
    state.songs = catalogue.songs;
    state.catalogueSignature = makeCatalogueSignature(state.genres, state.songs);
    state.catalogueLoadedAt = Date.now();
    const initial = resolveInitialState();

    state.genreId = initial.genre.id;
    state.sheetFilter = initial.genre.id;
    state.songId = initial.song?.id || null;
    state.duration = initial.song?.durationSeconds || 0;
    els.app.dataset.genre = initial.genre.id;
    setAccent(initial.genre.accent);
    els.worldA.style.backgroundImage = `url("${initial.genre.background}")`;
    preloadBackgrounds();

    if (initial.song) await selectSong(initial.song.id, { initial: true, animate: false, restoreElapsed: initial.elapsed, keepSheet: true });
    else {
      renderPlayer();
      syncGenreStrips({ smooth: false });
      renderSheet();
    }

    if (initial.browse) openSheet('all', { snap: 'full', history: false });
    updateUrl();
  } catch (error) {
    console.error(error);
    showToast('Catalogue could not load. The app shell is ready, but song data is unavailable.');
  }
}

wireEvents();
setupMediaSessionActions();
setupPwaInstall();
registerServiceWorker();
init();
