const GARBA_NONSTOP_TRANSPORT_RUNTIME = true;

(() => {
  const app = document.getElementById('app');
  const nonstopButton = document.getElementById('nonstopButton');
  const queueButton = document.getElementById('queueButton');
  const queueBadge = document.getElementById('queueBadge');
  const transportIds = ['prevButton', 'nextButton', 'miniPrev', 'miniNext'];

  if (!app || !nonstopButton) return;

  function isNonstopActive() {
    return app.dataset.playMode === 'nonstop';
  }

  function openNonstopChooser() {
    nonstopButton.click();
  }

  function syncTransportControl(control, active) {
    if (!control) return;
    const previous = control.id === 'prevButton' || control.id === 'miniPrev';
    if (active) {
      control.title = 'Choose another Nonstop set';
      control.setAttribute('aria-label', 'Choose another Nonstop set');
      control.dataset.nonstopTransport = 'chooser';
      return;
    }
    if (control.dataset.nonstopTransport !== 'chooser') return;
    control.title = previous ? 'Previous' : 'Next';
    control.setAttribute('aria-label', previous ? 'Previous song' : 'Next song');
    delete control.dataset.nonstopTransport;
  }

  function syncUi() {
    const active = isNonstopActive();

    if (queueButton) {
      if (active) {
        queueButton.title = 'Browse Nonstop sets';
        queueButton.setAttribute('aria-label', 'Browse Nonstop sets');
        queueButton.dataset.nonstopTransport = 'chooser';
      } else if (queueButton.dataset.nonstopTransport === 'chooser') {
        queueButton.title = 'Up next';
        queueButton.setAttribute('aria-label', 'Show queue');
        delete queueButton.dataset.nonstopTransport;
      }
    }

    if (queueBadge) {
      queueBadge.hidden = active;
      queueBadge.setAttribute('aria-hidden', String(active));
    }

    transportIds
      .map((id) => document.getElementById(id))
      .forEach((control) => syncTransportControl(control, active));
  }

  function captureClick(event) {
    if (!isNonstopActive()) return;
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest('#queueButton, #prevButton, #nextButton, #miniPrev, #miniNext');
    if (!control) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openNonstopChooser();
  }

  function captureKeys(event) {
    if (!isNonstopActive()) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target?.isContentEditable) return;
    if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openNonstopChooser();
  }

  document.addEventListener('click', captureClick, { capture: true });
  document.addEventListener('keydown', captureKeys, { capture: true });

  new MutationObserver(() => queueMicrotask(syncUi))
    .observe(app, { attributes: true, attributeFilter: ['data-play-mode'] });

  syncUi();
})();
