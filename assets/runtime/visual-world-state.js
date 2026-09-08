(() => {
  const base = 'assets/backgrounds/library/';
  const highResBase = 'assets/backgrounds/library-4k/';
  const highResPhysicalWidth = 2200;
  const library = Object.freeze({
    traditional: Object.freeze([
      '11-master-dark-courtyard.webp',
      '15-traditional-canopy-courtyard.webp',
      '13-traditional-marigold-courtyard.webp',
      '09-warm-stage-courtyard.webp',
    ]),
    dandiya: Object.freeze([
      '10-dandiya-silhouette-courtyard.webp',
      '07-dandiya-purple-courtyard.webp',
    ]),
    devotional: Object.freeze([
      '03-devotional-garba-courtyard.webp',
    ]),
    folk: Object.freeze([
      '14-gujarati-folk-courtyard.webp',
      '02-rhythmic-drums-courtyard-a.webp',
      '12-rhythmic-drums-courtyard-b.webp',
    ]),
    sanedo: Object.freeze([
      '08-colourful-garba-courtyard-b.webp',
      '04-colourful-garba-courtyard-a.webp',
    ]),
    fusion: Object.freeze([
      '05-fusion-gujarati-neon.webp',
      '06-fusion-abstract-neon.webp',
      '01-bollywood-garba-courtyard.webp',
    ]),
  });

  const allAssets = Object.freeze(
    Object.values(library).flat().map((filename) => `${base}${filename}`)
  );
  const highResAssets = Object.freeze(
    Object.values(library).flat().map((filename) => `${highResBase}${filename}`)
  );
  const loaded = new Set();
  const loading = new Map();
  let syncToken = 0;
  let syncScheduled = false;
  let warmScheduled = false;
  let resizeTimer = 0;

  function hash(value = '') {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function currentGenreId() {
    const appGenre = document.getElementById('app')?.dataset.genre;
    if (appGenre && library[appGenre]) return appGenre;
    const queryGenre = new URLSearchParams(location.search).get('genre');
    return queryGenre && library[queryGenre] ? queryGenre : 'traditional';
  }

  function currentSongSeed() {
    const params = new URLSearchParams(location.search);
    const songId = String(params.get('song') || '').trim();
    if (songId) return songId;

    const title = String(document.getElementById('songTitle')?.textContent || '').trim();
    const artist = String(document.getElementById('songArtist')?.textContent || '').trim();
    return title ? `${title}|${artist}` : '';
  }

  function candidateFilename(genreId = currentGenreId(), songSeed = currentSongSeed()) {
    const candidates = library[genreId] || [];
    if (!candidates.length) return null;
    const index = songSeed ? hash(`${genreId}:${songSeed}`) % candidates.length : 0;
    return candidates[index];
  }

  function connectionConstrained() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return false;
    return Boolean(connection.saveData || /(^|-)2g$/.test(String(connection.effectiveType || '')));
  }

  function prefers4kArtwork() {
    if (connectionConstrained()) return false;
    const dpr = Math.max(1, Math.min(3, Number(window.devicePixelRatio) || 1));
    const viewportWidth = Math.max(1, Number(window.innerWidth) || document.documentElement.clientWidth || 1);
    return Math.ceil(viewportWidth * dpr) > highResPhysicalWidth;
  }

  function candidateFor(
    genreId = currentGenreId(),
    songSeed = currentSongSeed(),
    { highRes = prefers4kArtwork() } = {},
  ) {
    const filename = candidateFilename(genreId, songSeed);
    if (!filename) return null;
    return `${highRes ? highResBase : base}${filename}`;
  }

  function fallbackFor(genreId) {
    return `assets/backgrounds/${genreId}.svg`;
  }

  function loadImage(url, { highPriority = false } = {}) {
    if (!url) return Promise.resolve(false);
    if (loaded.has(url)) return Promise.resolve(true);
    if (loading.has(url)) return loading.get(url);

    const promise = new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      if ('fetchPriority' in image) image.fetchPriority = highPriority ? 'high' : 'auto';
      image.onload = async () => {
        try { await image.decode?.(); } catch { /* loaded pixels are already usable */ }
        loaded.add(url);
        loading.delete(url);
        resolve(true);
      };
      image.onerror = () => {
        loading.delete(url);
        resolve(false);
      };
      image.src = url;
    });

    loading.set(url, promise);
    return promise;
  }

  function visibleWorldLayer() {
    return document.querySelector('.world-layer.is-visible') || document.getElementById('worldA');
  }

  async function syncNow() {
    syncScheduled = false;
    const token = ++syncToken;
    const genreId = currentGenreId();
    const filename = candidateFilename(genreId);
    if (!filename) return;

    const wants4k = prefers4kArtwork();
    const highResCandidate = `${highResBase}${filename}`;
    const standardCandidate = `${base}${filename}`;
    let candidate = wants4k ? highResCandidate : standardCandidate;
    let quality = wants4k ? '4k-q95-webp' : '2k-webp';
    let ready = await loadImage(candidate, { highPriority: true });

    if (!ready && wants4k) {
      candidate = standardCandidate;
      quality = '2k-webp-fallback';
      ready = await loadImage(candidate, { highPriority: true });
    }
    if (!ready || token !== syncToken) return;

    // The player can cross-fade world layers one frame after a genre change.
    // Wait through that frame, then write only to whichever layer is truly visible.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (token !== syncToken || genreId !== currentGenreId()) return;

    const layer = visibleWorldLayer();
    if (!layer) return;

    const fallback = fallbackFor(genreId);
    const imageLayers = [candidate];
    if (candidate !== standardCandidate) imageLayers.push(standardCandidate);
    imageLayers.push(fallback);
    layer.style.setProperty(
      'background-image',
      imageLayers.map((url) => `url("${url}")`).join(', '),
      'important'
    );
    layer.style.setProperty('background-size', 'cover', 'important');
    layer.style.setProperty('background-position', 'center center', 'important');
    layer.style.setProperty('background-repeat', 'no-repeat', 'important');
    layer.dataset.backgroundQuality = quality;
    layer.dataset.backgroundAsset = filename;
  }

  function scheduleSync() {
    if (syncScheduled) return;
    syncScheduled = true;
    queueMicrotask(syncNow);
  }

  function scheduleViewportSync() {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(scheduleSync, 120);
  }

  function patchHistory() {
    for (const method of ['replaceState', 'pushState']) {
      const original = history[method];
      if (typeof original !== 'function' || original.__garbaVisualWrapped) continue;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        scheduleSync();
        return result;
      };
      Object.defineProperty(wrapped, '__garbaVisualWrapped', { value: true });
      history[method] = wrapped;
    }
  }

  function observePlayer() {
    const app = document.getElementById('app');
    if (app) {
      new MutationObserver(scheduleSync).observe(app, {
        attributes: true,
        attributeFilter: ['data-genre'],
      });
    }

    const world = document.querySelector('.world');
    if (world) {
      new MutationObserver(scheduleSync).observe(world, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    for (const id of ['songTitle', 'songArtist']) {
      const node = document.getElementById(id);
      if (!node) continue;
      new MutationObserver(scheduleSync).observe(node, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
  }

  function warmRemainingArtwork() {
    if (warmScheduled || connectionConstrained()) return;
    warmScheduled = true;

    const run = async () => {
      // Warm the compact 2K library only. 4K files are intentionally fetched
      // on demand so a capable display does not automatically download 23 MB.
      const active = candidateFor(undefined, undefined, { highRes: false });
      for (const url of allAssets) {
        if (url === active || loaded.has(url)) continue;
        await loadImage(url);
      }
    };

    const afterLoad = () => {
      if ('requestIdleCallback' in window) requestIdleCallback(() => run(), { timeout: 5000 });
      else setTimeout(run, 2200);
    };

    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
  }

  window.GARBA_VISUAL_WORLDS = Object.freeze({
    base,
    highResBase,
    highResPhysicalWidth,
    library,
    allAssets,
    highResAssets,
    candidateFor,
    prefers4kArtwork,
    sync: scheduleSync,
  });

  patchHistory();
  observePlayer();
  window.addEventListener('resize', scheduleViewportSync, { passive: true });
  window.addEventListener('orientationchange', scheduleViewportSync, { passive: true });
  window.addEventListener('popstate', scheduleSync);
  window.addEventListener('pageshow', scheduleSync);
  window.addEventListener('garba:catalogue-ready', scheduleSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync();
  });

  scheduleSync();
  warmRemainingArtwork();
})();
