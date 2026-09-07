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

  function hash(value = '') {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function candidateFor(genreId) {
    const candidates = library[genreId] || [];
    if (!candidates.length) return null;
    const params = new URLSearchParams(location.search);
    const song = params.get('song') || '';
    // The first asset in every bucket is the art-directed primary. Shareable
    // song URLs deterministically rotate through the approved alternates.
    const index = song ? hash(`${genreId}:${song}`) % candidates.length : 0;
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
