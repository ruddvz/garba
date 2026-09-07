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

  async function fetchWithTimeout(input, init = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const externalSignal = init?.signal;
    const onAbort = () => controller.abort();
    externalSignal?.addEventListener?.('abort', onAbort, { once: true });
    try {
      return await nativeFetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener?.('abort', onAbort);
    }
  }

  async function fetchJson(path) {
    const response = await fetchWithTimeout(path, { cache: 'no-store' }, 12000);
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
    if (song.youtubeId) return 3;
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

  async function loadJsonBatched(paths, concurrency = 6) {
    const results = new Array(paths.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, paths.length) }, async () => {
      while (cursor < paths.length) {
        const index = cursor++;
        results[index] = await fetchJson(paths[index]);
      }
    });
    await Promise.all(workers);
    return results;
  }

  async function loadSongsFromChunks() {
    if (songsPromise) return songsPromise;
    songsPromise = (async () => {
      const index = await fetchJson('data/catalogue/index.json');
      if (!Array.isArray(index.songChunks) || !index.songChunks.length) throw new Error('Catalogue index has no song chunks');

      // Fallback only. Limit concurrency so a missing generated file cannot create
      // 50+ simultaneous requests on mobile Safari.
      const chunks = await loadJsonBatched(index.songChunks, 6);
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

      return preferPlayableWithinGenres(enriched);
    })().catch((error) => {
      songsPromise = null;
      throw error;
    });
    return songsPromise;
  }

  async function fastGeneratedSongs(input, init) {
    try {
      // The Pages workflow already generates data/songs.json. Use that single
      // compact request first instead of reconstructing the catalogue from every
      // chunk on each page load.
      const response = await fetchWithTimeout(input, init, 8000);
      if (!response.ok) return null;
      const songs = await response.json();
      if (!Array.isArray(songs) || !songs.length) return null;
      return new Response(JSON.stringify(preferPlayableWithinGenres(songs)), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    } catch {
      return null;
    }
  }

  function installLoadingGuard() {
    const app = document.getElementById('app');
    const title = document.getElementById('songTitle');
    if (!app || !title) return;

    const sync = () => {
      const value = String(title.textContent || '').trim();
      if (!value || /loading garba/i.test(value)) return;
      app.dataset.loading = 'false';
      app.setAttribute('aria-busy', 'false');
    };
    new MutationObserver(sync).observe(title, { childList: true, characterData: true, subtree: true });
    sync();

    // Never leave an iPhone behind an infinite skeleton if another enhancement
    // module fails to run. Core app errors remain visible instead of being hidden.
    setTimeout(() => {
      if (app.dataset.loading === 'true') {
        app.dataset.loading = 'false';
        app.setAttribute('aria-busy', 'false');
      }
    }, 15000);
  }

  window.fetch = async (input, init) => {
    if (!isSongsRequest(input)) return nativeFetch(input, init);

    const fast = await fastGeneratedSongs(input, init);
    if (fast) return fast;

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

  installLoadingGuard();
})();
