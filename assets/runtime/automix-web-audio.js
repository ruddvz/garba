(() => {
  const primary = document.getElementById('audio');
  const automix = () => window.GARBA_AUTOMIX;
  if (!primary) return;

  function mediaElementVolumeWorks() {
    const probe = document.createElement('audio');
    try {
      probe.volume = 0.37;
      return Math.abs(probe.volume - 0.37) < 0.01;
    } catch {
      return false;
    }
  }

  const nativeVolumeAvailable = mediaElementVolumeWorks();
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (nativeVolumeAvailable) {
    window.GARBA_AUTOMIX_AUDIO = { mode: 'media-element-volume', active: false };
    return;
  }

  const state = {
    context: null,
    primarySource: null,
    primaryGain: null,
    secondary: null,
    secondarySource: null,
    secondaryGain: null,
    songs: [],
    cataloguePromise: null,
    transitionStartedAt: 0,
    transitionDuration: 0,
    handoffStarted: false,
    handoffFrame: 0,
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function cancelUnsafeMix() {
    automix()?.cancel?.();
  }

  async function loadSongs({ refresh = false } = {}) {
    if (state.cataloguePromise && !refresh) return state.cataloguePromise;
    state.cataloguePromise = fetch('data/songs.json', { cache: refresh ? 'no-store' : 'force-cache' })
      .then((response) => response.ok ? response.json() : [])
      .then((songs) => {
        state.songs = Array.isArray(songs) ? songs : [];
        return state.songs;
      })
      .catch(() => state.songs);
    return state.cataloguePromise;
  }

  function currentSong() {
    const id = new URL(location.href).searchParams.get('song');
    if (id) {
      const found = state.songs.find((song) => song.id === id);
      if (found) return found;
    }
    const title = String(document.getElementById('songTitle')?.textContent || '').trim();
    const artist = String(document.getElementById('songArtist')?.textContent || '').trim();
    return state.songs.find((song) => song.title === title && song.artist === artist) || null;
  }

  function nextDirectSong(song) {
    if (!song?.genre) return null;
    const list = state.songs.filter((entry) => entry.genre === song.genre);
    const index = list.findIndex((entry) => entry.id === song.id);
    if (index < 0 || list.length < 2) return null;
    const next = list[(index + 1) % list.length];
    return next?.audioUrl ? next : null;
  }

  function mixDurationSeconds(current, next) {
    const explicit = Number(next?.transitionSeconds || current?.transitionSeconds || 0);
    if (Number.isFinite(explicit) && explicit > 0) return clamp(explicit, 4, 10);
    const bpm = Number(current?.bpm || next?.bpm || 0);
    if (Number.isFinite(bpm) && bpm >= 70 && bpm <= 220) return clamp((16 * 60) / bpm, 4, 10);
    if (navigator.connection?.saveData) return 4;
    return 7.5;
  }

  function makeCurve(type, samples = 96) {
    const curve = new Float32Array(samples);
    for (let index = 0; index < samples; index += 1) {
      const progress = index / (samples - 1);
      curve[index] = type === 'out'
        ? Math.cos(progress * Math.PI * 0.5)
        : Math.sin(progress * Math.PI * 0.5);
    }
    return curve;
  }

  const outgoingCurve = makeCurve('out');
  const incomingCurve = makeCurve('in');

  function resetParam(param, value) {
    if (!state.context || !param) return;
    const now = state.context.currentTime;
    try {
      param.cancelScheduledValues(now);
      param.setValueAtTime(value, now);
    } catch {
      param.value = value;
    }
  }

  async function ensureContext() {
    if (!AudioContextCtor) return false;
    if (!state.context) {
      try {
        state.context = new AudioContextCtor({ latencyHint: 'playback' });
      } catch {
        try { state.context = new AudioContextCtor(); }
        catch { return false; }
      }
    }
    try {
      if (state.context.state !== 'running') await state.context.resume();
    } catch {
      return false;
    }
    return state.context.state === 'running';
  }

  function wirePrimary() {
    if (!state.context) return false;
    if (state.primarySource && state.primaryGain) return true;
    try {
      state.primarySource = state.context.createMediaElementSource(primary);
      state.primaryGain = state.context.createGain();
      state.primaryGain.gain.value = 1;
      state.primarySource.connect(state.primaryGain).connect(state.context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function prepareSecondaryElement() {
    const secondary = document.getElementById('automixAudio');
    if (!secondary) return null;
    if (secondary.crossOrigin !== 'anonymous') {
      const source = secondary.getAttribute('src');
      secondary.crossOrigin = 'anonymous';
      if (source) {
        secondary.setAttribute('src', source);
        secondary.load();
      }
    }
    state.secondary = secondary;
    return secondary;
  }

  function wireSecondary() {
    if (!state.context) return false;
    const secondary = prepareSecondaryElement();
    if (!secondary) return false;
    if (state.secondarySource && state.secondaryGain) return true;
    try {
      state.secondarySource = state.context.createMediaElementSource(secondary);
      state.secondaryGain = state.context.createGain();
      state.secondaryGain.gain.value = 0;
      state.secondarySource.connect(state.secondaryGain).connect(state.context.destination);
      return true;
    } catch {
      return false;
    }
  }

  async function unlockAudioGraph() {
    if (!await ensureContext()) return false;
    return wirePrimary();
  }

  function scheduleTransition(duration) {
    if (!state.context || !state.primaryGain || !state.secondaryGain) return false;
    const now = state.context.currentTime;
    const primaryGain = state.primaryGain.gain;
    const secondaryGain = state.secondaryGain.gain;
    try {
      primaryGain.cancelScheduledValues(now);
      secondaryGain.cancelScheduledValues(now);
      primaryGain.setValueAtTime(1, now);
      secondaryGain.setValueAtTime(0, now);
      primaryGain.setValueCurveAtTime(outgoingCurve, now, duration);
      secondaryGain.setValueCurveAtTime(incomingCurve, now, duration);
    } catch {
      return false;
    }
    state.transitionStartedAt = now;
    state.transitionDuration = duration;
    state.handoffStarted = false;
    window.GARBA_AUTOMIX_AUDIO = { mode: 'web-audio-gain', active: true };
    return true;
  }

  async function startFallbackMix() {
    const active = document.documentElement.dataset.automixActive === 'true';
    if (!active) return;
    if (!await unlockAudioGraph()) {
      cancelUnsafeMix();
      return;
    }
    if (!wireSecondary()) {
      cancelUnsafeMix();
      return;
    }

    await loadSongs();
    const current = currentSong();
    const next = nextDirectSong(current);
    if (!current?.audioUrl || !next?.audioUrl) {
      cancelUnsafeMix();
      return;
    }

    primary.volume = 1;
    state.secondary.volume = 1;
    if (!scheduleTransition(mixDurationSeconds(current, next))) cancelUnsafeMix();
  }

  function beginHandoffWhenAligned() {
    if (state.handoffStarted || !state.context || !state.secondary || !state.primaryGain || !state.secondaryGain) return;
    state.handoffStarted = true;

    const poll = () => {
      if (document.documentElement.dataset.automixActive !== 'true') return;
      const secondaryTime = Number(state.secondary.currentTime || 0);
      const primaryTime = Number(primary.currentTime || 0);
      const aligned = !primary.paused && secondaryTime > 0 && Math.abs(primaryTime - secondaryTime) < 0.65;
      if (!aligned) {
        state.handoffFrame = requestAnimationFrame(poll);
        return;
      }

      const now = state.context.currentTime;
      const end = now + 0.16;
      const primaryGain = state.primaryGain.gain;
      const secondaryGain = state.secondaryGain.gain;
      try {
        primaryGain.cancelScheduledValues(now);
        secondaryGain.cancelScheduledValues(now);
        primaryGain.setValueAtTime(0, now);
        secondaryGain.setValueAtTime(1, now);
        primaryGain.linearRampToValueAtTime(1, end);
        secondaryGain.linearRampToValueAtTime(0, end);
      } catch {
        primaryGain.value = 1;
        secondaryGain.value = 0;
      }
    };
    poll();
  }

  function finishFallbackMix() {
    cancelAnimationFrame(state.handoffFrame);
    state.handoffFrame = 0;
    resetParam(state.primaryGain?.gain, 1);
    resetParam(state.secondaryGain?.gain, 0);
    state.transitionStartedAt = 0;
    state.transitionDuration = 0;
    state.handoffStarted = false;
    window.GARBA_AUTOMIX_AUDIO = { mode: 'web-audio-gain', active: false };
  }

  function handleAutomixAttribute() {
    if (document.documentElement.dataset.automixActive === 'true') startFallbackMix();
    else finishFallbackMix();
  }

  function trustedUnlock(event) {
    if (!event.isTrusted) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target && !target.closest('#playButton, #miniPlay, .song-copy, #prevButton, #nextButton, #miniPrev, #miniNext')) return;
    unlockAudioGraph();
  }

  primary.crossOrigin = 'anonymous';
  document.addEventListener('pointerdown', trustedUnlock, { capture: true });
  document.addEventListener('keydown', (event) => {
    if (!event.isTrusted || event.code !== 'Space') return;
    unlockAudioGraph();
  }, { capture: true });

  new MutationObserver(handleAutomixAttribute)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-automix-active'] });

  const title = document.getElementById('songTitle');
  if (title) new MutationObserver(() => {
    if (document.documentElement.dataset.automixActive === 'true') beginHandoffWhenAligned();
  }).observe(title, { childList: true, characterData: true, subtree: true });

  new MutationObserver(() => {
    if (document.documentElement.dataset.automixActive === 'true' && !state.secondarySource) wireSecondary();
  }).observe(document.body, { childList: true, subtree: true });

  window.addEventListener('garba:catalogue-ready', () => loadSongs({ refresh: true }));
  loadSongs();
  window.GARBA_AUTOMIX_AUDIO = { mode: AudioContextCtor ? 'web-audio-pending' : 'unsupported', active: false };
})();
