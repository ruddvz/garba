(() => {
  const $ = (id) => document.getElementById(id);
  const audio = $('audio');
  const playButton = $('playButton');
  const miniPlay = $('miniPlay');
  const progress = $('progress');
  const elapsedTime = $('elapsedTime');
  const durationTime = $('durationTime');
  const miniProgress = $('miniProgress');
  const songTitle = $('songTitle');
  const songArtist = $('songArtist');

  let apiPromise = null;
  let safeSongs = [];
  let safeSongsPromise = null;
  let player = null;
  let playerReadyPromise = null;
  let playerReadyReject = null;
  let playerGeneration = 0;
  let activeSong = null;
  let baseStart = 0;
  let trackDuration = 0;
  let playerState = -1;
  let pollTimer = null;
  let openToken = 0;
  let continueAfterNavigation = false;
  let lastPersistedSecond = -1;
  let lastMediaSessionPositionKey = '';
  let advanceLock = false;
  let bypassNextPlay = false;

  const states = () => window.YT?.PlayerState || { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

  function formatTime(seconds = 0) {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
  }

  function bootSongs() {
    return Array.isArray(window.GARBA_FAST_BOOT?.songs) ? window.GARBA_FAST_BOOT.songs : [];
  }

  function currentSongFrom(songs) {
    const id = new URL(location.href).searchParams.get('song');
    if (id) {
      const found = songs.find((song) => song.id === id);
      if (found) return found;
    }
    const title = String(songTitle?.textContent || '').trim();
    const artist = String(songArtist?.textContent || '').trim();
    return songs.find((song) => song.title === title && song.artist === artist) || null;
  }

  function currentSafeSong() {
    return currentSongFrom(safeSongs);
  }

  function currentBootSong() {
    return currentSongFrom(bootSongs());
  }

  function videoId(song) {
    if (song?.youtubeId) return String(song.youtubeId).trim();
    try {
      const url = new URL(String(song?.playbackSourceUrl || ''));
      if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
      if (url.hostname.includes('youtube.com')) {
        if (url.searchParams.get('v')) return url.searchParams.get('v');
        const parts = url.pathname.split('/').filter(Boolean);
        const marker = parts.findIndex((part) => part === 'embed' || part === 'shorts');
        return marker >= 0 ? parts[marker + 1] || '' : '';
      }
    } catch {
      // Invalid URLs are unavailable playback routes.
    }
    return '';
  }

  function youtubeCandidate(song) {
    if (!song || song.audioUrl) return false;
    const provider = String(song.playbackProvider || '').toLowerCase();
    return Boolean(song.youtubeId || provider === 'youtube' || /youtu(?:\.be|be\.com)/i.test(String(song.playbackSourceUrl || '')));
  }

  function canControl(song) {
    if (!youtubeCandidate(song) || song.playbackSearchOnly) return false;
    if (song.playbackSourceType === 'verified-unchaptered-youtube-release') return false;
    return Boolean(videoId(song));
  }

  function loadSafeSongs({ refresh = false } = {}) {
    if (safeSongsPromise && !refresh) return safeSongsPromise;
    safeSongsPromise = fetch('data/songs.json', { cache: refresh ? 'no-store' : 'force-cache' })
      .then((response) => response.ok ? response.json() : [])
      .then((songs) => {
        safeSongs = Array.isArray(songs) ? songs : [];
        return safeSongs;
      })
      .catch(() => safeSongs)
      .finally(() => { safeSongsPromise = null; });
    return safeSongsPromise;
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
    $('youtubeDockStop')?.addEventListener('click', () => close());
    return stage;
  }

  function setNote(message, { loading = false, needsTap = false } = {}) {
    const stage = ensureStage();
    const note = $('youtubeDockNote');
    if (note) note.textContent = message;
    stage.classList.toggle('is-loading', loading);
    stage.classList.toggle('needs-tap', needsTap);
  }

  function setPlaying(playing) {
    $('app')?.classList.toggle('is-playing', playing);
    for (const button of [playButton, miniPlay]) {
      if (!button) continue;
      button.classList.toggle('is-playing', playing);
      button.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      button.title = playing ? 'Pause' : 'Play';
    }
    try {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch {
      // Some webviews expose Media Session only partially.
    }
  }

  function elapsed() {
    if (!player || !activeSong) return 0;
    try { return Math.max(0, Number(player.getCurrentTime?.() || 0) - baseStart); }
    catch { return 0; }
  }

  function duration() {
    if (trackDuration > 0) return trackDuration;
    try {
      const full = Number(player?.getDuration?.() || 0);
      return full > baseStart ? full - baseStart : 0;
    } catch {
      return 0;
    }
  }

  function persistPosition(current) {
    const rounded = Math.round(current || 0);
    if (rounded === lastPersistedSecond || rounded % 5 !== 0) return;
    lastPersistedSecond = rounded;
    try {
      const previous = JSON.parse(localStorage.getItem('garba:session') || '{}');
      localStorage.setItem('garba:session', JSON.stringify({
        ...previous,
        genreId: String($('app')?.dataset.genre || previous.genreId || ''),
        songId: activeSong?.id || previous.songId || null,
        elapsed: rounded,
      }));
    } catch {
      // Storage can be denied in private browsing.
    }
  }

  function syncProgress() {
    if (!player || !activeSong) return;
    const current = elapsed();
    const total = duration();
    const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
    const progressValue = Math.round(ratio * 1000);
    const progressPercent = `${progressValue / 10}%`;

    if (progress) {
      if (String(progress.value) !== String(progressValue)) progress.value = String(progressValue);
      if (progress.style.getPropertyValue('--progress') !== progressPercent) {
        progress.style.setProperty('--progress', progressPercent);
      }
    }

    const elapsedLabel = formatTime(current);
    if (elapsedTime && elapsedTime.textContent !== elapsedLabel) elapsedTime.textContent = elapsedLabel;

    if (durationTime && total > 0) {
      const durationLabel = formatTime(total);
      if (durationTime.textContent !== durationLabel) durationTime.textContent = durationLabel;
    }

    if (miniProgress && miniProgress.style.width !== progressPercent) miniProgress.style.width = progressPercent;
    persistPosition(current);

    if ('mediaSession' in navigator && total > 0) {
      try {
        const playbackRate = Number(player.getPlaybackRate?.() || 1);
        const position = Math.min(Math.max(0, current), total);
        const positionKey = `${Math.max(1, total)}:${playbackRate}:${Math.floor(position)}`;
        if (positionKey !== lastMediaSessionPositionKey) {
          navigator.mediaSession.setPositionState({
            duration: Math.max(1, total),
            playbackRate,
            position,
          });
          lastMediaSessionPositionKey = positionKey;
        }
      } catch {
        // Position state is optional.
      }
    }

    if (trackDuration > 0 && playerState === states().PLAYING && current >= trackDuration - 0.3) advance();
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

  function loadApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;

    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('YT.Player unavailable'));
      };

      window.onYouTubeIframeAPIReady = () => {
        try { previous?.(); } catch { /* another consumer should not block GARBA */ }
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

      setTimeout(() => {
        if (!settled && !window.YT?.Player) reject(new Error('YouTube IFrame API timed out'));
      }, 12000);
    }).catch((error) => {
      apiPromise = null;
      throw error;
    });

    return apiPromise;
  }

  function closeGenericProvider() {
    document.querySelector('#providerStage.open[aria-hidden="false"] #providerDockStop')?.click();
  }

  function handlePlayerStateChange(event) {
    playerState = Number(event.data);
    const s = states();
    if (playerState === s.PLAYING) {
      setPlaying(true);
      setNote('YouTube · playing in GARBA');
      startPolling();
    } else if (playerState === s.BUFFERING) {
      setNote('YouTube · buffering', { loading: true });
      startPolling();
    } else if (playerState === s.PAUSED || playerState === s.CUED) {
      setPlaying(false);
      setNote('YouTube · paused');
      syncProgress();
    } else if (playerState === s.ENDED) {
      setPlaying(false);
      syncProgress();
      advance();
    }
  }

  function handleAutoplayBlocked() {
    setPlaying(false);
    setNote('Tap Play to start YouTube playback', { needsTap: true });
  }

  function handlePlayerError(event) {
    setPlaying(false);
    stopPolling();
    const code = Number(event.data || 0);
    const message = code === 101 || code === 150
      ? 'This YouTube upload does not allow embedded playback.'
      : code === 100
        ? 'This YouTube upload is unavailable.'
        : 'YouTube playback could not start.';
    setNote(message, { needsTap: true });
  }

  function destroyPlayer() {
    playerGeneration += 1;
    stopPolling();
    const currentPlayer = player;
    const rejectReady = playerReadyReject;
    player = null;
    playerReadyPromise = null;
    playerReadyReject = null;
    playerState = -1;
    lastMediaSessionPositionKey = '';
    try { currentPlayer?.destroy?.(); } catch { /* already detached */ }
    try { rejectReady?.(new Error('YouTube player initialisation cancelled')); } catch { /* already settled */ }
  }

  async function ensurePlayer(initialVideoId, expectedToken) {
    if (playerReadyPromise) return playerReadyPromise;

    await loadApi();
    if (expectedToken !== openToken || !activeSong) throw new Error('YouTube player initialisation cancelled');
    if (playerReadyPromise) return playerReadyPromise;

    const media = $('youtubeProviderMedia');
    const generation = ++playerGeneration;
    const mount = document.createElement('div');
    mount.id = 'garba-youtube-player';
    media?.replaceChildren(mount);

    playerReadyPromise = new Promise((resolve, reject) => {
      let ready = false;
      let createdPlayer = null;
      let timeout = null;

      const rejectIfCurrent = (error) => {
        if (generation !== playerGeneration) return;
        clearTimeout(timeout);
        if (player === createdPlayer) player = null;
        playerReadyPromise = null;
        playerReadyReject = null;
        playerState = -1;
        try { createdPlayer?.destroy?.(); } catch { /* partially initialised */ }
        reject(error);
      };

      playerReadyReject = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      try {
        createdPlayer = new window.YT.Player(mount.id, {
          width: '100%',
          height: '100%',
          videoId: initialVideoId,
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
              if (generation !== playerGeneration || player !== createdPlayer) return;
              ready = true;
              clearTimeout(timeout);
              playerReadyReject = null;
              resolve(createdPlayer);
            },
            onStateChange: handlePlayerStateChange,
            onAutoplayBlocked: handleAutoplayBlocked,
            onError: handlePlayerError,
          },
        });
        player = createdPlayer;
      } catch (error) {
        rejectIfCurrent(error);
        return;
      }

      timeout = setTimeout(() => {
        if (!ready) rejectIfCurrent(new Error('YouTube player readiness timed out'));
      }, 12000);
    });

    return playerReadyPromise;
  }

  function close() {
    openToken += 1;
    destroyPlayer();
    activeSong = null;
    baseStart = 0;
    trackDuration = 0;
    lastPersistedSecond = -1;
    lastMediaSessionPositionKey = '';
    advanceLock = false;
    continueAfterNavigation = false;
    const stage = $('youtubeStage');
    stage?.classList.remove('open', 'is-loading', 'needs-tap');
    stage?.setAttribute('aria-hidden', 'true');
    $('youtubeProviderMedia')?.replaceChildren();
    setPlaying(false);
  }

  function restoreElapsed(song) {
    try {
      const session = JSON.parse(localStorage.getItem('garba:session') || '{}');
      if (session.songId !== song?.id) return 0;
      const saved = Number(session.elapsed || 0);
      if (!Number.isFinite(saved) || saved < 0) return 0;
      const max = Number(song.durationSeconds || 0);
      return max > 0 ? Math.min(saved, Math.max(0, max - 1)) : saved;
    } catch {
      return 0;
    }
  }

  async function open(song, { autoplay = true, resume = true } = {}) {
    if (!canControl(song) || !navigator.onLine) return false;
    const id = videoId(song);
    const token = ++openToken;

    closeGenericProvider();
    stopPolling();
    activeSong = song;
    baseStart = Math.max(0, Number(song.youtubeStartSeconds || 0));
    trackDuration = Math.max(0, Number(song.durationSeconds || 0));
    playerState = -1;
    lastPersistedSecond = -1;
    lastMediaSessionPositionKey = '';
    advanceLock = false;
    setPlaying(false);

    const stage = ensureStage();
    const openLink = $('youtubeDockOpen');
    stage.classList.add('open', 'is-loading');
    stage.setAttribute('aria-hidden', 'false');
    if (openLink) {
      openLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
      openLink.setAttribute('aria-label', `Open ${song.title} on YouTube`);
    }
    setNote('YouTube · loading', { loading: true });

    try {
      const readyPlayer = await ensurePlayer(id, token);
      if (token !== openToken || activeSong?.id !== song.id) return false;

      const logicalStart = resume ? restoreElapsed(song) : 0;
      const startSeconds = baseStart + logicalStart;
      const endSeconds = trackDuration > 0 ? baseStart + trackDuration : undefined;
      const request = { videoId: id, startSeconds };
      if (Number.isFinite(endSeconds) && endSeconds > startSeconds) request.endSeconds = endSeconds;

      if (autoplay) readyPlayer.loadVideoById(request);
      else readyPlayer.cueVideoById(request);

      stage.classList.remove('is-loading');
      syncProgress();
      return true;
    } catch (error) {
      if (token !== openToken) return false;
      console.warn('GARBA YouTube engine failed to initialise', error);
      stage.classList.remove('is-loading');
      setNote('YouTube player could not initialise. Use Open YouTube.', { needsTap: true });
      return false;
    }
  }

  function toggle(song = currentSafeSong()) {
    if (!canControl(song)) return false;
    if (activeSong?.id !== song.id || !player) {
      open(song, { autoplay: true });
      return true;
    }
    try {
      if (playerState === states().PLAYING || playerState === states().BUFFERING) player.pauseVideo();
      else player.playVideo();
      return true;
    } catch {
      return false;
    }
  }

  function seekTo(logicalSeconds) {
    if (!player || !activeSong) return false;
    const total = duration();
    const safe = Math.max(0, total > 0 ? Math.min(Number(logicalSeconds || 0), total) : Number(logicalSeconds || 0));
    try {
      player.seekTo(baseStart + safe, true);
      lastMediaSessionPositionKey = '';
      syncProgress();
      return true;
    } catch {
      return false;
    }
  }

  function advance() {
    if (!activeSong || advanceLock) return;
    advanceLock = true;
    continueAfterNavigation = true;
    $('nextButton')?.click();
  }

  function genericPlay() {
    bypassNextPlay = true;
    queueMicrotask(() => playButton?.click());
  }

  function reopenAfterNavigation() {
    const next = currentSafeSong();
    if (activeSong && next && next.id !== activeSong.id && !continueAfterNavigation) {
      close();
      return;
    }
    if (!continueAfterNavigation) return;

    continueAfterNavigation = false;
    queueMicrotask(() => {
      const song = currentSafeSong();
      if (canControl(song)) {
        open(song, { autoplay: true, resume: false });
        return;
      }
      close();
      genericPlay();
    });
  }

  function interceptResolvedPlay(event, song) {
    if (!canControl(song)) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle(song);
    return true;
  }

  function captureClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (activeSong && target.closest('#prevButton, #nextButton, #miniPrev, #miniNext')) {
      continueAfterNavigation = true;
      advanceLock = false;
      return;
    }

    if (!target.closest('#playButton, #miniPlay')) return;
    if (bypassNextPlay) {
      bypassNextPlay = false;
      return;
    }
    if (audio?.getAttribute('src')) return;

    const safeSong = currentSafeSong();
    if (safeSong) {
      if (interceptResolvedPlay(event, safeSong)) return;
      if (activeSong) close();
      return;
    }

    const bootSong = currentBootSong();
    if (!youtubeCandidate(bootSong)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    loadSafeSongs().then(() => {
      const resolved = currentSafeSong();
      if (canControl(resolved)) toggle(resolved);
      else genericPlay();
    });
  }

  function captureKeys(event) {
    if (event.key === 'Escape' && activeSong) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      return;
    }

    if ((event.code === 'ArrowLeft' || event.code === 'ArrowRight') && activeSong) {
      continueAfterNavigation = true;
      advanceLock = false;
      return;
    }

    if (event.code !== 'Space') return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button, a[href], input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (audio?.getAttribute('src')) return;

    const song = currentSafeSong();
    if (!canControl(song)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle(song);
  }

  function captureSeek() {
    if (!activeSong || !player || !progress) return;
    const total = duration();
    if (total > 0) seekTo(Number(progress.value) / 1000 * total);
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
      if (activeSong) seekTo(elapsed() - (details.seekOffset || 10));
    }); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (activeSong) seekTo(elapsed() + (details.seekOffset || 10));
    }); } catch { /* unsupported */ }
  }

  document.addEventListener('click', captureClick, { capture: true });
  document.addEventListener('keydown', captureKeys, { capture: true });
  progress?.addEventListener('input', captureSeek, { capture: true });

  if (songTitle) {
    new MutationObserver(reopenAfterNavigation)
      .observe(songTitle, { childList: true, characterData: true, subtree: true });
  }

  window.addEventListener('garba:catalogue-ready', () => loadSafeSongs({ refresh: true }));
  window.addEventListener('offline', () => { if (activeSong) close(); });
  window.addEventListener('load', () => {
    loadSafeSongs({ refresh: true });
    const warm = () => loadApi().catch(() => null);
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 });
    else setTimeout(warm, 1000);
    setTimeout(setupMediaSession, 0);
  }, { once: true });

  loadSafeSongs();

  window.GARBA_YOUTUBE_PLAYER = {
    canPlay: canControl,
    open,
    close,
    seekTo,
    toggle,
    get activeSongId() { return activeSong?.id || null; },
    get playing() { return playerState === states().PLAYING; },
  };
})();