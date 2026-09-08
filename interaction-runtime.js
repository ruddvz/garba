(() => {
  const $ = (id) => document.getElementById(id);
  const app = $('app');
  const songTitle = $('songTitle');
  const songArtist = $('songArtist');
  const shareButton = $('shareButton');
  const queueButton = $('queueButton');
  const queueBadge = $('queueBadge');
  const favouriteButton = $('mobileFavourite');
  const elapsedTime = $('elapsedTime');
  const durationTime = $('durationTime');
  const progress = $('progress');
  const songSheet = $('songSheet');
  const sheetClose = $('sheetClose');
  const topbar = document.querySelector('.topbar');
  const mainPlayer = $('mainPlayer');
  const installBanner = $('installBanner');
  const networkStatus = $('networkStatus');
  const toast = $('toast');

  let toastTimer = null;
  let sheetModalActive = false;

  function cleanText(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function announce(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function isInteractiveTarget(target) {
    return target instanceof Element && Boolean(target.closest(
      'button, a[href], input, textarea, select, summary, iframe, [contenteditable="true"], [role="button"], [role="link"], [role="slider"], [role="textbox"]'
    ));
  }

  function isPlayerShortcut(event) {
    if (event.code === 'Space' || event.code === 'ArrowLeft' || event.code === 'ArrowRight') return true;
    if (event.key === '/') return true;
    const key = String(event.key || '').toLowerCase();
    return key === 'f';
  }

  function sheetIsOpen() {
    return songSheet?.getAttribute('aria-hidden') === 'false';
  }

  function copyTextFallback(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { copied = false; }
    textarea.remove();
    return copied;
  }

  async function shareCurrentTrack() {
    const title = cleanText(songTitle?.textContent) || 'PlayGarba';
    const artist = cleanText(songArtist?.textContent);
    const url = new URL(location.href);
    url.searchParams.delete('source');
    url.searchParams.delete('browse');
    const text = artist ? `${title} by ${artist}` : title;

    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · PlayGarba`, text, url: url.toString() });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString());
        announce('Track link copied.');
        return;
      }
      if (copyTextFallback(url.toString())) {
        announce('Track link copied.');
        return;
      }
      announce('Could not copy this track link.');
    } catch (error) {
      if (error?.name !== 'AbortError') announce('Could not share this track.');
    }
  }

  function syncControlLabels() {
    const title = cleanText(songTitle?.textContent) || 'current song';
    const artist = cleanText(songArtist?.textContent);
    const saved = favouriteButton?.getAttribute('aria-pressed') === 'true';

    if (shareButton) {
      shareButton.setAttribute('aria-label', `Share ${title}`);
      shareButton.setAttribute('aria-keyshortcuts', 'Shift+S');
      shareButton.title = artist ? `Share ${title} by ${artist}` : `Share ${title}`;
    }

    if (favouriteButton) {
      favouriteButton.setAttribute('aria-label', `${saved ? 'Remove' : 'Add'} ${title} ${saved ? 'from' : 'to'} favourites`);
    }

    if (queueButton) {
      const badge = cleanText(queueBadge?.textContent);
      queueButton.setAttribute('aria-label', badge ? `Show queue, ${badge} songs up next` : 'Show queue');
    }

    if (progress) {
      const elapsed = cleanText(elapsedTime?.textContent) || '0:00';
      const duration = cleanText(durationTime?.textContent) || '--:--';
      progress.setAttribute('aria-valuetext', `${elapsed} of ${duration}`);
    }
  }

  function setBackgroundInert(inert) {
    for (const element of [topbar, mainPlayer, installBanner]) {
      if (!element) continue;
      if (inert) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
    }
  }

  function visibleFocusable(root) {
    return [...root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((node) => node.getClientRects().length > 0 && !node.closest('[hidden]'));
  }

  function syncSheetModal() {
    if (!songSheet) return;
    const modal = sheetIsOpen() && songSheet.getAttribute('aria-modal') === 'true';
    if (modal === sheetModalActive) return;
    sheetModalActive = modal;
    setBackgroundInert(modal);

    if (modal && !songSheet.contains(document.activeElement)) {
      requestAnimationFrame(() => {
        const preferred = sheetClose || visibleFocusable(songSheet)[0];
        preferred?.focus?.({ preventScroll: true });
      });
    }
  }

  function trapSheetTab(event) {
    if (event.key !== 'Tab' || !sheetModalActive || !songSheet) return;
    const focusable = visibleFocusable(songSheet);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function syncNetworkStatus() {
    if (!networkStatus) return;
    const offline = navigator.onLine === false;
    networkStatus.textContent = offline ? 'Offline' : '';
    networkStatus.classList.toggle('show', offline);
    networkStatus.setAttribute('aria-hidden', String(!offline));
  }

  function syncPageActivity() {
    app?.classList.toggle('page-hidden', document.hidden);
  }

  function syncConnectionPreference() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const constrained = Boolean(connection?.saveData) || /(^|-)2g$/.test(String(connection?.effectiveType || ''));
    app?.toggleAttribute('data-save-data', constrained);
  }

  function setupKeyboardGuard() {
    // This listener registers before app.js. At document bubble phase the focused
    // control has already received the key, so stopping later document handlers does
    // not steal the control's native Space/arrow behaviour.
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sheetIsOpen() && songSheet?.contains(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sheetClose?.click();
        return;
      }

      if (event.key.toLowerCase() === 's' && event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        shareCurrentTrack();
        return;
      }

      if (!isPlayerShortcut(event)) return;
      if (event.metaKey || event.ctrlKey || event.altKey || isInteractiveTarget(event.target)) {
        event.stopImmediatePropagation();
      }
    });
  }

  function setupObservers() {
    const metadataObserver = new MutationObserver(syncControlLabels);
    for (const element of [songTitle, songArtist, queueBadge, favouriteButton, elapsedTime, durationTime]) {
      if (!element) continue;
      metadataObserver.observe(element, { childList: true, characterData: true, subtree: true, attributes: element === favouriteButton, attributeFilter: element === favouriteButton ? ['aria-pressed'] : undefined });
    }

    if (songSheet) {
      const sheetObserver = new MutationObserver(syncSheetModal);
      sheetObserver.observe(songSheet, { attributes: true, attributeFilter: ['aria-hidden', 'aria-modal', 'data-snap', 'class'] });
      songSheet.addEventListener('keydown', trapSheetTab);
    }
  }

  function init() {
    shareButton?.addEventListener('click', shareCurrentTrack);
    window.addEventListener('online', syncNetworkStatus);
    window.addEventListener('offline', syncNetworkStatus);
    document.addEventListener('visibilitychange', syncPageActivity);

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    connection?.addEventListener?.('change', syncConnectionPreference);

    setupKeyboardGuard();
    setupObservers();
    syncControlLabels();
    syncNetworkStatus();
    syncPageActivity();
    syncConnectionPreference();
    syncSheetModal();
  }

  init();
})();
