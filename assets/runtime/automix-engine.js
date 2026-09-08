(() => {
  const $ = (id) => document.getElementById(id);
  const primaryAudio = $('audio');
  if (!primaryAudio) return;

  const MIX_ENABLED_KEY = 'garba:automix-enabled';
  const MIX_DEFAULT_SECONDS = 7.5;
  const MIX_MIN_SECONDS = 4;
  const MIX_MAX_SECONDS = 10;
  const MIX_TEMPO_LIMIT = 0.06;
  const PRELOAD_WINDOW_SECONDS = 30;

  const state = {
    songs: [],
    cataloguePromise: null,
    enabled: readMixEnabled(),
    running: false,
    token: 0,
    nextSongId: null,
    secondary: null,
    frame: 0,
    startedAt: 0,
    durationMs: 0,
    handoffRequested: false,
    handoffTimer: 0,
    preloadedSongId: null,
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function readMixEnabled() {
    try {
      const stored = localStorage.getItem(MIX_ENABLED_KEY);
      return stored == null ? true : stored !== 'false';
    } catch {
      return true;
    }
  }

  function writeMixEnabled(enabled) {
    state.enabled = Boolean(enabled);
    try { localStorage.setItem(MIX_ENABLED_KEY, String(state.enabled)); } catch { /* storage denied */ }
    syncMixControl();
    if (!state.enabled) cancelAutoMix();
  }

  function announce(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  async function loadSongs({ refresh = false } = {}) {
    if (state.cataloguePromise && !refresh) return state.cataloguePromise;
    state.cataloguePromise = fetch('data/songs.json', { cache: refresh ? 'no-store' : 'force-cache' })
      .then((response) => response.ok ? response.json() : [])
      .then((songs) => {
        state.songs = Array.isArray(songs) ? songs : [];
        return state.songs;
      })
      .catch(() => state.songs)
      .finally(() => { state.cataloguePromise = null; });
    return state.cataloguePromise;
  }

  function currentSong() {
    const id = new URL(location.href).searchParams.get('song');
    if (id) {
      const found = state.songs.find((song) => song.id === id);
      if (found) return found;
    }
    const title = String($('songTitle')?.textContent || '').trim();
    const artist = String($('songArtist')?.textContent || '').trim();
    return state.songs.find((song) => song.title === title && song.artist === artist) || null;
  }

  function nextDirectSong(song) {
    if (!song?.genre || !state.songs.length) return null;
    const list = state.songs.filter((entry) => entry.genre === song.genre);
    const index = list.findIndex((entry) => entry.id === song.id);
    if (index < 0 || list.length < 2) return null;
    const next = list[(index + 1) % list.length];
    return next?.audioUrl ? next : null;
  }

  function mixDurationSeconds(current, next) {
    const explicit = Number(next?.transitionSeconds || current?.transitionSeconds || 0);
    if (Number.isFinite(explicit) && explicit > 0) return clamp(explicit, MIX_MIN_SECONDS, MIX_MAX_SECONDS);

    const bpm = Number(current?.bpm || next?.bpm || 0);
    if (Number.isFinite(bpm) && bpm >= 70 && bpm <= 220) {
      return clamp((16 * 60) / bpm, MIX_MIN_SECONDS, MIX_MAX_SECONDS);
    }

    if (navigator.connection?.saveData) return MIX_MIN_SECONDS;
    return MIX_DEFAULT_SECONDS;
  }

  function transitionTriggerTime(audio, song, seconds) {
    const metadataOut = Number(song?.mixOutSeconds || 0);
    if (metadataOut > 0) return Math.max(0, metadataOut - seconds);
    const duration = Number.isFinite(audio.duration) ? audio.duration : Number(song?.durationSeconds || 0);
    return Math.max(0, duration - seconds);
  }

  function tempoRatio(current, next) {
    const currentBpm = Number(current?.bpm || 0);
    const nextBpm = Number(next?.bpm || 0);
    if (!(currentBpm > 0 && nextBpm > 0)) return 1;
    const ratio = currentBpm / nextBpm;
    return Math.abs(ratio - 1) <= MIX_TEMPO_LIMIT ? ratio : 1;
  }

  function ensureSecondary() {
    if (state.secondary?.isConnected) return state.secondary;
    const deck = document.createElement('audio');
    deck.id = 'automixAudio';
    deck.preload = 'auto';
    deck.crossOrigin = 'anonymous';
    deck.setAttribute('aria-hidden', 'true');
    deck.setAttribute('tabindex', '-1');
    deck.style.display = 'none';
    deck.volume = 0;
    document.body.append(deck);
    state.secondary = deck;
    return deck;
  }

  function equalPower(progress) {
    const t = clamp(progress, 0, 1);
    return {
      outgoing: Math.cos(t * Math.PI * 0.5),
      incoming: Math.sin(t * Math.PI * 0.5),
    };
  }

  function usesNativeVolume() {
    return window.GARBA_AUTOMIX_AUDIO?.mode === 'media-element-volume';
  }

  function resetSecondary({ clearSource = true } = {}) {
    const secondary = state.secondary;
    if (!secondary) return;
    secondary.pause();
    secondary.volume = 0;
    secondary.playbackRate = 1;
    if (clearSource) {
      try { secondary.removeAttribute('src'); secondary.load(); } catch { /* media reset can fail during teardown */ }
      state.preloadedSongId = null;
    }
  }

  function cancelAutoMix() {
    state.token += 1;
    state.running = false;
    state.nextSongId = null;
    state.handoffRequested = false;
    cancelAnimationFrame(state.frame);
    clearTimeout(state.handoffTimer);
    if (primaryAudio) primaryAudio.volume = 1;
    resetSecondary();
    document.documentElement.removeAttribute('data-automix-active');
  }

  function preloadSong(song) {
    if (!song?.audioUrl || navigator.connection?.saveData || state.running) return;
    const secondary = ensureSecondary();
    if (state.preloadedSongId === song.id && secondary.getAttribute('src')) return;
    secondary.pause();
    secondary.volume = 0;
    secondary.playbackRate = 1;
    secondary.crossOrigin = 'anonymous';
    secondary.src = song.audioUrl;
    secondary.load();
    state.preloadedSongId = song.id;
  }

  function maybePreloadNext() {
    if (!state.enabled || state.running || primaryAudio.paused || primaryAudio.seeking) return;
    const current = currentSong();
    if (!current?.audioUrl) return;
    const next = nextDirectSong(current);
    if (!next) return;
    const duration = Number.isFinite(primaryAudio.duration) ? primaryAudio.duration : Number(current.durationSeconds || 0);
    if (!(duration > 0)) return;
    const remaining = duration - primaryAudio.currentTime;
    if (remaining <= PRELOAD_WINDOW_SECONDS && remaining > 0) preloadSong(next);
  }

  function waitForPrimaryHandoff(nextSong, secondary, token) {
    const attempt = async () => {
      if (token !== state.token || !state.running) return;
      const primarySrc = primaryAudio?.currentSrc || primaryAudio?.src || '';
      const expected = new URL(nextSong.audioUrl, location.href).href;
      if (!primarySrc || primarySrc !== expected || primaryAudio.readyState < 1) return false;

      const targetTime = secondary.currentTime;
      primaryAudio.volume = usesNativeVolume() ? 1 : primaryAudio.volume;
      primaryAudio.playbackRate = 1;
      try {
        if (Number.isFinite(primaryAudio.duration)) {
          primaryAudio.currentTime = Math.min(targetTime, Math.max(0, primaryAudio.duration - 0.05));
        } else {
          primaryAudio.currentTime = targetTime;
        }
      } catch { /* stream-like sources may reject precise seeks */ }

      try { await primaryAudio.play(); } catch { return false; }

      if (!usesNativeVolume()) {
        state.handoffTimer = setTimeout(() => {
          if (token !== state.token) return;
          resetSecondary();
          state.running = false;
          state.nextSongId = null;
          state.handoffRequested = false;
          document.documentElement.removeAttribute('data-automix-active');
        }, 260);
        return true;
      }

      const fadeStart = performance.now();
      const fadeOut = (now) => {
        if (token !== state.token) return;
        const t = clamp((now - fadeStart) / 160, 0, 1);
        secondary.volume = 1 - t;
        if (t < 1) requestAnimationFrame(fadeOut);
        else {
          resetSecondary();
          state.running = false;
          state.nextSongId = null;
          state.handoffRequested = false;
          document.documentElement.removeAttribute('data-automix-active');
        }
      };
      requestAnimationFrame(fadeOut);
      return true;
    };

    const poll = async () => {
      if (token !== state.token || !state.running) return;
      if (await attempt()) return;
      state.handoffTimer = setTimeout(poll, 35);
    };
    poll();
  }

  function requestCoreNavigation(nextSong, secondary, token) {
    if (state.handoffRequested || token !== state.token) return;
    state.handoffRequested = true;
    const nextButton = $('nextButton');
    if (!nextButton) {
      cancelAutoMix();
      return;
    }
    nextButton.click();
    waitForPrimaryHandoff(nextSong, secondary, token);
  }

  async function beginAutoMix(current, next) {
    if (!state.enabled || state.running || !current?.audioUrl || !next?.audioUrl) return;
    const secondary = ensureSecondary();
    const token = ++state.token;
    const seconds = mixDurationSeconds(current, next);
    const ratio = tempoRatio(current, next);
    const mixIn = Math.max(0, Number(next.mixInSeconds || next.introSilenceSeconds || 0));

    state.running = true;
    state.nextSongId = next.id;
    state.startedAt = performance.now();
    state.durationMs = seconds * 1000;
    state.handoffRequested = false;

    secondary.pause();
    secondary.volume = 0;
    secondary.playbackRate = ratio;
    secondary.crossOrigin = 'anonymous';
    if ('preservesPitch' in secondary) secondary.preservesPitch = true;
    if ('webkitPreservesPitch' in secondary) secondary.webkitPreservesPitch = true;
    if (state.preloadedSongId !== next.id || !secondary.getAttribute('src')) {
      secondary.src = next.audioUrl;
      secondary.load();
      state.preloadedSongId = next.id;
    }

    try {
      if (secondary.readyState < 1) {
        await new Promise((resolve, reject) => {
          const onReady = () => { cleanup(); resolve(); };
          const onError = () => { cleanup(); reject(new Error('incoming audio failed to preload')); };
          const cleanup = () => {
            secondary.removeEventListener('loadedmetadata', onReady);
            secondary.removeEventListener('error', onError);
          };
          secondary.addEventListener('loadedmetadata', onReady, { once: true });
          secondary.addEventListener('error', onError, { once: true });
        });
      }
      if (mixIn > 0) secondary.currentTime = mixIn;
      document.documentElement.setAttribute('data-automix-active', 'true');
      await secondary.play();
    } catch {
      cancelAutoMix();
      return;
    }

    const tick = (now) => {
      if (token !== state.token || !state.running) return;
      const progress = clamp((now - state.startedAt) / state.durationMs, 0, 1);
      if (usesNativeVolume()) {
        const gains = equalPower(progress);
        primaryAudio.volume = gains.outgoing;
        secondary.volume = gains.incoming;
      }
      secondary.playbackRate = ratio + ((1 - ratio) * progress);

      if (progress < 1) {
        state.frame = requestAnimationFrame(tick);
      } else {
        if (usesNativeVolume()) {
          primaryAudio.volume = 0;
          secondary.volume = 1;
        }
        secondary.playbackRate = 1;
        requestCoreNavigation(next, secondary, token);
      }
    };
    state.frame = requestAnimationFrame(tick);
  }

  function maybeStartAutoMix() {
    maybePreloadNext();
    if (!state.enabled || state.running || primaryAudio.paused || primaryAudio.seeking) return;
    const current = currentSong();
    if (!current?.audioUrl || !primaryAudio.currentSrc) return;
    const next = nextDirectSong(current);
    if (!next) return;
    const seconds = mixDurationSeconds(current, next);
    const trigger = transitionTriggerTime(primaryAudio, current, seconds);
    const end = Number(primaryAudio.duration) || Infinity;
    if (primaryAudio.currentTime >= trigger && primaryAudio.currentTime < end - 0.08) beginAutoMix(current, next);
  }

  function syncMixControl() {
    const control = document.querySelector('[data-garba-automix-toggle]');
    if (!control) return;
    control.setAttribute('aria-pressed', String(state.enabled));
    control.classList.toggle('active', state.enabled);
    const value = control.querySelector('[data-automix-value]');
    if (value) value.textContent = state.enabled ? 'On' : 'Off';
  }

  function ensureMixControl() {
    const sheet = $('songSheet');
    const list = $('songList');
    if (!sheet || !list || !sheet.classList.contains('mode-queue')) return;
    if (list.querySelector('[data-garba-automix-toggle]')) {
      syncMixControl();
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'automix-toggle';
    button.dataset.garbaAutomixToggle = 'true';
    button.setAttribute('aria-pressed', String(state.enabled));
    button.innerHTML = '<span class="automix-mark" aria-hidden="true">∿</span><span class="automix-copy"><strong>AutoMix</strong><small>Blend direct Garba tracks into the next song</small></span><span class="automix-value" data-automix-value></span>';
    button.addEventListener('click', () => {
      writeMixEnabled(!state.enabled);
      announce(`AutoMix ${state.enabled ? 'on' : 'off'}.`);
    });
    list.prepend(button);
    syncMixControl();
  }

  function installMixStyles() {
    if ($('garbaAutomixStyles')) return;
    const style = document.createElement('style');
    style.id = 'garbaAutomixStyles';
    style.textContent = `
      .automix-toggle{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 14px;margin:0 0 8px;border:1px solid rgba(246,236,215,.10);border-radius:14px;background:rgba(246,236,215,.045);color:inherit;text-align:left;cursor:pointer}
      .automix-toggle:hover{background:rgba(246,236,215,.075)}
      .automix-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:999px;background:rgba(246,236,215,.07);font:600 22px/1 system-ui,sans-serif}
      .automix-copy{display:grid;gap:2px;min-width:0}.automix-copy strong{font-size:14px}.automix-copy small{opacity:.62;font-size:11px;white-space:normal}
      .automix-value{font-size:12px;opacity:.68}.automix-toggle.active .automix-mark{background:color-mix(in srgb,var(--accent) 24%,rgba(246,236,215,.08))}.automix-toggle.active .automix-value{opacity:1}
      html[data-automix-active=true] .automix-toggle .automix-mark{animation:garbaMixPulse 1.1s ease-in-out infinite alternate}@keyframes garbaMixPulse{to{transform:scale(1.08);filter:brightness(1.2)}}
      @media(prefers-reduced-motion:reduce){html[data-automix-active=true] .automix-toggle .automix-mark{animation:none}}
    `;
    document.head.append(style);
  }

  primaryAudio.addEventListener('timeupdate', maybeStartAutoMix);
  primaryAudio.addEventListener('loadedmetadata', maybePreloadNext);
  primaryAudio.addEventListener('seeking', () => { if (state.running) cancelAutoMix(); });
  primaryAudio.addEventListener('pause', () => {
    if (state.running && !state.handoffRequested) cancelAutoMix();
  });

  document.addEventListener('pointerdown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || !state.running) return;
    if (target.closest('.song-copy, #prevButton, #nextButton, #miniPrev, #miniNext, #progress')) cancelAutoMix();
  }, { capture: true });
  document.addEventListener('input', (event) => {
    if (state.running && event.target === $('progress')) cancelAutoMix();
  }, { capture: true });

  const title = $('songTitle');
  if (title) new MutationObserver(() => {
    if (!state.running) {
      state.preloadedSongId = null;
      resetSecondary();
      void loadSongs().then(maybePreloadNext);
    }
  }).observe(title, { childList: true, characterData: true, subtree: true });

  installMixStyles();
  const sheet = $('songSheet');
  const songList = $('songList');
  if (sheet && songList) {
    new MutationObserver(ensureMixControl).observe(sheet, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(ensureMixControl).observe(songList, { childList: true });
  }

  window.addEventListener('garba:catalogue-ready', () => loadSongs({ refresh: true }));
  loadSongs();

  window.GARBA_AUTOMIX = {
    get enabled() { return state.enabled; },
    set enabled(value) { writeMixEnabled(Boolean(value)); },
    get active() { return state.running; },
    get nextSongId() { return state.nextSongId; },
    cancel: cancelAutoMix,
    refreshCatalogue: () => loadSongs({ refresh: true }),
  };
})();
