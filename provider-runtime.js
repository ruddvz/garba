(() => {
  const $ = (id) => document.getElementById(id);
  const upstreamFetch = window.fetch.bind(window);
  const fastBoot = window.GARBA_FAST_BOOT;
  let safeSongs = [];
  let refreshPromise = null;
  let youtubeUnlocked = false;
  let youtubeApi = null;
  let pendingYoutubeSong = null;
  let stageObserver = null;
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
    if (song.playbackSearchOnly) return false;
    if (song.playbackSourceType === 'verified-release-track-reference') return false;
    if (song.playbackSourceType === 'verified-unchaptered-youtube-release') return false;
    return Boolean(youtubeVideoId(song));
  }

  function applyYoutubeOnlyPolicy(song) {
    const safe = { ...song };
    const originalProvider = String(song?.playbackProvider || '').trim();
    const originalUrl = String(song?.playbackSourceUrl || '').trim();
    const originalAudio = String(song?.audioUrl || '').trim();

    // PlayGarba playback is YouTube-only. Direct audio and commercial-provider
    // URLs may remain as catalogue evidence, but they are never executable routes.
    delete safe.audioUrl;

    if (isExactYoutube(song)) {
      safe.playbackProvider = 'youtube';
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
    safe.playbackSearchOnly = true;
    if (song?.playbackSourceType !== 'verified-unchaptered-youtube-release') {
      safe.playbackSourceType = 'youtube-migration-pending';
    }
    return safe;
  }

  function sanitiseSongs(songs) {
    return Array.isArray(songs) ? songs.map(applyYoutubeOnlyPolicy) : [];
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
    const response = await upstreamFetch(input, init);
    if (!requestPath(input).endsWith('/data/songs.json') || !response?.ok) return response;
    try {
      const songs = await response.clone().json();
      safeSongs = sanitiseSongs(songs);
      return jsonResponse(safeSongs, response);
    } catch {
      return response;
    }
  };

  function seedFastBoot() {
    if (!Array.isArray(fastBoot?.songs)) return;
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
        syncYoutubeButton();
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

  function selectedYoutubeSong() {
    const nonstopActive = $('app')?.dataset.playMode === 'nonstop';
    return nonstopActive && pendingYoutubeSong ? pendingYoutubeSong : currentSong();
  }

  function announce(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function injectYoutubeControl() {
    if ($('youtubeVideoButton')) return;
    const button = document.createElement('button');
    button.id = 'youtubeVideoButton';
    button.className = 'youtube-video-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Open YouTube player');
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Open YouTube player';
    button.innerHTML = `
      <svg viewBox="0 0 28 20" aria-hidden="true" focusable="false">
        <path class="youtube-mark" d="M27.4 3.1A3.5 3.5 0 0 0 25 0.6C22.9 0 18.7 0 14 0S5.1 0 3 0.6A3.5 3.5 0 0 0 .6 3.1C0 5.2 0 7.6 0 10s0 4.8.6 6.9A3.5 3.5 0 0 0 3 19.4c2.1.6 6.3.6 11 .6s8.9 0 11-.6a3.5 3.5 0 0 0 2.4-2.5c.6-2.1.6-4.5.6-6.9s0-4.8-.6-6.9Z"/>
        <path class="youtube-play" d="m11.2 14.3 7.2-4.3-7.2-4.3v8.6Z"/>
      </svg>`;
    document.body.append(button);

    const style = document.createElement('style');
    style.id = 'youtubeOnlyPlaybackStyles';
    style.textContent = `
      #providerStage{display:none!important}
      .youtube-video-button{position:fixed;z-index:38;right:max(16px,calc(env(safe-area-inset-right) + 12px));bottom:max(16px,calc(env(safe-area-inset-bottom) + 12px));width:48px;height:48px;padding:0;display:grid;place-items:center;border:1px solid rgba(246,236,215,.16);border-radius:50%;background:rgba(8,10,18,.76);box-shadow:0 12px 34px rgba(0,0,0,.28);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);cursor:pointer;transition:transform .18s ease,background .18s ease,opacity .18s ease,border-color .18s ease}
      .youtube-video-button svg{width:26px;height:auto;display:block}
      .youtube-video-button .youtube-mark{fill:#ff0033}
      .youtube-video-button .youtube-play{fill:#fff}
      .youtube-video-button:hover{transform:translateY(-1px) scale(1.03);background:rgba(12,14,24,.9)}
      .youtube-video-button:active{transform:scale(.97)}
      .youtube-video-button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
      .youtube-video-button.is-unavailable{opacity:.46}
      .youtube-video-button[aria-pressed="true"]{border-color:rgba(255,255,255,.34);background:rgba(16,18,28,.96)}
      @media(max-width:700px){.youtube-video-button{right:max(12px,calc(env(safe-area-inset-right) + 10px));bottom:max(12px,calc(env(safe-area-inset-bottom) + 10px));width:46px;height:46px}.youtube-video-button svg{width:25px}}
      @media(max-height:560px) and (orientation:landscape){.youtube-video-button{right:max(10px,calc(env(safe-area-inset-right) + 8px));bottom:max(10px,calc(env(safe-area-inset-bottom) + 8px));width:42px;height:42px}}
      @media(prefers-reduced-motion:reduce){.youtube-video-button{transition:none}}
    `;
    document.head.append(style);
    button.addEventListener('click', toggleYoutubeDock);
  }

  function dockIsVisible() {
    return Boolean(document.querySelector('#youtubeStage.open[aria-hidden="false"]'));
  }

  function syncYoutubeButton() {
    injectYoutubeControl();
    const button = $('youtubeVideoButton');
    if (!button) return;
    const song = selectedYoutubeSong();
    const available = isExactYoutube(song);
    const open = dockIsVisible();
    button.classList.toggle('is-unavailable', !available);
    button.setAttribute('aria-pressed', String(open));
    button.setAttribute('aria-label', open ? 'Close YouTube player' : available ? 'Open YouTube player' : 'YouTube source not mapped for this song');
    button.title = open ? 'Close YouTube player' : available ? 'Open YouTube player' : 'YouTube source not mapped yet';
  }

  async function toggleYoutubeDock() {
    const song = selectedYoutubeSong();
    if (!isExactYoutube(song)) {
      announce('YouTube source not mapped yet. This track needs a YouTube conversion.');
      return;
    }

    if (!youtubeApi?.open) {
      announce('YouTube player is still loading. Try again.');
      return;
    }

    if (dockIsVisible()) {
      youtubeUnlocked = false;
      youtubeApi.close?.();
      syncYoutubeButton();
      return;
    }

    youtubeUnlocked = true;
    const opened = await youtubeApi.open(song, { autoplay: true, resume: $('app')?.dataset.playMode !== 'nonstop' });
    if (opened) pendingYoutubeSong = null;
    else {
      youtubeUnlocked = false;
      announce('YouTube playback could not start.');
    }
    syncYoutubeButton();
  }

  function installYoutubeApiGate(api) {
    if (!api || api.__youtubeOnlyPolicy) return api;
    const originalOpen = api.open?.bind(api);
    if (originalOpen) {
      api.open = (song, options = {}) => {
        if (!isExactYoutube(song)) {
          announce('YouTube source not mapped yet.');
          return Promise.resolve(false);
        }
        if (!youtubeUnlocked) {
          pendingYoutubeSong = song;
          syncYoutubeButton();
          announce('Tap the YouTube button to open this track.');
          return Promise.resolve(true);
        }
        return originalOpen(song, options);
      };
    }
    Object.defineProperty(api, '__youtubeOnlyPolicy', { value: true });
    return api;
  }

  try {
    Object.defineProperty(window, 'GARBA_YOUTUBE_PLAYER', {
      configurable: true,
      get() { return youtubeApi; },
      set(api) {
        youtubeApi = installYoutubeApiGate(api);
        syncYoutubeButton();
      },
    });
  } catch {
    // Extremely old WebViews can reject redefining globals. The click gate below
    // still prevents non-YouTube provider playback in those environments.
  }

  function interceptPlay(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('#playButton, #miniPlay')) return;
    const song = selectedYoutubeSong();
    if (!song) return;

    if (!isExactYoutube(song)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      announce('YouTube source not mapped yet. This track needs a YouTube conversion.');
      return;
    }

    if (!dockIsVisible()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      announce('Tap the YouTube button to open this track.');
    }
  }

  function interceptSpace(event) {
    if (event.code !== 'Space') return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button, a[href], input, textarea, select, iframe, [contenteditable]:not([contenteditable="false"])')) return;
    const song = selectedYoutubeSong();
    if (!song) return;
    if (isExactYoutube(song) && dockIsVisible()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    announce(isExactYoutube(song) ? 'Tap the YouTube button to open this track.' : 'YouTube source not mapped yet.');
  }

  function observeYoutubeStage() {
    const stage = $('youtubeStage');
    if (!stage || stage.dataset.youtubeOnlyObserved === 'true') return;
    stage.dataset.youtubeOnlyObserved = 'true';
    stageObserver?.disconnect();
    stageObserver = new MutationObserver(() => {
      if (!dockIsVisible()) youtubeUnlocked = false;
      syncYoutubeButton();
    });
    stageObserver.observe(stage, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
    syncYoutubeButton();
  }

  seedFastBoot();
  injectYoutubeControl();
  syncYoutubeButton();

  document.addEventListener('click', interceptPlay, { capture: true });
  document.addEventListener('keydown', interceptSpace, { capture: true });
  new MutationObserver(() => observeYoutubeStage()).observe(document.body, { childList: true });

  if ($('songTitle')) {
    new MutationObserver(syncYoutubeButton)
      .observe($('songTitle'), { childList: true, characterData: true, subtree: true });
  }
  if ($('songArtist')) {
    new MutationObserver(syncYoutubeButton)
      .observe($('songArtist'), { childList: true, characterData: true, subtree: true });
  }

  window.addEventListener('garba:catalogue-ready', () => queueMicrotask(refreshSafeSongs));
  window.addEventListener('offline', () => { youtubeUnlocked = false; pendingYoutubeSong = null; syncYoutubeButton(); });
  window.addEventListener('pageshow', syncYoutubeButton);

  window.GARBA_YOUTUBE_ONLY_POLICY = {
    isExactYoutube,
    sanitiseSongs,
    refresh: refreshSafeSongs,
    get currentSong() { return selectedYoutubeSong(); },
  };
})();
