(() => {
  'use strict';

  const app = document.getElementById('app');
  const button = document.getElementById('fullscreenButton');
  if (!app || !button) return;

  const iconPath = document.getElementById('fullscreenIconPath');
  const toast = document.getElementById('toast');
  const installedModes = ['standalone', 'minimal-ui', 'window-controls-overlay'];
  const installedQueries = installedModes.map((mode) => window.matchMedia(`(display-mode: ${mode})`));
  const manifestFullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
  const mediaQueries = [...installedQueries, manifestFullscreenQuery];

  let toastTimer = 0;
  let requestPending = false;

  function isInstalledLike() {
    return navigator.standalone === true || installedQueries.some((query) => query.matches);
  }

  function isFullscreenSupported() {
    return document.fullscreenEnabled === true &&
      typeof app.requestFullscreen === 'function' &&
      typeof document.exitFullscreen === 'function';
  }

  function isAppFullscreen() {
    return document.fullscreenElement === app;
  }

  function canOfferFullscreen() {
    return isFullscreenSupported() && isInstalledLike() && !manifestFullscreenQuery.matches;
  }

  function announce(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function syncControl() {
    const active = isAppFullscreen();
    button.hidden = !(active || canOfferFullscreen());
    button.disabled = requestPending;
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    button.title = active ? 'Exit fullscreen' : 'Enter fullscreen';

    if (iconPath) {
      iconPath.setAttribute(
        'd',
        active
          ? 'M9 9H4V4M15 9h5V4M9 15H4v5M15 15h5v5'
          : 'M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5',
      );
    }
  }

  async function toggleFullscreen() {
    if (requestPending) return;

    const active = isAppFullscreen();
    if (!active && !canOfferFullscreen()) {
      syncControl();
      return;
    }

    requestPending = true;
    syncControl();

    try {
      if (active) await document.exitFullscreen();
      else await app.requestFullscreen();
    } catch {
      announce('Fullscreen is not available right now.');
    } finally {
      requestPending = false;
      syncControl();
    }
  }

  button.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncControl);
  document.addEventListener('fullscreenerror', syncControl);

  for (const query of mediaQueries) {
    if (typeof query.addEventListener === 'function') query.addEventListener('change', syncControl);
    else if (typeof query.addListener === 'function') query.addListener(syncControl);
  }

  window.addEventListener('pageshow', syncControl);
  syncControl();
})();
