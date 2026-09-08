import './assets/runtime/route-readiness.js';
const { routeReadiness, canExecuteSong } = window.GARBA_ROUTE_READINESS;

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
  manualQueue: [...new Set(storage.get('garba:queue', []).filter((id) => typeof id === 'string'))].slice(0, 30),
  listeningHistory: [],
  playContextGenreId: 'traditional',
  playContextSongId: null,
  releaseContextId: null,
  releaseContextSongId: null,
  releaseContextConsumedIds: new Set(),
  playing: false,
  elapsed: 0,
  duration: 0,
  activeWorld: 'A',
  sheetFilter: 'traditional',
  sheetMode: 'all',
  sheetSnap: 'closed',
  sheetMatchCount: 0,
  toastTimer: null,
  transitionToken: 0,
  installPrompt: null,
  installTimer: null,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  lastPersistedElapsed: -1,
  catalogueSignature: '',
  catalogueLoadedAt: 0,
  pendingSongId: null,
  sheetTrigger: null,
  presentationRedirects: new Map(),
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
  sheetSummary: $('sheetSummary'),
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
const SEARCH_RESULT_LIMIT = 160;

const formatTime = (seconds = 0) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  return formatTime(seconds);
};

const currentSong = () => state.songs.find((song) => song.id === state.songId) || null;
const currentGenre = () => state.genres.find((genre) => genre.id === state.genreId) || null;
const songsForGenre = (genreId) => state.songs.filter((song) => song.genre === genreId);

const numericTrackNumber = (song) => {
  const value = Number(song?.trackNumber);
  return Number.isFinite(value) && value > 0 ? value : null;
};

function orderedReleaseSongs(releaseId) {
  if (!releaseId) return [];
  const byId = new Map();
  for (const song of state.songs) {
    if (!song?.id || song.releaseId !== releaseId || numericTrackNumber(song) == null) continue;
    byId.set(song.id, song);
  }
  return [...byId.values()].sort((left, right) => {
    const trackDelta = numericTrackNumber(left) - numericTrackNumber(right);
    return trackDelta || left.id.localeCompare(right.id);
  });
}

function releaseContextMatch(releaseId, songId) {
  const ordered = orderedReleaseSongs(releaseId);
  if (ordered.length < 2 || !songId) return null;
  return ordered.some((song) => song.id === songId) ? { releaseId, songId, ordered } : null;
}

function clearReleaseContext() {
  state.releaseContextId = null;
  state.releaseContextSongId = null;
  state.releaseContextConsumedIds.clear();
}

function setReleaseContext(releaseId, songId) {
  const match = releaseContextMatch(releaseId, songId);
  if (!match) {
    clearReleaseContext();
    return false;
  }
  state.releaseContextId = match.releaseId;
  state.releaseContextSongId = match.songId;
  state.releaseContextConsumedIds.clear();
  return true;
}

function songBelongsToActiveRelease(song) {
  return Boolean(
    song?.id
    && state.releaseContextId
    && song.releaseId === state.releaseContextId
    && numericTrackNumber(song) != null
    && orderedReleaseSongs(state.releaseContextId).some((entry) => entry.id === song.id)
  );
}

function releaseContinuationSongs(limit = Infinity) {
  const match = releaseContextMatch(state.releaseContextId, state.releaseContextSongId);
  if (!match) return [];
  const index = match.ordered.findIndex((song) => song.id === state.releaseContextSongId);
  const remaining = index >= 0
    ? match.ordered.slice(index + 1).filter((song) => (
      !state.releaseContextConsumedIds.has(song.id) && canExecuteSong(song)
    ))
    : [];
  return Number.isFinite(limit) ? remaining.slice(0, Math.max(0, limit)) : remaining;
}

function automaticGenreContinuation(limit = 12, {
  genreId = state.playContextGenreId || state.genreId,
  anchorId = state.playContextSongId || state.songId,
  excludeIds = new Set(),
} = {}) {
  const list = songsForGenre(genreId);
  if (!list.length || limit <= 0) return [];
  const excluded = excludeIds instanceof Set ? excludeIds : new Set(excludeIds || []);
  const anchorIndex = list.findIndex((song) => song.id === anchorId);
  const ordered = anchorIndex < 0
    ? [...list]
    : [...list.slice(anchorIndex + 1), ...list.slice(0, anchorIndex)];
  const seen = new Set();
  const result = [];
  for (const song of ordered) {
    if (!song?.id || song.id === state.songId || excluded.has(song.id) || seen.has(song.id) || !canExecuteSong(song)) continue;
    seen.add(song.id);
    result.push(song);
    if (result.length >= limit) break;
  }
  return result;
}

function persistFavourites() {
  storage.set('garba:favourites', [...state.favourites]);
}

function reconcilePresentationFavourites() {
  const visibleIds = new Set(state.songs.map((song) => song.id));
  const next = new Set();
  let changed = false;
  for (const id of state.favourites) {
    const redirect = state.presentationRedirects.get(id);
    const mapped = redirect?.canonicalSongId || id;
    if (visibleIds.has(mapped)) next.add(mapped);
    if (mapped !== id || !visibleIds.has(id)) changed = true;
  }
  if (changed || next.size !== state.favourites.size) {
    state.favourites = next;
    persistFavourites();
  }
}

function persistManualQueue() {
  storage.set('garba:queue', state.manualQueue);
}

function sanitiseManualQueue() {
  const byId = new Map(state.songs.map((song) => [song.id, song]));
  const next = [];
  const seen = new Set();
  for (const id of state.manualQueue) {
    const song = byId.get(id);
    if (!song || !canExecuteSong(song) || id === state.songId || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
    if (next.length >= 30) break;
  }
  const changed = next.length !== state.manualQueue.length || next.some((id, index) => id !== state.manualQueue[index]);
  state.manualQueue = next;
  if (changed) persistManualQueue();
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

function configureGenreButton(button, genre, activeId, onSelect) {
  if (button.dataset.genreBound !== 'true') {
    button.dataset.genreBound = 'true';
    button.addEventListener('click', () => {
      if (typeof button._garbaGenreSelect === 'function') button._garbaGenreSelect(button.dataset.genre);
    });
  }

  button._garbaGenreSelect = onSelect;
  button.classList.add('genre-button');
  button.classList.toggle('active', genre.id === activeId);
  button.type = 'button';
  button.dataset.genre = genre.id;
  if (button.textContent !== genre.name) button.textContent = genre.name;
  if (genre.id === activeId) button.setAttribute('aria-current', 'true');
  else button.removeAttribute('aria-current');
}

function reconcileGenreButtons(container, activeId, onSelect) {
  if (!container) return;
  const previousScrollLeft = Math.max(0, container.scrollLeft || 0);
  const focusedGenre = container.contains(document.activeElement) ? document.activeElement?.dataset?.genre : null;
  const desiredIds = new Set(state.genres.map((genre) => genre.id));
  const existing = new Map(
    [...container.querySelectorAll(':scope > .genre-button[data-genre]')]
      .map((button) => [button.dataset.genre, button])
  );

  const desiredButtons = state.genres.map((genre) => {
    const button = existing.get(genre.id) || document.createElement('button');
    configureGenreButton(button, genre, activeId, onSelect);
    existing.delete(genre.id);
    return button;
  });

  existing.forEach((button, genreId) => {
    if (!desiredIds.has(genreId)) button.remove();
  });

  const nonstop = container.querySelector(':scope > #nonstopButton');
  if (nonstop && container.firstElementChild !== nonstop) container.insertBefore(nonstop, container.firstElementChild);
  const offset = nonstop ? 1 : 0;
  desiredButtons.forEach((button, index) => {
    const slot = container.children[offset + index] || null;
    if (slot !== button) container.insertBefore(button, slot);
  });

  const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  container.scrollLeft = Math.min(previousScrollLeft, maxLeft);
  container.scrollTop = 0;

  if (focusedGenre && !container.contains(document.activeElement)) {
    container.querySelector(`[data-genre="${CSS.escape(focusedGenre)}"]`)?.focus({ preventScroll: true });
  }
}

function revealGenreHorizontally(strip, button, { smooth = true } = {}) {
  if (!strip || !button) return;
  const stripRect = strip.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const edgeInset = Math.min(28, Math.max(16, strip.clientWidth * .055));
  const safeLeft = stripRect.left + edgeInset;
  const safeRight = stripRect.right - edgeInset;
  let delta = 0;

  if (buttonRect.left < safeLeft) delta = buttonRect.left - safeLeft;
  else if (buttonRect.right > safeRight) delta = buttonRect.right - safeRight;

  strip.scrollTop = 0;
  if (Math.abs(delta) < 1) return;

  const maxLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
  const left = Math.min(maxLeft, Math.max(0, strip.scrollLeft + delta));
  const behavior = smooth && !state.reducedMotion ? 'smooth' : 'auto';
  if (typeof strip.scrollTo === 'function') strip.scrollTo({ left, top: 0, behavior });
  else strip.scrollLeft = left;
}

function syncGenreStrips({ smooth = true } = {}) {
  reconcileGenreButtons(els.genreStrip, state.genreId, selectGenre);
  syncSheetGenresOnly();

  requestAnimationFrame(() => {
    revealGenreHorizontally(els.genreStrip, els.genreStrip.querySelector('.active'), { smooth });
    revealGenreHorizontally(els.sheetGenreStrip, els.sheetGenreStrip.querySelector('.active'), { smooth });
  });
}

function syncSheetGenresOnly() {
  reconcileGenreButtons(els.sheetGenreStrip, state.sheetFilter, (genreId) => {
    state.sheetFilter = genreId;
    state.sheetMode = 'all';
    renderSheet();
  });
}

function updateUrl() {
  const url = new URL(location.href);
  url.searchParams.set('genre', state.genreId);
  const songId = state.pendingSongId || state.songId;
  if (songId) url.searchParams.set('song', songId);
  const song = state.songs.find((entry) => entry.id === songId) || null;
  if (
    state.releaseContextId
    && song?.releaseId === state.releaseContextId
    && numericTrackNumber(song) != null
  ) url.searchParams.set('release', state.releaseContextId);
  else url.searchParams.delete('release');
  url.searchParams.delete('browse');
  url.searchParams.delete('source');
  url.searchParams.delete('library');
  history.replaceState(history.state, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
}

function updateFavouriteUI() {
  const song = currentSong();
  const active = song ? state.favourites.has(song.id) : false;
  els.mobileFavourite.classList.toggle('active', active);
  els.mobileFavourite.setAttribute('aria-pressed', String(active));
}

function automaticUpNextSongs(limit = 12) {
  if (state.releaseContextId) {
    const releaseSongs = orderedReleaseSongs(state.releaseContextId);
    const releaseIds = new Set(releaseSongs.map((song) => song.id));
    const remaining = releaseContinuationSongs(limit);
    if (remaining.length >= limit) return remaining;
    const anchorId = state.releaseContextSongId || state.songId;
    const anchorSong = state.songs.find((song) => song.id === anchorId) || null;
    const generic = automaticGenreContinuation(limit - remaining.length, {
      genreId: anchorSong?.genre || state.playContextGenreId || state.genreId,
      anchorId,
      excludeIds: releaseIds,
    });
    return [...remaining, ...generic].slice(0, limit);
  }
  return automaticGenreContinuation(limit);
}

function manualQueueSongs() {
  sanitiseManualQueue();
  const byId = new Map(state.songs.map((song) => [song.id, song]));
  return state.manualQueue.map((id) => byId.get(id)).filter(Boolean);
}

function getUpNextSongs() {
  const queued = manualQueueSongs();
  const queuedIds = new Set(queued.map((song) => song.id));
  const automatic = automaticUpNextSongs(12).filter((song) => song.id !== state.songId && !queuedIds.has(song.id));
  return [...queued, ...automatic].slice(0, Math.max(12, queued.length + Math.min(8, automatic.length)));
}

function queueSong(songId) {
  if (!songId || songId === state.songId) {
    showToast('That song is already playing.');
    return;
  }
  const queuedSong = state.songs.find((song) => song.id === songId);
  if (!queuedSong) return;
  if (!canExecuteSong(queuedSong)) {
    showToast('This recording is not available to play yet.');
    return;
  }
  if (state.manualQueue.includes(songId)) {
    showToast('Already in Up next.');
    return;
  }
  state.manualQueue.push(songId);
  state.manualQueue = state.manualQueue.slice(0, 30);
  persistManualQueue();
  updateQueueBadge();
  if (state.sheetMode === 'queue') renderSheet();
  showToast('Added to Up next.');
}

function removeQueuedSong(songId, { announce = true } = {}) {
  const before = state.manualQueue.length;
  state.manualQueue = state.manualQueue.filter((id) => id !== songId);
  if (state.manualQueue.length === before) return false;
  persistManualQueue();
  updateQueueBadge();
  if (state.sheetMode === 'queue') renderSheet();
  if (announce) showToast('Removed from Up next.');
  return true;
}

function clearManualQueue() {
  if (!state.manualQueue.length) return;
  state.manualQueue = [];
  persistManualQueue();
  updateQueueBadge();
  if (state.sheetMode === 'queue') renderSheet();
  showToast('Up next cleared.');
}

function updateQueueBadge() {
  const manualCount = manualQueueSongs().length;
  const count = getUpNextSongs().length;
  els.queueBadge.textContent = manualCount ? (manualCount > 9 ? '9+' : String(manualCount)) : (count > 9 ? '9+' : String(count));
  els.queueBadge.classList.toggle('show', count > 0 && !mobileQuery.matches);
  els.queueButton.dataset.manualCount = String(manualCount);
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
        { src: 'assets/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
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
  els.durationTime.textContent = formatDuration(state.duration || song.durationSeconds);
  els.elapsedTime.textContent = formatTime(state.elapsed);

  const readiness = routeReadiness(song);
  els.app.dataset.playbackReady = String(readiness.executable);
  for (const button of [els.playButton, els.miniPlay]) {
    button.disabled = !readiness.executable;
    button.setAttribute('aria-disabled', String(!readiness.executable));
    if (!readiness.executable) button.title = 'This recording is not available to play yet';
    else if (!state.playing) button.title = 'Play';
  }

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

  if (!options.initial) state.pendingSongId = null;
  if (!options.preserveReleaseContext && !options.initial) clearReleaseContext();

  const previousSongId = state.songId;
  if (previousSongId && previousSongId !== song.id && !options.initial && !options.fromHistory) {
    state.listeningHistory.push(previousSongId);
    state.listeningHistory = state.listeningHistory.slice(-40);
  }
  if (options.consumeQueued) removeQueuedSong(song.id, { announce: false });

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
    if (!options.preserveContext) {
      state.playContextGenreId = song.genre;
      state.playContextSongId = song.id;
    }
    if ((options.releaseContextAdvance || options.syncReleaseAnchor) && songBelongsToActiveRelease(song)) {
      state.releaseContextSongId = song.id;
    }
    if (options.consumeQueued && songBelongsToActiveRelease(song)) {
      state.releaseContextConsumedIds.add(song.id);
    }
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
    clearReleaseContext();
    const song = currentSong();
    if (song) {
      state.playContextGenreId = song.genre;
      state.playContextSongId = song.id;
    }
    state.sheetFilter = genreId;
    syncGenreStrips();
    updateQueueBadge();
    updateUrl();
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
    if (!query) {
      state.sheetMatchCount = state.songs.length;
      return [];
    }
    songs = state.songs;
  } else {
    songs = state.songs.filter((song) => song.genre === state.sheetFilter);
  }

  if (query) songs = songs.filter((song) => [
    song.title,
    song.artist,
    song.genre,
    song.category,
    ...(song.styles || []),
    ...(song.taxonomyStyles || []),
  ].filter(Boolean).join(' ').toLowerCase().includes(query));
  state.sheetMatchCount = songs.length;
  if (state.sheetMode === 'search' && songs.length > SEARCH_RESULT_LIMIT) return songs.slice(0, SEARCH_RESULT_LIMIT);
  return songs;
}

function renderSheet() {
  els.songSheet.classList.toggle('mode-favourites', state.sheetMode === 'favourites');
  els.songSheet.classList.toggle('mode-queue', state.sheetMode === 'queue');
  els.songSheet.classList.toggle('mode-search', state.sheetMode === 'search');
  els.sheetTitle.textContent = state.sheetMode === 'favourites' ? 'My Garba' : state.sheetMode === 'queue' ? 'Up next' : state.sheetMode === 'search' ? 'Search' : 'Songs';

  syncSheetGenresOnly();
  const query = els.searchInput.value.trim();
  const songs = getSheetSongs();
  els.songList.innerHTML = '';

  if (els.sheetSummary) {
    if (state.sheetMode === 'search') {
      if (!query) els.sheetSummary.textContent = `${state.songs.length.toLocaleString()} songs`;
      else if (state.sheetMatchCount > songs.length) els.sheetSummary.textContent = `Showing ${songs.length} of ${state.sheetMatchCount.toLocaleString()}`;
      else els.sheetSummary.textContent = `${state.sheetMatchCount.toLocaleString()} ${state.sheetMatchCount === 1 ? 'match' : 'matches'}`;
    } else if (state.sheetMode === 'queue') {
      const queued = manualQueueSongs().length;
      const continuing = Math.max(0, songs.length - queued);
      els.sheetSummary.textContent = queued ? `${queued} queued · ${continuing} continue` : `${continuing} continue`;
    } else {
      els.sheetSummary.textContent = `${state.sheetMatchCount.toLocaleString()} ${state.sheetMatchCount === 1 ? 'song' : 'songs'}`;
    }
  }

  if (!songs.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const strong = document.createElement('strong');
    const copy = document.createElement('span');
    if (state.sheetMode === 'favourites') {
      strong.textContent = 'My Garba is empty';
      copy.textContent = 'Tap the heart beside a song to save it here.';
    } else if (state.sheetMode === 'queue') {
      strong.textContent = 'Nothing up next';
      copy.textContent = 'Choose a genre or another song to continue listening.';
    } else if (state.sheetMode === 'search' && !query) {
      strong.textContent = `Search ${state.songs.length.toLocaleString()} songs`;
      copy.textContent = 'Type a song, artist, genre or style to see matching results.';
    } else {
      strong.textContent = 'No songs found';
      copy.textContent = query ? 'Try a different search.' : 'This genre is waiting for catalogue data.';
    }
    empty.append(strong, copy);
    els.songList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  const queuedIds = new Set(state.manualQueue);
  let continuationLabelAdded = false;
  if (state.sheetMode === 'queue' && state.manualQueue.length) {
    const toolbar = document.createElement('div');
    toolbar.className = 'queue-toolbar';
    const label = document.createElement('span');
    label.textContent = 'Queued';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'queue-clear';
    clear.textContent = 'Clear';
    clear.addEventListener('click', clearManualQueue);
    toolbar.append(label, clear);
    fragment.append(toolbar);
  }
  songs.forEach((song, index) => {
    const queued = state.sheetMode === 'queue' && queuedIds.has(song.id);
    if (state.sheetMode === 'queue' && state.manualQueue.length && !queued && !continuationLabelAdded) {
      continuationLabelAdded = true;
      const label = document.createElement('div');
      label.className = 'queue-section-label';
      label.textContent = 'Continue playing';
      fragment.append(label);
    }
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
    const releaseContinuation = state.sheetMode === 'queue'
      && !queued
      && releaseContinuationSongs().some((entry) => entry.id === song.id);
    copy.addEventListener('click', () => selectSong(song.id, {
      keepSheet: true,
      preserveContext: queued || releaseContinuation,
      preserveReleaseContext: queued || releaseContinuation,
      releaseContextAdvance: releaseContinuation,
      consumeQueued: queued,
    }));

    const duration = document.createElement('span');
    duration.className = 'song-duration';
    duration.textContent = formatDuration(song.durationSeconds);

    const queuePlayable = Boolean(song.youtubeId);
    const queueAction = document.createElement('button');
    queueAction.type = 'button';
    queueAction.className = 'song-queue-action';
    queueAction.hidden = !queuePlayable || song.id === state.songId;
    queueAction.disabled = !queuePlayable || song.id === state.songId;
    queueAction.setAttribute('aria-label', queued ? `Remove ${song.title} from Up next` : `Play ${song.title} next`);
    queueAction.title = queued ? 'Remove from Up next' : 'Play next';
    queueAction.innerHTML = queued
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"></path></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h8M5 12h8M5 17h5"></path><path d="M17 8v9M13.5 13.5 17 17l3.5-3.5"></path></svg>';
    queueAction.addEventListener('click', () => queued ? removeQueuedSong(song.id) : queueSong(song.id));

    const favourite = document.createElement('button');
    favourite.type = 'button';
    favourite.className = `heart-button song-favourite${state.favourites.has(song.id) ? ' active' : ''}`;
    favourite.setAttribute('aria-label', state.favourites.has(song.id) ? `Remove ${song.title} from My Garba` : `Save ${song.title} to My Garba`);
    favourite.setAttribute('aria-pressed', String(state.favourites.has(song.id)));
    favourite.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 5.9l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.3 1-1a5.5 5.5 0 0 0 0-7.8Z"></path></svg>';
    favourite.addEventListener('click', () => toggleFavourite(song.id));

    row.classList.toggle('manually-queued', queued);
    row.append(idx, copy, duration, queueAction, favourite);
    fragment.append(row);
  });

  if (state.sheetMode === 'search' && state.sheetMatchCount > songs.length) {
    const hint = document.createElement('div');
    hint.className = 'search-result-hint';
    hint.setAttribute('role', 'status');
    hint.textContent = `Showing the first ${songs.length} of ${state.sheetMatchCount.toLocaleString()} matches. Keep typing to narrow the list.`;
    fragment.append(hint);
  }

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
  showToast(willAdd ? 'Saved to My Garba.' : 'Removed from My Garba.');
}

function setSheetSnap(snap) {
  const allowed = ['closed', 'collapsed', 'medium', 'full'];
  state.sheetSnap = allowed.includes(snap) ? snap : 'closed';
  els.songSheet.dataset.snap = state.sheetSnap;
  els.app.dataset.sheetSnap = state.sheetSnap;
  const open = state.sheetSnap !== 'closed';
  els.songSheet.setAttribute('aria-hidden', String(!open));
  if (els.browseButton?.hasAttribute('aria-controls')) els.browseButton.setAttribute('aria-expanded', String(open));
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

function openSheet(mode = 'all', options = {}) {
  const wasClosed = state.sheetSnap === 'closed';
  if (wasClosed && options.trigger instanceof HTMLElement) state.sheetTrigger = options.trigger;
  state.sheetMode = mode;
  if (state.sheetMode === 'all') state.sheetFilter = state.genreId;
  if (state.sheetMode !== 'search') els.searchInput.value = '';
  const snap = options.snap || preferredOpenSnap(mode);
  setSheetSnap(snap);
  renderSheet();

  if (wasClosed && options.history !== false) {
    history.pushState({ ...(history.state || {}), garbaSheet: true }, '', location.href);
  }

  if (mode === 'search') {
    els.songSheet.classList.add('searching');
    setTimeout(() => els.searchInput.focus(), state.reducedMotion ? 0 : 150);
  }
}

function closeSheet({ fromHistory = false } = {}) {
  if (!fromHistory && history.state?.garbaSheet) {
    history.back();
    return;
  }
  setSheetSnap('closed');
  const trigger = state.sheetTrigger;
  state.sheetTrigger = null;
  if (trigger?.isConnected) setTimeout(() => trigger.focus({ preventScroll: true }), state.reducedMotion ? 0 : 80);
}

async function togglePlay() {
  const song = currentSong();
  if (!song) return;

  if (!song.audioUrl) {
    const sourceMessage = song.youtubeId
      ? 'This catalogue entry has a YouTube source. Connect the approved playback provider before publishing.'
      : 'Add an approved audio source for this track before publishing.';
    showToast(sourceMessage);
    return;
  }

  if (state.playing) {
    els.audio.pause();
  } else {
    try { await els.audio.play(); }
    catch { showToast('Playback could not start. Check the approved audio source.'); }
  }
}

function changeSong(direction) {
  if (direction < 0 && state.listeningHistory.length) {
    const previousId = state.listeningHistory.pop();
    if (previousId) {
      selectSong(previousId, {
        keepSheet: true,
        preservePlayback: true,
        preserveContext: true, fromHistory: true,
        preserveReleaseContext: true,
        syncReleaseAnchor: true,
      });
      return;
    }
  }

  if (direction > 0) {
    sanitiseManualQueue();
    const queuedId = state.manualQueue.shift();
    if (queuedId) {
      persistManualQueue();
      selectSong(queuedId, {
        keepSheet: true,
        preservePlayback: true,
        preserveContext: true,
        preserveReleaseContext: true,
        consumeQueued: true,
      });
      return;
    }
  }

  if (direction > 0 && state.releaseContextId) {
    const nextReleaseSong = releaseContinuationSongs(1)[0];
    if (nextReleaseSong) {
      selectSong(nextReleaseSong.id, {
        keepSheet: true,
        preservePlayback: true,
        preserveContext: true,
        preserveReleaseContext: true,
        releaseContextAdvance: true,
      });
      return;
    }

    const releaseSongs = orderedReleaseSongs(state.releaseContextId);
    const releaseIds = new Set(releaseSongs.map((song) => song.id));
    const anchorId = state.releaseContextSongId || state.songId;
    const anchorSong = state.songs.find((song) => song.id === anchorId) || null;
    const nextGeneric = automaticGenreContinuation(1, {
      genreId: anchorSong?.genre || state.playContextGenreId || state.genreId,
      anchorId,
      excludeIds: releaseIds,
    })[0];
    clearReleaseContext();
    if (nextGeneric) {
      selectSong(nextGeneric.id, { keepSheet: true, preservePlayback: true });
      return;
    }
    updateQueueBadge();
    renderSheet();
    updateUrl();
    return;
  }

  const genreId = state.playContextGenreId || state.genreId;
  const list = songsForGenre(genreId).filter(canExecuteSong);
  if (!list.length) return;
  const anchorId = state.playContextSongId || state.songId;
  let index = list.findIndex((song) => song.id === anchorId);
  index = index < 0 ? 0 : (index + direction + list.length) % list.length;
  selectSong(list[index].id, { keepSheet: true, preservePlayback: true });
}

function cycleSheetSnap(direction = 1) {
  if (!mobileQuery.matches) return;
  const order = ['collapsed', 'medium', 'full'];
  if (state.sheetSnap === 'closed') {
    setSheetSnap('medium');
    return;
  }
  const index = order.indexOf(state.sheetSnap);
  const next = Math.max(0, Math.min(order.length - 1, index + direction));
  setSheetSnap(order[next]);
}

function setupSheetGestures() {
  let startY = null;
  let pointerId = null;
  let suppressClick = false;

  const start = (event) => {
    if (!mobileQuery.matches) return;
    pointerId = event.pointerId;
    startY = event.clientY;
    els.sheetHandle.setPointerCapture?.(pointerId);
  };

  const end = (event) => {
    if (startY == null || event.pointerId !== pointerId) return;
    const delta = event.clientY - startY;
    if (Math.abs(delta) > 48) {
      suppressClick = true;
      if (delta > 0) {
        if (state.sheetSnap === 'full') setSheetSnap('medium');
        else if (state.sheetSnap === 'medium') setSheetSnap('collapsed');
        else closeSheet();
      } else {
        if (state.sheetSnap === 'collapsed') setSheetSnap('medium');
        else setSheetSnap('full');
      }
    }
    startY = null;
    pointerId = null;
  };

  els.sheetHandle.addEventListener('pointerdown', start);
  els.sheetHandle.addEventListener('pointerup', end);
  els.sheetHandle.addEventListener('pointercancel', () => { startY = null; pointerId = null; suppressClick = false; });
  els.sheetHandle.addEventListener('click', () => {
    if (!mobileQuery.matches) return;
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (state.sheetSnap === 'collapsed') setSheetSnap('medium');
    else if (state.sheetSnap === 'medium') setSheetSnap('full');
    else if (state.sheetSnap === 'full') setSheetSnap('medium');
  });
}

function setupMediaSessionActions() {
  if (!('mediaSession' in navigator)) return;
  const actions = {
    play: () => togglePlay(),
    pause: () => els.audio.pause(),
    previoustrack: () => changeSong(-1),
    nexttrack: () => changeSong(1),
    seekbackward: (details) => {
      if (!state.duration) return;
      const next = Math.max(0, state.elapsed - (details.seekOffset || 10));
      if (els.audio.src) els.audio.currentTime = next;
    },
    seekforward: (details) => {
      if (!state.duration) return;
      const next = Math.min(state.duration, state.elapsed + (details.seekOffset || 10));
      if (els.audio.src) els.audio.currentTime = next;
    },
    seekto: (details) => {
      if (els.audio.src && typeof details.seekTime === 'number') els.audio.currentTime = details.seekTime;
    },
  };

  Object.entries(actions).forEach(([action, handler]) => {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* action not supported */ }
  });
}

function isStandalone() {
  return standaloneQuery.matches || window.navigator.standalone === true;
}

function installDismissedRecently() {
  const dismissedAt = storage.get('garba:install-dismissed', 0);
  return Date.now() - Number(dismissedAt || 0) < 7 * 24 * 60 * 60 * 1000;
}

function showInstallBanner({ ios = false } = {}) {
  if (isStandalone() || installDismissedRecently() || state.sheetSnap !== 'closed') return;
  if (ios) {
    els.installTitle.textContent = 'Add GARBA to Home Screen';
    els.installText.textContent = 'In Safari, use Share → Add to Home Screen.';
    els.installButton.textContent = 'Got it';
    els.installButton.dataset.mode = 'ios';
  } else {
    els.installTitle.textContent = 'Install GARBA';
    els.installText.textContent = 'Keep the full-screen player one tap away.';
    els.installButton.textContent = 'Install';
    els.installButton.dataset.mode = 'prompt';
  }
  els.installBanner.hidden = false;
}

function setupPwaInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    clearTimeout(state.installTimer);
    state.installTimer = setTimeout(() => showInstallBanner(), 5000);
  });

  window.addEventListener('appinstalled', () => {
    state.installPrompt = null;
    els.installBanner.hidden = true;
    showToast('GARBA installed.');
  });

  els.installDismiss.addEventListener('click', () => {
    storage.set('garba:install-dismissed', Date.now());
    els.installBanner.hidden = true;
  });

  els.installButton.addEventListener('click', async () => {
    if (els.installButton.dataset.mode === 'ios') {
      storage.set('garba:install-dismissed', Date.now());
      els.installBanner.hidden = true;
      showToast('Use Safari Share, then Add to Home Screen.');
      return;
    }
    if (!state.installPrompt) return;
    await state.installPrompt.prompt();
    await state.installPrompt.userChoice.catch(() => null);
    state.installPrompt = null;
    els.installBanner.hidden = true;
  });

  const ua = navigator.userAgent;
  const isIpadDesktopUa = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isIos = (/iPad|iPhone|iPod/.test(ua) || isIpadDesktopUa) && !window.MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (isIos && isSafari && !isStandalone()) {
    clearTimeout(state.installTimer);
    state.installTimer = setTimeout(() => showInstallBanner({ ios: true }), 7000);
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker registration failed', error));
  });
}

function wireEvents() {
  let searchTimer = null;
  els.playButton.addEventListener('click', togglePlay);
  els.miniPlay.addEventListener('click', togglePlay);
  els.prevButton.addEventListener('click', () => changeSong(-1));
  els.nextButton.addEventListener('click', () => changeSong(1));
  els.miniPrev.addEventListener('click', () => changeSong(-1));
  els.miniNext.addEventListener('click', () => changeSong(1));

  if (els.browseButton?.tagName !== 'A') {
    els.browseButton?.addEventListener('click', () => {
      if (state.sheetSnap === 'closed' || state.sheetSnap === 'collapsed') openSheet('all', { trigger: els.browseButton });
      else closeSheet();
    });
  }
  els.sheetClose.addEventListener('click', closeSheet);
  els.mobileFavourite.addEventListener('click', () => toggleFavourite());
  els.favouritesButton.addEventListener('click', () => openSheet('favourites', { trigger: els.favouritesButton }));
  els.queueButton.addEventListener('click', () => openSheet('queue', { trigger: els.queueButton }));
  els.searchButton.addEventListener('click', () => openSheet('search', { trigger: els.searchButton }));

  els.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderSheet, 70);
  });
  els.searchInput.addEventListener('focus', () => {
    els.songSheet.classList.add('searching');
    if (mobileQuery.matches && state.sheetSnap !== 'full') setSheetSnap('full');
  });

  els.progress.addEventListener('input', () => {
    if (!state.duration) return;
    const next = Number(els.progress.value) / 1000 * state.duration;
    if (els.audio.src) els.audio.currentTime = next;
    else state.elapsed = next;
    renderPlayer();
  });

  els.audio.addEventListener('play', () => { setPlaying(true); renderPlayer(); });
  els.audio.addEventListener('pause', () => { setPlaying(false); renderPlayer(); persistSession(); });
  els.audio.addEventListener('loadedmetadata', () => {
    state.duration = els.audio.duration || currentSong()?.durationSeconds || 0;
    renderPlayer();
  });
  els.audio.addEventListener('timeupdate', () => {
    state.elapsed = els.audio.currentTime;
    state.duration = els.audio.duration || state.duration;
    renderPlayer();
    const rounded = Math.round(state.elapsed);
    if (rounded % 5 === 0 && rounded !== state.lastPersistedElapsed) {
      state.lastPersistedElapsed = rounded;
      persistSession();
    }
  });
  els.audio.addEventListener('ended', () => changeSong(1));

  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === '/') {
      event.preventDefault();
      openSheet('search', { trigger: els.searchButton });
      return;
    }
    if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
    if (event.code === 'ArrowRight') changeSong(1);
    if (event.code === 'ArrowLeft') changeSong(-1);
    if (event.code === 'Escape') {
      if (els.songSheet.classList.contains('searching')) {
        els.songSheet.classList.remove('searching');
        els.searchInput.blur();
      } else closeSheet();
    }
    if (event.key.toLowerCase() === 'f') toggleFavourite();
  });

  window.addEventListener('offline', () => showToast('Offline. The app shell and cached catalogue remain available.'));
  window.addEventListener('online', () => {
    showToast('Back online.');
    refreshCatalogue({ quiet: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - state.catalogueLoadedAt > 5 * 60 * 1000) refreshCatalogue({ quiet: true });
  });
  window.addEventListener('popstate', () => {
    if (state.sheetSnap !== 'closed') {
      closeSheet({ fromHistory: true });
      updateUrl();
    }
  });
  window.addEventListener('pagehide', persistSession);

  mobileQuery.addEventListener?.('change', () => {
    if (!mobileQuery.matches && state.sheetSnap !== 'closed') setSheetSnap('full');
    syncGenreStrips({ smooth: false });
  });

  setupSheetGestures();
}

async function fetchCatalogue() {
  const [genresResponse, songsResponse] = await Promise.all([
    fetch('data/genres.json', { cache: 'no-store' }),
    fetch('data/songs.json', { cache: 'no-store' }),
  ]);
  if (!genresResponse.ok || !songsResponse.ok) throw new Error('Failed to load catalogue');
  const [genres, allSongs] = await Promise.all([genresResponse.json(), songsResponse.json()]);
  const songs = [];
  const presentationRedirects = new Map();
  for (const song of allSongs) {
    const role = String(song?.presentationRole || 'catalogue');
    if (role === 'catalogue') songs.push(song);
    else if (song?.id) presentationRedirects.set(song.id, song);
  }
  return { genres, songs, presentationRedirects };
}

function makeCatalogueSignature(genres, songs) {
  return JSON.stringify({
    genres: genres.map((genre) => [genre.id, genre.label, genre.background, genre.accent]),
    songs: songs.map((song) => [song.id, song.title, song.artist, song.genre, song.releaseId, song.trackNumber, song.durationSeconds, song.audioUrl, song.youtubeId]),
  });
}

async function refreshCatalogue({ quiet = false } = {}) {
  try {
    const next = await fetchCatalogue();
    const signature = makeCatalogueSignature(next.genres, next.songs);
    const changed = state.catalogueSignature && signature !== state.catalogueSignature;
    state.genres = next.genres;
    state.songs = next.songs;
    state.presentationRedirects = next.presentationRedirects;
    if (state.releaseContextId && !releaseContextMatch(state.releaseContextId, state.releaseContextSongId || state.songId)) {
      clearReleaseContext();
    }
    reconcilePresentationFavourites();
    sanitiseManualQueue();
    state.catalogueSignature = signature;
    state.catalogueLoadedAt = Date.now();

    if (state.pendingSongId) {
      const pendingSong = state.songs.find((entry) => entry.id === state.pendingSongId);
      state.pendingSongId = null;
      if (pendingSong) {
        await selectSong(pendingSong.id, { initial: true, animate: false, keepSheet: true });
        updateUrl();
        if (changed && !quiet) showToast('Song catalogue updated.');
        return;
      }
    }

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
  let requestedSong = params.get('song');
  const requestedGenre = params.get('genre');
  const requestedRelease = params.get('release');
  const redirect = requestedSong ? state.presentationRedirects.get(requestedSong) : null;
  let pendingNonstopSetId = null;
  if (redirect?.presentationRole === 'nonstop-only' && redirect.nonstopSetId) {
    pendingNonstopSetId = redirect.nonstopSetId;
    const url = new URL(location.href);
    url.searchParams.delete('song');
    url.searchParams.set('nonstop', pendingNonstopSetId);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    requestedSong = redirect.canonicalSongId || null;
  } else if (redirect?.canonicalSongId) {
    requestedSong = redirect.canonicalSongId;
  }
  const pendingSongId = requestedSong && !state.songs.some((entry) => entry.id === requestedSong) ? requestedSong : null;

  let song = requestedSong ? state.songs.find((entry) => entry.id === requestedSong) : null;
  if (!song && !pendingSongId && session.songId) song = state.songs.find((entry) => entry.id === session.songId);
  const preserveRequestedIdentity = Boolean(song && requestedSong && song.id === requestedSong);
  const preserveRestoredIdentity = Boolean(song && !requestedSong && session.songId && song.id === session.songId);

  let genre = requestedGenre ? state.genres.find((entry) => entry.id === requestedGenre) : null;
  if (!genre && song) genre = state.genres.find((entry) => entry.id === song.genre);
  if (!genre && session.genreId) genre = state.genres.find((entry) => entry.id === session.genreId);
  if (!genre) genre = state.genres.find((entry) => entry.id === 'traditional') || state.genres[0];

  if (!song || (!(preserveRequestedIdentity || preserveRestoredIdentity) && song.genre !== genre.id)) {
    song = state.songs.find((entry) => entry.genre === genre.id && canExecuteSong(entry))
      || state.songs.find((entry) => entry.genre === genre.id)
      || state.songs.find(canExecuteSong)
      || state.songs[0];
  }
  const releaseContext = requestedRelease
    && requestedSong
    && song?.id === requestedSong
    && !pendingNonstopSetId
    ? releaseContextMatch(requestedRelease, requestedSong)
    : null;
  return {
    genre,
    song,
    pendingSongId,
    releaseContextId: releaseContext?.releaseId || null,
    elapsed: Number(session.elapsed || 0),
    browse: params.get('browse') === '1',
    myGarba: params.get('library') === 'my-garba',
    pendingNonstopSetId,
  };
}

async function init() {
  try {
    const catalogue = await fetchCatalogue();
    state.genres = catalogue.genres;
    state.songs = catalogue.songs;
    state.presentationRedirects = catalogue.presentationRedirects;
    reconcilePresentationFavourites();
    sanitiseManualQueue();
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

    if (initial.releaseContextId && initial.song) {
      setReleaseContext(initial.releaseContextId, initial.song.id);
      renderPlayer();
      renderSheet();
    } else clearReleaseContext();

    state.pendingSongId = initial.pendingSongId;
    if (initial.pendingNonstopSetId) {
      setTimeout(() => window.GARBA_NONSTOP?.play?.(initial.pendingNonstopSetId, { quiet: true }), 0);
    }
    if (initial.myGarba) openSheet('favourites', { snap: 'full', history: false });
    else if (initial.browse) openSheet('all', { snap: 'full', history: false });
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
