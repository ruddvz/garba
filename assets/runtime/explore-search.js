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
  button.setAttribute('aria-keyshortcuts', '/ Control+K Meta+K');
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
    .explore-search-label input::-webkit-search-cancel-button{display:none}
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

(() => {
  const songList = document.getElementById('catalogueSongList');
  const sectionRoot = document.getElementById('catalogueSections');
  if (!songList || !sectionRoot) return;

  const STORAGE_KEY = 'playgarba:explore:shelf-scrolls';
  const SHELF_SELECTOR = '.collection-grid,.essential-release-rail,.release-rail';
  const AUTO_PAGE_COOLDOWN_MS = 650;
  let pagerObserver = null;
  let refreshQueued = false;
  let lastAutoPageAt = 0;
  let saveTimer = 0;

  const performanceStyle = document.createElement('style');
  performanceStyle.dataset.playgarbaExplorePerformance = '';
  performanceStyle.textContent = `
    html{scroll-padding-top:92px}
    .catalogue-section{content-visibility:auto;contain-intrinsic-size:auto 560px}
    .collection-card{transform:none;contain:layout paint style}
    .song-row{content-visibility:auto;contain-intrinsic-size:72px;contain:layout paint style}
    .release-card,.release-more{content-visibility:auto;contain-intrinsic-size:236px}
    .collection-grid,.release-rail,.essential-release-rail{-webkit-overflow-scrolling:touch;overscroll-behavior-inline:contain}
    .song-more[data-auto-paging="true"]{position:relative;justify-self:stretch;width:100%;min-height:52px;border-style:dashed;color:rgba(255,248,236,.66);background:rgba(255,255,255,.025);pointer-events:none}
    .song-more[data-auto-paging="true"]::after{content:"";display:inline-block;width:13px;height:13px;margin-left:9px;border:1.5px solid rgba(255,248,236,.28);border-top-color:var(--gold);border-radius:50%;vertical-align:-2px;animation:exploreAutoPageSpin .75s linear infinite}
    @keyframes exploreAutoPageSpin{to{transform:rotate(1turn)}}
    @media(max-width:900px){
      .catalogue-section{margin-bottom:30px;contain-intrinsic-size:auto 330px}
      .section-title-row{align-items:center;margin-bottom:11px}
      .section-title-row p{display:none}
      .collection-grid{grid-template-columns:none!important;grid-auto-flow:column;grid-auto-columns:minmax(235px,68vw);gap:12px;overflow-x:auto;overflow-y:hidden;margin-inline:-17px;padding:4px 17px 14px;scroll-snap-type:x proximity;scrollbar-width:none;touch-action:pan-x pan-y}
      .collection-grid::-webkit-scrollbar,.release-rail::-webkit-scrollbar,.essential-release-rail::-webkit-scrollbar{display:none}
      .collection-card{width:auto;min-height:198px;aspect-ratio:1.18/1;scroll-snap-align:start;scroll-snap-stop:normal}
      .collection-copy strong{font-size:clamp(1.28rem,4.6vw,1.68rem)}
    }
    @media(max-width:560px){
      html{scroll-padding-top:78px}
      main{padding-bottom:max(64px,calc(42px + env(safe-area-inset-bottom)))}
      .collection-home{padding-top:2px}
      .catalogue-section{margin-bottom:24px;contain-intrinsic-size:auto 292px}
      .collection-grid{grid-auto-columns:minmax(242px,82vw);gap:10px;margin-inline:-11px;padding:3px 11px 12px}
      .collection-card{min-height:176px;aspect-ratio:1.34/1;border-radius:23px}
      .collection-copy{inset:16px}
      .collection-copy strong{max-width:15ch;font-size:clamp(1.28rem,6.2vw,1.58rem)}
      .collection-copy span{margin-top:8px;font-size:.68rem}
      .essential-release-section{margin-bottom:25px;padding:12px 12px 10px}
      .essential-release-rail{grid-auto-columns:minmax(142px,43vw);gap:9px}
      .songs-section,.release-section{content-visibility:auto;contain-intrinsic-size:auto 620px}
      .song-row{contain-intrinsic-size:66px}
    }
    @media(pointer:coarse){
      body::before{filter:saturate(1.01) contrast(1.01);transform:scale(1.008)}
      .collection-card,.collection-image,.collection-card::after,.essential-release-card,.release-cover{transition-duration:.12s!important}
      .collection-card{box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 14px 34px rgba(0,0,0,.22)}
      .collection-card::after{mix-blend-mode:normal;opacity:.14;transform:none}
      .collection-image{transform:scale(1.018)}
      .detail-head,.release-section,.songs-section,.essential-release-section,.close-explore,.search-explore{backdrop-filter:blur(12px) saturate(1.03);-webkit-backdrop-filter:blur(12px) saturate(1.03)}
    }
    @media(prefers-reduced-motion:reduce){.song-more[data-auto-paging="true"]::after{animation:none}}
  `;
  document.head.append(performanceStyle);

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
    return section?.querySelector('.section-title-row h2,.section-heading h3')?.textContent?.trim() || shelf.id || null;
  }

  function saveShelfPositions() {
    const state = readShelfState();
    document.querySelectorAll(SHELF_SELECTOR).forEach((shelf) => {
      const key = shelfKey(shelf);
      if (!key) return;
      state[key] = Math.max(0, Math.round(shelf.scrollLeft));
    });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Scroll memory is optional. Never let storage failure affect browsing.
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

  function bindShelves(root = document) {
    root.querySelectorAll?.(SHELF_SELECTOR).forEach((shelf) => {
      if (!(shelf instanceof HTMLElement) || shelf.dataset.scrollContinuityBound === 'true') return;
      shelf.dataset.scrollContinuityBound = 'true';
      shelf.addEventListener('scroll', () => {
        clearTimeout(saveTimer);
        saveTimer = window.setTimeout(saveShelfPositions, 140);
      }, { passive: true });
    });
    restoreShelfPositions(root);
  }

  function bindSongPager() {
    pagerObserver?.disconnect();
    pagerObserver = null;
    const more = songList.querySelector('.song-more');
    if (!(more instanceof HTMLButtonElement)) return;
    more.removeAttribute('data-auto-paging');
    if (!('IntersectionObserver' in window)) return;

    pagerObserver = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastAutoPageAt < AUTO_PAGE_COOLDOWN_MS || !more.isConnected || more.disabled) return;
      lastAutoPageAt = now;
      more.dataset.autoPaging = 'true';
      more.textContent = 'Loading more songs';
      pagerObserver?.disconnect();
      requestAnimationFrame(() => more.click());
    }, { rootMargin: '950px 0px 1150px 0px', threshold: .01 });

    pagerObserver.observe(more);
  }

  function refresh() {
    refreshQueued = false;
    bindShelves(document);
    bindSongPager();
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(refresh);
  }

  new MutationObserver(queueRefresh).observe(sectionRoot, { childList: true, subtree: true });
  new MutationObserver(queueRefresh).observe(songList, { childList: true, subtree: true });
  window.addEventListener('pagehide', saveShelfPositions);
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveShelfPositions();
  });

  refresh();
})();

(() => {
  const responsiveStyle = document.createElement('style');
  responsiveStyle.dataset.playgarbaExploreResponsive = '';
  responsiveStyle.textContent = `
    :root{--explore-gutter:clamp(17px,3vw,42px)}
    .topbar,main{width:min(var(--max),calc(100% - (var(--explore-gutter) * 2)))}
    .topbar{min-height:82px;padding-top:max(10px,env(safe-area-inset-top));isolation:isolate}
    .topbar::before{content:"";position:absolute;inset:0 calc(var(--explore-gutter) * -1);z-index:-1;pointer-events:none;background:linear-gradient(to bottom,rgba(8,8,11,.82),rgba(8,8,11,.42) 62%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);mask-image:linear-gradient(to bottom,#000 0 68%,transparent);-webkit-mask-image:linear-gradient(to bottom,#000 0 68%,transparent)}
    .explore-title{font-size:clamp(1.16rem,1.7vw,1.38rem);white-space:nowrap}
    main{padding-top:clamp(8px,1.5vw,18px)}
    .collection-home{padding-top:clamp(3px,1vw,10px)}
    .catalogue-section{margin-bottom:clamp(32px,4.2vw,54px)}
    .section-title-row{margin-inline:2px;margin-bottom:14px}
    .section-title-row h2{font-size:clamp(1.03rem,1.6vw,1.22rem)}
    .collection-grid{gap:clamp(12px,1.25vw,17px)}
    .collection-card{min-height:clamp(214px,19vw,276px);border-radius:clamp(24px,2.2vw,30px)}
    .collection-copy{inset:clamp(18px,2.1vw,26px)}
    .collection-copy strong{font-size:clamp(1.28rem,2vw,1.76rem)}
    .detail-head{width:min(920px,100%);margin-bottom:clamp(20px,3vw,30px)}
    .release-section,.songs-section{scroll-margin-top:100px}
    .release-rail,.essential-release-rail{scroll-padding-inline:3px}
    .release-title,.release-meta{overflow:hidden;text-overflow:ellipsis}
    .release-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;min-height:2.5em}
    .back-button,.quiet-button,.play-link,.song-more,.retry-button{touch-action:manipulation}

    @media(min-width:1181px){
      .collection-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
      .collection-card{aspect-ratio:1.2/1}
    }

    @media(min-width:901px) and (max-width:1180px){
      :root{--explore-gutter:clamp(24px,3.2vw,36px)}
      .collection-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      .collection-card{min-height:220px;aspect-ratio:1.12/1}
      .collection-copy strong{font-size:clamp(1.28rem,2.5vw,1.62rem)}
      .section-title-row p{max-width:44vw}
      .collection-detail{width:min(980px,100%)}
      .detail-head{padding:clamp(36px,5.5vw,56px) clamp(28px,5vw,54px)}
      .release-section,.songs-section{padding:20px}
    }

    @media(min-width:641px) and (max-width:900px){
      :root{--explore-gutter:clamp(20px,3.4vw,30px)}
      html{scroll-padding-top:94px}
      .topbar{min-height:80px}
      main{padding-top:8px}
      .catalogue-section{margin-bottom:32px;contain-intrinsic-size:auto 340px}
      .section-title-row{margin-bottom:12px}
      body .collection-grid{grid-template-columns:none!important;grid-auto-flow:column;grid-auto-columns:minmax(270px,44vw);gap:12px;overflow-x:auto;overflow-y:hidden;margin-inline:calc(var(--explore-gutter) * -1);padding:4px var(--explore-gutter) 15px;scroll-snap-type:x proximity;scroll-padding-inline:var(--explore-gutter);scrollbar-width:none;touch-action:pan-x pan-y}
      body .collection-card{width:auto;min-height:204px;aspect-ratio:1.18/1;border-radius:26px;scroll-snap-align:start;scroll-snap-stop:normal}
      .collection-copy strong{font-size:clamp(1.3rem,3.7vw,1.62rem)}
      .essential-release-section{margin-bottom:38px}
      .essential-release-rail{grid-auto-columns:minmax(174px,25vw)}
      .collection-detail{width:min(760px,100%)}
      .detail-head{padding:clamp(34px,6vw,50px) clamp(24px,5vw,42px);border-radius:28px}
      .detail-head h2{font-size:clamp(2.8rem,8vw,4.8rem)}
      .release-section,.songs-section{padding:19px;border-radius:26px}
      .release-rail{grid-auto-columns:minmax(164px,25vw)}
      .song-row{grid-template-columns:50px minmax(0,1fr) auto;gap:12px}
    }

    @media(max-width:640px){
      :root{--explore-gutter:clamp(11px,3.5vw,17px)}
      html{scroll-padding-top:78px}
      .topbar,main{width:calc(100% - (var(--explore-gutter) * 2))}
      .topbar{min-height:70px;padding-top:max(8px,env(safe-area-inset-top))}
      .topbar::before{inset-inline:calc(var(--explore-gutter) * -1)}
      .explore-title{font-size:1.13rem}
      .search-explore,.close-explore{width:42px;height:42px}
      main{padding-top:5px;padding-bottom:max(68px,calc(46px + env(safe-area-inset-bottom)))}
      .collection-home{padding-top:1px}
      .catalogue-section{margin-bottom:25px;contain-intrinsic-size:auto 294px}
      .section-title-row{margin-inline:1px;margin-bottom:10px}
      .section-title-row h2{font-size:1rem}
      body .collection-grid{grid-template-columns:none!important;grid-auto-flow:column;grid-auto-columns:minmax(248px,84vw);gap:10px;overflow-x:auto;overflow-y:hidden;margin-inline:calc(var(--explore-gutter) * -1);padding:3px var(--explore-gutter) 13px;scroll-snap-type:x proximity;scroll-padding-inline:var(--explore-gutter);scrollbar-width:none;touch-action:pan-x pan-y}
      body .collection-card{width:auto;min-height:176px;aspect-ratio:1.38/1;border-radius:22px;scroll-snap-align:start;scroll-snap-stop:normal}
      .collection-copy{inset:15px}
      .collection-copy small{font-size:.62rem;margin-bottom:6px}
      .collection-copy strong{max-width:15ch;font-size:clamp(1.26rem,6.3vw,1.56rem);line-height:1.04}
      .collection-copy span{margin-top:8px;font-size:.68rem}
      .essential-release-section{margin-inline:0;margin-bottom:25px;padding:12px;border-radius:22px}
      .essential-release-rail{grid-auto-columns:minmax(145px,44vw);gap:9px;margin-right:-12px;padding-right:12px}
      .essential-release-card{padding:7px;border-radius:18px}
      .collection-detail{padding-top:1px}
      .back-button{min-height:44px;margin-bottom:11px;padding-inline:14px}
      .detail-head{margin-bottom:18px;padding:30px 18px;border-radius:22px}
      .detail-head h2{font-size:clamp(2.35rem,12.2vw,3.7rem);line-height:.98}
      .detail-head>p:not(.eyebrow){margin-top:15px;font-size:.88rem;line-height:1.55}
      .detail-meta{margin-top:16px;gap:6px}
      .detail-meta span{padding:6px 9px;font-size:.72rem}
      .release-section,.songs-section{margin-top:12px;margin-inline:0;padding:14px;border-radius:21px}
      .section-heading{gap:10px;margin-bottom:13px}
      .section-heading h3{font-size:1.12rem}
      .section-heading>span{font-size:.76rem}
      .quiet-button{min-height:42px;padding-inline:10px;font-size:.73rem;white-space:nowrap}
      .release-rail{grid-auto-columns:minmax(146px,45vw);gap:9px;margin-right:-14px;padding-right:14px}
      .release-cover{border-radius:16px}
      .release-title{margin-top:8px;font-size:.86rem}
      .release-meta{font-size:.71rem}
      .song-row{grid-template-columns:46px minmax(0,1fr) auto;gap:9px;min-height:64px;padding:9px 2px}
      .song-art{width:46px;height:46px;border-radius:10px}
      .song-copy strong{font-size:.89rem}
      .song-copy span{font-size:.72rem}
      .play-link{min-width:58px;min-height:42px;padding-inline:11px;font-size:.75rem}
      .song-more{min-height:46px;width:100%;justify-self:stretch}
      body.explore-search-open .catalogue-status{width:calc(100% - (var(--explore-gutter) * 2));max-height:calc(100dvh - max(84px,calc(env(safe-area-inset-top) + 74px)));padding:9px;border-radius:18px}
      .explore-search-label{min-height:50px;border-radius:14px}
    }

    @media(max-width:420px){
      .section-heading{align-items:flex-start;flex-wrap:wrap}
      .section-heading>span{margin-left:auto;padding-top:4px}
      .release-section .section-heading{align-items:center}
      .release-section .section-heading>div{min-width:0;flex:1 1 170px}
      .release-section .quiet-button{flex:0 0 auto}
      body .collection-grid{grid-auto-columns:minmax(244px,86vw)}
      .play-link{min-width:54px;padding-inline:9px}
    }

    @media(max-width:350px){
      :root{--explore-gutter:10px}
      .search-explore,.close-explore{width:40px;height:40px}
      body .collection-grid{grid-auto-columns:minmax(232px,88vw)}
      body .collection-card{min-height:168px}
      .section-heading{gap:7px}
      .quiet-button{padding-inline:8px;font-size:.7rem}
      .song-row{grid-template-columns:42px minmax(0,1fr) auto;gap:7px}
      .song-art{width:42px;height:42px}
      .play-link{min-width:50px;padding-inline:8px;font-size:.72rem}
    }

    @media(max-height:600px) and (orientation:landscape){
      .topbar{min-height:60px;padding-top:max(5px,env(safe-area-inset-top))}
      .search-explore,.close-explore{width:40px;height:40px}
      main{padding-top:2px}
      .catalogue-section{margin-bottom:20px}
      body .collection-grid{grid-auto-columns:minmax(230px,34vw);padding-bottom:10px}
      body .collection-card{min-height:154px;aspect-ratio:1.42/1}
      .detail-head{padding-block:24px}
    }

    @media(pointer:coarse){
      .back-button,.quiet-button,.play-link,.song-more,.retry-button{min-height:44px}
      .release-card{touch-action:manipulation}
      .collection-card{touch-action:manipulation}
    }

    @media(hover:hover) and (pointer:fine){
      .back-button,.quiet-button,.play-link,.release-card{transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}
      .back-button:hover,.quiet-button:hover{transform:translateY(-1px)}
    }

    @media(prefers-reduced-motion:reduce){
      .topbar::before{backdrop-filter:none;-webkit-backdrop-filter:none}
    }
  `;
  document.head.append(responsiveStyle);
})();

(() => {
  const detail = document.getElementById('collectionDetail');
  const releaseSection = document.getElementById('releaseSection');
  const releaseRail = document.getElementById('releaseRail');
  const showAll = document.getElementById('showAllSongs');
  const songsSection = detail?.querySelector('.songs-section');
  const songsHeading = songsSection?.querySelector('.section-heading > div');
  const songsEyebrow = songsSection?.querySelector('.eyebrow');
  if (!detail || !releaseSection || !releaseRail || !showAll || !songsSection || !songsHeading || !songsEyebrow) return;

  const selectedContext = document.createElement('p');
  selectedContext.className = 'selected-release-context';
  selectedContext.hidden = true;
  songsHeading.append(selectedContext);

  const detailStyle = document.createElement('style');
  detailStyle.dataset.playgarbaExploreDetailRefinement = '';
  detailStyle.textContent = `
    .collection-detail{width:min(1060px,100%)}
    .collection-detail .detail-actions{width:min(980px,100%);margin-inline:auto;margin-bottom:12px}
    .collection-detail .detail-head{width:min(980px,100%);max-width:none;margin-bottom:14px;padding:clamp(28px,4.6vw,48px) clamp(22px,5vw,54px);border-radius:28px;background:radial-gradient(circle at 50% 0%,rgba(255,226,177,.085),transparent 36%),rgba(15,14,20,.48);box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 24px 70px rgba(0,0,0,.24)}
    .collection-detail .detail-head h2{max-width:18ch;margin-inline:auto;font-size:clamp(2.15rem,5.2vw,4.25rem);line-height:.98;letter-spacing:-.055em}
    .collection-detail .detail-head>p:not(.eyebrow){max-width:620px;margin-top:14px;font-size:.92rem;line-height:1.55}
    .collection-detail .detail-meta{margin-top:16px}
    .collection-detail .release-section,.collection-detail .songs-section{border-radius:25px;box-shadow:inset 0 1px 0 rgba(255,255,255,.065),0 20px 58px rgba(0,0,0,.20)}
    .collection-detail .release-section{margin-top:10px;padding:20px 20px 17px;background:rgba(15,14,20,.44)}
    .collection-detail .songs-section{margin-top:10px;padding:20px;background:rgba(14,13,19,.60)}
    .collection-detail[data-release-filter="true"] .release-section{border-color:rgba(231,201,143,.16)}
    .collection-detail[data-release-filter="true"] .songs-section{border-color:rgba(231,201,143,.20);background:linear-gradient(180deg,rgba(231,201,143,.025),transparent 120px),rgba(14,13,19,.62)}
    .collection-detail .section-heading{align-items:flex-start;margin-bottom:14px}
    .collection-detail .section-heading>div{min-width:0}
    .collection-detail .section-heading h3{max-width:32ch;font-size:clamp(1.18rem,2vw,1.38rem);line-height:1.12;text-wrap:balance}
    .collection-detail .section-heading>span{max-width:40ch;padding-top:3px;line-height:1.35;text-align:right}
    .selected-release-context{display:block;max-width:58ch;margin:6px 0 0;color:rgba(255,248,236,.56);font-size:.74rem;line-height:1.4}
    .selected-release-context[hidden]{display:none}
    .release-rail{scroll-padding-inline:3px;overscroll-behavior-x:contain}
    .release-card{display:grid;grid-template-rows:auto minmax(2.45em,auto) minmax(2em,auto);align-content:start}
    .release-title{display:-webkit-box;min-height:2.45em;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;text-overflow:ellipsis;text-wrap:pretty}
    .release-meta{display:-webkit-box;min-height:2em;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;text-overflow:ellipsis}
    .release-card.active .release-cover{transform:none;outline:0;border-color:rgba(231,201,143,.80);box-shadow:0 18px 46px rgba(0,0,0,.32),0 0 0 2px rgba(231,201,143,.82),0 0 0 6px rgba(231,201,143,.055)}
    .release-card.active::after{content:"✓";top:9px;right:9px;display:grid;place-items:center;width:28px;height:28px;padding:0;border:1px solid rgba(255,255,255,.32);border-radius:50%;color:#171419;background:rgba(255,248,236,.94);font-size:.72rem;font-weight:900;line-height:1;box-shadow:0 8px 22px rgba(0,0,0,.26)}
    .release-card.active .release-title{color:rgba(255,238,209,.96)}
    .release-card[aria-current="true"]{cursor:default}
    .quiet-button[hidden]{display:none!important}
    .song-list{gap:1px}
    .song-row{min-height:72px;padding:9px 10px;border-top-color:rgba(255,255,255,.065);border-radius:16px}
    .song-row:hover{background:rgba(255,255,255,.042)}
    .song-copy strong{line-height:1.25}
    .play-link{min-width:82px;min-height:42px;gap:6px;padding-inline:14px}
    .play-link::before{content:"▶";font-size:.58rem;line-height:1;transform:translateY(.2px)}

    @media(max-width:900px){
      .collection-detail .detail-head{padding:30px 24px}
      .collection-detail .detail-head h2{font-size:clamp(2.2rem,7.4vw,3.8rem)}
      .collection-detail .release-section,.collection-detail .songs-section{padding:18px}
    }

    @media(max-width:640px){
      .collection-detail .detail-actions{margin-bottom:9px}
      .collection-detail .detail-head{margin-bottom:11px;padding:24px 17px;border-radius:21px}
      .collection-detail .detail-head h2{max-width:16ch;font-size:clamp(2rem,10vw,3rem);line-height:1}
      .collection-detail .detail-head>p:not(.eyebrow){margin-top:12px;font-size:.86rem;line-height:1.5}
      .collection-detail .detail-meta{margin-top:13px}
      .collection-detail .release-section,.collection-detail .songs-section{margin-top:8px;padding:13px;border-radius:20px}
      .collection-detail .section-heading{gap:8px;margin-bottom:11px}
      .collection-detail .section-heading h3{max-width:22ch;font-size:1.08rem;line-height:1.15}
      .collection-detail .section-heading>span{font-size:.72rem}
      .selected-release-context{margin-top:5px;font-size:.7rem;line-height:1.35}
      .release-rail{grid-auto-columns:minmax(142px,44vw);gap:9px;margin-right:-13px;padding-right:13px}
      .release-title{font-size:.84rem}
      .release-meta{font-size:.7rem}
      .release-card.active::after{top:7px;right:7px;width:25px;height:25px;font-size:.66rem}
      .song-row{grid-template-columns:45px minmax(0,1fr) auto;gap:9px;min-height:66px;padding:8px 3px}
      .song-art{width:45px;height:45px}
      .song-copy strong{display:-webkit-box;overflow:hidden;white-space:normal;-webkit-box-orient:vertical;-webkit-line-clamp:2;font-size:.88rem;line-height:1.18}
      .song-copy span{margin-top:2px;white-space:nowrap}
      .play-link{min-width:60px;min-height:44px;padding-inline:10px;font-size:.73rem}
      .play-link::before{font-size:.54rem}
    }

    @media(max-width:420px){
      .collection-detail .section-heading{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start}
      .collection-detail .section-heading>span{align-self:end;max-width:16ch;padding-top:0;font-size:.69rem}
      .collection-detail .release-section .section-heading{display:flex;align-items:center}
      .release-card{grid-template-rows:auto minmax(2.35em,auto) minmax(2em,auto)}
      .song-row{grid-template-columns:43px minmax(0,1fr) auto;gap:8px}
      .song-art{width:43px;height:43px}
      .play-link{min-width:56px;padding-inline:8px}
    }

    @media(max-width:380px){
      .collection-detail .detail-head{padding-inline:14px}
      .collection-detail .detail-head h2{font-size:clamp(1.9rem,9.7vw,2.65rem)}
      .release-rail{grid-auto-columns:minmax(136px,45vw)}
      .song-row{grid-template-columns:42px minmax(0,1fr) 44px;gap:7px}
      .song-art{width:42px;height:42px}
      .play-link{width:44px;min-width:44px;padding:0;font-size:0}
      .play-link::before{margin:0;font-size:.72rem}
    }

    @media(hover:hover) and (pointer:fine){
      .release-card.active:hover .release-cover{transform:none}
    }

    @media(prefers-reduced-motion:reduce){
      .release-card.active .release-cover{transform:none}
    }
  `;
  document.head.append(detailStyle);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let syncQueued = false;

  function revealActiveRelease(active) {
    if (!(active instanceof HTMLElement)) return;
    const railRect = releaseRail.getBoundingClientRect();
    const cardRect = active.getBoundingClientRect();
    const inset = 6;
    let delta = 0;
    if (cardRect.left < railRect.left + inset) delta = cardRect.left - railRect.left - inset;
    else if (cardRect.right > railRect.right - inset) delta = cardRect.right - railRect.right + inset;
    if (Math.abs(delta) < 1) return;
    releaseRail.scrollTo({
      left: Math.max(0, releaseRail.scrollLeft + delta),
      behavior: reduced.matches ? 'auto' : 'smooth',
    });
  }

  function syncDetailState() {
    syncQueued = false;
    const cards = [...releaseRail.querySelectorAll('.release-card')];
    const active = cards.find((card) => card.classList.contains('active')) || null;
    const hasActiveRelease = Boolean(active);
    detail.dataset.releaseFilter = hasActiveRelease ? 'true' : 'false';
    showAll.hidden = !hasActiveRelease;
    showAll.textContent = 'All songs';
    showAll.setAttribute('aria-label', 'Show all songs in this catalogue');
    songsEyebrow.textContent = hasActiveRelease ? 'Selected release' : 'Songs';

    cards.forEach((card) => {
      if (card === active) card.setAttribute('aria-current', 'true');
      else card.removeAttribute('aria-current');
    });

    if (active) {
      selectedContext.textContent = active.querySelector('.release-meta')?.textContent?.trim() || '';
      selectedContext.hidden = !selectedContext.textContent;
      requestAnimationFrame(() => revealActiveRelease(active));
    } else {
      selectedContext.textContent = '';
      selectedContext.hidden = true;
    }
  }

  function queueSyncDetailState() {
    if (syncQueued) return;
    syncQueued = true;
    queueMicrotask(syncDetailState);
  }

  new MutationObserver(queueSyncDetailState).observe(releaseRail, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  new MutationObserver(queueSyncDetailState).observe(songsSection, { childList: true, subtree: true });
  window.addEventListener('popstate', () => queueMicrotask(queueSyncDetailState));
  window.addEventListener('pageshow', queueSyncDetailState);
  queueSyncDetailState();
})();
