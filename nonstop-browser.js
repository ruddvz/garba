(() => {
  const state = {
    sets: [],
    ready: false,
    loading: null,
    loadFailed: false,
    overlay: null,
    panel: null,
    player: null,
    list: null,
    search: null,
    summary: null,
    returnFocus: null,
  };

  const rank = {
    'official-artist-channel': 6,
    'artist-channel': 5,
    'verified-label-channel': 4,
    'label-channel': 4,
    'verified-distributor-channel': 3,
    'official-streaming-catalogue': 2,
    'community-upload': 1,
  };

  const $ = (id) => document.getElementById(id);
  const normalise = (value = '') => String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0a80-\u0aff]+/g, ' ')
    .trim();
  const formatTime = (seconds = 0) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds)) % 60).padStart(2, '0')}`;

  function announce(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  async function fetchJson(url) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  function durationFor(set) {
    if (Number.isFinite(Number(set.durationSeconds)) && Number(set.durationSeconds) > 0) return Number(set.durationSeconds);
    const ends = (set.segments || []).map((segment) => Number(segment.endSeconds)).filter(Number.isFinite);
    const starts = (set.segments || []).map((segment) => Number(segment.startSeconds)).filter(Number.isFinite);
    return Math.max(0, ...ends, ...starts);
  }

  function normalizeSet(set) {
    const source = set.source || {};
    return {
      ...set,
      artistsText: Array.isArray(set.artists) ? set.artists.join(' · ') : String(set.artist || ''),
      provider: source.provider,
      videoId: source.videoId,
      sourceUrl: source.url,
      embeddable: source.embeddable !== false && set.playbackPolicy !== 'youtube-external-visible',
      sourceType: set.officiality || set.setType || source.provider || 'source',
      durationSeconds: durationFor(set),
      segments: Array.isArray(set.segments) ? set.segments : [],
    };
  }

  async function loadSets() {
    const index = await fetchJson('data/discovery/sets/index.json');
    if (!index?.chunks?.length) throw new Error('Nonstop index unavailable');
    const chunks = await Promise.all(index.chunks.map((chunk) => fetchJson(`data/discovery/sets/${chunk}`)));
    const seen = new Set();
    const sets = chunks.flatMap((chunk) => chunk?.sets || [])
      .map(normalizeSet)
      .filter((set) => set.id && !seen.has(set.id) && seen.add(set.id))
      .sort((a, b) => (rank[b.sourceType] || 0) - (rank[a.sourceType] || 0)
        || Number(b.year || 0) - Number(a.year || 0)
        || a.title.localeCompare(b.title));
    if (!sets.length) throw new Error('No nonstop sets available');
    return sets;
  }

  function loadSetsOnce({ retry = false } = {}) {
    if (retry) {
      state.loading = null;
      state.ready = false;
      state.loadFailed = false;
    }
    if (state.ready) return Promise.resolve(state.sets);
    if (state.loading) return state.loading;

    state.loadFailed = false;
    state.loading = loadSets()
      .then((sets) => {
        state.sets = sets;
        state.ready = true;
        state.loadFailed = false;
        return sets;
      })
      .catch((error) => {
        state.loadFailed = true;
        throw error;
      })
      .finally(() => {
        state.loading = null;
      });
    return state.loading;
  }

  function injectStyles() {
    if ($('nonstopBrowserStyles')) return;
    const style = document.createElement('style');
    style.id = 'nonstopBrowserStyles';
    style.textContent = `
      .nonstop-browser-button{gap:.55rem}.nonstop-browser-button .infinity{font-size:1.2em;line-height:1}
      .nonstop-overlay{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(7,8,15,.78);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#fff}.nonstop-overlay.open{display:flex}
      .nonstop-panel{width:min(1060px,100%);max-height:min(900px,92dvh);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:26px;background:rgba(18,20,32,.97);box-shadow:0 36px 100px rgba(0,0,0,.58)}
      .nonstop-head{display:flex;align-items:center;gap:14px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.1)}.nonstop-head-copy{min-width:0;flex:1}.nonstop-head h2{margin:0;font:650 21px/1.2 system-ui}.nonstop-summary{display:block;margin-top:4px;color:rgba(255,255,255,.58);font:13px/1.35 system-ui}.nonstop-close{width:40px;height:40px;flex:0 0 auto;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:23px;cursor:pointer}.nonstop-close:focus-visible{outline:2px solid var(--accent,#d6b06f);outline-offset:2px}
      .nonstop-search-wrap{padding:12px 20px;border-bottom:1px solid rgba(255,255,255,.08)}.nonstop-search{box-sizing:border-box;width:100%;height:44px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.055);color:#fff;padding:0 14px;font:14px system-ui;outline:none}.nonstop-search:focus{border-color:rgba(255,255,255,.35);box-shadow:0 0 0 2px rgba(214,176,111,.12)}
      .nonstop-player{display:none;padding:16px 20px 18px;border-bottom:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.025)}.nonstop-player.open{display:block}.nonstop-player-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}.nonstop-player-copy{min-width:0;flex:1}.nonstop-player-copy strong{display:block;font:650 16px/1.3 system-ui}.nonstop-player-copy span{display:block;margin-top:3px;color:rgba(255,255,255,.6);font:13px/1.35 system-ui}.nonstop-player-frame{display:block;width:100%;aspect-ratio:16/9;min-width:200px;min-height:200px;border:0;border-radius:18px;background:#000}.nonstop-player-hide{border:0;border-radius:999px;background:rgba(255,255,255,.08);color:#fff;padding:8px 12px;cursor:pointer}.nonstop-player-hide:focus-visible{outline:2px solid var(--accent,#d6b06f);outline-offset:2px}
      .nonstop-chapters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px;max-height:190px;overflow:auto}.nonstop-chapter{display:flex;gap:9px;align-items:center;min-width:0;border:1px solid rgba(255,255,255,.09);border-radius:11px;background:rgba(255,255,255,.035);color:#fff;padding:9px 10px;text-align:left;cursor:pointer}.nonstop-chapter:hover{background:rgba(255,255,255,.09)}.nonstop-chapter:focus-visible{outline:2px solid var(--accent,#d6b06f);outline-offset:1px}.nonstop-chapter-time{flex:0 0 auto;color:rgba(255,255,255,.48);font:12px/1 system-ui;font-variant-numeric:tabular-nums}.nonstop-chapter-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:12px/1.25 system-ui}
      .nonstop-list{overflow:auto;overscroll-behavior:contain;padding:14px 20px 22px;display:grid;gap:9px}.nonstop-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 15px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(255,255,255,.03)}.nonstop-card-main{min-width:0}.nonstop-card-title{display:block;font:650 14px/1.3 system-ui}.nonstop-card-meta{display:block;margin-top:4px;color:rgba(255,255,255,.58);font:12px/1.4 system-ui}.nonstop-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.nonstop-badge{padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.065);color:rgba(255,255,255,.68);font:11px/1 system-ui}.nonstop-badge.external{background:rgba(255,190,90,.11);color:rgba(255,221,170,.9)}.nonstop-play{min-height:39px;border:0;border-radius:999px;padding:0 14px;background:var(--accent,#d6b06f);color:#10111a;font:700 12px system-ui;cursor:pointer;white-space:nowrap}.nonstop-play:focus-visible,.nonstop-retry:focus-visible{outline:2px solid #fff;outline-offset:2px}.nonstop-play[disabled]{opacity:.45;cursor:not-allowed}
      .nonstop-empty{padding:32px 10px;text-align:center;color:rgba(255,255,255,.6);font:14px/1.45 system-ui}.nonstop-empty strong{display:block;margin-bottom:5px;color:#fff;font-size:15px}.nonstop-retry{display:inline-flex;align-items:center;justify-content:center;min-height:38px;margin-top:14px;padding:0 14px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font:650 12px system-ui;cursor:pointer}
      @media(max-width:720px){.browse-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.nonstop-overlay{padding:0;align-items:flex-end}.nonstop-panel{max-height:92dvh;border-radius:25px 25px 0 0;padding-bottom:env(safe-area-inset-bottom)}.nonstop-head{padding:16px}.nonstop-search-wrap,.nonstop-player,.nonstop-list{padding-left:16px;padding-right:16px}.nonstop-card{grid-template-columns:1fr}.nonstop-play{width:100%}.nonstop-chapters{grid-template-columns:1fr}}
      @media(prefers-reduced-motion:reduce){.nonstop-overlay *{scroll-behavior:auto!important}}
    `;
    document.head.append(style);
  }

  function ensureUi() {
    injectStyles();
    if (!$('nonstopButton')) {
      const actions = $('browseActions');
      if (actions) {
        const button = document.createElement('button');
        button.id = 'nonstopButton';
        button.type = 'button';
        button.className = 'browse-button nonstop-browser-button';
        button.innerHTML = '<span class="infinity" aria-hidden="true">∞</span><span>Nonstop Garba</span>';
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-controls', 'nonstopOverlay');
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', openBrowser);
        actions.append(button);
      }
    }

    if (state.overlay) return state.overlay;
    const overlay = document.createElement('div');
    overlay.id = 'nonstopOverlay';
    overlay.className = 'nonstop-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="nonstop-panel" role="dialog" aria-modal="true" aria-labelledby="nonstopTitle" aria-describedby="nonstopSummary">
        <header class="nonstop-head"><div class="nonstop-head-copy"><h2 id="nonstopTitle">Nonstop Garba</h2><span class="nonstop-summary" id="nonstopSummary">Open to load verified live and nonstop sets.</span></div><button class="nonstop-close" type="button" aria-label="Close nonstop Garba">×</button></header>
        <div class="nonstop-search-wrap"><input class="nonstop-search" id="nonstopSearch" type="search" placeholder="Search artist, year or nonstop set" aria-label="Search nonstop Garba" autocomplete="off" enterkeyhint="search" /></div>
        <section class="nonstop-player" id="nonstopPlayer" aria-live="polite"></section>
        <div class="nonstop-list" id="nonstopList" role="list" aria-label="Nonstop Garba sets"></div>
      </section>`;
    document.body.append(overlay);

    state.overlay = overlay;
    state.panel = overlay.querySelector('.nonstop-panel');
    state.player = $('nonstopPlayer');
    state.list = $('nonstopList');
    state.search = $('nonstopSearch');
    state.summary = $('nonstopSummary');

    overlay.querySelector('.nonstop-close')?.addEventListener('click', closeBrowser);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) closeBrowser(); });
    state.search?.addEventListener('input', renderList);
    return overlay;
  }

  function setSummary(count) {
    if (!state.summary) return;
    const chaptered = state.sets.filter((set) => set.segments.length).length;
    state.summary.textContent = `${count} of ${state.sets.length} verified sets · ${chaptered} chaptered`;
  }

  function renderMessage(title, body, { retry = false } = {}) {
    if (!state.list) return;
    state.list.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'nonstop-empty';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const copy = document.createElement('span');
    copy.textContent = body;
    empty.append(strong, copy);
    if (retry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nonstop-retry';
      button.textContent = 'Retry';
      button.addEventListener('click', () => hydrateBrowser(true));
      empty.append(button);
    }
    state.list.append(empty);
  }

  function renderList() {
    ensureUi();
    if (!state.list) return;
    if (!state.ready) {
      renderMessage(
        state.loadFailed ? 'Could not load Nonstop Garba' : 'Loading Nonstop Garba…',
        state.loadFailed
          ? (navigator.onLine ? 'The set catalogue is temporarily unavailable.' : 'You are offline and this set catalogue has not been cached yet.')
          : 'Fetching verified live sets and timestamped chapters.',
        { retry: state.loadFailed },
      );
      if (state.summary) state.summary.textContent = state.loadFailed ? 'Set catalogue unavailable' : 'Loading verified sets…';
      return;
    }

    const q = normalise(state.search?.value || '');
    const terms = q.split(/\s+/).filter(Boolean);
    const visible = state.sets.filter((set) => {
      if (!terms.length) return true;
      const chapterText = set.segments.map((segment) => segment.title).join(' ');
      const haystack = normalise([set.title, set.artistsText, set.year, set.setType, set.sourceType, chapterText].join(' '));
      return terms.every((term) => haystack.includes(term));
    });

    setSummary(visible.length);
    state.list.replaceChildren();
    if (!visible.length) {
      renderMessage('No matching set', 'Try an artist, year, set title, or a song contained in a timestamped chapter.');
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const set of visible) {
      const card = document.createElement('article');
      card.className = 'nonstop-card';
      card.setAttribute('role', 'listitem');
      const main = document.createElement('div');
      main.className = 'nonstop-card-main';
      const title = document.createElement('strong');
      title.className = 'nonstop-card-title';
      title.textContent = set.title;
      const meta = document.createElement('span');
      meta.className = 'nonstop-card-meta';
      const minutes = set.durationSeconds ? `${Math.round(set.durationSeconds / 60)} min` : null;
      meta.textContent = [set.artistsText, set.year, minutes].filter(Boolean).join(' · ');
      const badges = document.createElement('div');
      badges.className = 'nonstop-badges';
      const sourceBadge = document.createElement('span');
      sourceBadge.className = 'nonstop-badge';
      sourceBadge.textContent = String(set.sourceType || 'verified source').replaceAll('-', ' ');
      badges.append(sourceBadge);
      if (set.segments.length) {
        const chapterBadge = document.createElement('span');
        chapterBadge.className = 'nonstop-badge';
        chapterBadge.textContent = `${set.segments.length} chapters`;
        badges.append(chapterBadge);
      }
      if (!set.embeddable && set.provider === 'youtube') {
        const external = document.createElement('span');
        external.className = 'nonstop-badge external';
        external.textContent = 'YouTube watch page';
        badges.append(external);
      }
      main.append(title, meta, badges);

      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'nonstop-play';
      play.textContent = set.provider === 'youtube' && set.embeddable ? 'Play nonstop' : 'Open source';
      play.disabled = !set.sourceUrl && !(set.provider === 'youtube' && set.videoId);
      play.setAttribute('aria-label', `${play.textContent}: ${set.title}`);
      play.addEventListener('click', () => playSet(set));
      card.append(main, play);
      fragment.append(card);
    }
    state.list.append(fragment);
  }

  function embedUrl(set, startSeconds = 0) {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(set.videoId)}?autoplay=1&playsinline=1&rel=0&start=${Math.max(0, Number(startSeconds) || 0)}`;
  }

  function destroyPlayer() {
    if (!state.player) return;
    state.player.classList.remove('open');
    state.player.replaceChildren();
  }

  function stopMainPlayback() {
    try { window.GARBA_YOUTUBE_PLAYER?.close?.(); } catch { /* main player may not be initialised */ }
    document.querySelector('#providerStage.open[aria-hidden="false"] #providerDockStop')?.click();
    const audio = $('audio');
    if (audio && !audio.paused) audio.pause();
  }

  function playSet(set, startSeconds = 0) {
    if (!navigator.onLine) {
      announce('You are offline. Nonstop playback needs an internet connection.');
      return;
    }

    stopMainPlayback();

    if (set.provider !== 'youtube' || !set.videoId || !set.embeddable) {
      if (!set.sourceUrl) {
        announce('This set does not have an actionable source yet.');
        return;
      }
      const opened = window.open(set.sourceUrl, '_blank', 'noopener,noreferrer');
      if (!opened) location.href = set.sourceUrl;
      return;
    }

    const player = state.player;
    if (!player) return;
    player.classList.add('open');
    player.replaceChildren();
    const top = document.createElement('div');
    top.className = 'nonstop-player-top';
    const copy = document.createElement('div');
    copy.className = 'nonstop-player-copy';
    const strong = document.createElement('strong');
    strong.textContent = set.title;
    const detail = document.createElement('span');
    detail.textContent = [set.artistsText, set.year, set.segments.length ? `${set.segments.length} chapters` : null].filter(Boolean).join(' · ');
    copy.append(strong, detail);
    const hide = document.createElement('button');
    hide.type = 'button';
    hide.className = 'nonstop-player-hide';
    hide.textContent = 'Hide player';
    hide.addEventListener('click', () => {
      destroyPlayer();
      state.search?.focus({ preventScroll: true });
    });
    top.append(copy, hide);

    const iframe = document.createElement('iframe');
    iframe.className = 'nonstop-player-frame';
    iframe.title = `${set.title} playback`;
    iframe.src = embedUrl(set, startSeconds);
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    player.append(top, iframe);

    if (set.segments.length) {
      const chapters = document.createElement('div');
      chapters.className = 'nonstop-chapters';
      chapters.setAttribute('aria-label', 'Jump to chapter');
      for (const segment of set.segments) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'nonstop-chapter';
        const time = document.createElement('span');
        time.className = 'nonstop-chapter-time';
        time.textContent = formatTime(Number(segment.startSeconds) || 0);
        const label = document.createElement('span');
        label.className = 'nonstop-chapter-title';
        label.textContent = segment.title;
        button.setAttribute('aria-label', `${formatTime(Number(segment.startSeconds) || 0)} · ${segment.title}`);
        button.append(time, label);
        button.addEventListener('click', () => playSet(set, Number(segment.startSeconds) || 0));
        chapters.append(button);
      }
      player.append(chapters);
    }

    player.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function focusableElements() {
    if (!state.overlay) return [];
    return [...state.overlay.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length > 0);
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !state.overlay?.classList.contains('open')) return;
    const focusable = focusableElements();
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

  async function hydrateBrowser(retry = false) {
    renderList();
    try {
      await loadSetsOnce({ retry });
    } catch {
      // renderList below exposes retry and offline-aware messaging.
    }
    renderList();
  }

  function openBrowser() {
    ensureUi();
    if (!state.overlay) return;
    stopMainPlayback();
    state.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : $('nonstopButton');
    state.overlay.classList.add('open');
    state.overlay.setAttribute('aria-hidden', 'false');
    $('nonstopButton')?.setAttribute('aria-expanded', 'true');
    if ($('app')) $('app').inert = true;
    document.body.style.overflow = 'hidden';
    hydrateBrowser(false);
    setTimeout(() => state.search?.focus({ preventScroll: true }), 60);
  }

  function closeBrowser() {
    if (!state.overlay?.classList.contains('open')) return;
    destroyPlayer();
    state.overlay.classList.remove('open');
    state.overlay.setAttribute('aria-hidden', 'true');
    $('nonstopButton')?.setAttribute('aria-expanded', 'false');
    if ($('app')) $('app').inert = false;
    document.body.style.overflow = '';
    const target = state.returnFocus;
    state.returnFocus = null;
    queueMicrotask(() => target?.focus?.({ preventScroll: true }));
  }

  function handleKeydown(event) {
    if (!state.overlay?.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeBrowser();
      return;
    }
    trapFocus(event);
  }

  function init() {
    ensureUi();
    document.addEventListener('keydown', handleKeydown, true);
    window.addEventListener('offline', () => {
      if (state.overlay?.classList.contains('open')) {
        destroyPlayer();
        announce('Offline. Nonstop provider playback is unavailable.');
        if (!state.ready) renderList();
      }
    });
    window.addEventListener('online', () => {
      if (state.overlay?.classList.contains('open') && state.loadFailed) hydrateBrowser(true);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();