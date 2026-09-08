(() => {
  const songList = document.getElementById('catalogueSongList');
  const sectionRoot = document.getElementById('catalogueSections');
  if (!songList || !sectionRoot) return;

  const STORAGE_KEY = 'playgarba:explore:shelf-scrolls';
  const AUTO_PAGE_COOLDOWN_MS = 650;
  const SHELF_SELECTOR = '.collection-grid,.essential-release-rail,.release-rail';
  let pagerObserver = null;
  let mutationQueued = false;
  let lastAutoPageAt = 0;
  let shelfSaveTimer = 0;

  function readShelfState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function shelfKey(shelf) {
    const section = shelf.closest('.catalogue-section,.release-section');
    const heading = section?.querySelector('.section-title-row h2,.section-heading h3')?.textContent?.trim();
    if (heading) return heading;
    if (shelf.id) return shelf.id;
    return null;
  }

  function saveShelfPositions() {
    const next = readShelfState();
    document.querySelectorAll(SHELF_SELECTOR).forEach((shelf) => {
      const key = shelfKey(shelf);
      if (!key || shelf.scrollLeft < 2) return;
      next[key] = Math.round(shelf.scrollLeft);
    });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage is an enhancement only. Scrolling must never depend on it.
    }
  }

  function restoreShelfPositions(root = document) {
    const saved = readShelfState();
    root.querySelectorAll?.(SHELF_SELECTOR).forEach((shelf) => {
      const key = shelfKey(shelf);
      const left = key ? Number(saved[key]) : 0;
      if (!Number.isFinite(left) || left <= 0) return;
      requestAnimationFrame(() => {
        shelf.scrollLeft = Math.min(left, Math.max(0, shelf.scrollWidth - shelf.clientWidth));
      });
    });
  }

  function bindShelf(shelf) {
    if (!(shelf instanceof HTMLElement) || shelf.dataset.scrollContinuityBound === 'true') return;
    shelf.dataset.scrollContinuityBound = 'true';
    shelf.addEventListener('scroll', () => {
      clearTimeout(shelfSaveTimer);
      shelfSaveTimer = window.setTimeout(saveShelfPositions, 140);
    }, { passive: true });
  }

  function bindShelves(root = document) {
    root.querySelectorAll?.(SHELF_SELECTOR).forEach(bindShelf);
    restoreShelfPositions(root);
  }

  function disconnectPager() {
    pagerObserver?.disconnect();
    pagerObserver = null;
  }

  function triggerNextPage(button) {
    if (!(button instanceof HTMLButtonElement) || !button.isConnected || button.disabled) return;
    const now = Date.now();
    if (now - lastAutoPageAt < AUTO_PAGE_COOLDOWN_MS) return;
    if (document.visibilityState === 'hidden') return;
    lastAutoPageAt = now;
    button.dataset.autoPaging = 'true';
    button.textContent = 'Loading more songs';
    disconnectPager();
    requestAnimationFrame(() => button.click());
  }

  function bindSongPager() {
    disconnectPager();
    const button = songList.querySelector('.song-more');
    if (!(button instanceof HTMLButtonElement)) return;

    button.removeAttribute('data-auto-paging');
    if (!('IntersectionObserver' in window)) return;

    pagerObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      triggerNextPage(button);
    }, {
      root: null,
      rootMargin: '950px 0px 1150px 0px',
      threshold: 0.01,
    });
    pagerObserver.observe(button);
  }

  function refreshRuntime() {
    mutationQueued = false;
    bindShelves(document);
    bindSongPager();
  }

  function queueRefresh() {
    if (mutationQueued) return;
    mutationQueued = true;
    queueMicrotask(refreshRuntime);
  }

  new MutationObserver(queueRefresh).observe(sectionRoot, { childList: true, subtree: true });
  new MutationObserver(queueRefresh).observe(songList, { childList: true, subtree: true });

  window.addEventListener('pagehide', saveShelfPositions);
  window.addEventListener('pageshow', () => {
    bindShelves(document);
    bindSongPager();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveShelfPositions();
  });

  bindShelves(document);
  bindSongPager();
})();
