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
  const warmed = new Set();
  const warming = new Map();

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

  function candidateFor(genreId, songId = null) {
    const candidates = library[genreId] || [];
    if (!candidates.length) return null;
    const params = new URLSearchParams(location.search);
    const song = songId ?? params.get('song') ?? '';
    // The first asset in every bucket is the art-directed primary. Shareable
    // song URLs deterministically rotate through the approved alternates.
    const index = song ? hash(`${genreId}:${song}`) % candidates.length : 0;
    return `${base}${candidates[index]}`;
  }

  function connectionConstrained() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return false;
    return Boolean(connection.saveData || /(^|-)2g$/.test(connection.effectiveType || ''));
  }

  function requestedGenre() {
    const params = new URLSearchParams(location.search);
    return params.get('genre') || document.getElementById('app')?.dataset.genre || 'traditional';
  }

  async function exists(url) {
    try {
      const response = await nativeFetch(url, { method: 'HEAD', cache: 'no-store' });
      return response.ok;
    } catch {
      return false;
    }
  }

  function warmImage(url) {
    if (!url || connectionConstrained()) return Promise.resolve(false);
    if (warmed.has(url)) return Promise.resolve(true);
    if (warming.has(url)) return warming.get(url);

    const promise = new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        try { await image.decode?.(); } catch { /* decoded load is already usable */ }
        warmed.add(url);
        warming.delete(url);
        resolve(true);
      };
      image.onerror = () => {
        warming.delete(url);
        resolve(false);
      };
      image.src = url;
    });
    warming.set(url, promise);
    return promise;
  }

  async function promoteVisibleGenre(genreId) {
    if (!genreId || connectionConstrained()) return;
    const candidate = candidateFor(genreId);
    if (!candidate || !(await warmImage(candidate))) return;

    const app = document.getElementById('app');
    if (!app || app.dataset.genre !== genreId) return;
    const visible = document.querySelector('.world-layer.is-visible');
    if (!visible) return;
    visible.style.backgroundImage = `url("${candidate}")`;
    visible.dataset.backgroundQuality = '2k-webp';
  }

  function observeWorldChanges() {
    const app = document.getElementById('app');
    if (!app || app.dataset.visualLazyBound === 'true') return;
    app.dataset.visualLazyBound = 'true';
    new MutationObserver(() => {
      promoteVisibleGenre(app.dataset.genre);
    }).observe(app, { attributes: true, attributeFilter: ['data-genre'] });
  }

  window.GARBA_VISUAL_LIBRARY = {
    base,
    library,
    allAssets,
    candidateFor,
    promoteVisibleGenre,
    connectionConstrained,
  };

  window.fetch = async (input, init) => {
    if (!isGenresRequest(input)) return nativeFetch(input, init);

    const response = await nativeFetch(input, init);
    if (!response.ok) return response;

    try {
      const genres = await response.clone().json();
      const currentGenre = requestedGenre();
      const constrained = connectionConstrained();
      const enhanced = await Promise.all(genres.map(async (genre) => {
        const backgrounds = (library[genre.id] || []).map((file) => `${base}${file}`);
        const candidate = candidateFor(genre.id);
        const metadata = { ...genre, backgrounds };

        // Do not make app.js eagerly preload six large 2K worlds. Only promote
        // the currently visible world during catalogue bootstrap. Other worlds
        // keep their lightweight SVG until the user actually enters them.
        if (constrained || genre.id !== currentGenre || !candidate || !(await exists(candidate))) {
          return metadata;
        }
        warmed.add(candidate);
        return {
          ...metadata,
          background: candidate,
          backgroundQuality: '2k-webp',
        };
      }));

      queueMicrotask(observeWorldChanges);
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

  observeWorldChanges();
})();
