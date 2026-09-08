(() => {
  const DEFAULT_SET_ID = 'set-aditya-ochhav-2023';
  const $ = (id) => document.getElementById(id);

  const state = {
    index: null,
    chunks: new Map(),
    songs: null,
    loading: null,
    activeSet: null,
    activeTrack: null,
    previousSession: null,
    buttonObserver: null,
    metadataObserver: null,
    toastTimer: null,
  };

  const rank = {
    'official-artist-channel': 6,
    'artist-channel': 5,
    'verified-label-channel': 4,
    'label-channel': 4,
    'verified-distributor-channel': 3,
    'official-streaming-catalogue': 2,
    'community-upload': 1,
  };

  function announce(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  async function fetchJson(url) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  function durationFor(set) {
    const direct = Number(set?.durationSeconds || 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const segments = Array.isArray(set?.segments) ? set.segments : [];
    const boundaries = segments.flatMap((segment) => [Number(segment.startSeconds), Number(segment.endSeconds)]).filter(Number.isFinite);
    return boundaries.length ? Math.max(...boundaries) : 0;
  }

  function normaliseSet(set) {
    const source = set?.source || {};
    return {
      ...set,
      artistsText: Array.isArray(set?.artists) ? set.artists.join(' · ') : String(set?.artist || ''),
      provider: String(source.provider || '').toLowerCase(),
      videoId: String(source.videoId || '').trim(),
      sourceUrl: String(source.url || '').trim(),
      embeddable: source.embeddable !== false && set?.playbackPolicy !== 'youtube-external-visible',
      sourceType: set?.officiality || set?.setType || source.provider || 'source',
      durationSeconds: durationFor(set),
    };
  }

  function isPlayableSet(set) {
    return Boolean(set?.id && set.provider === 'youtube' && set.videoId && set.embeddable);
  }

  function sortSets(sets) {
    return [...sets].sort((a, b) => (rank[b.sourceType] || 0) - (rank[a.sourceType] || 0)
      || Number(b.year || 0) - Number(a.year || 0)
      || String(a.title || '').localeCompare(String(b.title || '')));
  }

  async function loadIndex() {
    if (state.index) return state.index;
    const index = await fetchJson('data/discovery/sets/index.json');
    if (!Array.isArray(index?.chunks) || !index.chunks.length) throw new Error('Nonstop index unavailable');
    state.index = index;
    return index;
  }

  async function loadChunk(name) {
    if (state.chunks.has(name)) return state.chunks.get(name);
    const payload = await fetchJson(`data/discovery/sets/${name}`);
    const sets = sortSets((payload?.sets || []).map(normaliseSet).filter(isPlayableSet));
    state.chunks.set(name, sets);
    return sets;
  }

  async function loadSongs() {
    if (state.songs) return state.songs;
    const songs = await fetchJson('data/songs.json');
    if (!Array.isArray(songs) || !songs.length) throw new Error('Song catalogue unavailable');
    state.songs = songs;
    return songs;
  }

  async function findSet(requestedId = null) {
    const index = await loadIndex();
    let fallback = null;

    for (const chunk of index.chunks) {
      const sets = await loadChunk(chunk);
      if (!fallback && sets.length) fallback = sets[0];
      if (requestedId) {
        const exact = sets.find((set) => set.id === requestedId);
        if (exact) return exact;
      } else {
        const preferred = sets.find((set) => set.id === DEFAULT_SET_ID);
        if (preferred) return preferred;
      }
    }

    return requestedId ? null : fallback;
  }

  function findAnchorSong(set, songs) {
    if (!set?.videoId) return null;
    return songs.find((song) => String(song.youtubeId || '') === set.videoId && Number(song.youtubeStartSeconds || 0) === 0)
      || songs.find((song) => String(song.youtubeId || '') === set.videoId)
      || null;
  }

  function formatTime(seconds = 0) {
    const safe = Math.max(0, Math.round(Number(seconds) || 0));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
  }

  function injectStyles() {
    if ($('nonstopPlaybackStyles')) return;
    const style = document.createElement('style');
    style.id = 'nonstopPlaybackStyles';
    style.textContent = `
      #nonstopButton{display:inline-flex;align-items:center;gap:6px}
      .app[data-play-mode="nonstop"] #nonstopButton{color:var(--ivory)}
      .app[data-play-mode="nonstop"] #nonstopButton::after{background:color-mix(in srgb,var(--accent) 70%,var(--ivory))}
      .app[data-play-mode="nonstop"] #nonstopButton::before{background:var(--accent);box-shadow:0 0 10px color-mix(in srgb,var(--accent) 48%,transparent)}
      .app[data-play-mode="nonstop"] .mobile-heart{visibility:hidden;pointer-events:none}

      .player-shell{grid-template-rows:minmax(0,1fr) auto auto auto minmax(22px,5vh) auto auto minmax(8px,.42fr)!important}
      #genreStrip{grid-row:6!important;align-self:end;margin-top:0!important;padding-top:8px!important}
      #browseActions{grid-row:7!important;align-self:start!important;margin-top:clamp(2px,.7vh,9px)!important}
      #browseActions .browse-button{margin-top:0!important}

      @media(max-width:700px){
        .player-shell{grid-template-rows:minmax(92px,.92fr) auto auto auto minmax(10px,2.4vh) auto auto minmax(2px,.13fr)!important}
        #genreStrip{grid-row:6!important;padding-top:6px!important;padding-bottom:3px!important;align-self:end!important}
        .app #browseActions{grid-row:7!important;width:auto!important;display:flex!important;align-self:start!important;justify-content:center!important;gap:0!important;margin-top:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
        .app #browseActions .browse-button{flex:0 0 auto!important;min-height:40px!important;padding:0 13px!important;border:1px solid rgba(246,236,215,.11)!important;border-radius:999px!important;background:rgba(8,10,18,.20)!important;box-shadow:0 8px 26px rgba(0,0,0,.10)!important;font-size:14px!important}
        .app #browseActions .browse-button span{padding:0!important;border:0!important}
        .app #browseActions .browse-button svg{width:15px!important;height:15px!important}
      }

      @media(max-width:390px){
        .player-shell{grid-template-rows:minmax(86px,.86fr) auto auto auto 8px auto auto 2px!important}
        #genreStrip{gap:24px!important;padding-top:4px!important}
        .app #browseActions .browse-button{min-height:38px!important;padding-inline:11px!important;font-size:13px!important}
      }

      @media(max-height:620px) and (orientation:landscape){
        .player-shell{grid-template-rows:minmax(0,.55fr) auto auto auto 4px auto auto 0!important}
        #genreStrip{padding-top:2px!important}
        #browseActions{position:static!important;margin-top:0!important}
      }
    `;
    document.head.append(style);
  }

  function syncButton() {
    const button = $('nonstopButton');
    if (!button) return;
    const active = Boolean(state.activeSet);
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'true' : 'false');
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? `Nonstop Garba · ${state.activeSet.title}` : 'Play Nonstop Garba';
  }

  function ensureButton() {
    const strip = $('genreStrip');
    if (!strip) return null;
    let button = $('nonstopButton');
    if (!button) {
      button = document.createElement('button');
      button.id = 'nonstopButton';
      button.type = 'button';
      button.className = 'genre-button nonstop-mode-button';
      button.textContent = 'Nonstop';
      button.dataset.nonstop = 'true';
      button.setAttribute('aria-label', 'Play Nonstop Garba');
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => startNonstop());
      strip.insertBefore(button, strip.firstElementChild);
    } else if (button.parentElement !== strip || strip.firstElementChild !== button) {
      strip.insertBefore(button, strip.firstElementChild);
    }
    syncButton();
    return button;
  }

  function watchGenreStrip() {
    const strip = $('genreStrip');
    if (!strip || state.buttonObserver) return;
    state.buttonObserver = new MutationObserver(() => queueMicrotask(ensureButton));
    state.buttonObserver.observe(strip, { childList: true });
  }

  function setMetadata(set) {
    if (!state.activeSet || state.activeSet.id !== set.id) return;
    const app = $('app');
    const eyebrow = $('genreEyebrow');
    const title = $('songTitle');
    const artist = $('songArtist');
    const duration = $('durationTime');
    const miniTitle = $('miniTitle');
    const miniArtist = $('miniArtist');

    app?.setAttribute('data-play-mode', 'nonstop');
    if (eyebrow && eyebrow.textContent !== 'Nonstop Garba') eyebrow.textContent = 'Nonstop Garba';
    if (title && title.textContent !== set.title) title.textContent = set.title;
    if (artist && artist.textContent !== set.artistsText) artist.textContent = set.artistsText;
    if (miniTitle && miniTitle.textContent !== set.title) miniTitle.textContent = set.title;
    if (miniArtist && miniArtist.textContent !== set.artistsText) miniArtist.textContent = set.artistsText;
    if (duration && set.durationSeconds > 0 && (duration.textContent === '--:--' || duration.textContent === '0:00')) duration.textContent = formatTime(set.durationSeconds);

    try {
      if ('mediaSession' in navigator && 'MediaMetadata' in window) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: set.title,
          artist: set.artistsText,
          album: 'Nonstop Garba',
          artwork: [{ src: 'assets/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
        });
      }
    } catch {
      // Media Session metadata is optional.
    }
    syncButton();
  }

  function watchMetadata() {
    const title = $('songTitle');
    if (!title || state.metadataObserver) return;
    state.metadataObserver = new MutationObserver(() => {
      if (state.activeSet) queueMicrotask(() => setMetadata(state.activeSet));
    });
    state.metadataObserver.observe(title, { childList: true, characterData: true, subtree: true });
  }

  function urlWithoutNonstop() {
    const url = new URL(location.href);
    url.searchParams.delete('nonstop');
    return `${url.pathname}${url.search ? url.search : ''}${url.hash}`;
  }

  function capturePreviousSession(songs) {
    const params = new URLSearchParams(location.search);
    const songId = params.get('song');
    const song = songs.find((entry) => entry.id === songId)
      || songs.find((entry) => entry.title === $('songTitle')?.textContent && entry.artist === $('songArtist')?.textContent)
      || null;
    const audio = $('audio');
    return {
      url: urlWithoutNonstop(),
      song,
      audioTime: Number(audio?.currentTime || 0),
      hadAudioSource: Boolean(audio?.getAttribute('src')),
      appGenre: $('app')?.dataset.genre || song?.genre || 'traditional',
      eyebrow: $('genreEyebrow')?.textContent || '',
      title: song?.title || $('songTitle')?.textContent || '',
      artist: song?.artist || $('songArtist')?.textContent || '',
      duration: $('durationTime')?.textContent || '--:--',
      miniTitle: song?.title || $('miniTitle')?.textContent || '',
      miniArtist: song?.artist || $('miniArtist')?.textContent || '',
    };
  }

  function restorePreviousSession(previous) {
    if (!previous) return;
    history.replaceState(history.state, '', previous.url);
    const app = $('app');
    if (app) app.dataset.genre = previous.appGenre;
    if ($('genreEyebrow')) $('genreEyebrow').textContent = previous.eyebrow;
    if ($('songTitle')) $('songTitle').textContent = previous.title;
    if ($('songArtist')) $('songArtist').textContent = previous.artist;
    if ($('durationTime')) $('durationTime').textContent = previous.duration;
    if ($('miniTitle')) $('miniTitle').textContent = previous.miniTitle;
    if ($('miniArtist')) $('miniArtist').textContent = previous.miniArtist;

    const audio = $('audio');
    if (audio) {
      audio.removeAttribute('src');
      try { audio.load(); } catch { /* no-op */ }
      if (previous.hadAudioSource && previous.song?.audioUrl) {
        audio.src = previous.song.audioUrl;
        try { audio.load(); } catch { /* no-op */ }
        if (previous.audioTime > 0) {
          const restoreTime = () => {
            try { audio.currentTime = previous.audioTime; } catch { /* no-op */ }
            audio.removeEventListener('loadedmetadata', restoreTime);
          };
          audio.addEventListener('loadedmetadata', restoreTime);
        }
      }
    }

    try {
      if (previous.song && 'mediaSession' in navigator && 'MediaMetadata' in window) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: previous.song.title,
          artist: previous.song.artist,
          album: previous.eyebrow || 'GARBA',
          artwork: [{ src: 'assets/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
        });
      }
    } catch {
      // Media Session metadata is optional.
    }
  }

  function setUrlForNonstop(set, anchor) {
    const url = new URL(location.href);
    url.searchParams.set('genre', anchor.genre || 'traditional');
    url.searchParams.set('song', anchor.id);
    url.searchParams.set('nonstop', set.id);
    url.searchParams.delete('browse');
    url.searchParams.delete('source');
    history.replaceState(history.state, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
  }

  function stopNativeAudio() {
    const audio = $('audio');
    if (!audio) return;
    try { audio.pause(); } catch { /* no-op */ }
    audio.removeAttribute('src');
    try { audio.load(); } catch { /* no-op */ }
  }

  function markDock() {
    const dock = $('youtubeStage');
    dock?.classList.toggle('is-nonstop', Boolean(state.activeSet));
  }

  async function startNonstop(requestedSetId = null, { quiet = false } = {}) {
    if (!navigator.onLine) {
      announce('Nonstop Garba needs an internet connection for playback.');
      return false;
    }

    const button = ensureButton();
    button?.setAttribute('aria-busy', 'true');
    if (!quiet) announce('Starting Nonstop Garba…');

    try {
      if (!state.loading) {
        state.loading = Promise.all([findSet(requestedSetId), loadSongs()]).finally(() => { state.loading = null; });
      }
      const [set, songs] = await state.loading;
      if (!set) throw new Error('Requested nonstop set unavailable');
      const anchor = findAnchorSong(set, songs);
      if (!anchor) throw new Error('No controllable PlayGarba anchor for this nonstop set');
      if (!window.GARBA_YOUTUBE_PLAYER?.open) throw new Error('PlayGarba YouTube engine unavailable');

      if (state.activeSet?.id === set.id && state.activeTrack?.id === anchor.id) {
        setMetadata(set);
        markDock();
        if (!window.GARBA_YOUTUBE_PLAYER.playing) window.GARBA_YOUTUBE_PLAYER.toggle(state.activeTrack);
        return true;
      }

      if (!state.activeSet) state.previousSession = capturePreviousSession(songs);
      stopNativeAudio();
      state.activeSet = set;
      state.activeTrack = {
        ...anchor,
        id: anchor.id,
        title: set.title,
        artist: set.artistsText,
        youtubeId: set.videoId,
        youtubeStartSeconds: 0,
        durationSeconds: 0,
        playbackProvider: 'youtube',
        playbackSourceUrl: set.sourceUrl || `https://www.youtube.com/watch?v=${encodeURIComponent(set.videoId)}`,
        playbackSourceType: set.sourceType,
      };

      setUrlForNonstop(set, anchor);
      setMetadata(set);
      syncButton();

      const opened = await window.GARBA_YOUTUBE_PLAYER.open(state.activeTrack, { autoplay: true, resume: false });
      markDock();
      if (!opened) throw new Error('Nonstop player could not open');
      setMetadata(set);
      if (!quiet) announce(`Playing ${set.title}`);
      return true;
    } catch (error) {
      console.warn('PlayGarba nonstop playback failed', error);
      deactivateNonstop({ closePlayer: true, restoreSession: true });
      announce('Nonstop Garba could not start in the player. Try again when online.');
      return false;
    } finally {
      button?.removeAttribute('aria-busy');
    }
  }

  function deactivateNonstop({ closePlayer = true, restoreSession = true } = {}) {
    if (!state.activeSet && !new URL(location.href).searchParams.has('nonstop')) return;
    const previous = state.previousSession;
    state.activeSet = null;
    state.activeTrack = null;
    state.previousSession = null;
    $('app')?.removeAttribute('data-play-mode');
    if (closePlayer) {
      try { window.GARBA_YOUTUBE_PLAYER?.close?.(); } catch { /* player may already be closed */ }
    }
    markDock();
    if (restoreSession && previous) restorePreviousSession(previous);
    else if (restoreSession) history.replaceState(history.state, '', urlWithoutNonstop());
    syncButton();
  }

  function captureMainNavigation(event) {
    if (!state.activeSet) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('#nonstopButton')) return;

    if (target.closest('#prevButton, #nextButton, #miniPrev, #miniNext')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      announce('Nonstop Garba plays continuously. Choose another style to leave Nonstop.');
      return;
    }

    if (target.closest('#genreStrip .genre-button, .song-copy')) {
      deactivateNonstop({ closePlayer: true, restoreSession: true });
    }
  }

  function captureSeek(event) {
    if (!state.activeSet) return;
    event.stopImmediatePropagation();
  }

  function restoreFromUrl() {
    const id = new URL(location.href).searchParams.get('nonstop');
    if (id) startNonstop(id, { quiet: true });
  }

  function warmNonstop() {
    const warm = () => Promise.all([findSet(), loadSongs()]).catch(() => null);
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3500 });
    else setTimeout(warm, 1800);
  }

  function init() {
    injectStyles();
    ensureButton();
    watchGenreStrip();
    watchMetadata();

    document.addEventListener('click', captureMainNavigation, { capture: true });
    $('progress')?.addEventListener('input', captureSeek, { capture: true });

    window.addEventListener('offline', () => {
      if (!state.activeSet) return;
      deactivateNonstop({ closePlayer: true, restoreSession: true });
      announce('Offline. Nonstop Garba playback stopped.');
    });
    window.addEventListener('popstate', () => {
      const id = new URL(location.href).searchParams.get('nonstop');
      if (id && !state.activeSet) startNonstop(id, { quiet: true });
      else if (!id && state.activeSet) deactivateNonstop({ closePlayer: true, restoreSession: false });
    });

    warmNonstop();
    restoreFromUrl();
  }

  window.GARBA_NONSTOP = {
    play: startNonstop,
    stop: () => deactivateNonstop({ closePlayer: true, restoreSession: true }),
    get activeSetId() { return state.activeSet?.id || null; },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
