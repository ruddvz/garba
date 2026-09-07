(() => {
  const nativeFetch = window.fetch.bind(window);
  let songsPromise = null;

  function isSongsRequest(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return false;
      const url = new URL(raw, location.href);
      return url.pathname.endsWith('/data/songs.json');
    } catch {
      return false;
    }
  }

  async function fetchJson(path) {
    const response = await nativeFetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Catalogue source failed: ${path} (${response.status})`);
    return response.json();
  }

  async function loadPlaybackSources(index) {
    const configured = index.playbackSources || 'data/playback-sources.json';
    const paths = Array.isArray(configured) ? configured : [configured];
    const manifests = await Promise.all(paths.map(async (path) => {
      try { return await fetchJson(path); }
      catch { return { songSources: {} }; }
    }));
    return {
      songSources: Object.assign({}, ...manifests.map((manifest) => manifest?.songSources || {})),
    };
  }

  function playbackPriority(song) {
    if (song.audioUrl) return 4;
    if (song.playbackProvider === 'youtube' && song.youtubeId) return 3;
    if (song.playbackProvider === 'spotify' && song.playbackSourceUrl) return 2;
    if (song.playbackSourceUrl) return 1;
    return 0;
  }

  function preferPlayableWithinGenres(songs) {
    const queues = new Map();
    songs.forEach((song, index) => {
      if (!queues.has(song.genre)) queues.set(song.genre, []);
      queues.get(song.genre).push({ song, index });
    });

    for (const entries of queues.values()) {
      entries.sort((a, b) => playbackPriority(b.song) - playbackPriority(a.song) || a.index - b.index);
    }

    const offsets = new Map();
    return songs.map((original) => {
      const offset = offsets.get(original.genre) || 0;
      const replacement = queues.get(original.genre)?.[offset]?.song || original;
      offsets.set(original.genre, offset + 1);
      return replacement;
    });
  }

  async function loadSongsFromChunks() {
    if (songsPromise) return songsPromise;
    songsPromise = (async () => {
      const index = await fetchJson('data/catalogue/index.json');
      if (!Array.isArray(index.songChunks) || !index.songChunks.length) throw new Error('Catalogue index has no song chunks');

      const chunks = await Promise.all(index.songChunks.map((path) => fetchJson(path)));
      const songs = chunks.flat();
      const playback = await loadPlaybackSources(index);

      const enriched = songs.map((song) => {
        const source = playback.songSources?.[song.id];
        if (!source) return { ...song, playbackReady: Boolean(song.audioUrl || song.youtubeId) };
        return {
          ...song,
          youtubeId: source.videoId || song.youtubeId || null,
          youtubeStartSeconds: source.startSeconds || 0,
          playbackProvider: source.provider || null,
          playbackSourceUrl: source.sourceUrl || null,
          playbackSourceType: source.sourceType || null,
          playbackAlternate: source.alternate || null,
          playbackReady: Boolean(song.audioUrl || source.videoId || source.sourceUrl),
          audioAvailability: source.provider === 'youtube' ? 'youtube-official' : song.audioAvailability,
        };
      });

      // The catalogue remains complete, but the first item returned for each
      // genre is now one with a verified playable provider whenever possible.
      // This prevents a genre switch from landing on a metadata-only record.
      return preferPlayableWithinGenres(enriched);
    })().catch((error) => {
      songsPromise = null;
      throw error;
    });
    return songsPromise;
  }

  window.fetch = async (input, init) => {
    if (!isSongsRequest(input)) return nativeFetch(input, init);
    try {
      const songs = await loadSongsFromChunks();
      return new Response(JSON.stringify(songs), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      console.error('Chunked catalogue bootstrap failed', error);
      return nativeFetch(input, init);
    }
  };

  // Apple Music and Amazon Music are common verified release fallbacks in the
  // catalogue. Register this listener before playback-bridge.js so those
  // providers stay inside GARBA instead of falling through to an error state.
  let releaseProviderSongs = new Map();
  let releaseProviderActive = false;

  function releaseProviderSong() {
    const id = new URLSearchParams(location.search).get('song');
    return id ? releaseProviderSongs.get(id) : null;
  }

  function appleEmbedUrl(sourceUrl = '') {
    try {
      const url = new URL(sourceUrl);
      if (url.hostname !== 'music.apple.com') return null;
      url.hostname = 'embed.music.apple.com';
      url.protocol = 'https:';
      return url.toString();
    } catch {
      return null;
    }
  }

  function amazonEmbedUrl(sourceUrl = '') {
    try {
      const url = new URL(sourceUrl);
      if (!/^music\.amazon\./i.test(url.hostname)) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      const index = parts.findIndex((part) => ['albums', 'tracks'].includes(part));
      if (index < 0 || !parts[index + 1]) return null;
      return `${url.origin}/embed/${encodeURIComponent(parts[index + 1])}/`;
    } catch {
      return null;
    }
  }

  function releaseProviderStage() {
    return {
      stage: document.getElementById('providerStage'),
      mount: document.getElementById('providerMedia'),
      note: document.getElementById('providerDockNote'),
    };
  }

  function clearReleaseProvider() {
    if (!releaseProviderActive) return;
    const { stage, mount } = releaseProviderStage();
    stage?.classList.remove('open', 'is-release-provider');
    stage?.setAttribute('aria-hidden', 'true');
    if (mount) mount.replaceChildren();
    releaseProviderActive = false;
  }

  function releaseProviderToast(message) {
    const target = document.getElementById('toast');
    if (!target) return;
    target.textContent = message;
    target.classList.add('show');
    clearTimeout(releaseProviderToast.timer);
    releaseProviderToast.timer = setTimeout(() => target.classList.remove('show'), 2400);
  }

  function playReleaseProvider(song) {
    if (navigator.onLine === false) {
      releaseProviderToast('You are offline. Provider-backed songs need an internet connection.');
      return;
    }
    const provider = song.playbackProvider;
    const embed = provider === 'apple-music'
      ? appleEmbedUrl(song.playbackSourceUrl)
      : provider === 'amazon-music'
        ? amazonEmbedUrl(song.playbackSourceUrl)
        : null;
    if (!embed) return;

    const { stage, mount, note } = releaseProviderStage();
    if (!stage || !mount) return;
    document.getElementById('audio')?.pause();
    stage.classList.add('open', 'is-release-provider');
    stage.setAttribute('aria-hidden', 'false');
    const trackNumber = Number(song.trackNumber);
    if (note) note.textContent = trackNumber > 0 ? `Official release · choose track ${trackNumber}` : 'Official release · choose the track';

    const iframe = document.createElement('iframe');
    iframe.title = provider === 'apple-music' ? 'Apple Music playback' : 'Amazon Music playback';
    iframe.src = embed;
    iframe.loading = 'eager';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'autoplay; encrypted-media; fullscreen';
    if (provider === 'apple-music') {
      iframe.setAttribute('sandbox', 'allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation');
    }
    mount.replaceChildren(iframe);
    releaseProviderActive = true;
  }

  function interceptReleaseProvider(event) {
    const button = event.target.closest?.('#playButton, #miniPlay');
    if (!button) return;
    const song = releaseProviderSong();
    if (!song || !['apple-music', 'amazon-music'].includes(song.playbackProvider) || !song.playbackSourceUrl) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    playReleaseProvider(song);
  }

  function interceptReleaseProviderKey(event) {
    if (event.code !== 'Space' || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target?.isContentEditable) return;
    const song = releaseProviderSong();
    if (!song || !['apple-music', 'amazon-music'].includes(song.playbackProvider) || !song.playbackSourceUrl) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    playReleaseProvider(song);
  }

  document.addEventListener('click', interceptReleaseProvider, true);
  document.addEventListener('keydown', interceptReleaseProviderKey, true);
  loadSongsFromChunks().then((songs) => {
    releaseProviderSongs = new Map(songs.map((song) => [song.id, song]));
  }).catch(() => {});

  const bindReleaseProviderLifecycle = () => {
    const title = document.getElementById('songTitle');
    if (title) new MutationObserver(clearReleaseProvider).observe(title, { childList: true, characterData: true, subtree: true });
    const stop = document.getElementById('providerDockStop');
    stop?.addEventListener('click', clearReleaseProvider, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(bindReleaseProviderLifecycle, 0), { once: true });
  else setTimeout(bindReleaseProviderLifecycle, 0);
  window.addEventListener('popstate', clearReleaseProvider);
})();
