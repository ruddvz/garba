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
  let warmAllScheduled = false;

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

  function warmImage(url, { background = false } = {}) {
    if (!url) return Promise.resolve(false);
    // The visible artwork is a product requirement, even on Save-Data/2G. Only
    // speculative warming of the other 14 images is skipped on constrained links.
    if (background && connectionConstrained()) return Promise.resolve(false);
    if (warmed.has(url)) return Promise.resolve(true);
    if (warming.has(url)) return warming.get(url);

    const promise = new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        try { await image.decode?.(); } catch { /* loaded pixels are already usable */ }
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
    if (!genreId) return;
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

  function scheduleRemainingArtwork() {
    if (warmAllScheduled || connectionConstrained()) return;
    warmAllScheduled = true;

    const run = async () => {
      const visible = candidateFor(requestedGenre());
      for (const url of allAssets) {
        if (url === visible || warmed.has(url)) continue;
        await warmImage(url, { background: true });
      }
    };

    const afterLoad = () => {
      if ('requestIdleCallback' in window) requestIdleCallback(() => run(), { timeout: 5000 });
      else setTimeout(run, 2500);
    };

    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
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
      const enhanced = genres.map((genre) => {
        const backgrounds = (library[genre.id] || []).map((file) => `${base}${file}`);
        const candidate = candidateFor(genre.id);
        const metadata = { ...genre, backgrounds };
        if (genre.id !== currentGenre || !candidate) return metadata;
        return { ...metadata, background: candidate, backgroundQuality: '2k-webp' };
      });

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
  requestAnimationFrame(() => promoteVisibleGenre(requestedGenre()));
  scheduleRemainingArtwork();
})();
