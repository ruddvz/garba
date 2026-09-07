(() => {
  const nativeFetch = window.fetch.bind(window);
  const base = 'assets/backgrounds/library/';
  const library = {
    traditional: [
      '11-master-dark-courtyard.webp',
      '15-traditional-canopy-courtyard.webp',
      '13-traditional-marigold-courtyard.webp',
      '09-warm-stage-courtyard.webp',
    ],
    dandiya: [
      '10-dandiya-silhouette-courtyard.webp',
      '07-dandiya-purple-courtyard.webp',
    ],
    devotional: [
      '03-devotional-garba-courtyard.webp',
    ],
    folk: [
      '14-gujarati-folk-courtyard.webp',
      '02-rhythmic-drums-courtyard-a.webp',
      '12-rhythmic-drums-courtyard-b.webp',
    ],
    sanedo: [
      '08-colourful-garba-courtyard-b.webp',
      '04-colourful-garba-courtyard-a.webp',
    ],
    fusion: [
      '05-fusion-gujarati-neon.webp',
      '06-fusion-abstract-neon.webp',
      '01-bollywood-garba-courtyard.webp',
    ],
  };

  const allAssets = Object.values(library).flat().map((file) => `${base}${file}`);
  window.GARBA_VISUAL_LIBRARY = { base, library, allAssets };

  function isGenresRequest(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return false;
      return new URL(raw, location.href).pathname.endsWith('/data/genres.json');
    } catch {
      return false;
    }
  }

  function candidateFor(genreId) {
    const candidates = library[genreId] || [];
    if (!candidates.length) return null;

    // The first image in every bucket is the art-directed production default.
    // Alternate approved images are opt-in through ?scene=2, ?scene=3, etc.,
    // rather than changing every time the song changes. That keeps the world
    // stable and avoids distracting flashes while still retaining all 15 assets.
    const requested = Number(new URLSearchParams(location.search).get('scene'));
    const index = Number.isFinite(requested) && requested > 0
      ? Math.min(candidates.length - 1, Math.floor(requested - 1))
      : 0;
    return `${base}${candidates[index]}`;
  }

  async function exists(url) {
    try {
      const response = await nativeFetch(url, { method: 'HEAD', cache: 'no-store' });
      return response.ok;
    } catch {
      return false;
    }
  }

  window.fetch = async (input, init) => {
    if (!isGenresRequest(input)) return nativeFetch(input, init);

    const response = await nativeFetch(input, init);
    if (!response.ok) return response;

    try {
      const genres = await response.clone().json();
      const enhanced = await Promise.all(genres.map(async (genre) => {
        const candidate = candidateFor(genre.id);
        if (!candidate || !(await exists(candidate))) return genre;
        return {
          ...genre,
          background: candidate,
          backgrounds: (library[genre.id] || []).map((file) => `${base}${file}`),
          backgroundQuality: '2k-webp',
        };
      }));

      return new Response(JSON.stringify(enhanced), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      console.warn('2K visual library unavailable; using bundled fallback.', error);
      return response;
    }
  };
})();
