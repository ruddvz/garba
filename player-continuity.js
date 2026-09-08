(() => {
  const $ = (id) => document.getElementById(id);
  const songTitle = $('songTitle');
  const playButton = $('playButton');
  const catalogueFetch = window.fetch.bind(window);

  let playAfterSelection = false;
  let continueProviderAfterNavigation = false;
  let safeSongs = [];

  const PROVIDER_NAMES = {
    youtube: 'YouTube',
    spotify: 'Spotify',
    'apple-music': 'Apple Music',
    'amazon-music': 'Amazon Music',
    soundcloud: 'SoundCloud',
    bandcamp: 'Bandcamp',
    qobuz: 'Qobuz',
    external: 'source provider',
  };

  function requestPath(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      return raw ? new URL(raw, location.href).pathname : '';
    } catch {
      return '';
    }
  }

  function canonicalSourceUrl(raw = '') {
    try {
      const url = new URL(raw);
      url.hash = '';
      for (const key of [...url.searchParams.keys()]) {
        if (/^(?:utm_|si$|ref$|source$)/i.test(key)) url.searchParams.delete(key);
      }
      return url.toString();
    } catch {
      return String(raw || '').trim();
    }
  }

  function providerSearchUrl(song) {
    const query = `${song?.title || ''} ${song?.artist || ''}`.trim();
    const encoded = encodeURIComponent(query);
    switch (song?.playbackProvider) {
      case 'spotify': return `https://open.spotify.com/search/${encoded}`;
      case 'apple-music': return `https://music.apple.com/us/search?term=${encoded}`;
      case 'amazon-music': return `https://music.amazon.com/search/${encoded}`;
      case 'youtube': return `https://www.youtube.com/results?search_query=${encoded}`;
      case 'soundcloud': return `https://soundcloud.com/search?q=${encoded}`;
      default: return String(song?.playbackSourceUrl || '').trim();
    }
  }

  function sanitisePlaybackRoutes(songs) {
    if (!Array.isArray(songs)) return [];
    const cloned = songs.map((song) => ({ ...song }));
    const exactByUrl = new Map();

    for (const song of cloned) {
      if (song.playbackSourceType !== 'verified-track-source' || !song.playbackSourceUrl) continue;
      const key = `${song.playbackProvider || ''}|${canonicalSourceUrl(song.playbackSourceUrl)}`;
      const group = exactByUrl.get(key) || [];
      group.push(song);
      exactByUrl.set(key, group);
    }

    const unsafeIds = new Set();
    for (const group of exactByUrl.values()) {
      const signatures = new Set(group.map((song) => `${song.title || ''}\u0000${song.artist || ''}`));
      if (signatures.size > 1) group.forEach((song) => unsafeIds.add(song.id));
    }

    for (const song of cloned) {
      const releaseReference = song.playbackSourceType === 'verified-release-track-reference';
      const duplicateExact = unsafeIds.has(song.id);
      if (!releaseReference && !duplicateExact) continue;

      const referenceUrl = String(song.playbackReferenceUrl || song.playbackSourceUrl || '').trim();
      song.playbackReferenceUrl = referenceUrl;
      song.playbackSourceType = 'verified-release-track-reference';
      song.playbackSearchOnly = true;
      song.playbackSourceUrl = providerSearchUrl(song) || referenceUrl;
      delete song.youtubeStartSeconds;
    }

    return cloned;
  }

  function jsonResponse(data, original) {
    const headers = new Headers(original?.headers || undefined);
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(data), {
      status: Number(original?.status) || 200,
      statusText: original?.statusText || 'OK',
      headers,
    });
  }

  window.fetch = async (input, init) => {
    const response = await catalogueFetch(input, init);
    if (!requestPath(input).endsWith('/data/songs.json')) return response;
    if (!response?.ok) return response;

    try {
      const songs = await response.clone().json();
      safeSongs = sanitisePlaybackRoutes(songs);
      return jsonResponse(safeSongs, response);
    } catch {
      return response;
    }
  };

  function currentSafeSong() {
    const id = new URL(location.href).searchParams.get('song');
    if (id) {
      const byId = safeSongs.find((song) => song.id === id);
      if (byId) return byId;
    }
    const title = String(songTitle?.textContent || '').trim();
    const artist = String($('songArtist')?.textContent || '').trim();
    return safeSongs.find((song) => song.title === title && song.artist === artist) || null;
  }

  function providerName(provider = '') {
    const key = String(provider || '').toLowerCase();
    return PROVIDER_NAMES[key] || key.replace(/(^|-)([a-z])/g, (_, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`) || 'provider';
  }

  function guardReferenceOnlyProvider() {
    const stage = document.querySelector('#providerStage');
    if (!stage) return;
    if (stage.getAttribute('aria-hidden') === 'true' || !stage.classList.contains('open')) {
      delete stage.dataset.routeTruthSong;
      return;
    }

    const song = currentSafeSong();
    if (!song?.playbackSearchOnly || song.playbackSourceType !== 'verified-release-track-reference') return;
    if (stage.dataset.routeTruthSong === song.id) return;

    const name = providerName(song.playbackProvider);
    const searchUrl = providerSearchUrl(song) || song.playbackSourceUrl || song.playbackReferenceUrl;
    const media = stage.querySelector('#providerMedia');
    const note = stage.querySelector('#providerDockNote');
    const open = stage.querySelector('#providerDockOpen');
    const card = document.createElement('div');
    card.className = 'provider-external';

    const heading = document.createElement('strong');
    heading.textContent = 'Exact track source not mapped';
    const copy = document.createElement('span');
    copy.textContent = `The release evidence points to one ${name} track, but GARBA has not verified that it is ${song.title}. The wrong recording will not be autoplayed.`;
    const action = document.createElement('a');
    action.className = 'provider-external-action';
    action.href = searchUrl;
    action.target = '_blank';
    action.rel = 'noopener noreferrer';
    action.textContent = `Search ${name}`;
    card.append(heading, copy, action);

    stage.classList.remove('is-spotify', 'is-apple', 'is-soundcloud', 'is-youtube-release');
    stage.classList.add('is-external');
    media?.replaceChildren(card);
    if (note) note.textContent = 'Release reference only · exact selected song not verified';
    if (open) {
      open.href = searchUrl;
      open.textContent = `Search ${name}`;
      open.setAttribute('aria-label', `Search for ${song.title} on ${name}`);
    }
    stage.dataset.routeTruthSong = song.id || 'reference';
  }

  function providerIsOpen() {
    return Boolean(document.querySelector('#providerStage.open[aria-hidden="false"]'));
  }

  function rememberPlaybackIntent(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('.song-copy')) {
      playAfterSelection = true;
      continueProviderAfterNavigation = false;
      return;
    }

    if (providerIsOpen() && target.closest('#prevButton, #nextButton, #miniPrev, #miniNext')) {
      continueProviderAfterNavigation = true;
      playAfterSelection = false;
    }
  }

  function resumeSelectedProviderIfNeeded() {
    const shouldStartSelectedSong = playAfterSelection;
    const shouldContinueProvider = continueProviderAfterNavigation;
    playAfterSelection = false;
    continueProviderAfterNavigation = false;

    if (!shouldStartSelectedSong && !shouldContinueProvider) return;

    queueMicrotask(() => {
      if (!playButton?.isConnected) return;
      playButton.click();
    });
  }

  const primaryAudio = $('audio');
  const MIX_ENABLED_KEY = 'garba:automix-enabled';
  const MIX_DEFAULT_SECONDS = 7.5;
  const MIX_MIN_SECONDS = 4;
  const MIX_MAX_SECONDS = 10;
  const MIX_TEMPO_LIMIT = 0.06;
  const mixState = {
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
  };

  function readMixEnabled() {
    try {
      const stored = localStorage.getItem(MIX_ENABLED_KEY);
      return stored == null ? true : stored !== 'false';
    } catch {
      return true;
    }
  }

  function writeMixEnabled(enabled) {
    mixState.enabled = Boolean(enabled);
    try { localStorage.setItem(MIX_ENABLED_KEY, String(mixState.enabled)); } catch { /* storage denied */ }
    syncMixControl();
    if (!mixState.enabled) cancelAutoMix();
  }

  function announce(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function nextDirectSong(song) {
    if (!song?.genre || !safeSongs.length) return null;
    const list = safeSongs.filter((entry) => entry.genre === song.genre);
    const index = list.findIndex((entry) => entry.id === song.id);
    if (index < 0 || list.length < 2) return null;
    const next = list[(index + 1) % list.length];
    return next?.audioUrl ? next : null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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
    if (mixState.secondary?.isConnected) return mixState.secondary;
    const deck = document.createElement('audio');
    deck.id = 'automixAudio';
    deck.preload = 'auto';
    deck.setAttribute('aria-hidden', 'true');
    deck.setAttribute('tabindex', '-1');
    deck.style.display = 'none';
    deck.volume = 0;
    document.body.append(deck);
    mixState.secondary = deck;
    return deck;
  }

  function equalPower(progress) {
    const t = clamp(progress, 0, 1);
    return {
      outgoing: Math.cos(t * Math.PI * 0.5),
      incoming: Math.sin(t * Math.PI * 0.5),
    };
  }

  function resetSecondary() {
    const secondary = mixState.secondary;
    if (!secondary) return;
    secondary.pause();
    secondary.volume = 0;
    secondary.playbackRate = 1;
    try { secondary.removeAttribute('src'); secondary.load(); } catch { /* ignore media reset failures */ }
  }

  function cancelAutoMix() {
    mixState.token += 1;
    mixState.running = false;
    mixState.nextSongId = null;
    mixState.handoffRequested = false;
    cancelAnimationFrame(mixState.frame);
    clearTimeout(mixState.handoffTimer);
    if (primaryAudio) primaryAudio.volume = 1;
    resetSecondary();
    document.documentElement.removeAttribute('data-automix-active');
  }

  function waitForPrimaryHandoff(nextSong, secondary, token) {
    const attempt = async () => {
      if (token !== mixState.token || !mixState.running) return;
      const primarySrc = primaryAudio?.currentSrc || primaryAudio?.src || '';
      const expected = new URL(nextSong.audioUrl, location.href).href;
      if (!primarySrc || primarySrc !== expected || primaryAudio.readyState < 1) return false;

      const targetTime = secondary.currentTime;
      primaryAudio.volume = 1;
      primaryAudio.playbackRate = 1;
      try {
        if (Number.isFinite(primaryAudio.duration)) {
          primaryAudio.currentTime = Math.min(targetTime, Math.max(0, primaryAudio.duration - 0.05));
        } else {
          primaryAudio.currentTime = targetTime;
        }
      } catch { /* live/stream-like sources may reject precise seeks */ }

      try { await primaryAudio.play(); } catch { return false; }

      const fadeStart = performance.now();
      const fadeOut = (now) => {
        if (token !== mixState.token) return;
        const t = clamp((now - fadeStart) / 160, 0, 1);
        secondary.volume = 1 - t;
        if (t < 1) requestAnimationFrame(fadeOut);
        else {
          resetSecondary();
          mixState.running = false;
          mixState.nextSongId = null;
          mixState.handoffRequested = false;
          document.documentElement.removeAttribute('data-automix-active');
        }
      };
      requestAnimationFrame(fadeOut);
      return true;
    };

    const poll = async () => {
      if (token !== mixState.token || !mixState.running) return;
      if (await attempt()) return;
      mixState.handoffTimer = setTimeout(poll, 35);
    };
    poll();
  }

  async function requestCoreNavigation(nextSong, secondary, token) {
    if (mixState.handoffRequested || token !== mixState.token) return;
    mixState.handoffRequested = true;
    const nextButton = $('nextButton');
    if (!nextButton) {
      cancelAutoMix();
      return;
    }

    nextButton.click();
    waitForPrimaryHandoff(nextSong, secondary, token);
  }

  async function beginAutoMix(current, next) {
    if (!mixState.enabled || mixState.running || !primaryAudio || !current?.audioUrl || !next?.audioUrl) return;
    const secondary = ensureSecondary();
    const token = ++mixState.token;
    const seconds = mixDurationSeconds(current, next);
    const ratio = tempoRatio(current, next);
    const mixIn = Math.max(0, Number(next.mixInSeconds || next.introSilenceSeconds || 0));

    mixState.running = true;
    mixState.nextSongId = next.id;
    mixState.startedAt = performance.now();
    mixState.durationMs = seconds * 1000;
    mixState.handoffRequested = false;
    document.documentElement.setAttribute('data-automix-active', 'true');

    secondary.pause();
    secondary.volume = 0;
    secondary.playbackRate = ratio;
    if ('preservesPitch' in secondary) secondary.preservesPitch = true;
    if ('webkitPreservesPitch' in secondary) secondary.webkitPreservesPitch = true;
    secondary.src = next.audioUrl;
    secondary.load();

    const startIncoming = () => {
      try {
        if (mixIn > 0) secondary.currentTime = mixIn;
      } catch { /* metadata may not be available yet */ }
      return secondary.play();
    };

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
      await startIncoming();
    } catch {
      cancelAutoMix();
      return;
    }

    const tick = (now) => {
      if (token !== mixState.token || !mixState.running) return;
      const progress = clamp((now - mixState.startedAt) / mixState.durationMs, 0, 1);
      const gains = equalPower(progress);
      primaryAudio.volume = gains.outgoing;
      secondary.volume = gains.incoming;
      secondary.playbackRate = ratio + ((1 - ratio) * progress);

      if (progress < 1) {
        mixState.frame = requestAnimationFrame(tick);
      } else {
        primaryAudio.volume = 0;
        secondary.volume = 1;
        secondary.playbackRate = 1;
        requestCoreNavigation(next, secondary, token);
      }
    };
    mixState.frame = requestAnimationFrame(tick);
  }

  function maybeStartAutoMix() {
    if (!mixState.enabled || mixState.running || !primaryAudio || primaryAudio.paused || primaryAudio.seeking) return;
    const current = currentSafeSong();
    if (!current?.audioUrl || !primaryAudio.currentSrc) return;
    const next = nextDirectSong(current);
    if (!next) return;
    const seconds = mixDurationSeconds(current, next);
    const trigger = transitionTriggerTime(primaryAudio, current, seconds);
    if (primaryAudio.currentTime >= trigger && primaryAudio.currentTime < (Number(primaryAudio.duration) || Infinity) - 0.08) {
      beginAutoMix(current, next);
    }
  }

  function syncMixControl() {
    const control = document.querySelector('[data-garba-automix-toggle]');
    if (!control) return;
    control.setAttribute('aria-pressed', String(mixState.enabled));
    control.classList.toggle('active', mixState.enabled);
    const value = control.querySelector('[data-automix-value]');
    if (value) value.textContent = mixState.enabled ? 'On' : 'Off';
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
    button.setAttribute('aria-pressed', String(mixState.enabled));
    button.innerHTML = '<span class="automix-mark" aria-hidden="true">∿</span><span class="automix-copy"><strong>AutoMix</strong><small>Blend direct Garba tracks into the next song</small></span><span class="automix-value" data-automix-value></span>';
    button.addEventListener('click', () => {
      writeMixEnabled(!mixState.enabled);
      announce(`AutoMix ${mixState.enabled ? 'on' : 'off'}.`);
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

  if (primaryAudio) {
    primaryAudio.addEventListener('timeupdate', maybeStartAutoMix);
    primaryAudio.addEventListener('seeking', () => { if (mixState.running) cancelAutoMix(); });
    primaryAudio.addEventListener('pause', () => {
      if (mixState.running && !mixState.handoffRequested) cancelAutoMix();
    });
  }

  document.addEventListener('pointerdown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || !mixState.running) return;
    if (target.closest('.song-copy, #prevButton, #nextButton, #miniPrev, #miniNext, #progress')) cancelAutoMix();
  }, { capture: true });

  document.addEventListener('input', (event) => {
    if (mixState.running && event.target === $('progress')) cancelAutoMix();
  }, { capture: true });

  document.addEventListener('click', rememberPlaybackIntent, { capture: true });

  if (songTitle) {
    new MutationObserver(resumeSelectedProviderIfNeeded)
      .observe(songTitle, { childList: true, characterData: true, subtree: true });
  }

  new MutationObserver(guardReferenceOnlyProvider)
    .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-hidden'] });

  installMixStyles();
  const sheet = $('songSheet');
  const songList = $('songList');
  if (sheet && songList) {
    new MutationObserver(ensureMixControl).observe(sheet, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(ensureMixControl).observe(songList, { childList: true });
  }

  window.GARBA_AUTOMIX = {
    get enabled() { return mixState.enabled; },
    set enabled(value) { writeMixEnabled(Boolean(value)); },
    get active() { return mixState.running; },
    cancel: cancelAutoMix,
  };
})();