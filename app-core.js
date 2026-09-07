const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode / storage denied */ }
  },
};

const state = {
  genres: [],
  songs: [],
  genreId: 'traditional',
  songId: null,
  favourites: new Set(storage.get('garba:favourites', [])),
  playing: false,
  elapsed: 0,
  duration: 0,
  activeWorld: 'A',
  sheetFilter: 'traditional',
  sheetMode: 'all',
  sheetSnap: 'closed',
  toastTimer: null,
  transitionToken: 0,
  installPrompt: null,
  installTimer: null,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  lastPersistedElapsed: -1,
  catalogueSignature: '',
  catalogueLoadedAt: 0,
  sheetTrigger: null,
};

const $ = (id) => document.getElementById(id);
const els = {
  app: $('app'),
  worldA: $('worldA'),
  worldB: $('worldB'),
  worldAmbient: $('worldAmbient'),
  trackBlock: $('trackBlock'),
  genreEyebrow: $('genreEyebrow'),
  songTitle: $('songTitle'),
  songArtist: $('songArtist'),
  playButton: $('playButton'),
  prevButton: $('prevButton'),
  nextButton: $('nextButton'),
  progress: $('progress'),
  elapsedTime: $('elapsedTime'),
  durationTime: $('durationTime'),
  genreStrip: $('genreStrip'),
  browseButton: $('browseButton'),
  songSheet: $('songSheet'),
  sheetHandle: $('sheetHandle'),
  sheetTitle: $('sheetTitle'),
  sheetClose: $('sheetClose'),
  sheetGenreStrip: $('sheetGenreStrip'),
  songList: $('songList'),
  searchButton: $('searchButton'),
  favouritesButton: $('favouritesButton'),
  queueButton: $('queueButton'),
  queueBadge: $('queueBadge'),
  searchInput: $('searchInput'),
  mobileFavourite: $('mobileFavourite'),
  miniTitle: $('miniTitle'),
  miniArtist: $('miniArtist'),
  miniProgress: $('miniProgress'),
  miniPlay: $('miniPlay'),
  miniPrev: $('miniPrev'),
  miniNext: $('miniNext'),
  audio: $('audio'),
  toast: $('toast'),
  installBanner: $('installBanner'),
  installTitle: $('installTitle'),
  installText: $('installText'),
  installButton: $('installButton'),
  installDismiss: $('installDismiss'),
};

const mobileQuery = window.matchMedia('(max-width: 700px)');
const standaloneQuery = window.matchMedia('(display-mode: standalone)');

const formatTime = (seconds = 0) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

const currentSong = () => state.songs.find((song) => song.id === state.songId) || null;
const currentGenre = () => state.genres.find((genre) => genre.id === state.genreId) || null;
const songsForGenre = (genreId) => state.songs.filter((song) => song.genre === genreId);

function persistFavourites() {
  storage.set('garba:favourites', [...state.favourites]);
}

function persistSession() {
  storage.set('garba:session', {
    genreId: state.genreId,
    songId: state.songId,
    elapsed: Math.round(state.elapsed || 0),
  });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2500);
}

function setAccent(accent) {
  document.documentElement.style.setProperty('--accent', accent || '#d6b06f');
}

function setPlaying(playing) {
  state.playing = playing;
  els.app.classList.toggle('is-playing', playing);
  els.playButton.classList.toggle('is-playing', playing);
  els.miniPlay.classList.toggle('is-playing', playing);
  els.playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  els.miniPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
}

function preloadBackgrounds() {
  state.genres.forEach((genre) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = genre.background;
  });
}

function setWorld(background, immediate = false) {
  const incoming = state.activeWorld === 'A' ? els.worldB : els.worldA;
  const outgoing = state.activeWorld === 'A' ? els.worldA : els.worldB;
  incoming.style.backgroundImage = `url("${background}")`;

  if (immediate || state.reducedMotion) {
    outgoing.classList.remove('is-visible');
    incoming.classList.add('is-visible');
  } else {
    requestAnimationFrame(() => {
      incoming.classList.add('is-visible');
      outgoing.classList.remove('is-visible');
    });
  }

  state.activeWorld = state.activeWorld === 'A' ? 'B' : 'A';
}

function renderGenreButtons(container, activeId, onSelect) {
  const previousFocus = document.activeElement?.dataset?.genre;
  container.innerHTML = '';

  state.genres.forEach((genre) => {
    const button = document.createElement('button');
    button.className = `genre-button${genre.id === activeId ? ' active' : ''}`;
    button.type = 'button';
    button.textContent = genre.name;
    button.dataset.genre = genre.id;
    if (genre.id === activeId) button.setAttribute('aria-current', 'true');
    button.addEventListener('click', () => onSelect(genre.id));
    container.append(button);
  });

  if (previousFocus) container.querySelector(`[data-genre="${CSS.escape(previousFocus)}"]`)?.focus({ preventScroll: true });
}

function syncGenreStrips({ smooth = true } = {}) {
  renderGenreButtons(els.genreStrip, state.genreId, selectGenre);
  syncSheetGenresOnly();

  requestAnimationFrame(() => {
    const behavior = smooth && !state.reducedMotion ? 'smooth' : 'auto';
    els.genreStrip.querySelector('.active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior });
    els.sheetGenreStrip.querySelector('.active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior });
  });
}

function syncSheetGenresOnly() {
  renderGenreButtons(els.sheetGenreStrip, state.sheetFilter, (genreId) => {
    state.sheetFilter = genreId;
    state.sheetMode = 'all';
    renderSheet();
  });
}

function updateUrl() {
  const url = new URL(location.href);
  url.searchParams.set('genre', state.genreId);
  if (state.songId) url.searchParams.set('song', state.songId);
  url.searchParams.delete('browse');
  url.searchParams.delete('source');
  history.replaceState(history.state, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
}

function updateFavouriteUI() {
  const song = currentSong();
  const active = song ? state.favourites.has(song.id) : false;
  els.mobileFavourite.classList.toggle('active', active);
  els.mobileFavourite.setAttribute('aria-pressed', String(active));
}

function getUpNextSongs() {
  const list = songsForGenre(state.genreId);
  if (!list.length) return [];
  const currentIndex = list.findIndex((song) => song.id === state.songId);
  if (currentIndex < 0) return list.slice(0, 12);
  return [...list.slice(currentIndex + 1), ...list.slice(0, currentIndex)].slice(0, 12);
}

function updateQueueBadge() {
  const count = getUpNextSongs().length;
  els.queueBadge.textContent = count > 9 ? '9+' : String(count);
  els.queueBadge.classList.toggle('show', count > 0 && !mobileQuery.matches);
}

function updateMediaSession() {
  const song = currentSong();
  const genre = currentGenre();
  if (!song || !('mediaSession' in navigator)) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: genre?.label || 'GARBA',
      artwork: [
        { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  } catch { /* MediaMetadata may be unavailable inside some webviews */ }
}

function updateMediaPositionState() {
  if (!('mediaSession' in navigator) || !state.duration || !Number.isFinite(state.duration)) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: Math.max(1, state.duration),
      playbackRate: els.audio.playbackRate || 1,
      position: Math.min(Math.max(0, state.elapsed), state.duration),
    });
  } catch { /* Not supported in every browser */ }
}

function renderPlayer() {
  const song = currentSong();
  const genre = currentGenre();
  if (!song || !genre) return;

  els.genreEyebrow.textContent = genre.label;
  els.songTitle.textContent = song.title;
  const titleLength = [...song.title].length;
  els.trackBlock.classList.toggle('is-long-title', titleLength > 28);
  els.trackBlock.classList.toggle('is-very-long-title', titleLength > 44);
  els.songArtist.textContent = song.artist;
  els.miniTitle.textContent = song.title;
  els.miniArtist.textContent = song.artist;
  els.durationTime.textContent = formatTime(state.duration || song.durationSeconds);
  els.elapsedTime.textContent = formatTime(state.elapsed);

  const ratio = state.duration ? Math.min(1, Math.max(0, state.elapsed / state.duration)) : 0;
  els.progress.value = Math.round(ratio * 1000);
  els.progress.style.setProperty('--progress', `${ratio * 100}%`);
  els.miniProgress.style.width = `${ratio * 100}%`;

  updateFavouriteUI();
  updateQueueBadge();
  updateMediaPositionState();
}

async function animateTrackSwap(update) {
  const token = ++state.transitionToken;
  if (state.reducedMotion || !els.trackBlock.animate) {
    update();
    return;
  }

  const out = els.trackBlock.animate(
    [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-12px)' },
    ],
    { duration: 170, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }
  );

  try { await out.finished; } catch { /* animation cancelled */ }
  if (token !== state.transitionToken) return;
  update();
  out.cancel();

  els.trackBlock.animate(
    [
      { opacity: 0, transform: 'translateY(12px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 230, easing: 'cubic-bezier(.2,.75,.2,1)' }
  );
}

function configureAudio(song, restoreElapsed = 0) {
  els.audio.pause();
  els.audio.removeAttribute('src');
  els.audio.load();
  setPlaying(false);

  state.elapsed = 0;
  state.duration = song.durationSeconds || 0;

  if (song.audioUrl) {
    els.audio.src = song.audioUrl;
    els.audio.load();
    if (restoreElapsed > 0) {
      const setTime = () => {
        els.audio.currentTime = Math.min(restoreElapsed, Number.isFinite(els.audio.duration) ? els.audio.duration : restoreElapsed);
        els.audio.removeEventListener('loadedmetadata', setTime);
      };
      els.audio.addEventListener('loadedmetadata', setTime);
    }
  } else if (restoreElapsed > 0) {
    state.elapsed = Math.min(restoreElapsed, state.duration || restoreElapsed);
  }
}

async function selectSong(songId, options = {}) {
  const song = state.songs.find((entry) => entry.id === songId);
  if (!song) return;

  const genre = state.genres.find((entry) => entry.id === song.genre);
  if (!genre) return;

  const wasPlaying = state.playing;
  const genreChanged = song.genre !== state.genreId;
  const restoreElapsed = options.restoreElapsed || 0;

  if (genreChanged) {
    state.genreId = song.genre;
    state.sheetFilter = song.genre;
    els.app.dataset.genre = song.genre;
    setAccent(genre.accent);
    setWorld(genre.background);
  }

  const apply = () => {
    state.songId = song.id;
    state.genreId = song.genre;
    state.sheetFilter = song.genre;
    configureAudio(song, restoreElapsed);
    renderPlayer();
    updateMediaSession();
    syncGenreStrips({ smooth: !options.initial });
    renderSheet();
    persistSession();
    if (!options.initial) updateUrl();
  };

  if (options.animate === false || options.initial) apply();
  else await animateTrackSwap(apply);

  if (wasPlaying && song.audioUrl && options.preservePlayback !== false) {
    try { await els.audio.play(); } catch { /* browser can block autoplay after async transitions */ }
  }

  if (!options.keepSheet && mobileQuery.matches && state.sheetSnap !== 'closed') setSheetSnap('collapsed');
}

function selectGenre(genreId) {
  const genre = state.genres.find((entry) => entry.id === genreId);
  if (!genre) return;
  if (genreId === state.genreId) {
    state.sheetFilter = genreId;
    syncGenreStrips();
    return;
  }

  const next = songsForGenre(genreId)[0];
  if (next) selectSong(next.id, { keepSheet: true });
  else {
    state.genreId = genreId;
    state.sheetFilter = genreId;
    els.app.dataset.genre = genreId;
    setAccent(genre.accent);
    setWorld(genre.background);
    syncGenreStrips();
    renderSheet();
    updateUrl();
  }
}

function getSheetSongs() {
  const query = els.searchInput.value.trim().toLowerCase();
  let songs;

  if (state.sheetMode === 'favourites') {
    songs = state.songs.filter((song) => state.favourites.has(song.id));
  } else if (state.sheetMode === 'queue') {
    songs = getUpNextSongs();
  } else if (state.sheetMode === 'search') {
    songs = state.songs;
  } else {
    songs = state.songs.filter((song) => song.genre === state.sheetFilter);
  }

  if (query) songs = songs.filter((song) => `${song.title} ${song.artist}`.toLowerCase().includes(query));
  return songs;
}

function renderSheet() {
  els.songSheet.classList.toggle('mode-favourites', state.sheetMode === 'favourites');
  els.songSheet.classList.toggle('mode-queue', state.sheetMode === 'queue');
  els.songSheet.classList.toggle('mode-search', state.sheetMode === 'search');
  els.sheetTitle.textContent = state.sheetMode === 'favourites' ? 'Favourites' : state.sheetMode === 'queue' ? 'Up next' : state.sheetMode === 'search' ? 'Search' : 'Songs';

  syncSheetGenresOnly();
  const songs = getSheetSongs();
  els.songList.innerHTML = '';

  if (!songs.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const strong = document.createElement('strong');
    const copy = document.createElement('span');
    if (state.sheetMode === 'favourites') {
      strong.textContent = 'No favourites yet';
      copy.textContent = 'Tap the heart beside a song to keep it here.';
    } else if (state.sheetMode === 'queue') {
      strong.textContent = 'Nothing up next';
      copy.textContent = 'Choose a genre or another song to continue listening.';
    } else {
      strong.textContent = 'No songs found';
      copy.textContent = els.searchInput.value ? 'Try a different search.' : 'This genre is waiting for catalogue data.';
    }
    empty.append(strong, copy);
    els.songList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  songs.forEach((song, index) => {
    const row = document.createElement('div');
    row.className = `song-row${song.id === state.songId ? ' current' : ''}`;
    row.role = 'listitem';

    const idx = document.createElement('span');
    idx.className = 'song-index';
    idx.textContent = String(index + 1).padStart(2, '0');

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'song-copy';
    copy.setAttribute('aria-label', `Play ${song.title} by ${song.artist}`);
    const title = document.createElement('strong');
    title.textContent = song.title;
    const artist = document.createElement('small');
    artist.textContent = song.artist;
    copy.append(title, artist);
    copy.addEventListener('click', () => selectSong(song.id, { keepSheet: true }));

    const duration = document.createElement('span');
    duration.className = 'song-duration';
    duration.textContent = formatTime(song.durationSeconds);

    const favourite = document.createElement('button');
    favourite.type = 'button';
    favourite.className = `heart-button song-favourite${state.favourites.has(song.id) ? ' active' : ''}`;
    favourite.setAttribute('aria-label', state.favourites.has(song.id) ? `Remove ${song.title} from favourites` : `Add ${song.title} to favourites`);
    favourite.setAttribute('aria-pressed', String(state.favourites.has(song.id)));
    favourite.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 5.9l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.3 1-1a5.5 5.5 0 0 0 0-7.8Z"></path></svg>';
    favourite.addEventListener('click', () => toggleFavourite(song.id));

    row.append(idx, copy, duration, favourite);
    fragment.append(row);
  });
  els.songList.append(fragment);
}

function toggleFavourite(songId = state.songId) {
  if (!songId) return;
  const willAdd = !state.favourites.has(songId);
  if (willAdd) state.favourites.add(songId);
  else state.favourites.delete(songId);
  persistFavourites();
  updateFavouriteUI();
  renderSheet();
  showToast(willAdd ? 'Added to favourites.' : 'Removed from favourites.');
}

function setSheetSnap(snap) {
  const allowed = ['closed', 'collapsed', 'medium', 'full'];
  state.sheetSnap = allowed.includes(snap) ? snap : 'closed';
  els.songSheet.dataset.snap = state.sheetSnap;
  els.app.dataset.sheetSnap = state.sheetSnap;
  const open = state.sheetSnap !== 'closed';
  els.songSheet.setAttribute('aria-hidden', String(!open));
  els.browseButton.setAttribute('aria-expanded', String(open));
  if (!open) {
    els.songSheet.classList.remove('searching');
    els.searchInput.blur();
  }
}

function preferredOpenSnap(mode) {
  if (!mobileQuery.matches) return 'full';
  if (mode === 'search') return 'full';
  return 'medium';
}
