(() => {
  const DEFAULT_SET_ID = 'set-aditya-ochhav-2023';
  const $ = (id) => document.getElementById(id);

  const state = {
    index: null,
    chunks: new Map(),
    failedChunks: new Set(),
    allSets: null,
    activeSet: null,
    activeTrack: null,
    previousSession: null,
    buttonObserver: null,
    metadataObserver: null,
    toastTimer: null,
    browserCategory: 'all',
    browserQuery: '',
    browserOpen: false,
    lastFocus: null,
    startingSetId: null,
  };

  const rank = {
    'official-artist-channel': 6,
    'official-topic': 5,
    'official-label-channel': 5,
    'artist-channel': 5,
    'verified-label-channel': 4,
    'label-channel': 4,
    'verified-distributor-channel': 3,
    'official-streaming-catalogue': 2,
    'community-upload': 1,
  };

  const categoryDefinitions = [
    ['all', 'All'],
    ['ramzat', 'Ramzat'],
    ['rangtaali', 'Rangtaali'],
    ['taal', 'Taal'],
    ['tahukar', 'Tahukar'],
    ['shakti', 'Shakti'],
    ['traditional', 'Traditional'],
    ['dandiya', 'Dandiya / Raas'],
    ['devotional', 'Devotional'],
    ['folk', 'Folk / Lok'],
    ['sanedo', 'Sanedo'],
    ['fusion', 'Fusion'],
    ['live', 'Live'],
    ['other', 'More'],
  ];

  const seriesCategories = new Set(['ramzat', 'rangtaali', 'taal', 'tahukar', 'shakti']);
  const MEDIA_ARTWORK = [
    { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ];

  function announce(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
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
    const direct = Number(set?.durationSeconds || 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const segments = Array.isArray(set?.segments) ? set.segments : [];
    const boundaries = segments
      .flatMap((segment) => [Number(segment.startSeconds), Number(segment.endSeconds)])
      .filter((value) => Number.isFinite(value) && value > 0);
    return boundaries.length ? Math.max(...boundaries) : 0;
  }

  function normaliseSet(set) {
    const source = set?.source || {};
    return {
      ...set,
      artistsText: Array.isArray(set?.artists) ? set.artists.join(' · ') : String(set?.artist || ''),
      provider: String(source.provider || '').toLowerCase(),
      videoId: String(source.videoId || '').trim(),
      sourceUrl: String(source.url || '').trim(),
      embeddable: source.embeddable !== false && set?.playbackPolicy !== 'youtube-external-visible',
      sourceType: set?.officiality || set?.setType || source.provider || 'source',
      durationSeconds: durationFor(set),
    };
  }

  function isPlayableSet(set) {
    return Boolean(set?.id && set.provider === 'youtube' && set.videoId && set.embeddable);
  }

  function sortSets(sets) {
    return [...sets].sort((a, b) => (rank[b.sourceType] || 0) - (rank[a.sourceType] || 0)
      || Number(b.year || 0) - Number(a.year || 0)
      || String(a.title || '').localeCompare(String(b.title || '')));
  }

  function volumeNumber(set) {
    const direct = Number.parseFloat(String(set?.volume ?? '').replace(/[^0-9.]/g, ''));
    if (Number.isFinite(direct)) return direct;
    const match = String(set?.title || '').match(/(?:^|\s)(\d+(?:\.\d+)?)(?:\s|\.|-|$)/);
    return match ? Number.parseFloat(match[1]) : -1;
  }

  function sortForView(sets, category) {
    if (!seriesCategories.has(category)) return sortSets(sets);
    return [...sets].sort((a, b) => volumeNumber(b) - volumeNumber(a)
      || Number(b.year || 0) - Number(a.year || 0)
      || (rank[b.sourceType] || 0) - (rank[a.sourceType] || 0)
      || String(a.title || '').localeCompare(String(b.title || '')));
  }

  async function loadIndex() {
    if (state.index) return state.index;
    const index = await fetchJson('data/discovery/sets/index.json');
    if (!Array.isArray(index?.chunks) || !index.chunks.length) throw new Error('Nonstop index unavailable');
    state.index = index;
    return index;
  }

  async function loadChunk(name) {
    if (state.chunks.has(name)) return state.chunks.get(name);
    const payload = await fetchJson(`data/discovery/sets/${name}`);
    if (!payload || !Array.isArray(payload.sets)) {
      state.failedChunks.add(name);
      state.chunks.set(name, []);
      return [];
    }
    state.failedChunks.delete(name);
    const sets = sortSets(payload.sets.map(normaliseSet).filter(isPlayableSet));
    state.chunks.set(name, sets);
    return sets;
  }

  async function loadAllSets({ refresh = false } = {}) {
    if (refresh) {
      state.index = null;
      state.chunks.clear();
      state.failedChunks.clear();
      state.allSets = null;
    }
    if (state.allSets) return state.allSets;
    const index = await loadIndex();
    const chunks = await Promise.all(index.chunks.map(loadChunk));
    const seenIds = new Set();
    const seenVideos = new Set();
    state.allSets = sortSets(chunks.flat()).filter((set) => {
      if (seenIds.has(set.id) || seenVideos.has(set.videoId)) return false;
      seenIds.add(set.id);
      seenVideos.add(set.videoId);
      return true;
    });
    if (!state.allSets.length) throw new Error('No playable nonstop sets');
    return state.allSets;
  }

  async function findSet(requestedId = null) {
    const sets = await loadAllSets();
    if (requestedId) return sets.find((set) => set.id === requestedId) || null;
    return sets.find((set) => set.id === DEFAULT_SET_ID) || sets[0] || null;
  }

  function setSearchText(set) {
    return [
      set.title,
      set.artistsText,
      set.series,
      set.volume,
      set.setType,
      ...(Array.isArray(set.categories) ? set.categories : []),
      ...(Array.isArray(set.tags) ? set.tags : []),
      ...(Array.isArray(set.tracklist) ? set.tracklist : []),
      ...(Array.isArray(set.segments) ? set.segments.map((segment) => segment.title) : []),
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function explicitCategories(set) {
    return new Set((Array.isArray(set?.categories) ? set.categories : [])
      .map((value) => String(value).toLowerCase().trim()));
  }

  function categoriesFor(set) {
    const text = setSearchText(set);
    const explicit = explicitCategories(set);
    const categories = new Set();
    const series = String(set.series || '').toLowerCase();

    if (series === 'ramzat' || /\bramzat\b/.test(text)) categories.add('ramzat');
    if (series === 'rangtaali' || /\brangtaali\b|\brang tali\b/.test(text)) categories.add('rangtaali');
    if (series === 'taal' || /\btaal(?:\s|\d|\.|$)/.test(text)) categories.add('taal');
    if (series === 'tahukar' || /\btahukar\b/.test(text)) categories.add('tahukar');
    if (series === 'shakti' || /\bshakti\b/.test(text)) categories.add('shakti');

    if ([...explicit].some((value) => value === 'traditional' || value === 'traditional-garba') || /\btraditional\b/.test(text)) categories.add('traditional');
    if ([...explicit].some((value) => /dandiya|raas|tran-taali|trantaali|2-taali|3-taali/.test(value)) || /dandiya|raas|ras utsav|tran[ -]?taali|trantaali|2[ -]?taali|3[ -]?taali/.test(text)) categories.add('dandiya');
    if ([...explicit].some((value) => /devotional|mataji|dakla|aarti|bhajan/.test(value)) || /devotional|mataji|amba|maa |navdurga|dakla|bhajan|aarti/.test(text)) categories.add('devotional');
    if ([...explicit].some((value) => /folk|lok|santvani/.test(value)) || /folk|lok geet|lokgeet|desi geet|santvani/.test(text)) categories.add('folk');
    if ([...explicit].some((value) => /sanedo/.test(value)) || /\bsanedo\b/.test(text)) categories.add('sanedo');
    if ([...explicit].some((value) => /fusion|modern|remix/.test(value)) || /fusion|edm|remix|riddim|modern/.test(text)) categories.add('fusion');
    if (/live/.test(String(set.setType || '').toLowerCase()) || /\blive\b/.test(text)) categories.add('live');

    if (!categories.size) categories.add('other');
    return categories;
  }

  function matchesCategory(set, category) {
    return category === 'all' || categoriesFor(set).has(category);
  }

  function matchesQuery(set, query) {
    const needle = String(query || '').trim().toLowerCase();
    return !needle || setSearchText(set).includes(needle);
  }

  function formatTime(seconds = 0) {
    const safe = Math.max(0, Math.round(Number(seconds) || 0));
    if (!safe) return '';
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${minutes}:${String(secs).padStart(2, '0')}`;
  }

  function sourceLabel(set) {
    if (set.sourceType === 'official-artist-channel') return 'Official artist';
    if (set.sourceType === 'official-topic') return 'Official YouTube';
    if (set.sourceType === 'official-label-channel') return 'Official label';
    if (set.sourceType === 'artist-channel') return 'Artist channel';
    if (set.sourceType === 'verified-label-channel') return 'Verified label';
    if (set.sourceType === 'label-channel') return 'Label channel';
    if (set.sourceType === 'verified-distributor-channel') return 'Verified distributor';
    if (set.sourceType === 'community-upload') return 'Community source';
    return 'YouTube';
  }

  function injectStyles() {
    if ($('nonstopPlaybackStyles')) return;
    const style = document.createElement('style');
    style.id = 'nonstopPlaybackStyles';
    style.textContent = `
      #nonstopButton{display:inline-flex;align-items:center;gap:6px}
      .app[data-play-mode="nonstop"] #nonstopButton{color:var(--ivory)}
      .app[data-play-mode="nonstop"] #nonstopButton::after{background:color-mix(in srgb,var(--accent) 70%,var(--ivory))}
      .app[data-play-mode="nonstop"] #nonstopButton::before{background:var(--accent);box-shadow:0 0 10px color-mix(in srgb,var(--accent) 48%,transparent)}
      .app[data-play-mode="nonstop"] .mobile-heart{visibility:hidden;pointer-events:none}
      .player-shell{grid-template-rows:minmax(0,1fr) auto auto auto minmax(22px,5vh) auto auto minmax(8px,.42fr)!important}
      #genreStrip{grid-row:6!important;align-self:end;margin-top:0!important;padding-top:8px!important}
      #browseActions{grid-row:7!important;align-self:start!important;margin-top:clamp(2px,.7vh,9px)!important}
      #browseActions .browse-button{margin-top:0!important}
      .nonstop-browser-backdrop{position:fixed;inset:0;z-index:120;background:rgba(3,5,10,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .2s ease}
      .nonstop-browser-backdrop.open{opacity:1;pointer-events:auto}
      .nonstop-browser{position:fixed;z-index:121;left:50%;bottom:max(24px,env(safe-area-inset-bottom));transform:translate(-50%,24px);width:min(900px,calc(100vw - 32px));max-height:min(82dvh,780px);overflow:hidden;border:1px solid rgba(246,236,215,.14);border-radius:28px;background:rgba(8,10,18,.96);box-shadow:0 30px 90px rgba(0,0,0,.48);color:var(--ivory);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .24s ease;display:grid;grid-template-rows:auto auto auto minmax(0,1fr)}
      .nonstop-browser.open{opacity:1;pointer-events:auto;transform:translate(-50%,0)}
      .nonstop-browser-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:22px 24px 12px}
      .nonstop-browser-kicker{margin:0 0 5px;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:rgba(246,236,215,.55)}
      .nonstop-browser-title{margin:0;font-size:clamp(23px,3vw,34px);line-height:1.05;font-weight:600;letter-spacing:-.025em}
      .nonstop-browser-summary{display:block;margin-top:7px;font-size:13px;line-height:1.35;color:rgba(246,236,215,.62)}
      .nonstop-browser-close{display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border:1px solid rgba(246,236,215,.13);border-radius:50%;background:rgba(255,255,255,.04);color:inherit;font-size:25px;line-height:1;cursor:pointer}
      .nonstop-browser-search-wrap{padding:0 24px 12px}
      .nonstop-browser-search{width:100%;min-height:44px;border:1px solid rgba(246,236,215,.13);border-radius:14px;background:rgba(255,255,255,.045);color:var(--ivory);padding:0 14px;font:inherit;font-size:14px;outline:none}
      .nonstop-browser-search::placeholder{color:rgba(246,236,215,.42)}
      .nonstop-browser-search:focus{border-color:color-mix(in srgb,var(--accent) 68%,rgba(246,236,215,.25));box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 16%,transparent)}
      .nonstop-browser-categories{display:flex;gap:8px;overflow-x:auto;padding:0 24px 14px;scrollbar-width:none;scroll-padding-inline:24px}
      .nonstop-browser-categories::-webkit-scrollbar{display:none}
      .nonstop-category{flex:0 0 auto;min-height:38px;border:1px solid rgba(246,236,215,.12);border-radius:999px;background:rgba(255,255,255,.035);color:rgba(246,236,215,.72);padding:8px 12px;font:inherit;font-size:12px;cursor:pointer}
      .nonstop-category.active{background:var(--ivory);color:#101018;border-color:var(--ivory)}
      .nonstop-browser-list{overflow:auto;padding:0 12px 16px 24px;display:grid;gap:8px;overscroll-behavior:contain;scrollbar-gutter:stable}
      .nonstop-set{width:100%;min-height:68px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;text-align:left;border:1px solid rgba(246,236,215,.09);border-radius:18px;background:rgba(255,255,255,.025);color:inherit;padding:14px 15px;cursor:pointer;transition:background .15s ease,border-color .15s ease,transform .15s ease}
      .nonstop-set:hover{background:rgba(255,255,255,.06);border-color:rgba(246,236,215,.18)}
      .nonstop-set:active{transform:scale(.995)}
      .nonstop-set:disabled{opacity:.62;cursor:wait}
      .nonstop-set.active{border-color:color-mix(in srgb,var(--accent) 65%,rgba(246,236,215,.16));background:color-mix(in srgb,var(--accent) 9%,rgba(255,255,255,.025))}
      .nonstop-set-title{display:block;font-size:15px;font-weight:600;line-height:1.3}
      .nonstop-set-meta{display:block;margin-top:4px;font-size:12px;line-height:1.4;color:rgba(246,236,215,.57)}
      .nonstop-set-badges{display:flex;justify-content:flex-end;align-items:center;gap:6px;flex-wrap:wrap;max-width:260px}
      .nonstop-set-badge{display:inline-flex;align-items:center;min-height:26px;padding:0 8px;border-radius:999px;background:rgba(255,255,255,.055);font-size:10px;letter-spacing:.04em;color:rgba(246,236,215,.68);white-space:nowrap}
      .nonstop-set-badge.youtube{color:rgba(246,236,215,.92)}
      .nonstop-browser-empty{padding:38px 12px 52px;color:rgba(246,236,215,.58);font-size:14px;line-height:1.5;text-align:center}
      body.nonstop-browser-open{overflow:hidden}
      .nonstop-browser :focus-visible{outline:2px solid var(--ivory);outline-offset:2px}
      @media(max-width:700px){
        .player-shell{grid-template-rows:minmax(92px,.92fr) auto auto auto minmax(10px,2.4vh) auto auto minmax(2px,.13fr)!important}
        #genreStrip{grid-row:6!important;padding-top:6px!important;padding-bottom:3px!important;align-self:end!important}
        .app #browseActions{grid-row:7!important;width:auto!important;display:flex!important;align-self:start!important;justify-content:center!important;gap:0!important;margin-top:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
        .app #browseActions .browse-button{flex:0 0 auto!important;min-height:40px!important;padding:0 13px!important;border:1px solid rgba(246,236,215,.11)!important;border-radius:999px!important;background:rgba(8,10,18,.20)!important;box-shadow:0 8px 26px rgba(0,0,0,.10)!important;font-size:14px!important}
        .app #browseActions .browse-button span{padding:0!important;border:0!important}
        .app #browseActions .browse-button svg{width:15px!important;height:15px!important}
        .nonstop-browser{left:0;bottom:0;transform:translateY(28px);width:100%;max-height:88dvh;border-radius:26px 26px 0 0;border-left:0;border-right:0;border-bottom:0;padding-bottom:env(safe-area-inset-bottom)}
        .nonstop-browser.open{transform:translateY(0)}
        .nonstop-browser-header{padding:20px 18px 11px}
        .nonstop-browser-search-wrap{padding:0 18px 11px}
        .nonstop-browser-categories{padding:0 18px 13px;scroll-padding-inline:18px}
        .nonstop-browser-list{padding:0 10px 18px 18px}
        .nonstop-set{grid-template-columns:minmax(0,1fr);gap:9px;padding:13px 14px}
        .nonstop-set-badges{justify-content:flex-start;max-width:none}
      }
      @media(max-width:390px){
        .player-shell{grid-template-rows:minmax(86px,.86fr) auto auto auto 8px auto auto 2px!important}
        #genreStrip{gap:24px!important;padding-top:4px!important}
        .app #browseActions .browse-button{min-height:38px!important;padding-inline:11px!important;font-size:13px!important}
      }
      @media(max-height:620px) and (orientation:landscape){
        .player-shell{grid-template-rows:minmax(0,.55fr) auto auto auto 4px auto auto 0!important}
        #genreStrip{padding-top:2px!important}
        #browseActions{position:static!important;margin-top:0!important}
        .nonstop-browser{max-height:94dvh;bottom:3dvh}
      }
      @media(prefers-reduced-motion:reduce){
        .nonstop-browser,.nonstop-browser-backdrop,.nonstop-set{transition:none!important}
      }
    `;
    document.head.append(style);
  }

  function syncMainTransport(active) {
    const queueButton = $('queueButton');
    const queueBadge = $('queueBadge');
    if (queueButton) {
      if (active) {
        queueButton.dataset.nonstopContext = 'true';
        queueButton.title = 'Browse Nonstop Garba';
        queueButton.setAttribute('aria-label', 'Browse Nonstop Garba sets');
      } else if (queueButton.dataset.nonstopContext === 'true') {
        delete queueButton.dataset.nonstopContext;
        queueButton.title = 'Up next';
        queueButton.setAttribute('aria-label', 'Show queue');
      }
    }
    if (active) queueBadge?.classList.remove('show');

    for (const id of ['prevButton', 'nextButton', 'miniPrev', 'miniNext']) {
      const control = $(id);
      if (!control) continue;
      const previous = id === 'prevButton' || id === 'miniPrev';
      if (active) {
        control.dataset.nonstopContext = 'true';
        control.title = 'Choose another Nonstop set';
        control.setAttribute('aria-label', 'Choose another Nonstop set');
      } else if (control.dataset.nonstopContext === 'true') {
        delete control.dataset.nonstopContext;
        control.removeAttribute('title');
        control.setAttribute('aria-label', previous ? 'Previous song' : 'Next song');
      }
    }
  }

  function syncButton() {
    const button = $('nonstopButton');
    if (!button) return;
    const active = Boolean(state.activeSet);
    syncMainTransport(active);
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'true' : 'false');
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-expanded', String(state.browserOpen));
    button.title = active ? `Nonstop Garba · ${state.activeSet.title}` : 'Browse Nonstop Garba';
  }

  function ensureButton() {
    const strip = $('genreStrip');
    if (!strip) return null;
    let button = $('nonstopButton');
    if (!button) {
      button = document.createElement('button');
      button.id = 'nonstopButton';
      button.type = 'button';
      button.className = 'genre-button nonstop-mode-button';
      button.textContent = 'Nonstop';
      button.dataset.nonstop = 'true';
      button.setAttribute('aria-label', 'Browse Nonstop Garba');
      button.setAttribute('aria-controls', 'nonstopBrowser');
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', () => openBrowser());
      strip.insertBefore(button, strip.firstElementChild);
    } else if (button.parentElement !== strip || strip.firstElementChild !== button) {
      strip.insertBefore(button, strip.firstElementChild);
    }
    syncButton();
    return button;
  }

  function watchGenreStrip() {
    const strip = $('genreStrip');
    if (!strip || state.buttonObserver) return;
    state.buttonObserver = new MutationObserver(() => queueMicrotask(ensureButton));
    state.buttonObserver.observe(strip, { childList: true });
  }

  function setMetadata(set) {
    if (!state.activeSet || state.activeSet.id !== set.id) return;
    const app = $('app');
    const eyebrow = $('genreEyebrow');
    const title = $('songTitle');
    const artist = $('songArtist');
    const duration = $('durationTime');
    const miniTitle = $('miniTitle');
    const miniArtist = $('miniArtist');
    app?.setAttribute('data-play-mode', 'nonstop');
    if (eyebrow && eyebrow.textContent !== 'Nonstop Garba') eyebrow.textContent = 'Nonstop Garba';
    if (title && title.textContent !== set.title) title.textContent = set.title;
    if (artist && artist.textContent !== set.artistsText) artist.textContent = set.artistsText;
    if (miniTitle && miniTitle.textContent !== set.title) miniTitle.textContent = set.title;
    if (miniArtist && miniArtist.textContent !== set.artistsText) miniArtist.textContent = set.artistsText;
    if (duration && set.durationSeconds > 0) duration.textContent = formatTime(set.durationSeconds);
    try {
      if ('mediaSession' in navigator && 'MediaMetadata' in window) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: set.title,
          artist: set.artistsText,
          album: 'Nonstop Garba',
          artwork: MEDIA_ARTWORK,
        });
      }
    } catch {
      // Media Session metadata is optional.
    }
    syncButton();
  }

  function watchMetadata() {
    const title = $('songTitle');
    if (!title || state.metadataObserver) return;
    state.metadataObserver = new MutationObserver(() => {
      if (state.activeSet) queueMicrotask(() => setMetadata(state.activeSet));
    });
    state.metadataObserver.observe(title, { childList: true, characterData: true, subtree: true });
    const queueBadge = $('queueBadge');
    if (queueBadge) state.metadataObserver.observe(queueBadge, { childList: true, characterData: true, subtree: true });
  }

  function capturePreviousSession() {
    const audio = $('audio');
    let storedSession = null;
    try { storedSession = localStorage.getItem('garba:session'); } catch { /* storage can be denied */ }
    return {
      url: `${location.pathname}${location.search}${location.hash}`,
      audioSrc: audio?.getAttribute('src') || '',
      audioTime: Number(audio?.currentTime || 0),
      audioWasPlaying: Boolean(audio && !audio.paused && audio.getAttribute('src')),
      youtubeSongId: window.GARBA_YOUTUBE_PLAYER?.activeSongId || null,
      youtubeWasPlaying: Boolean(window.GARBA_YOUTUBE_PLAYER?.playing),
      storedSession,
      historyPushed: false,
      appGenre: $('app')?.dataset.genre || 'traditional',
      eyebrow: $('genreEyebrow')?.textContent || '',
      title: $('songTitle')?.textContent || '',
      artist: $('songArtist')?.textContent || '',
      duration: $('durationTime')?.textContent || '--:--',
      elapsed: $('elapsedTime')?.textContent || '0:00',
      miniTitle: $('miniTitle')?.textContent || '',
      miniArtist: $('miniArtist')?.textContent || '',
    };
  }

  function restorePreviousSession(previous, { updateHistory = true } = {}) {
    if (!previous) return;
    if (updateHistory) history.replaceState(history.state, '', previous.url);
    try {
      if (previous.storedSession == null) localStorage.removeItem('garba:session');
      else localStorage.setItem('garba:session', previous.storedSession);
    } catch { /* storage can be denied */ }
    const app = $('app');
    if (app) app.dataset.genre = previous.appGenre;
    if ($('genreEyebrow')) $('genreEyebrow').textContent = previous.eyebrow;
    if ($('songTitle')) $('songTitle').textContent = previous.title;
    if ($('songArtist')) $('songArtist').textContent = previous.artist;
    if ($('durationTime')) $('durationTime').textContent = previous.duration;
    if ($('elapsedTime')) $('elapsedTime').textContent = previous.elapsed;
    if ($('miniTitle')) $('miniTitle').textContent = previous.miniTitle;
    if ($('miniArtist')) $('miniArtist').textContent = previous.miniArtist;
    const audio = $('audio');
    if (audio) {
      audio.removeAttribute('src');
      try { audio.load(); } catch { /* no-op */ }
      if (previous.audioSrc) {
        audio.src = previous.audioSrc;
        try { audio.load(); } catch { /* no-op */ }
        const restoreAudio = () => {
          if (previous.audioTime > 0) {
            try { audio.currentTime = previous.audioTime; } catch { /* no-op */ }
          }
          if (previous.audioWasPlaying) audio.play().catch(() => null);
          audio.removeEventListener('loadedmetadata', restoreAudio);
        };
        audio.addEventListener('loadedmetadata', restoreAudio);
      }
    }
    if (previous.youtubeSongId && previous.youtubeWasPlaying && !previous.audioSrc) {
      setTimeout(() => $('playButton')?.click(), 0);
    }
  }

  function setUrlForNonstop(set, { push = false } = {}) {
    const url = new URL(location.href);
    url.searchParams.set('nonstop', set.id);
    url.searchParams.delete('song');
    url.searchParams.delete('browse');
    url.searchParams.delete('source');
    const next = `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
    if (push) history.pushState(history.state, '', next);
    else history.replaceState(history.state, '', next);
  }

  function stopNativeAudio() {
    const audio = $('audio');
    if (!audio) return;
    try { audio.pause(); } catch { /* no-op */ }
    audio.removeAttribute('src');
    try { audio.load(); } catch { /* no-op */ }
  }

  function markDock() {
    $('youtubeStage')?.classList.toggle('is-nonstop', Boolean(state.activeSet));
  }

  function visualGenreForSet(set) {
    const aliases = new Map([
      ['traditional', 'traditional'],
      ['traditional-garba', 'traditional'],
      ['dandiya', 'dandiya'],
      ['raas-dandiya', 'dandiya'],
      ['devotional', 'devotional'],
      ['mataji-devotional', 'devotional'],
      ['folk', 'folk'],
      ['folk-lokgeet', 'folk'],
      ['sanedo', 'sanedo'],
      ['fusion', 'fusion'],
      ['electronic-fusion', 'fusion'],
    ]);
    for (const category of Array.isArray(set?.categories) ? set.categories : []) {
      const visual = aliases.get(String(category).toLowerCase().trim());
      if (visual) return visual;
    }
    const inferred = categoriesFor(set);
    for (const visual of ['sanedo', 'dandiya', 'devotional', 'folk', 'fusion', 'traditional']) {
      if (inferred.has(visual)) return visual;
    }
    return 'traditional';
  }

  function trackForSet(set) {
    return {
      id: `nonstop:${set.id}`,
      title: set.title,
      artist: set.artistsText,
      genre: visualGenreForSet(set),
      audioUrl: null,
      youtubeId: set.videoId,
      youtubeStartSeconds: 0,
      durationSeconds: set.durationSeconds || 0,
      playbackProvider: 'youtube',
      playbackSourceUrl: set.sourceUrl || `https://www.youtube.com/watch?v=${encodeURIComponent(set.videoId)}`,
      playbackSourceType: set.sourceType,
      playbackSearchOnly: false,
    };
  }

  async function startNonstop(requestedSetId = null, { quiet = false } = {}) {
    if (!navigator.onLine) {
      announce('Nonstop Garba needs an internet connection for YouTube playback.');
      return false;
    }
    const trigger = ensureButton();
    trigger?.setAttribute('aria-busy', 'true');
    state.startingSetId = requestedSetId || DEFAULT_SET_ID;
    renderBrowser();
    if (!quiet) announce('Starting Nonstop Garba…');
    try {
      const set = await findSet(requestedSetId);
      if (!set) throw new Error('Requested nonstop set unavailable');
      if (!window.GARBA_YOUTUBE_PLAYER?.open) throw new Error('PlayGarba YouTube engine unavailable');
      const track = trackForSet(set);
      if (state.activeSet?.id === set.id && state.activeTrack?.id === track.id) {
        setMetadata(set);
        markDock();
        if (!window.GARBA_YOUTUBE_PLAYER.playing) window.GARBA_YOUTUBE_PLAYER.toggle(state.activeTrack);
        return true;
      }

      const entering = !state.activeSet;
      const urlAlreadyRequestsSet = new URL(location.href).searchParams.get('nonstop') === set.id;
      if (entering) state.previousSession = capturePreviousSession();
      else window.GARBA_YOUTUBE_PLAYER?.close?.();
      stopNativeAudio();
      state.activeSet = set;
      state.activeTrack = track;
      setMetadata(set);
      syncButton();

      const opened = await window.GARBA_YOUTUBE_PLAYER.open(track, { autoplay: true, resume: false });
      markDock();
      if (!opened) throw new Error('Nonstop player could not open');

      const shouldPush = entering && !urlAlreadyRequestsSet;
      setUrlForNonstop(set, { push: shouldPush });
      if (state.previousSession && shouldPush) state.previousSession.historyPushed = true;
      setMetadata(set);
      if (!quiet) announce(`Playing ${set.title}`);
      return true;
    } catch (error) {
      console.warn('PlayGarba nonstop playback failed', error);
      deactivateNonstop({ closePlayer: true, restoreSession: true, updateHistory: true });
      announce('That YouTube set could not start here. Try another set.');
      return false;
    } finally {
      state.startingSetId = null;
      trigger?.removeAttribute('aria-busy');
      renderBrowser();
    }
  }

  function deactivateNonstop({ closePlayer = true, restoreSession = true, updateHistory = true } = {}) {
    if (!state.activeSet && !new URL(location.href).searchParams.has('nonstop')) return;
    const previous = state.previousSession;
    state.activeSet = null;
    state.activeTrack = null;
    state.previousSession = null;
    $('app')?.removeAttribute('data-play-mode');
    if (closePlayer) {
      try { window.GARBA_YOUTUBE_PLAYER?.close?.(); } catch { /* player may already be closed */ }
    }
    markDock();
    if (restoreSession && previous) restorePreviousSession(previous, { updateHistory });
    else if (updateHistory) {
      const url = new URL(location.href);
      url.searchParams.delete('nonstop');
      history.replaceState(history.state, '', `${url.pathname}${url.search ? url.search : ''}${url.hash}`);
    }
    syncButton();
    renderBrowser();
  }

  function stopNonstop() {
    if (state.previousSession?.historyPushed) {
      history.back();
      return;
    }
    deactivateNonstop({ closePlayer: true, restoreSession: true, updateHistory: true });
  }

  function ensureBrowser() {
    let panel = $('nonstopBrowser');
    if (panel) return panel;
    const backdrop = document.createElement('div');
    backdrop.id = 'nonstopBrowserBackdrop';
    backdrop.className = 'nonstop-browser-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', closeBrowser);

    panel = document.createElement('section');
    panel.id = 'nonstopBrowser';
    panel.className = 'nonstop-browser';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-labelledby', 'nonstopBrowserTitle');
    panel.innerHTML = `
      <header class="nonstop-browser-header">
        <div>
          <p class="nonstop-browser-kicker">YouTube-first catalogue</p>
          <h2 class="nonstop-browser-title" id="nonstopBrowserTitle">Nonstop Garba</h2>
          <span class="nonstop-browser-summary" id="nonstopBrowserSummary" aria-live="polite">Loading verified sets…</span>
        </div>
        <button class="nonstop-browser-close" id="nonstopBrowserClose" type="button" aria-label="Close Nonstop Garba">×</button>
      </header>
      <div class="nonstop-browser-search-wrap">
        <input class="nonstop-browser-search" id="nonstopBrowserSearch" type="search" inputmode="search" autocomplete="off" enterkeyhint="search" aria-label="Search nonstop sets and artists" placeholder="Search sets, artists or songs" />
      </div>
      <nav class="nonstop-browser-categories" id="nonstopBrowserCategories" aria-label="Nonstop Garba categories"></nav>
      <div class="nonstop-browser-list" id="nonstopBrowserList" aria-live="polite"></div>`;
    document.body.append(backdrop, panel);
    $('nonstopBrowserClose')?.addEventListener('click', closeBrowser);
    $('nonstopBrowserSearch')?.addEventListener('input', (event) => {
      state.browserQuery = String(event.target?.value || '');
      renderBrowser();
    });
    return panel;
  }

  function setBackgroundInert(inert) {
    const app = $('app');
    const dock = $('youtubeStage');
    if (app && 'inert' in app) app.inert = inert;
    if (dock && 'inert' in dock) dock.inert = inert;
  }

  function closeBrowser() {
    if (!state.browserOpen) return;
    const panel = $('nonstopBrowser');
    const backdrop = $('nonstopBrowserBackdrop');
    state.browserOpen = false;
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden', 'true');
    backdrop?.classList.remove('open');
    backdrop?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nonstop-browser-open');
    setBackgroundInert(false);
    syncButton();
    const target = state.lastFocus instanceof HTMLElement && state.lastFocus.isConnected ? state.lastFocus : $('nonstopButton');
    state.lastFocus = null;
    target?.focus?.({ preventScroll: true });
  }

  async function openBrowser() {
    ensureBrowser();
    if (!state.browserOpen) state.lastFocus = document.activeElement;
    state.browserOpen = true;
    const panel = $('nonstopBrowser');
    const backdrop = $('nonstopBrowserBackdrop');
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
    backdrop?.classList.add('open');
    backdrop?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nonstop-browser-open');
    setBackgroundInert(true);
    syncButton();

    const list = $('nonstopBrowserList');
    if (list && !state.allSets) {
      list.setAttribute('aria-busy', 'true');
      list.innerHTML = '<div class="nonstop-browser-empty">Loading verified YouTube sets…</div>';
    }
    requestAnimationFrame(() => $('nonstopBrowserSearch')?.focus({ preventScroll: true }));
    try {
      await loadAllSets();
      renderBrowser();
    } catch (error) {
      console.warn('PlayGarba nonstop catalogue failed to load', error);
      if (list) {
        list.removeAttribute('aria-busy');
        list.innerHTML = '<div class="nonstop-browser-empty">The YouTube non-stop catalogue could not load. Check your connection and try again.</div>';
      }
    }
  }

  function renderBrowser() {
    const sets = state.allSets;
    if (!sets || !$('nonstopBrowser')) return;
    const searched = sets.filter((set) => matchesQuery(set, state.browserQuery));
    const filtered = sortForView(searched.filter((set) => matchesCategory(set, state.browserCategory)), state.browserCategory);
    const summary = $('nonstopBrowserSummary');
    if (summary) {
      const partial = state.failedChunks.size ? ` · ${state.failedChunks.size} section${state.failedChunks.size === 1 ? '' : 's'} unavailable` : '';
      const shown = filtered.length === sets.length ? `${sets.length} playable YouTube sets` : `${filtered.length} of ${sets.length} playable YouTube sets`;
      summary.textContent = `${shown} · official and verified sources ranked first${partial}`;
    }

    const categoryNav = $('nonstopBrowserCategories');
    if (categoryNav) {
      categoryNav.replaceChildren(...categoryDefinitions.map(([id, label]) => {
        const count = id === 'all' ? searched.length : searched.filter((set) => matchesCategory(set, id)).length;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `nonstop-category${state.browserCategory === id ? ' active' : ''}`;
        button.textContent = `${label} ${count}`;
        button.setAttribute('aria-pressed', String(state.browserCategory === id));
        button.addEventListener('click', () => {
          state.browserCategory = id;
          renderBrowser();
          button.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        });
        return button;
      }));
    }

    const list = $('nonstopBrowserList');
    if (!list) return;
    list.removeAttribute('aria-busy');
    if (!filtered.length) {
      const action = state.browserQuery ? 'Try a different search or category.' : 'Choose another category.';
      list.innerHTML = `<div class="nonstop-browser-empty">No playable YouTube sets match this view.<br>${action}</div>`;
      return;
    }

    list.replaceChildren(...filtered.map((set) => {
      const button = document.createElement('button');
      const active = state.activeSet?.id === set.id;
      const starting = state.startingSetId === set.id;
      button.type = 'button';
      button.className = `nonstop-set${active ? ' active' : ''}`;
      button.setAttribute('aria-label', `${active ? 'Currently playing' : 'Play'} ${set.title} by ${set.artistsText}`);
      button.setAttribute('aria-pressed', String(active));
      if (starting) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      const duration = formatTime(set.durationSeconds);
      button.innerHTML = `
        <span>
          <span class="nonstop-set-title"></span>
          <span class="nonstop-set-meta"></span>
        </span>
        <span class="nonstop-set-badges">
          <span class="nonstop-set-badge youtube">YouTube</span>
          <span class="nonstop-set-badge source"></span>
          ${duration ? '<span class="nonstop-set-badge duration"></span>' : ''}
        </span>`;
      button.querySelector('.nonstop-set-title').textContent = set.title;
      button.querySelector('.nonstop-set-meta').textContent = [set.artistsText, set.year || null].filter(Boolean).join(' · ');
      button.querySelector('.nonstop-set-badge.source').textContent = sourceLabel(set);
      if (duration) button.querySelector('.nonstop-set-badge.duration').textContent = duration;
      button.addEventListener('click', async () => {
        const played = await startNonstop(set.id);
        if (played) closeBrowser();
      });
      return button;
    }));
  }

  function focusableElements() {
    const panel = $('nonstopBrowser');
    if (!panel) return [];
    return [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.hasAttribute('hidden') && element.getClientRects().length > 0);
  }

  function trapBrowserFocus(event) {
    if (!state.browserOpen) return false;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeBrowser();
      return true;
    }
    if (event.key !== 'Tab') return false;
    const focusables = focusableElements();
    if (!focusables.length) return false;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }

  function captureMainNavigation(event) {
    if (!state.activeSet) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('#nonstopButton, #nonstopBrowser')) return;
    if (target.closest('#queueButton, #prevButton, #nextButton, #miniPrev, #miniNext')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openBrowser();
      return;
    }
    if (target.closest('#genreStrip .genre-button, .song-copy')) {
      deactivateNonstop({ closePlayer: true, restoreSession: false, updateHistory: true });
    }
  }

  function captureSeek(event) {
    if (!state.activeSet) return;
    const duration = Number(state.activeSet.durationSeconds || 0);
    if (duration <= 0) return;
    const ratio = Math.max(0, Math.min(1, Number(event.currentTarget?.value || 0) / 1000));
    window.GARBA_YOUTUBE_PLAYER?.seekTo?.(duration * ratio);
    event.stopImmediatePropagation();
  }

  function restoreFromUrl() {
    const id = new URL(location.href).searchParams.get('nonstop');
    if (id) startNonstop(id, { quiet: true });
  }

  function warmNonstop() {
    const warm = () => loadAllSets().catch(() => null);
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3500 });
    else setTimeout(warm, 1800);
  }

  function captureNonstopKeyboard(event) {
    if (!state.activeSet) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
    if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openBrowser();
  }

  function init() {
    injectStyles();
    ensureButton();
    watchGenreStrip();
    watchMetadata();
    document.addEventListener('click', captureMainNavigation, { capture: true });
    document.addEventListener('keydown', captureNonstopKeyboard, { capture: true });
    $('progress')?.addEventListener('input', captureSeek, { capture: true });
    window.addEventListener('offline', () => {
      closeBrowser();
      if (!state.activeSet) return;
      deactivateNonstop({ closePlayer: true, restoreSession: true, updateHistory: true });
      announce('Offline. Nonstop Garba playback stopped.');
    });
    window.addEventListener('online', () => {
      if (state.failedChunks.size) loadAllSets({ refresh: true }).then(renderBrowser).catch(() => null);
    });
    window.addEventListener('popstate', () => {
      const id = new URL(location.href).searchParams.get('nonstop');
      if (id && state.activeSet?.id !== id) startNonstop(id, { quiet: true });
      else if (!id && state.activeSet) deactivateNonstop({ closePlayer: true, restoreSession: true, updateHistory: false });
    });
    document.addEventListener('keydown', trapBrowserFocus, { capture: true });
    warmNonstop();
    restoreFromUrl();
  }

  window.GARBA_NONSTOP = {
    play: startNonstop,
    browse: openBrowser,
    stop: stopNonstop,
    list: async () => loadAllSets(),
    get activeSetId() { return state.activeSet?.id || null; },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

(() => {
  function nonstopActive() {
    return Boolean(window.GARBA_NONSTOP?.activeSetId);
  }

  function announceContinuous() {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = 'Nonstop Garba plays continuously. Pick another set from Nonstop to switch.';
    toast.classList.add('show');
    clearTimeout(announceContinuous.timer);
    announceContinuous.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  document.addEventListener('keydown', (event) => {
    if (!nonstopActive()) return;
    if (document.getElementById('nonstopBrowser')?.classList.contains('open')) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    const key = String(event.key || '').toLowerCase();
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight' || key === 'f') {
      event.preventDefault();
      event.stopImmediatePropagation();
      announceContinuous();
    }
  }, { capture: true });

  document.addEventListener('click', (event) => {
    if (!nonstopActive()) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('#youtubeDockStop')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.GARBA_NONSTOP?.stop?.();
  }, { capture: true });

  document.addEventListener('keyup', (event) => {
    if (event.key !== 'Escape' || !nonstopActive()) return;
    if (document.getElementById('nonstopBrowser')?.classList.contains('open')) return;
    if (window.GARBA_YOUTUBE_PLAYER?.activeSongId) return;
    window.GARBA_NONSTOP?.stop?.();
  }, { capture: true });
})();
