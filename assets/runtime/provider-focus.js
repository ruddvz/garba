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
