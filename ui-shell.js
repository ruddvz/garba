(() => {
  const $ = (id) => document.getElementById(id);
  const app = $('app');
  const sheet = $('songSheet');
  const sheetClose = $('sheetClose');
  const browseButton = $('browseButton');
  const searchButton = $('searchButton');
  const queueButton = $('queueButton');
  const favouritesButton = $('favouritesButton');
  const mobileFavourite = $('mobileFavourite');
  const utilities = document.querySelector('.utilities');
  const mobileQuery = window.matchMedia('(max-width: 700px)');

  if (!app || !sheet) return;

  function relocateCurrentFavourite() {
    if (!mobileFavourite || !utilities) return;
    if (!mobileFavourite.classList.contains('utility-favourite')) {
      mobileFavourite.classList.add('utility-favourite');
      mobileFavourite.title = 'Favourite current song';
    }
    if (mobileFavourite.parentElement !== utilities) {
      utilities.insertBefore(mobileFavourite, queueButton || null);
    }
  }

  function ensureSheetBackdrop() {
    let backdrop = $('sheetBackdrop');
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = 'sheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    backdrop.addEventListener('click', () => sheetClose?.click());
    app.insertBefore(backdrop, sheet);
    return backdrop;
  }

  const sheetBackdrop = ensureSheetBackdrop();

  function syncSheetChrome() {
    const snap = sheet.dataset.snap || 'closed';
    const modal = mobileQuery.matches && (snap === 'medium' || snap === 'full');
    sheetBackdrop.hidden = !modal;
    sheetBackdrop.setAttribute('aria-hidden', String(!modal));
    app.classList.toggle('sheet-modal-open', modal);
    sheet.setAttribute('aria-modal', String(modal));
    if (sheetClose) {
      sheetClose.title = 'Close song browser';
      sheetClose.setAttribute('aria-label', 'Close song browser');
    }
  }

  function providerIsOpen() {
    return document.querySelector('#providerStage.open[aria-hidden="false"]');
  }

  function closeProviderOnOutsideClick(event) {
    const stage = providerIsOpen();
    if (!stage) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (stage.contains(target)) return;
    if ($('playButton')?.contains(target) || $('miniPlay')?.contains(target)) return;
    stage.querySelector('#providerDockStop')?.click();
  }

  function closeTopLayerOnEscape(event) {
    if (event.key !== 'Escape') return;
    const provider = providerIsOpen();
    if (provider) {
      event.preventDefault();
      provider.querySelector('#providerDockStop')?.click();
      return;
    }
    if (mobileQuery.matches && ['medium', 'full'].includes(sheet.dataset.snap || '')) {
      event.preventDefault();
      sheetClose?.click();
    }
  }

  function keepFocusedControlVisible(event) {
    if (!mobileQuery.matches) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches('button, input, a[href]')) return;
    requestAnimationFrame(() => {
      target.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    });
  }

  relocateCurrentFavourite();
  syncSheetChrome();

  new MutationObserver(syncSheetChrome).observe(sheet, {
    attributes: true,
    attributeFilter: ['data-snap', 'aria-hidden'],
  });

  mobileQuery.addEventListener?.('change', () => {
    relocateCurrentFavourite();
    syncSheetChrome();
  });

  document.addEventListener('click', closeProviderOnOutsideClick);
  document.addEventListener('keydown', closeTopLayerOnEscape, true);
  document.addEventListener('focusin', keepFocusedControlVisible);

  for (const trigger of [browseButton, searchButton, queueButton, favouritesButton]) {
    trigger?.addEventListener('click', () => requestAnimationFrame(syncSheetChrome));
  }

  window.addEventListener('pageshow', () => {
    relocateCurrentFavourite();
    syncSheetChrome();
  });
})();
