(() => {
  const $ = (id) => document.getElementById(id);
  const upstreamFetch = window.fetch.bind(window);
  const fastBoot = window.GARBA_FAST_BOOT;
  const DIRECT_MANIFEST_PATH = 'data/direct-audio.json';
  const DIRECT_RESOLVER_PATH = 'src/playback/direct-source-resolver.js';
  let safeSongs = [];
  let refreshPromise = null;
  let directManifestPromise = null;
  let directResolverPromise = null;
  let youtubeApi = null;
  let toastTimer = null;

  function requestPath(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      return raw ? new URL(raw, location.href).pathname : '';
    } catch {
      return '';
    }
  }

  function youtubeVideoId(song) {
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
      // Invalid/non-YouTube URLs are migration references only.
    }
    return '';
  }

  function isExactYoutube(song) {
    if (!song) return false;
    if (song.audioUrl) return false;
    if (song.playbackSearchOnly) return false;
    if (song.playbackSourceType === 'verified-release-track-reference') return false;
    if (song.playbackSourceType === 'verified-unchaptered-youtube-release') return false;
    return Boolean(youtubeVideoId(song));
  }

  function isAuthorisedDirect(song) {
    const rights = song?.directAudioRights;
    let audioIsHttps = false;
    let proofIsHttps = false;
    try { audioIsHttps = new URL(String(song?.audioUrl || '')).protocol === 'https:'; } catch { audioIsHttps = false; }
    try { proofIsHttps = new URL(String(rights?.proofUrl || '')).protocol === 'https:'; } catch { proofIsHttps = false; }
    return Boolean(
      song?.playbackRouteKind === 'direct'
      && String(song?.playbackProvider || '').toLowerCase() === 'direct'
      && song?.playbackSourceType === 'licensed-direct'
      && song?.playbackReady === true
      && audioIsHttps
      && proofIsHttps
      && rights?.redistributionAuthorized === true
      && String(rights?.rightsHolder || '').trim()
      && String(rights?.licenseName || '').trim()
    );
  }

  function isPlayableSong(song) {
    return isAuthorisedDirect(song) || isExactYoutube(song);
  }

  function applyYoutubeOnlyPolicy(song) {
    const safe = { ...song };
    const originalProvider = String(song?.playbackProvider || '').trim();
    const originalUrl = String(song?.playbackSourceUrl || '').trim();
    const originalAudio = String(song?.audioUrl || '').trim();

    // Direct media must come only from the separately rights-gated manifest. Any
    // catalogue audioUrl remains evidence and is never executable by itself.
    delete safe.audioUrl;
    delete safe.audioMimeType;
    delete safe.directAudioRights;
    delete safe.playbackRouteKind;

    if (isExactYoutube({ ...song, audioUrl: null })) {
      safe.playbackProvider = 'youtube';
      safe.playbackReady = true;
      if (!safe.playbackSourceUrl || !/youtu(?:\.be|be\.com)/i.test(safe.playbackSourceUrl)) {
        safe.playbackSourceUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId(song))}`;
      }
      return safe;
    }

    const referenceUrl = String(song?.playbackReferenceUrl || originalUrl || originalAudio || '').trim();
    if (referenceUrl) safe.playbackReferenceUrl = referenceUrl;
    if (originalProvider && originalProvider !== 'youtube') safe.migrationSourceProvider = originalProvider;
    safe.playbackProvider = 'youtube';
    safe.playbackSourceUrl = '';
    safe.playbackReady = false;
    safe.playbackSearchOnly = true;
    if (song?.playbackSourceType !== 'verified-unchaptered-youtube-release') {
      safe.playbackSourceType = 'youtube-migration-pending';
    }
    return safe;
  }

  function blockedDirectPolicy(song, directEntry, reason = 'direct-entry-invalid') {
    const safe = { ...song };
    const originalUrl = String(song?.playbackSourceUrl || '').trim();
    delete safe.audioUrl;
    delete safe.audioMimeType;
    if (originalUrl) safe.playbackReferenceUrl = originalUrl;
    safe.playbackProvider = 'direct';
    safe.playbackSourceUrl = '';
    safe.playbackSourceType = 'direct-policy-blocked';
    safe.playbackReady = false;
    safe.playbackRouteKind = 'direct-invalid';
    safe.directAudioFailure = reason;
    safe.directAudioRights = directEntry?.rights && typeof directEntry.rights === 'object'
      ? { ...directEntry.rights }
      : null;
    return safe;
  }

  function applyDirectResolution(song, directEntry, resolution) {
    return {
      ...song,
      audioUrl: resolution.media.url,
      audioMimeType: resolution.media.mimeType,
      playbackProvider: 'direct',
      playbackSourceUrl: resolution.media.url,
      playbackSourceType: 'licensed-direct',
      playbackReady: true,
      playbackSearchOnly: false,
      playbackRouteKind: 'direct',
      directAudioRights: { ...directEntry.rights },
    };
  }

  function sanitiseSongs(songs) {
    return Array.isArray(songs) ? songs.map(applyYoutubeOnlyPolicy) : [];
  }

  function loadDirectManifest() {
    if (directManifestPromise) return directManifestPromise;
    directManifestPromise = upstreamFetch(DIRECT_MANIFEST_PATH, { cache: 'no-store' })
      .then(async (response) => {
        if (!response?.ok) return { version: null, tracks: {} };
        const manifest = await response.json();
        const tracks = manifest?.tracks;
        if (!manifest || typeof manifest !== 'object' || !tracks || typeof tracks !== 'object' || Array.isArray(tracks)) {
          return { version: null, tracks: {} };
        }
        return manifest;
      })
      .catch(() => ({ version: null, tracks: {} }));
    return directManifestPromise;
  }

  function loadDirectResolver() {
    const current = window.GARBA_DIRECT_SOURCE_RESOLVER;
    if (current?.resolvePlaybackSource) return Promise.resolve(current);
    if (directResolverPromise) return directResolverPromise;

    directResolverPromise = new Promise((resolve) => {
      const finish = () => resolve(window.GARBA_DIRECT_SOURCE_RESOLVER?.resolvePlaybackSource
        ? window.GARBA_DIRECT_SOURCE_RESOLVER
        : null);
      const existing = document.querySelector('script[data-garba-direct-source-resolver]');
      if (existing) {
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', () => resolve(null), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = DIRECT_RESOLVER_PATH;
      script.async = false;
      script.dataset.garbaDirectSourceResolver = 'true';
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => resolve(null), { once: true });
      document.head.append(script);
    });
    return directResolverPromise;
  }

  async function sanitiseSongsDirectFirst(songs) {
    if (!Array.isArray(songs)) return [];
    const manifest = await loadDirectManifest();
    const tracks = manifest?.tracks || {};
    const directIds = Object.keys(tracks);
    if (directIds.length === 0) return sanitiseSongs(songs);

    const resolver = await loadDirectResolver();
    return songs.map((song) => {
      const songId = String(song?.id || '').trim();
      if (!songId || !Object.prototype.hasOwnProperty.call(tracks, songId)) return applyYoutubeOnlyPolicy(song);
      const directEntry = tracks[songId];
      if (!resolver?.resolvePlaybackSource) return blockedDirectPolicy(song, directEntry, 'direct-resolver-unavailable');

      let resolution;
      try {
        resolution = resolver.resolvePlaybackSource({ song, directEntry, directSongId: songId });
      } catch {
        return blockedDirectPolicy(song, directEntry, 'direct-resolution-failed');
      }
      if (resolution?.kind === 'direct' && resolution.playable === true && resolution.provider === 'direct') {
        return applyDirectResolution(song, directEntry, resolution);
      }
      return blockedDirectPolicy(song, directEntry, resolution?.reason || 'direct-entry-invalid');
    });
  }

  function jsonResponse(data, original) {
    const headers = new Headers(original?.headers || undefined);
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', 'no-store');
    return new Response(JSON.stringify(data), {
      status: Number(original?.status) || 200,
      statusText: original?.statusText || 'OK',
      headers,
    });
  }

  window.fetch = async (input, init) => {
    const response = await upstreamFetch(input, init);
    if (!requestPath(input).endsWith('/data/songs.json') || !response?.ok) return response;
    try {
      const songs = await response.clone().json();
      safeSongs = await sanitiseSongsDirectFirst(songs);
      return jsonResponse(safeSongs, response);
    } catch {
      return response;
    }
  };

  function seedFastBoot() {
    if (!Array.isArray(fastBoot?.songs)) return;
    // Fast boot has no rights manifest yet. Keep it YouTube-safe until the first
    // canonical songs fetch resolves the rights-gated direct-source plan.
    const sanitised = sanitiseSongs(fastBoot.songs);
    fastBoot.songs.splice(0, fastBoot.songs.length, ...sanitised);
    safeSongs = sanitised;
  }

  async function refreshSafeSongs() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = window.fetch('data/songs.json', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : safeSongs)
      .then((songs) => {
        safeSongs = Array.isArray(songs) ? songs : safeSongs;
        return safeSongs;
      })
      .catch(() => safeSongs)
      .finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  function currentSong() {
    const id = new URL(location.href).searchParams.get('song');
    if (id) {
      const byId = safeSongs.find((song) => song.id === id);
      if (byId) return byId;
    }
    const title = String($('songTitle')?.textContent || '').trim();
    const artist = String($('songArtist')?.textContent || '').trim();
    return safeSongs.find((song) => song.title === title && song.artist === artist) || null;
  }

  function announce(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function observeYoutubeStage() {
    const stage = $('youtubeStage');
    if (!stage || stage.dataset.youtubeOnlyObserved === 'true') return;
    stage.dataset.youtubeOnlyObserved = 'true';

    // The embedded YouTube surface is persistent. Ordinary page clicks never act as
    // dismissal. Playback is controlled by the main transport; Stop remains explicit.
    const stop = $('youtubeDockStop');
    if (stop) {
      stop.textContent = 'Stop';
      stop.setAttribute('aria-label', 'Stop YouTube playback');
      stop.title = 'Stop YouTube playback';
    }
    const open = $('youtubeDockOpen');
    if (open) open.textContent = 'YouTube';
  }

  try {
    Object.defineProperty(window, 'GARBA_YOUTUBE_PLAYER', {
      configurable: true,
      get() { return youtubeApi; },
      set(api) { youtubeApi = api; },
    });
  } catch {
    // Extremely old WebViews can reject redefining globals. The player runtime can
    // still own the main Play button directly in those environments.
  }

  function unavailableMessage(song, compact = false) {
    if (song?.playbackRouteKind === 'direct-invalid') {
      return compact
        ? 'Authorised direct source unavailable.'
        : 'Authorised direct source unavailable. Playback will not switch to a different recording.';
    }
    return compact
      ? 'YouTube source not mapped yet.'
      : 'YouTube source not mapped yet. This track still needs a verified YouTube route.';
  }

  function interceptUnavailablePlay(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('#playButton, #miniPlay')) return;
    const song = currentSong();
    if (!song || isPlayableSong(song)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    announce(unavailableMessage(song));
  }

  function interceptUnavailableSpace(event) {
    if (event.code !== 'Space') return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button, a[href], input, textarea, select, iframe, [contenteditable]:not([contenteditable="false"])')) return;
    const song = currentSong();
    if (!song || isPlayableSong(song)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    announce(unavailableMessage(song, true));
  }

  function loadAtmosphereRuntime() {
    if (window.GARBA_ATMOSPHERE || document.getElementById('garbaAtmosphereRuntime')) return;
    const script = document.createElement('script');
    script.id = 'garbaAtmosphereRuntime';
    script.src = 'assets/runtime/immersive-atmosphere.js';
    script.async = false;
    script.addEventListener('error', () => console.warn('Garba Atmosphere runtime could not load.'));
    document.head.append(script);
  }

  function loadLocalBackgroundRuntime() {
    if (window.GARBA_LOCAL_BACKGROUND || document.getElementById('garbaLocalBackgroundRuntime')) return;
    const script = document.createElement('script');
    script.id = 'garbaLocalBackgroundRuntime';
    script.src = 'assets/runtime/local-background.js';
    script.async = false;
    script.addEventListener('error', () => console.warn('Local background runtime could not load.'));
    document.head.append(script);
  }

  seedFastBoot();
  loadAtmosphereRuntime();
  loadLocalBackgroundRuntime();

  // Exact mapped YouTube songs fall through to youtube-player-runtime.js. Authorised
  // direct songs retain audioUrl and are handled by the existing HTML audio path.
  document.addEventListener('click', interceptUnavailablePlay, { capture: true });
  document.addEventListener('keydown', interceptUnavailableSpace, { capture: true });
  new MutationObserver(() => observeYoutubeStage()).observe(document.body, { childList: true });

  window.addEventListener('garba:catalogue-ready', () => queueMicrotask(refreshSafeSongs));

  const playbackPolicy = {
    isExactYoutube,
    isAuthorisedDirect,
    isPlayableSong,
    sanitiseSongs,
    sanitiseSongsDirectFirst,
    refresh: refreshSafeSongs,
    get currentSong() { return currentSong(); },
    directManifestPath: DIRECT_MANIFEST_PATH,
  };
  window.GARBA_PLAYBACK_POLICY = playbackPolicy;
  // Backwards-compatible name for existing diagnostics while the direct-first rollout lands.
  window.GARBA_YOUTUBE_ONLY_POLICY = playbackPolicy;
})();