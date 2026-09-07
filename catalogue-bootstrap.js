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
})();
