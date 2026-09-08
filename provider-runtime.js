(() => {
  const $ = (id) => document.getElementById(id);
  const toast = $('toast');
  const playButton = $('playButton');
  const miniPlay = $('miniPlay');
  const shareButton = $('shareButton');
  const audio = $('audio');
  const app = $('app');
  const genreStrip = $('genreStrip');
  const networkStatus = $('networkStatus');
  const songTitle = $('songTitle');

  const PROVIDER_NAMES = {
    youtube: 'YouTube',
    spotify: 'Spotify',
    'apple-music': 'Apple Music',
    'amazon-music': 'Amazon Music',
    soundcloud: 'SoundCloud',
    bandcamp: 'Bandcamp',
    qobuz: 'Qobuz',
  };

  const HQ_VISUALS = {
    traditional: 'assets/backgrounds/library/15-traditional-canopy-courtyard.webp',
    dandiya: 'assets/backgrounds/library/10-dandiya-silhouette-courtyard.webp',
    devotional: 'assets/backgrounds/library/03-devotional-garba-courtyard.webp',
    folk: 'assets/backgrounds/library/14-gujarati-folk-courtyard.webp',
    sanedo: 'assets/backgrounds/library/04-colourful-garba-courtyard-a.webp',
    fusion: 'assets/backgrounds/library/05-fusion-gujarati-neon.webp',
  };

  let songsPromise = null;
  let providerSongId = null;
  let visualToken = 0;

  function announce(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function hasDirectAudio() {
    return Boolean(audio?.getAttribute('src'));
  }

  function clearStaleInert() {
    document.querySelectorAll('[inert]').forEach((node) => node.removeAttribute('inert'));
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
      const found = songs.find((song) => song.id === id);
      if (found) return found;
    }
    const title = String($('songTitle')?.textContent || '').trim();
    const artist = String($('songArtist')?.textContent || '').trim();
    return songs.find((song) => song.title === title && song.artist === artist) || songs[0] || null;
  }

  function providerName(provider = '') {
    const key = String(provider).toLowerCase();
    return PROVIDER_NAMES[key] || key.replace(/(^|-)([a-z])/g, (_, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`) || 'Provider';
  }

  function inferProvider(song, sourceUrl = '') {
    const configured = String(song?.playbackProvider || '').toLowerCase();
    if (configured && configured !== 'direct') return configured;
    try {
      const host = new URL(sourceUrl).hostname.toLowerCase();
      if (host.includes('youtube.com') || host === 'youtu.be') return 'youtube';
      if (host.includes('spotify.com')) return 'spotify';
      if (host.includes('music.apple.com')) return 'apple-music';
      if (host.includes('music.amazon.')) return 'amazon-music';
      if (host.includes('soundcloud.com')) return 'soundcloud';
      if (host.includes('bandcamp.com')) return 'bandcamp';
      if (host.includes('qobuz.com')) return 'qobuz';
    } catch {
      // The URL is optional. Unknown sources remain explicit external actions.
    }
    return song?.youtubeId ? 'youtube' : 'provider';
  }

  function youtubeVideoId(song, sourceUrl = '') {
    if (song?.youtubeId) return String(song.youtubeId);
    try {
      const url = new URL(sourceUrl);
      if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
      if (url.hostname.includes('youtube.com')) {
        if (url.searchParams.get('v')) return url.searchParams.get('v');
        const parts = url.pathname.split('/').filter(Boolean);
        const embedIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts');
        if (embedIndex >= 0) return parts[embedIndex + 1] || '';
      }
    } catch {
      // Fall through to an external action.
    }
    return '';
  }

  function spotifyEmbedUrl(sourceUrl = '') {
    try {
      const url = new URL(sourceUrl);
      const parts = url.pathname.split('/').filter(Boolean).filter((part) => !part.startsWith('intl-'));
      const index = parts.findIndex((part) => ['track', 'album', 'playlist', 'episode', 'show'].includes(part));
      if (index < 0 || !parts[index + 1]) return '';
      return `https://open.spotify.com/embed/${parts[index]}/${parts[index + 1]}?utm_source=generator&theme=0`;
    } catch {
      return '';
    }
  }

  function soundCloudEmbedUrl(sourceUrl = '') {
    try {
      const url = new URL(sourceUrl);
      if (url.hostname !== 'soundcloud.com' && !url.hostname.endsWith('.soundcloud.com')) return '';
      const params = new URLSearchParams({
        url: url.toString(),
        auto_play: 'true',
        hide_related: 'true',
        show_comments: 'false',
        show_user: 'true',
        show_reposts: 'false',
        visual: 'false',
      });
      return `https://w.soundcloud.com/player/?${params.toString()}`;
    } catch {
      return '';
    }
  }

  function providerEmbed(song, sourceUrl, provider) {
    if (provider === 'youtube') {
      const videoId = youtubeVideoId(song, sourceUrl);
      if (!videoId) return null;
      const fullReleaseOnly = song?.playbackSourceType === 'verified-unchaptered-youtube-release';
      const params = new URLSearchParams({ autoplay: fullReleaseOnly ? '0' : '1', playsinline: '1', rel: '0', controls: '1' });
      const startSeconds = Math.max(0, Number(song?.youtubeStartSeconds || 0));
      if (!fullReleaseOnly && startSeconds > 0) params.set('start', String(Math.floor(startSeconds)));
      return {
        src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`,
        title: fullReleaseOnly ? 'YouTube full release' : 'YouTube playback',
        className: 'is-youtube-release',
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        fullReleaseOnly,
      };
    }

    if (provider === 'spotify') {
      const src = spotifyEmbedUrl(sourceUrl);
      if (!src) return null;
      return {
        src,
        title: 'Spotify playback',
        className: 'is-spotify',
        allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
      };
    }

    if (provider === 'apple-music') {
      try {
        const url = new URL(sourceUrl);
        if (url.hostname !== 'music.apple.com' && !url.hostname.endsWith('.music.apple.com')) return null;
        url.hostname = 'embed.music.apple.com';
        return {
          src: url.toString(),
          title: 'Apple Music playback',
          className: 'is-apple',
          allow: 'autoplay *; encrypted-media *; fullscreen *',
        };
      } catch {
        return null;
      }
    }

    if (provider === 'soundcloud') {
      const src = soundCloudEmbedUrl(sourceUrl);
      if (!src) return null;
      return {
        src,
        title: 'SoundCloud playback',
        className: 'is-soundcloud',
        allow: 'autoplay',
      };
    }

    return null;
  }

  function ensureProviderStage() {
    let stage = $('providerStage');
    if (stage) return stage;

    stage = document.createElement('section');
    stage.id = 'providerStage';
    stage.className = 'provider-dock';
    stage.setAttribute('aria-label', 'Playback source');
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `
      <div class="provider-media" id="providerMedia"></div>
      <div class="provider-dock-bar">
        <span id="providerDockNote">Playback source</span>
        <div class="provider-dock-actions">
          <a id="providerDockOpen" class="provider-dock-open" target="_blank" rel="noopener noreferrer">Open source</a>
          <button type="button" id="providerDockStop" aria-label="Close playback source">Close</button>
        </div>
      </div>`;
    document.body.append(stage);
    stage.querySelector('#providerDockStop')?.addEventListener('click', closeProvider);
    return stage;
  }

  function syncProviderControls(active) {
    for (const button of [playButton, miniPlay]) {
      if (!button) continue;
      if (active) {
        button.setAttribute('aria-label', 'Close provider player');
        button.title = 'Close provider player';
      } else {
        button.setAttribute('aria-label', 'Play');
        button.title = 'Play';
      }
    }
  }

  function closeProvider() {
    const stage = $('providerStage');
    if (!stage || stage.getAttribute('aria-hidden') === 'true') return;
    stage.classList.remove('open', 'is-spotify', 'is-apple', 'is-soundcloud', 'is-youtube-release', 'is-external');
    stage.setAttribute('aria-hidden', 'true');
    $('providerMedia')?.replaceChildren();
    providerSongId = null;
    syncProviderControls(false);
  }

  function externalProviderCard(song, sourceUrl, provider) {
    const name = providerName(provider);
    const card = document.createElement('div');
    card.className = 'provider-external';
    const heading = document.createElement('strong');
    const copy = document.createElement('span');
    const unchapteredYoutubeRelease = song?.playbackSourceType === 'verified-unchaptered-youtube-release';
    heading.textContent = unchapteredYoutubeRelease ? 'Open the verified full release' : `Continue on ${name}`;
    copy.textContent = unchapteredYoutubeRelease
      ? `GARBA has a verified multi-song YouTube source, but no verified timestamp for ${song?.title || 'this song'}. The full release will open without pretending it starts at the selected song.`
      : song?.playbackSourceType === 'verified-release-source'
        ? 'GARBA verified the release, but this provider does not offer a safe in-app embed for this source.'
        : 'This verified source opens on the provider because a reliable in-app embed is not available.';
    const action = document.createElement('a');
    action.className = 'provider-external-action';
    action.href = sourceUrl;
    action.target = '_blank';
    action.rel = 'noopener noreferrer';
    action.textContent = unchapteredYoutubeRelease ? 'Open full release on YouTube' : `Open ${name}`;
    card.append(heading, copy, action);
    return card;
  }

  async function openProvider(song) {
    if (!song || hasDirectAudio()) return;
    if (!navigator.onLine) {
      announce('You are offline. Provider-backed songs need an internet connection.');
      return;
    }

    const sourceUrl = String(song.playbackSourceUrl || '').trim()
      || (song.youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(song.youtubeId)}` : '');
    if (!sourceUrl) {
      announce('This track does not have a playable source yet.');
      return;
    }

    const stage = ensureProviderStage();
    if (providerSongId === song.id && stage.classList.contains('open')) {
      closeProvider();
      return;
    }

    const provider = inferProvider(song, sourceUrl);
    const name = providerName(provider);
    const embed = providerEmbed(song, sourceUrl, provider);
    const media = $('providerMedia');
    const note = $('providerDockNote');
    const openSource = $('providerDockOpen');

    audio?.pause();
    closeProvider();
    stage.classList.add('open');
    stage.setAttribute('aria-hidden', 'false');
    providerSongId = song.id || null;
    syncProviderControls(true);
    if (openSource) {
      openSource.href = sourceUrl;
      openSource.textContent = `Open ${name}`;
      openSource.setAttribute('aria-label', `Open source on ${name}`);
    }

    if (embed) {
      stage.classList.add(embed.className);
      const iframe = document.createElement('iframe');
      iframe.src = embed.src;
      iframe.title = embed.title;
      iframe.allow = embed.allow;
      iframe.loading = 'eager';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.setAttribute('allowfullscreen', '');
      media?.replaceChildren(iframe);
      if (note) {
        if (embed.fullReleaseOnly) {
          note.textContent = `Verified full release · choose ${song.title} manually · exact timestamp not verified`;
        } else if (song.playbackSourceType === 'verified-release-source') {
          note.textContent = `Verified release · ${name} · choose ${song.title}`;
        } else if (song.playbackSourceType === 'verified-performance-chapter') {
          note.textContent = 'Verified live version · starts at the mapped song chapter';
        } else {
          note.textContent = provider === 'youtube' ? 'Playing in GARBA · tap the video if autoplay is blocked' : `Playing via ${name}`;
        }
      }
      return;
    }

    stage.classList.add('is-external');
    media?.replaceChildren(externalProviderCard(song, sourceUrl, provider));
    if (note) note.textContent = song.playbackSourceType === 'verified-unchaptered-youtube-release'
      ? 'Verified full release · exact song timestamp not verified'
      : `Verified source · ${name}`;
  }

  async function fallbackPlay() {
    if (hasDirectAudio()) return;
    const song = await currentSong();
    if (!song || hasDirectAudio()) return;
    await openProvider(song);
  }

  function interceptFallbackPlay(event) {
    if (hasDirectAudio()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    fallbackPlay();
  }

  function interceptGlobalSpace(event) {
    if (event.code !== 'Space') return;
    const target = event.target;
    const interactive = target instanceof Element
      && Boolean(target.closest('button, a[href], input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
    if (interactive) {
      event.stopImmediatePropagation();
      return;
    }
    if (hasDirectAudio()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    fallbackPlay();
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      try {
        if (!document.execCommand('copy')) throw new Error('copy failed');
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        field.remove();
      }
    });
  }

  async function shareCurrent(event) {
    event.preventDefault();
    const song = await currentSong();
    const title = song?.title || String($('songTitle')?.textContent || 'GARBA').trim();
    const artist = song?.artist || String($('songArtist')?.textContent || '').trim();
    const url = new URL(location.href);
    url.searchParams.delete('browse');
    url.searchParams.delete('source');
    const text = artist ? `${title} by ${artist}` : title;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · GARBA`, text, url: url.toString() });
        return;
      }
      await copyText(url.toString());
      announce('Track link copied.');
    } catch (error) {
      if (error?.name !== 'AbortError') announce('Could not share this track.');
    }
  }

  function constrainedConnection() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ''));
  }

  function requestedGenre() {
    const fromApp = String(app?.dataset.genre || '').trim();
    if (HQ_VISUALS[fromApp]) return fromApp;
    const fromUrl = new URL(location.href).searchParams.get('genre');
    return HQ_VISUALS[fromUrl] ? fromUrl : 'traditional';
  }

  function promoteCurrentVisual() {
    if (constrainedConnection()) return;
    const genre = requestedGenre();
    const src = HQ_VISUALS[genre];
    if (!src) return;
    const token = ++visualToken;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (token !== visualToken || requestedGenre() !== genre) return;
      requestAnimationFrame(() => {
        const layer = document.querySelector('.world-layer.is-visible');
        if (!layer || requestedGenre() !== genre) return;
        layer.style.backgroundImage = `url("${src}"), url("assets/backgrounds/${genre}.svg")`;
        layer.dataset.backgroundQuality = '2k-webp';
      });
    };
    image.src = src;
  }

  function scheduleVisualPromotion() {
    const run = () => promoteCurrentVisual();
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1800 });
    else setTimeout(run, 450);
  }

  function updateNetworkState() {
    if (!networkStatus) return;
    const offline = !navigator.onLine;
    networkStatus.textContent = offline ? 'Offline' : '';
    networkStatus.setAttribute('aria-hidden', String(!offline));
    networkStatus.title = offline ? 'Offline. Provider-backed playback is unavailable.' : '';
    networkStatus.classList.toggle('show', offline);
  }

  function setupMediaSessionFallback() {
    if (!('mediaSession' in navigator)) return;
    try { navigator.mediaSession.setActionHandler('play', () => playButton?.click()); } catch { /* unsupported */ }
    try {
      navigator.mediaSession.setActionHandler('pause', () => {
        if (providerSongId) closeProvider();
        else audio?.pause();
      });
    } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('stop', () => providerSongId ? closeProvider() : audio?.pause()); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('previoustrack', () => $('prevButton')?.click()); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler('nexttrack', () => $('nextButton')?.click()); } catch { /* unsupported */ }
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (!hasDirectAudio() || !Number.isFinite(details.seekTime)) return;
        audio.currentTime = Math.max(0, Math.min(details.seekTime, Number.isFinite(audio.duration) ? audio.duration : details.seekTime));
      });
    } catch { /* unsupported */ }
  }

  genreStrip?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-static-genre="true"]');
    if (!button) return;
    const url = new URL(location.href);
    url.searchParams.set('genre', button.dataset.genre);
    url.searchParams.delete('song');
    location.assign(url.toString());
  });

  playButton?.addEventListener('click', interceptFallbackPlay, { capture: true });
  miniPlay?.addEventListener('click', interceptFallbackPlay, { capture: true });
  shareButton?.addEventListener('click', shareCurrent);
  document.addEventListener('keydown', interceptGlobalSpace);

  if (songTitle) {
    new MutationObserver(() => {
      closeProvider();
      scheduleVisualPromotion();
    }).observe(songTitle, { childList: true, characterData: true, subtree: true });
  }

  if (app) {
    new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.attributeName === 'data-genre')) scheduleVisualPromotion();
    }).observe(app, { attributes: true, attributeFilter: ['data-genre'] });
  }

  window.addEventListener('online', updateNetworkState);
  window.addEventListener('offline', () => {
    const hadProvider = Boolean(providerSongId);
    closeProvider();
    updateNetworkState();
    announce(hadProvider ? 'Offline. Provider playback was closed.' : 'You are offline.');
  });
  window.addEventListener('load', () => {
    setupMediaSessionFallback();
    scheduleVisualPromotion();
    setTimeout(() => { loadSongs(); }, 600);
  }, { once: true });
  window.addEventListener('pageshow', clearStaleInert);
  document.addEventListener('pointerdown', clearStaleInert, { capture: true, once: true });

  updateNetworkState();
  clearStaleInert();
})();
