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
  const list = songsForGenre(state.genreId);
  if (!list.length) return;
  let index = list.findIndex((song) => song.id === state.songId);
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

  els.browseButton.addEventListener('click', () => {
    if (state.sheetSnap === 'closed' || state.sheetSnap === 'collapsed') openSheet('all', { trigger: els.browseButton });
    else closeSheet();
  });
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
      // A track can change while the transient sheet history entry is active.
      // Keep the popped URL aligned with the player that remains on screen.
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

