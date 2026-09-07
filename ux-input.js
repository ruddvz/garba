const playButton = document.getElementById('playButton');
const app = document.getElementById('app');

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest(
    'button, a[href], input, textarea, select, summary, iframe, [contenteditable="true"], [role="button"], [role="link"]'
  ));
}

function stopGlobalSpaceOnInteractive(container) {
  if (!container || container.dataset.spaceGuard === 'true') return;
  container.dataset.spaceGuard = 'true';
  container.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && isInteractiveTarget(event.target)) {
      // Let the focused control keep its native Space behavior, but do not let
      // the document-level transport shortcut also toggle the music player.
      event.stopPropagation();
    }
  });
}

function setupProviderSpaceGuard() {
  const bind = () => stopGlobalSpaceOnInteractive(document.getElementById('providerOverlay'));
  bind();
  new MutationObserver(bind).observe(document.body, { childList: true });
}

function setupPlaybackInputParity() {
  // The core app owns a document-level Space shortcut. Route Space from a
  // non-interactive surface through the actual Play button instead, so the
  // playback bridge can open verified YouTube/Spotify sources as it does for
  // pointer/touch clicks. This also avoids a separate, inconsistent code path.
  document.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (isInteractiveTarget(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    playButton?.click();
  }, { capture: true });

  stopGlobalSpaceOnInteractive(app);
  setupProviderSpaceGuard();

  // Hardware/lock-screen Play should take the same provider-aware path where
  // Media Session action handlers are supported. The core app's pause/seek/next
  // handlers remain in place.
  if ('mediaSession' in navigator && playButton) {
    try {
      navigator.mediaSession.setActionHandler('play', () => playButton.click());
    } catch {
      // Not every Media Session implementation exposes every action.
    }
  }
}

setupPlaybackInputParity();
