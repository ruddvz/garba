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

  async function loadSongsFromChunks() {
    if (songsPromise) return songsPromise;
    songsPromise = (async () => {
      const indexResponse = await nativeFetch('data/catalogue/index.json', { cache: 'no-store' });
      if (!indexResponse.ok) throw new Error(`Catalogue index failed: ${indexResponse.status}`);
      const index = await indexResponse.json();
      const chunks = await Promise.all(index.songChunks.map(async (path) => {
        const response = await nativeFetch(path, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Song chunk failed: ${path} (${response.status})`);
        return response.json();
      }));

      const songs = chunks.flat();
      let playback = { songSources: {} };
      try {
        const sourceResponse = await nativeFetch(index.playbackSources || 'data/playback-sources.json', { cache: 'no-store' });
        if (sourceResponse.ok) playback = await sourceResponse.json();
      } catch { /* playback metadata is optional */ }

      return songs.map((song) => {
        const source = playback.songSources?.[song.id];
        return source ? {
          ...song,
          youtubeId: source.videoId || song.youtubeId || null,
          youtubeStartSeconds: source.startSeconds || 0,
          playbackProvider: source.provider,
          playbackSourceUrl: source.sourceUrl,
          playbackSourceType: source.sourceType,
          audioAvailability: source.provider === 'youtube' ? 'youtube-official' : song.audioAvailability,
        } : song;
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
