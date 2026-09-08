const input = document.getElementById('catalogueSearch');
const status = input?.closest('.catalogue-status');
const topbar = document.querySelector('.topbar');
const spacer = topbar?.querySelector('.topbar-spacer');

if (input && status && topbar && spacer) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'search-explore';
  button.setAttribute('aria-label', 'Search PlayGarba');
  button.setAttribute('aria-controls', 'catalogueSearchPanel');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="5.8"></circle><path d="m15.4 15.4 4.6 4.6"></path></svg>';
  spacer.replaceWith(button);

  status.id = 'catalogueSearchPanel';
  status.setAttribute('role', 'search');
  status.setAttribute('aria-hidden', 'true');
  input.placeholder = 'Search songs, artists or albums';
  input.removeAttribute('tabindex');
  input.setAttribute('enterkeyhint', 'search');
  input.setAttribute('aria-label', 'Search songs, artists or albums');

  const label = input.closest('label');
  label?.classList.add('explore-search-label');
  const searchIcon = document.createElement('svg');
  searchIcon.className = 'explore-search-field-icon';
  searchIcon.setAttribute('viewBox', '0 0 24 24');
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.innerHTML = '<circle cx="10.8" cy="10.8" r="5.8"></circle><path d="m15.4 15.4 4.6 4.6"></path>';
  label?.prepend(searchIcon);

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'explore-search-clear';
  clear.setAttribute('aria-label', 'Clear search');
  clear.hidden = true;
  clear.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"></path></svg>';
  label?.append(clear);

  const hint = document.createElement('p');
  hint.className = 'explore-search-hint';
  hint.textContent = 'Search 1,000+ Garba songs, artists and releases';
  status.append(hint);

  const style = document.createElement('style');
  style.dataset.playgarbaExploreSearch = '';
  style.textContent = `
    .search-explore{grid-column:1;justify-self:start;display:grid;place-items:center;width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.16);border-radius:50%;color:var(--text);background:rgba(19,18,24,.38);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 12px 38px rgba(0,0,0,.26);backdrop-filter:blur(22px) saturate(1.16);-webkit-backdrop-filter:blur(22px) saturate(1.16);cursor:pointer;transition:transform .18s ease,background .18s ease,border-color .18s ease,opacity .18s ease}
    .search-explore svg,.explore-search-field-icon,.explore-search-clear svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
    .search-explore:hover{transform:scale(1.04);background:rgba(29,27,34,.54);border-color:rgba(255,255,255,.26)}
    .search-explore:active{transform:scale(.97)}
    .search-explore:focus-visible,.explore-search-clear:focus-visible,.explore-search-label:focus-within{outline:2px solid var(--gold);outline-offset:3px}
    .search-explore:disabled{opacity:.45;cursor:wait}
    body.explore-search-open .search-explore{border-color:rgba(231,201,143,.42);background:rgba(38,33,26,.54)}
    .catalogue-status{display:none}
    body.explore-search-open .catalogue-status{position:fixed;top:max(78px,calc(env(safe-area-inset-top) + 68px));left:50%;z-index:60;display:block;width:min(680px,calc(100% - 34px));padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:rgba(13,12,17,.78);box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 28px 90px rgba(0,0,0,.38);backdrop-filter:blur(28px) saturate(1.16);-webkit-backdrop-filter:blur(28px) saturate(1.16);transform:translateX(-50%);animation:exploreSearchIn .18s cubic-bezier(.2,.7,.2,1)}
    .explore-search-label{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;min-height:52px;padding:0 14px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.055);transition:border-color .16s ease,background .16s ease}
    .explore-search-label:focus-within{border-color:rgba(231,201,143,.30);background:rgba(255,255,255,.07)}
    .explore-search-field-icon{color:rgba(255,248,236,.62)}
    .explore-search-label input{min-width:0;width:100%;padding:0;border:0;outline:0;color:var(--text);background:transparent;font-size:1rem;line-height:1.2}
    .explore-search-label input::placeholder{color:rgba(255,248,236,.44)}
    .explore-search-clear{display:grid;place-items:center;width:34px;height:34px;padding:0;border:0;border-radius:50%;color:rgba(255,248,236,.70);background:rgba(255,255,255,.065);cursor:pointer}
    .explore-search-clear[hidden]{display:none}
    .catalogue-status #catalogueCount{margin:8px 4px 0;color:rgba(255,248,236,.48);font-size:.72rem;line-height:1.35}
    .explore-search-hint{margin:5px 4px 0;color:rgba(255,248,236,.36);font-size:.69rem;line-height:1.35}
    body.explore-search-open::before{filter:saturate(.94) contrast(1.02) brightness(.78)}
    @keyframes exploreSearchIn{from{opacity:0;transform:translate(-50%,-8px) scale(.985)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
    @media(max-width:640px){.search-explore{width:42px;height:42px}.search-explore svg{width:19px;height:19px}body.explore-search-open .catalogue-status{top:max(72px,calc(env(safe-area-inset-top) + 62px));width:calc(100% - 22px);padding:9px;border-radius:20px}.explore-search-label{min-height:50px;border-radius:14px}.explore-search-hint{display:none}}
    @media(prefers-reduced-motion:reduce){body.explore-search-open .catalogue-status{animation:none}.search-explore{transition:none!important}}
  `;
  document.head.append(style);

  let restoreFocus = true;
  const isOpen = () => document.body.classList.contains('explore-search-open');
  const updateClear = () => { clear.hidden = !input.value.trim(); };

  function openSearch({ focus = true } = {}) {
    document.body.classList.add('explore-search-open');
    status.setAttribute('aria-hidden', 'false');
    button.setAttribute('aria-expanded', 'true');
    updateClear();
    if (focus && !input.disabled) requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  function closeSearch({ clearQuery = true, focusButton = restoreFocus } = {}) {
    if (clearQuery && input.value) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.body.classList.remove('explore-search-open');
    status.setAttribute('aria-hidden', 'true');
    button.setAttribute('aria-expanded', 'false');
    updateClear();
    if (focusButton && button.isConnected) requestAnimationFrame(() => button.focus({ preventScroll: true }));
  }

  button.addEventListener('click', () => {
    if (isOpen()) closeSearch();
    else openSearch();
  });

  clear.addEventListener('click', () => {
    if (!input.value) return;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateClear();
    input.focus({ preventScroll: true });
  });

  input.addEventListener('input', updateClear);

  document.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const typing = Boolean(target?.closest('input,textarea,select,[contenteditable="true"]'));
    const searchShortcut = event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k');
    if (searchShortcut && !typing) {
      event.preventDefault();
      restoreFocus = false;
      openSearch();
      restoreFocus = true;
      return;
    }
    if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeSearch();
    }
  }, { capture: true });

  const inputStateObserver = new MutationObserver(() => { button.disabled = input.disabled; });
  inputStateObserver.observe(input, { attributes: true, attributeFilter: ['disabled'] });
  button.disabled = input.disabled;

  function syncFromHistory() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const query = params.get('search');
    if (query) {
      openSearch({ focus: false });
      updateClear();
    } else if (isOpen() && !input.value) {
      closeSearch({ clearQuery: false, focusButton: false });
    }
  }

  window.addEventListener('popstate', () => requestAnimationFrame(syncFromHistory));
  queueMicrotask(syncFromHistory);
}
