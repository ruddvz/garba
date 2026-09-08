(() => {
  const progress = document.getElementById('progress');
  const audio = document.getElementById('audio');
  const durationTime = document.getElementById('durationTime');
  if (!progress || !audio) return;

  const defaultLabel = progress.getAttribute('aria-label') || 'Seek';
  let scheduled = false;

  function durationTextIsKnown() {
    const text = String(durationTime?.textContent || '').trim();
    return Boolean(text && text !== '--:--' && text !== '—' && text !== '0:00');
  }

  function directAudioSeekable() {
    const hasSource = Boolean(audio.currentSrc || audio.getAttribute('src'));
    const duration = Number(audio.duration);
    return hasSource && Number.isFinite(duration) && duration > 0;
  }

  function youtubeSeekable() {
    const stage = document.getElementById('youtubeStage');
    if (!stage?.classList.contains('open')) return false;
    if (stage.classList.contains('is-loading')) return false;
    if (stage.getAttribute('aria-hidden') === 'true') return false;
    return Boolean(window.GARBA_YOUTUBE_PLAYER?.activeSongId && durationTextIsKnown());
  }

  function sync() {
    scheduled = false;
    const seekable = directAudioSeekable() || youtubeSeekable();
    if (progress.disabled === seekable) progress.disabled = !seekable;
    progress.setAttribute('aria-disabled', String(!seekable));
    progress.setAttribute('aria-label', seekable ? defaultLabel : 'Seek unavailable for this playback source');
    progress.title = seekable ? defaultLabel : 'Seeking is unavailable for this playback source';
    progress.dataset.seekAvailable = seekable ? 'true' : 'false';
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(sync);
  }

  for (const eventName of ['loadedmetadata', 'durationchange', 'emptied', 'abort', 'error']) {
    audio.addEventListener(eventName, scheduleSync);
  }

  new MutationObserver(scheduleSync).observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'aria-hidden', 'src', 'disabled'],
  });

  window.addEventListener('garba:catalogue-ready', scheduleSync);
  window.addEventListener('pageshow', scheduleSync);
  scheduleSync();

  window.GARBA_SEEK_STATE_RUNTIME = { sync: scheduleSync };
})();

(() => {
  const mainPlay = document.getElementById('playButton');
  const miniPlay = document.getElementById('miniPlay');
  const STAGE_SELECTOR = '#providerStage, #youtubeStage';
  let lastTrigger = mainPlay || miniPlay || null;

  function usableTrigger(candidate) {
    if (!(candidate instanceof HTMLElement) || !candidate.isConnected || candidate.matches(':disabled')) return null;
    if (candidate.closest('[inert], [aria-hidden="true"]')) return null;
    return candidate;
  }

  function rememberTrigger(event) {
    const target = event.target instanceof Element ? event.target.closest('#playButton, #miniPlay') : null;
    if (target instanceof HTMLElement) lastTrigger = target;
  }

  function restoreFromHiddenStage(stage) {
    if (!(stage instanceof HTMLElement) || stage.getAttribute('aria-hidden') !== 'true') return;
    const active = document.activeElement;
    if (!(active instanceof Element) || !stage.contains(active)) return;

    const target = usableTrigger(lastTrigger) || usableTrigger(mainPlay) || usableTrigger(miniPlay);
    if (!target) {
      active.blur?.();
      return;
    }

    requestAnimationFrame(() => {
      if (stage.getAttribute('aria-hidden') !== 'true') return;
      if (!stage.contains(document.activeElement)) return;
      try { target.focus({ preventScroll: true }); }
      catch { target.focus(); }
    });
  }

  function inspectMutation(mutation) {
    if (mutation.type === 'attributes') {
      const stage = mutation.target instanceof Element ? mutation.target.closest(STAGE_SELECTOR) : null;
      if (stage) restoreFromHiddenStage(stage);
      return;
    }

    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches(STAGE_SELECTOR)) restoreFromHiddenStage(node);
      node.querySelectorAll?.(STAGE_SELECTOR).forEach(restoreFromHiddenStage);
    }
  }

  document.addEventListener('click', rememberTrigger, { capture: true });
  new MutationObserver((mutations) => mutations.forEach(inspectMutation)).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-hidden'],
  });

  window.addEventListener('pageshow', () => {
    document.querySelectorAll(STAGE_SELECTOR).forEach(restoreFromHiddenStage);
  });

  window.GARBA_PROVIDER_FOCUS_RUNTIME = {
    restore() { document.querySelectorAll(STAGE_SELECTOR).forEach(restoreFromHiddenStage); },
  };
})();
