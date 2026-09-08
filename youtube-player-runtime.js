(() => {
  const $ = (id) => document.getElementById(id);
  const playButton = $('playButton');
  const miniPlay = $('miniPlay');
  const progress = $('progress');
  const elapsedTime = $('elapsedTime');
  const durationTime = $('durationTime');
  const miniProgress = $('miniProgress');
  const audio = $('audio');
  const songTitle = $('songTitle');
  const songArtist = $('songArtist');

  let apiPromise = null;
  let songsPromise = null;
  let player = null;
  let activeSong = null;
  let activeVideoId = '';
  let baseStartSeconds = 0;
  let logicalDuration = 0;
  let pollTimer = null;
  let providerState = -1;
  let continueAfterNavigation = false;
  let pendingOpenToken = 0;
  let lastPersistedSecond = -1;

  const ytState = () => window.YT?.PlayerState || {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
  };

  function formatTime(seconds = 0) {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
  }

  function youtubeVideoId(song, sourceUrl = '') {
    if (song?.youtubeId) return String(song.youtubeId).trim();
    try {
      const url = new URL(sourceUrl);
      if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
      if (url.hostname.includes('youtube.com')) {
        if (url.searchParams.get('v')) return url.searchParams.get('v');
        const parts = url.pathname.split('/').filter(Boolean);
        const marker = parts.findIndex((part) => part === 'embed' || part === 'shorts');
        if (marker >= 0) return parts[marker + 1] || '';
      }
    } catch {
      // Invalid URLs are handled as unavailable sources.
    }
    return '';
  }

  function isExactYoutubeSong(song) {
    if (!song || song.audioUrl || song.playbackSearchOnly) return false;
    if (String(song.playbackProvider || '').toLowerCase() !== 'youtube' && !song.youtubeId) return false;
    if (song.playbackSourceType === 'verified-unchaptered-youtube-release') return false;
    return Boolean(youtubeVideoId(song, song.playbackSourceUrl));
  }

  function loadSongs() {
    if (!songsPromise) {
      songsPromise = fetch('data/songs.json', { cache: 'force-cache' })
        .then((response) => response.ok ? response.json() : [])
        .catch(() => []);
    }
    return songsPromise;
  }

  async function currentSong() {
    const songs = await loadSongs();
    const id = new URL(location.href).searchParams.get('song');
    if (id) {
      const byId = songs.find((song) => song.id === id);
      if (byId) return byId;
    }
    const title = String(songTitle?.textContent || '').trim();
    const artist = String(songArtist?.textContent || '').trim();
    return songs.find((song) => song.title === title && song.artist === artist) || null;
  }

  function ensureStage() {
    let stage = $('youtubeStage');
    if (stage) return stage;

    stage = document.createElement('section');
    stage.id = 'youtubeStage';
    stage.className = 'provider-dock is-youtube-release youtube-dock';
    stage.setAttribute('aria-label', 'YouTube playback');
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `
      <div class="provider-media youtube-provider-media" id="youtubeProviderMedia"></div>
      <div class="provider-dock-bar">
        <span id="youtubeDockNote">YouTube · ready</span>
        <div class="provider-dock-actions">
          <a id="youtubeDockOpen" class="provider-dock-open" target="_blank" rel="noopener noreferrer">Open YouTube</a>
          <button type="button" id="youtubeDockStop" aria-label="Close YouTube playback">Close</button>
        </div>
      </div>`;
    document.body.append(stage);
    $('youtubeDockStop')?.addEventListener('click', () => close({ preserveIntent: false }));
    return stage;
  }

  function setDockNote(message, { needsTap = false, loading = false } = {}) {
    const stage = ensureStage();
    const note = $('youtubeDockNote');
    if (note) note.textContent = message;
    stage.classList.toggle('needs-tap', needsTap);
    stage.classList.toggle('is-loading', loading);
  }

  function setTransportPlaying(playing) {
    for (const button of [playButton, miniPlay]) {
      if (!button) continue;
      button.classList.toggle('is-playing', playing);
      button.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      button.title = playing ? 'Pause' : 'Play';
    }
    $('app')?.classList.toggle('is-playing', playing);
    try {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch {
      // Some embedded browsers expose Media Session only partially.
    }
  }

  function activeLogicalTime() {
    if (!player || !activeSong) return 0;
    try {
      return Math.max(0, Number(player.getCurrentTime?.() || 0) - baseStartSeconds);
    } catch {
      return 0;
    }
  }

  function resolvedLogicalDuration() {
    if (logicalDuration > 0) return logicalDuration;
    try {
      const full = Number(player?.getDuration?.() || 0);
      return full > baseStartSeconds ? full - baseStartSeconds : 0;
    } catch {
      return 0;
    }
  }

  function persistProviderPosition(elapsed) {
    const rounded = Math.round(elapsed || 0);
    if (rounded === lastPersistedSecond || rounded % 5 !== 0) return;
    lastPersistedSecond = rounded;
    try {
      const raw = localStorage.getItem('garba:session');
      const session = raw ? JSON.parse(raw) : {};
      localStorage.setItem('garba:session', JSON.stringify({
        ...session,
        genreId: String($('app')?.dataset.genre || session.genreId || ''),
        songId: activeSong?.id || session.songId || null,
        elapsed: rounded,
      }));
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }

  function syncProgress() {
    if (!activeSong || !player) return;
    const elapsed = activeLogicalTime();
    const duration = resolvedLogicalDuration();
    const ratio = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 0;

    if (progress) {
      progress.value = String(Math.round(ratio * 1000));
      progress.style.setProperty('--progress', `${ratio * 100}%`);
    }
    if (elapsedTime) elapsedTime.textContent = formatTime(elapsed);
    if (durationTime && duration > 0) durationTime.textContent = formatTime(duration);
    if (miniProgress) miniProgress.style.width = `${ratio * 100}%`;

    persistProviderPosition(elapsed);

    if ('mediaSession' in navigator && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, duration),
          playbackRate: Number(player.getPlaybackRate?.() || 1),
          position: Math.min(Math.max(0, elapsed), duration),
        });
      } catch {
        // Position state is optional in several webviews.
      }
    }

    if (logicalDuration > 0 && providerState === ytState().PLAYING && elapsed >= logicalDuration - 0.35) {
      advanceToNext();
    }
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(syncProgress, 350);
    syncProgress();
  }

  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  function dispatchPlaybackState() {
    window.dispatchEvent(new CustomEvent('garba:youtube-playback', {
      detail: {
        active: Boolean(activeSong && player),
        playing: providerState === ytState().PLAYING,
        songId: activeSong?.id || null,
        elapsed: activeLogicalTime(),
        duration: resolvedLogicalDuration(),
      },
    }));
  }

  function onPlayerStateChange(event) {
    providerState = Number(event?.data);
    const states = ytState();
    const playing = providerState === states.PLAYING;
    setTransportPlaying(playing);

    if (playing) {
      setDockNote('YouTube · playing in GARBA');
      startPolling();
    } else if (providerState === states.BUFFERING) {
      setDockNote('YouTube · buffering', { loading: true });
      startPolling();
    } else if (providerState === states.PAUSED || providerState === states.CUED) {
      setDockNote('YouTube · paused');
      syncProgress();
    } else if (providerState === states.ENDED) {
      syncProgress();
      advanceToNext();
    }
    dispatchPlaybackState();
  }

  function onPlayerError(event) {
    setTransportPlaying(false);
    stopPolling();
    const code = Number(event?.data || 0);
    const message = code === 101 || code === 150
      ? 'This YouTube upload does not allow embedded playback.'
      : code === 100
        ? 'This YouTube upload is no longer available.'
        : 'YouTube playback could not start for this source.';
    setDockNote(message, { needsTap: true });
    dispatchPlaybackState();
  }

  function loadIframeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;

    apiPromise = new Promise((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('YouTube IFrame API did not expose YT.Player'));
      };

      window.onYouTubeIframeAPIReady = () => {
        try { previousReady?.(); } catch { /* another consumer should not block GARBA */ }
        finish();
      };

      let script = document.querySelector('script[data-garba-youtube-api="true"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.dataset.garbaYoutubeApi = 'true';
        script.addEventListener('error', () => reject(new Error('YouTube IFrame API failed to load')), { once: true });
        document.head.append(script);
      }

      const deadline = setTimeout(() => reject(new Error('YouTube IFrame API timed out')), 12000);
      apiPromise.finally(() => clearTimeout(deadline));
    }).catch((error) => {
      apiPromise = null;
      throw error;
    });

    return apiPromise;
  }

  function closeGenericProvider() {
    const generic = document.querySelector('#providerStage.open[aria-hidden="false"]');
    generic?.querySelector('#providerDockStop')?.click();
  }

  function destroyPlayer() {
    stopPolling();
    try { player?.destroy?.(); } catch { /* already detached */ }
    player = null;
    providerState = -1;
    activeVideoId = '';
  }

  function close({ preserveIntent = false } = {}) {
    pendingOpenToken += 1;
    destroyPlayer();
    activeSong = null;
    baseStartSeconds = 0;
    logicalDuration = 0;
    lastPersistedSecond = -1;
    const stage = $('youtubeStage');
    stage?.classList.remove('open', 'is-loading', 'needs-tap');
    stage?.setAttribute('aria-hidden', 'true');
    $('youtubeProviderMedia')?.replaceChildren();
    setTransportPlaying(false);
    if (!preserveIntent) continueAfterNavigation = false;
    dispatchPlaybackState();
  }

  function restoreElapsedForSong(song) {
    try {
      const raw = localStorage.getItem('garba:session');
      const session = raw ? JSON.parse(raw) : {};
      if (session.songId !== song?.id) return 0;
      const elapsed = Number(session.elapsed || 0);
      if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
      const max = Number(song?.durationSeconds || 0);
      return max > 0 ? Math.min(elapsed, Math.max(0, max - 1)) : elapsed;
    } catch {
      return 0;
    }
  }

  async function openSong(song, { autoplay = true, restoreElapsed = true } = {}) {
    if (!isExactYoutubeSong(song) || !navigator.onLine) return false;

    const videoId = youtubeVideoId(song, song.playbackSourceUrl);
    const token = ++pendingOpenToken;
    closeGenericProvider();
    destroyPlayer();

    activeSong = song;
    activeVideoId = videoId;
    baseStartSeconds = Math.max(0, Number(song.youtubeStartSeconds || 0));
    logicalDuration = Math.max(0, Number(song.durationSeconds || 0));
    providerState = -1;

    const stage = ensureStage();
    const media = $('youtubeProviderMedia');
    const open = $('youtubeDockOpen');
    stage.classList.add('open', 'is-loading');
    stage.setAttribute('aria-hidden', 'false');
    if (open) {
      open.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
      open.textContent = 'Open YouTube';
      open.setAttribute('aria-label', `Open ${song.title} on YouTube`);
    }
    setDockNote('YouTube · loading', { loading: true });

    const mount = document.createElement('div');
    mount.id = `garbaYoutubePlayer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    media?.replaceChildren(mount);

    try {
      await loadIframeApi();
      if (token !== pendingOpenToken || !activeSong || activeSong.id !== song.id) return false;

      const savedElapsed = restoreElapsed ? restoreElapsedForSong(song) : 0;
      const startSeconds = baseStartSeconds + savedElapsed;
      const endSeconds = logicalDuration > 0 ? baseStartSeconds + logicalDuration : undefined;

      await new Promise((resolve, reject) => {
        let resolved = false;
        player = new window.YT.Player(mount.id, {
          width: '100%',
          height: '100%',
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            playsinline: 1,
            rel: 0,
            enablejsapi: 1,
            origin: location.origin,
          },
          events: {
            onReady: () => {
              if (token !== pendingOpenToken) {
                destroyPlayer();
                return;
              }
              try {
                const request = { videoId, startSeconds };
                if (Number.isFinite(endSeconds) && endSeconds > startSeconds) request.endSeconds = endSeconds;
                if (autoplay) player.loadVideoById(request);
                else player.cueVideoById(request);
                resolved = true;
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            onStateChange: onPlayerStateChange,
            onError: onPlayerError,
          },
        });
        setTimeout(() => {
          if (!resolved && token === pendingOpenToken) reject(new Error('YouTube player did not become ready'));
        }, 12000);
      });

      stage.classList.remove('is-loading');
      if (!autoplay) setDockNote('YouTube · ready');
      syncProgress();
      dispatchPlaybackState();
      return true;
    } catch (error) {
      console.warn('GARBA YouTube player failed to initialise', error);
      setTransportPlaying(false);
      setDockNote('YouTube player could not initialise. Use Open YouTube for this source.', { needsTap: true });
      stage.classList.remove('is-loading');
      return false;
    }
  }

  async function toggleCurrentSong() {
    const song = await currentSong();
    if (!song) return false;

    if (!isExactYoutubeSong(song)) {
      if (activeSong) close();
      return false;
    }

    if (activeSong?.id === song.id && player) {
      const states = ytState();
      if (providerState === states.PLAYING || providerState === states.BUFFERING) {
        try { player.pauseVideo(); } catch { /* player is changing state */ }
      } else {
        try { player.playVideo(); } catch { /* player is changing state */ }
      }
      return true;
    }

    return openSong(song, { autoplay: true });
  }

  function seekTo(logicalSeconds) {
    if (!player || !activeSong) return false;
    const duration = resolvedLogicalDuration();
    const next = Math.max(0, duration > 0 ? Math.min(Number(logicalSeconds || 0), duration) : Number(logicalSeconds || 0));
    try {
      player.seekTo(baseStartSeconds + next, true);
      syncProgress();
      return true;
    } catch {
      return false;
    }
  }

  function advanceToNext() {
    if (!activeSong) return;
    continueAfterNavigation = true;
    $('nextButton')?.click();
  }

  async function reopenAfterNavigation() {
    if (!continueAfterNavigation) return;
    continueAfterNavigation = false;
    await new Promise((resolve) => queueMicrotask(resolve));
    const song = await currentSong();
    if (!song || !isExactYoutubeSong(song)) {
      close();
      return;
    }
    await openSong(song, { autoplay: true, restoreElapsed: false });
  }

  function rememberNavigationIntent(event) {
    if (!activeSong) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('#prevButton, #nextButton, #miniPrev, #miniNext')) continueAfterNavigation = true;
  }

  function interceptPlay(event) {
    if (audio?.getAttribute('src')) return;
    const promise = currentSong();
    promise.then((song) => {
      if (!isExactYoutubeSong(song)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleCurrentSong();
    });
  }

  function interceptPlaySynchronous(event) {
    if (audio?.getAttribute('src')) return;
    const id = new URL(location.href).searchParams.get('song');
    if (!id) return;
    loadSongs().then((songs) => {
      const song = songs.find((entry) => entry.id === id);
      if (!isExactYoutubeSong(song)) return;
      // This fallback runs only when catalogue lookup was not already warm.
      toggleCurrentSong();
    });
  }

  async function handleSpace(event) {
    if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
      if (activeSong) continueAfterNavigation = true;
      return;
    }
    if (event.code !== 'Space') return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button, a[href], input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (audio?.getAttribute('src')) return;
    const song = await currentSong();
    if (!isExactYoutubeSong(song)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleCurrentSong();
  }

  function handleSeekInput() {
    if (!activeSong || !player || !progress) return;
    const duration = resolvedLogicalDuration();
    if (duration <= 0) return;
    seekTo(Number(progress.value) / 1000 * duration);
  }

  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try { navigator.mediaSession.setActionHandler('play', () => activeSong ? player?.playVideo?.() : playButton?.click()); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('pause', () => activeSong ? player?.pauseVideo?.() : audio?.pause()); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('stop', () => activeSong ? close() : audio?.pause()); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('previoustrack', () => $('prevButton')?.click()); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('nexttrack', () => $('nextButton')?.click()); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (activeSong && Number.isFinite(details.seekTime)) seekTo(details.seekTime);
    }); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      if (activeSong) seekTo(activeLogicalTime() - (details.seekOffset || 10));
    }); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (activeSong) seekTo(activeLogicalTime() + (details.seekOffset || 10));
    }); } catch { /* unsupported */ }
  }

  playButton?.addEventListener('click', interceptPlay, { capture: true });
  miniPlay?.addEventListener('click', interceptPlay, { capture: true });
  playButton?.addEventListener('click', interceptPlaySynchronous, { capture: true });
  miniPlay?.addEventListener('click', interceptPlaySynchronous, { capture: true });
  document.addEventListener('click', rememberNavigationIntent, { capture: true });
  document.addEventListener('keydown', handleSpace);
  progress?.addEventListener('input', handleSeekInput, { capture: true });

  if (songTitle) {
    new MutationObserver(() => {
      reopenAfterNavigation();
    }).observe(songTitle, { childList: true, characterData: true, subtree: true });
  }

  window.addEventListener('offline', () => {
    if (activeSong) close();
  });

  window.addEventListener('load', () => {
    const warm = () => loadIframeApi().catch(() => null);
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 });
    else setTimeout(warm, 1200);
    setTimeout(setupMediaSession, 0);
    loadSongs();
  }, { once: true });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !activeSong) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
  }, { capture: true });

  window.GARBA_YOUTUBE_PLAYER = {
    canPlay: isExactYoutubeSong,
    openSong,
    close,
    seekTo,
    get activeSongId() { return activeSong?.id || null; },
    get playing() { return providerState === ytState().PLAYING; },
  };
})();
