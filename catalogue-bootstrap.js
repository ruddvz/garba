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

  async function loadSongsFromChunks() {
    if (songsPromise) return songsPromise;
    songsPromise = (async () => {
      const index = await fetchJson('data/catalogue/index.json');
      if (!Array.isArray(index.songChunks) || !index.songChunks.length) throw new Error('Catalogue index has no song chunks');

      const chunks = await Promise.all(index.songChunks.map((path) => fetchJson(path)));
      const songs = chunks.flat();
      const playback = await loadPlaybackSources(index);

      return songs.map((song) => {
        const source = playback.songSources?.[song.id];
        if (!source) return song;
        return {
          ...song,
          youtubeId: source.videoId || song.youtubeId || null,
          youtubeStartSeconds: source.startSeconds || 0,
          playbackProvider: source.provider || null,
          playbackSourceUrl: source.sourceUrl || null,
          playbackSourceType: source.sourceType || null,
          playbackAlternate: source.alternate || null,
          audioAvailability: source.provider === 'youtube' ? 'youtube-official' : song.audioAvailability,
        };
      });
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
