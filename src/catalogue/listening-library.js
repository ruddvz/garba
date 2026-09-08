const SESSION_KEY = 'garba:session';
const FAVOURITES_KEY = 'garba:favourites';
const MAX_FAVOURITES = 6;
const EXPLORE_RETURN_STATE_KEY = 'playgarbaExploreReturn';
const EXPLORE_RETURN_MAX_AGE = 2 * 60 * 60 * 1000;

const sections = document.getElementById('catalogueSections');
const catalogueCount = document.getElementById('catalogueCount');
let cataloguePromise = null;
let catalogueData = null;
let renderQueued = false;
let returnRestoreTimer = 0;

function readStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function listeningState() {
  const session = readStoredJson(SESSION_KEY, {});
  const favourites = readStoredJson(FAVOURITES_KEY, []);
  return {
    session: session && typeof session === 'object' ? session : {},
    favourites: Array.isArray(favourites) ? favourites.filter((id) => typeof id === 'string') : [],
  };
}

function hasListeningState({ session, favourites }) {
  return Boolean(session?.songId || favourites.length);
}

function formatTime(seconds = 0) {
  const safe = Number.isFinite(Number(seconds)) ? Math.max(0, Math.round(Number(seconds))) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function releaseYear(release) {
  return Number(release?.originalReleaseYear || String(release?.releaseDate || '').slice(0, 4)) || 0;
}

function richerRelease(existing, candidate) {
  if (!existing) return candidate;
  const score = (release) => {
    const artist = String(release?.artist || '');
    return (artist.toLowerCase() !== 'various artists' ? 10 : 0)
      + Math.min(artist.length, 120) / 20
      + (Array.isArray(release?.sources) ? release.sources.length : 0)
      + (release?.label ? 1 : 0)
      + (release?.releaseDate ? 1 : 0);
  };
  return score(candidate) > score(existing) ? candidate : existing;
}

function buildReleaseIndex(releases) {
  const map = new Map();
  for (const release of releases || []) {
    if (!release?.id) continue;
    map.set(release.id, richerRelease(map.get(release.id), release));
  }
  return map;
}

async function fetchJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'default' });
    return response.ok ? await response.json() : fallback;
  } catch {
    return fallback;
  }
}

async function loadCatalogue() {
  if (catalogueData) return catalogueData;
  if (!cataloguePromise) {
    cataloguePromise = Promise.all([
      fetchJson('../data/songs.json', []),
      fetchJson('../data/releases.json', []),
      fetchJson('../data/release-artwork.json', { releases: {} }),
    ]).then(([songs, releases, artwork]) => {
      catalogueData = {
        songById: new Map((songs || []).filter((song) => song?.id).map((song) => [song.id, song])),
        releaseById: buildReleaseIndex(releases),
        artwork: artwork?.releases || {},
      };
      return catalogueData;
    }).finally(() => {
      if (!catalogueData) cataloguePromise = null;
    });
  }
  return cataloguePromise;
}

function initials(value = '') {
  const words = String(value).replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  return (words.slice(0, 2).map((word) => word[0]).join('') || 'PG').toUpperCase();
}

function coverFor(song, release, artwork) {
  const wrap = document.createElement('span');
  wrap.className = 'personal-listening-cover';
  const entry = artwork?.[release?.id];
  if (entry?.verified === true && entry.imageUrl) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.src = entry.imageUrl;
    img.addEventListener('error', () => {
      img.remove();
      wrap.classList.add('fallback');
      wrap.textContent = initials(release?.title || song?.title);
    }, { once: true });
    wrap.append(img);
  } else {
    wrap.classList.add('fallback');
    wrap.textContent = initials(release?.title || song?.title);
  }
  return wrap;
}

function playerUrl(song) {
  return `../?genre=${encodeURIComponent(song.genre || 'traditional')}&song=${encodeURIComponent(song.id)}`;
}

function primeFavouriteSession(song) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      genreId: song.genre || 'traditional',
      songId: song.id,
      elapsed: 0,
    }));
  } catch {
    // Storage can be denied in private browsing; navigation still works.
  }
}

function makeCard({ song, release, artwork, kind, elapsed = 0 }) {
  const link = document.createElement('a');
  link.className = `personal-listening-card ${kind === 'continue' ? 'is-continue' : 'is-favourite'}`;
  link.href = playerUrl(song);
  link.setAttribute('aria-label', `${kind === 'continue' ? 'Continue listening to' : 'Listen to saved song'} ${song.title} by ${song.artist}`);
  if (kind === 'favourite') link.addEventListener('click', () => primeFavouriteSession(song));
  link.append(coverFor(song, release, artwork));

  const copy = document.createElement('span');
  copy.className = 'personal-listening-copy';
  const kicker = document.createElement('small');
  kicker.textContent = kind === 'continue' ? 'Continue listening' : 'Saved';
  const title = document.createElement('strong');
  title.textContent = song.title;
  const meta = document.createElement('span');
  const year = releaseYear(release);
  meta.textContent = [song.artist, release?.title, year || null].filter(Boolean).join(' · ');
  copy.append(kicker, title, meta);

  if (kind === 'continue') {
    const duration = Number(song.durationSeconds || 0);
    const position = Math.max(0, Number(elapsed || 0));
    if (duration > 0 && position > 0) {
      const progress = document.createElement('span');
      progress.className = 'personal-listening-progress';
      const bar = document.createElement('span');
      const fill = document.createElement('span');
      fill.style.width = `${Math.max(2, Math.min(100, position / duration * 100))}%`;
      bar.append(fill);
      const timing = document.createElement('span');
      timing.textContent = `${formatTime(position)} of ${formatTime(duration)}`;
      progress.append(bar, timing);
      copy.append(progress);
    }
  }

  link.append(copy);
  return link;
}

function installStyles() {
  if (document.querySelector('style[data-playgarba-listening-library]')) return;
  const style = document.createElement('style');
  style.dataset.playgarbaListeningLibrary = '';
  style.textContent = `
    .personal-listening-section{margin-bottom:42px}
    .personal-listening-section .section-title-row{margin-bottom:14px;align-items:center;justify-content:flex-start}
    .personal-listening-section .section-title-row p{margin-left:auto}
    .personal-listening-open{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;min-height:34px;margin-left:14px;padding:0 11px;border:1px solid rgba(255,255,255,.11);border-radius:999px;color:rgba(255,248,236,.72);background:rgba(255,255,255,.035);font-size:.7rem;font-weight:760;text-decoration:none;transition:border-color .18s ease,background .18s ease,color .18s ease}
    .personal-listening-open:hover,.personal-listening-open:focus-visible{color:var(--gold);border-color:rgba(231,201,143,.28);background:rgba(231,201,143,.055)}
    .personal-listening-rail{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(278px,370px);gap:14px;overflow-x:auto;overscroll-behavior-inline:contain;padding:2px 3px 12px;scroll-snap-type:x proximity;scrollbar-width:thin}
    .personal-listening-card{position:relative;display:grid;grid-template-columns:88px minmax(0,1fr);gap:14px;align-items:center;min-height:114px;padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(17,16,23,.40);color:var(--text);text-decoration:none;scroll-snap-align:start;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 18px 54px rgba(0,0,0,.24);backdrop-filter:blur(22px) saturate(1.12);-webkit-backdrop-filter:blur(22px) saturate(1.12);transition:transform .2s ease,border-color .2s ease,background .2s ease}
    .personal-listening-card::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:linear-gradient(126deg,rgba(255,255,255,.05),transparent 38%,rgba(231,201,143,.04));}
    .personal-listening-card:hover{transform:translateY(-3px);border-color:rgba(231,201,143,.28);background:rgba(24,22,30,.50)}
    .personal-listening-card:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
    .personal-listening-cover{position:relative;z-index:1;display:grid;place-items:center;width:88px;aspect-ratio:1;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:linear-gradient(145deg,rgba(53,49,63,.92),rgba(19,18,25,.94));color:rgba(255,238,209,.80);font-size:1.08rem;font-weight:800;letter-spacing:-.04em;box-shadow:0 12px 30px rgba(0,0,0,.24)}
    .personal-listening-cover img{display:block;width:100%;height:100%;object-fit:cover}
    .personal-listening-copy{position:relative;z-index:1;display:block;min-width:0}
    .personal-listening-copy small{display:block;margin-bottom:5px;color:var(--gold);font-size:.64rem;font-weight:780;letter-spacing:.12em;text-transform:uppercase}
    .personal-listening-copy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:1rem;letter-spacing:-.025em;text-shadow:0 2px 12px rgba(0,0,0,.35)}
    .personal-listening-copy>span:not(.personal-listening-progress){display:-webkit-box;overflow:hidden;margin-top:5px;color:var(--muted);font-size:.75rem;line-height:1.35;-webkit-line-clamp:2;-webkit-box-orient:vertical}
    .personal-listening-progress{display:grid;grid-template-columns:minmax(62px,1fr) auto;gap:8px;align-items:center;margin-top:10px;color:var(--muted);font-size:.68rem}
    .personal-listening-progress>span:first-child{height:3px;overflow:hidden;border-radius:999px;background:rgba(255,248,236,.13)}
    .personal-listening-progress>span:first-child>span{display:block;height:100%;border-radius:inherit;background:var(--gold)}
    @media(max-width:640px){.personal-listening-section{margin-bottom:36px}.personal-listening-open{margin-left:auto}.personal-listening-rail{grid-auto-columns:minmax(250px,82vw);margin-right:-17px;padding-right:17px}.personal-listening-card{grid-template-columns:76px minmax(0,1fr);min-height:102px;padding:10px;border-radius:21px}.personal-listening-cover{width:76px;border-radius:15px}.personal-listening-section .section-title-row p{display:none}}
    @media(prefers-reduced-motion:reduce){.personal-listening-card{transition:none!important}}
  `;
  document.head.append(style);
}

function removeSection() {
  document.getElementById('personalListeningSection')?.remove();
}

async function renderListeningLibrary() {
  if (!sections) return;
  const stored = listeningState();
  if (!hasListeningState(stored)) {
    removeSection();
    return;
  }

  const { songById, releaseById, artwork } = await loadCatalogue();
  const continueSong = stored.session?.songId ? songById.get(stored.session.songId) : null;
  const seen = new Set(continueSong?.id ? [continueSong.id] : []);
  const favouriteSongs = [];
  for (const id of stored.favourites) {
    if (seen.has(id)) continue;
    const song = songById.get(id);
    if (!song) continue;
    favouriteSongs.push(song);
    seen.add(id);
    if (favouriteSongs.length >= MAX_FAVOURITES) break;
  }

  if (!continueSong && !favouriteSongs.length) {
    removeSection();
    return;
  }

  installStyles();
  const section = document.createElement('section');
  section.id = 'personalListeningSection';
  section.className = 'catalogue-section personal-listening-section';
  section.setAttribute('aria-labelledby', 'personalListeningTitle');

  const head = document.createElement('div');
  head.className = 'section-title-row';
  const heading = document.createElement('h2');
  heading.id = 'personalListeningTitle';
  heading.textContent = 'My Garba';
  const description = document.createElement('p');
  description.textContent = continueSong
    ? 'Continue where you left off, then return to songs you saved.'
    : 'Songs you saved with the heart in PlayGarba.';
  const openMyGarba = document.createElement('a');
  openMyGarba.className = 'personal-listening-open';
  openMyGarba.href = '../?library=my-garba';
  openMyGarba.textContent = 'Open';
  openMyGarba.setAttribute('aria-label', 'Open all songs in My Garba');
  head.append(heading, description, openMyGarba);

  const rail = document.createElement('div');
  rail.className = 'personal-listening-rail';
  rail.setAttribute('aria-label', 'My Garba saved songs and continue listening');

  if (continueSong) {
    rail.append(makeCard({
      song: continueSong,
      release: releaseById.get(continueSong.releaseId),
      artwork,
      kind: 'continue',
      elapsed: Number(stored.session.elapsed || 0),
    }));
  }

  for (const song of favouriteSongs) {
    rail.append(makeCard({
      song,
      release: releaseById.get(song.releaseId),
      artwork,
      kind: 'favourite',
    }));
  }

  section.append(head, rail);
  removeSection();
  sections.prepend(section);
}

function catalogueReady() {
  return Boolean(sections?.querySelector('.catalogue-section'))
    && !String(catalogueCount?.textContent || '').startsWith('Loading');
}

function queueListeningRender() {
  if (renderQueued) return;
  renderQueued = true;
  queueMicrotask(() => {
    renderQueued = false;
    void renderListeningLibrary();
  });
}

function startWhenReady() {
  const stored = listeningState();
  if (!hasListeningState(stored)) return;
  if (catalogueReady()) {
    queueListeningRender();
    return;
  }
  const observer = new MutationObserver(() => {
    if (!catalogueReady()) return;
    observer.disconnect();
    queueListeningRender();
  });
  if (sections) observer.observe(sections, { childList: true, subtree: false });
  if (catalogueCount) observer.observe(catalogueCount, { childList: true, characterData: true, subtree: true });
}

function watchCatalogueRenders() {
  if (!sections) return;
  const observer = new MutationObserver(() => {
    const stored = listeningState();
    if (!hasListeningState(stored)) {
      removeSection();
      return;
    }
    if (catalogueReady() && !document.getElementById('personalListeningSection')) queueListeningRender();
  });
  observer.observe(sections, { childList: true });
}

function plainPrimaryNavigation(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function songIdForPlayerLink(link) {
  try {
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin) return null;
    return destination.searchParams.get('song');
  } catch {
    return null;
  }
}

function captureExploreReturnState(link, event) {
  const songId = songIdForPlayerLink(link);
  if (!songId) return;
  const currentState = history.state && typeof history.state === 'object' ? history.state : {};
  const songRows = document.querySelectorAll('#catalogueSongList .song-row').length;
  const context = {
    v: 1,
    at: Date.now(),
    href: location.href,
    hash: location.hash,
    songId,
    scrollY: Math.max(0, window.scrollY || 0),
    linkTop: link.getBoundingClientRect().top,
    songRows,
    restoreFocus: event.detail === 0 || document.activeElement === link,
  };
  try {
    history.replaceState({ ...currentState, [EXPLORE_RETURN_STATE_KEY]: context }, '', location.href);
  } catch {
    // History state can be unavailable in unusual embedded contexts; navigation still works.
  }
}

function currentExploreReturnState() {
  const context = history.state?.[EXPLORE_RETURN_STATE_KEY];
  if (!context || context.v !== 1 || context.href !== location.href) return null;
  if (!Number.isFinite(Number(context.at)) || Date.now() - Number(context.at) > EXPLORE_RETURN_MAX_AGE) return null;
  return context;
}

function findReturnLink(songId) {
  if (!songId) return null;
  const links = document.querySelectorAll('a.play-link[href], a.personal-listening-card[href]');
  for (const link of links) {
    if (songIdForPlayerLink(link) === songId) return link;
  }
  return null;
}

function expandSongRowsForReturn(context) {
  let link = findReturnLink(context.songId);
  let guard = 0;
  while (!link && guard < 8) {
    const rows = document.querySelectorAll('#catalogueSongList .song-row').length;
    const more = document.querySelector('#catalogueSongList .song-more');
    if (!more || (context.songRows > 0 && rows >= context.songRows)) break;
    more.click();
    guard += 1;
    link = findReturnLink(context.songId);
  }
  return link;
}

function alignReturnTarget(context, link, { focus = false } = {}) {
  if (!link?.isConnected) return;
  if (Number.isFinite(Number(context.linkTop))) {
    const delta = link.getBoundingClientRect().top - Number(context.linkTop);
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
  }
  if (focus && context.restoreFocus) link.focus({ preventScroll: true });
}

function restoreExploreReturnState(attempt = 0) {
  clearTimeout(returnRestoreTimer);
  const context = currentExploreReturnState();
  if (!context) return;
  if (!catalogueReady()) {
    if (attempt < 100) returnRestoreTimer = window.setTimeout(() => restoreExploreReturnState(attempt + 1), 50);
    return;
  }

  const link = expandSongRowsForReturn(context) || findReturnLink(context.songId);
  if (!link && attempt < 100) {
    returnRestoreTimer = window.setTimeout(() => restoreExploreReturnState(attempt + 1), 50);
    return;
  }

  window.scrollTo({ top: Math.max(0, Number(context.scrollY) || 0), left: 0, behavior: 'auto' });
  requestAnimationFrame(() => requestAnimationFrame(() => alignReturnTarget(context, findReturnLink(context.songId) || link, { focus: true })));
  window.setTimeout(() => alignReturnTarget(context, findReturnLink(context.songId) || link), 420);
}

document.addEventListener('click', (event) => {
  if (!plainPrimaryNavigation(event)) return;
  const link = event.target instanceof Element
    ? event.target.closest('a.play-link[href], a.personal-listening-card[href]')
    : null;
  if (!link || link.target || link.hasAttribute('download')) return;
  captureExploreReturnState(link, event);
}, true);

window.addEventListener('pageshow', (event) => {
  if (event.persisted) queueListeningRender();
  else restoreExploreReturnState();
});
window.addEventListener('storage', (event) => {
  if (event.key === SESSION_KEY || event.key === FAVOURITES_KEY) queueListeningRender();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && hasListeningState(listeningState())) queueListeningRender();
});

startWhenReady();
watchCatalogueRenders();

(() => {
  const detail = document.getElementById('collectionDetail');
  const detailHead = detail?.querySelector('.detail-head');
  const releaseRail = document.getElementById('releaseRail');
  if (!detail || !detailHead || !releaseRail) return;

  const hero = document.createElement('div');
  hero.className = 'release-hero-art';
  hero.hidden = true;
  hero.setAttribute('aria-hidden', 'true');
  detailHead.prepend(hero);

  const style = document.createElement('style');
  style.dataset.playgarbaReleaseHero = '';
  style.textContent = `
    .collection-detail .detail-head[data-release-artwork="true"]{display:grid!important;grid-template-columns:clamp(132px,17vw,172px) minmax(0,1fr)!important;grid-template-areas:"art kicker" "art title" "art desc" "art meta";column-gap:clamp(20px,4vw,34px);align-items:center;text-align:left!important}
    .collection-detail .detail-head[data-release-artwork="true"] .release-hero-art{grid-area:art;align-self:center;display:block;width:100%;max-width:172px;aspect-ratio:1;overflow:hidden;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:rgba(255,255,255,.045);box-shadow:0 20px 52px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.08)}
    .collection-detail .detail-head[data-release-artwork="true"] .release-hero-art img{display:block;width:100%;height:100%;object-fit:cover}
    .collection-detail .detail-head[data-release-artwork="true"] #detailKicker{grid-area:kicker;align-self:end;margin:0 0 8px;text-align:left}
    .collection-detail .detail-head[data-release-artwork="true"] #detailTitle{grid-area:title;max-width:16ch!important;margin-inline:0!important;text-align:left}
    .collection-detail .detail-head[data-release-artwork="true"] #detailDescription{grid-area:desc;max-width:620px!important;margin:11px 0 0!important;text-align:left}
    .collection-detail .detail-head[data-release-artwork="true"] #detailMeta{grid-area:meta;justify-content:flex-start!important;margin-top:14px!important}
    @media(max-width:640px){
      .collection-detail .detail-head[data-release-artwork="true"]{grid-template-columns:84px minmax(0,1fr)!important;grid-template-areas:"art kicker" "art title" "desc desc" "meta meta";column-gap:13px;align-items:center}
      .collection-detail .detail-head[data-release-artwork="true"] .release-hero-art{width:84px;max-width:84px;border-radius:15px;box-shadow:0 13px 30px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.08)}
      .collection-detail .detail-head[data-release-artwork="true"] #detailKicker{margin-bottom:5px;font-size:.62rem;line-height:1.1}
      .collection-detail .detail-head[data-release-artwork="true"] #detailTitle{max-width:14ch!important;font-size:clamp(1.65rem,8vw,2.45rem);line-height:1}
      .collection-detail .detail-head[data-release-artwork="true"] #detailDescription{margin-top:13px!important}
      .collection-detail .detail-head[data-release-artwork="true"] #detailMeta{margin-top:12px!important}
    }
    @media(max-width:380px){
      .collection-detail .detail-head[data-release-artwork="true"]{grid-template-columns:72px minmax(0,1fr)!important;column-gap:11px}
      .collection-detail .detail-head[data-release-artwork="true"] .release-hero-art{width:72px;max-width:72px;border-radius:13px}
      .collection-detail .detail-head[data-release-artwork="true"] #detailTitle{font-size:clamp(1.5rem,7.7vw,2.1rem)}
    }
    @media(prefers-reduced-motion:reduce){.release-hero-art{transition:none!important}}
  `;
  document.head.append(style);

  let syncToken = 0;
  let queued = false;

  function clearHero() {
    syncToken += 1;
    delete detailHead.dataset.releaseArtwork;
    hero.hidden = true;
    hero.removeAttribute('data-release-id');
    hero.replaceChildren();
  }

  async function syncHero() {
    queued = false;
    const active = releaseRail.querySelector('.release-card.active[data-release-id]');
    if (!(active instanceof HTMLElement) || detail.hidden) {
      clearHero();
      return;
    }
    const releaseId = active.dataset.releaseId || '';
    if (!releaseId) {
      clearHero();
      return;
    }
    if (hero.dataset.releaseId === releaseId && detailHead.dataset.releaseArtwork === 'true') return;

    const token = ++syncToken;
    const { artwork } = await loadCatalogue();
    if (token !== syncToken) return;
    const entry = artwork?.[releaseId];
    if (entry?.verified !== true || !entry.imageUrl) {
      clearHero();
      return;
    }

    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'eager';
    img.fetchPriority = 'high';
    img.src = entry.imageUrl;
    img.addEventListener('error', () => {
      if (hero.dataset.releaseId === releaseId) clearHero();
    }, { once: true });

    hero.replaceChildren(img);
    hero.dataset.releaseId = releaseId;
    hero.hidden = false;
    detailHead.dataset.releaseArtwork = 'true';
  }

  function queueHeroSync() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { void syncHero(); });
  }

  new MutationObserver(queueHeroSync).observe(releaseRail, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  new MutationObserver(queueHeroSync).observe(detail, {
    attributes: true,
    attributeFilter: ['hidden'],
  });
  window.addEventListener('popstate', queueHeroSync);
  window.addEventListener('pageshow', queueHeroSync);
  queueHeroSync();
})();

(() => {
  const detail = document.getElementById('collectionDetail');
  const releaseRail = document.getElementById('releaseRail');
  const songList = document.getElementById('catalogueSongList');
  const songSectionTitle = document.getElementById('songSectionTitle');
  if (!detail || !releaseRail || !songList || !songSectionTitle) return;

  const style = document.createElement('style');
  style.dataset.playgarbaSelectedTracklist = '';
  style.textContent = `
    .collection-detail[data-selected-tracklist="true"] .song-release{display:none!important}
    .collection-detail[data-selected-tracklist="true"] .song-row{grid-template-columns:52px minmax(0,1fr) auto!important}
    .collection-detail[data-selected-tracklist="true"] .selected-release-context{display:none!important}
    .collection-detail[data-selected-tracklist="true"] .song-copy{padding-right:8px}
    .collection-detail[data-selected-tracklist="true"] .play-link{justify-self:end}
    @media(max-width:1080px){.collection-detail[data-selected-tracklist="true"] .song-row{grid-template-columns:50px minmax(0,1fr) auto!important}}
    @media(max-width:640px){.collection-detail[data-selected-tracklist="true"] .song-row{grid-template-columns:45px minmax(0,1fr) auto!important}.collection-detail[data-selected-tracklist="true"] .song-copy{padding-right:3px}}
    @media(max-width:420px){.collection-detail[data-selected-tracklist="true"] .song-row{grid-template-columns:43px minmax(0,1fr) auto!important}}
    @media(max-width:380px){.collection-detail[data-selected-tracklist="true"] .song-row{grid-template-columns:42px minmax(0,1fr) 44px!important}}
  `;
  document.head.append(style);

  let queued = false;

  function syncSelectedTracklist() {
    queued = false;
    const active = releaseRail.querySelector('.release-card.active[data-release-id]');
    const selected = active instanceof HTMLElement && !detail.hidden;
    if (!selected) {
      delete detail.dataset.selectedTracklist;
      songList.setAttribute('aria-label', 'Catalogue songs');
      return;
    }

    detail.dataset.selectedTracklist = 'true';
    const releaseTitle = active.querySelector('.release-title')?.textContent?.trim() || 'Selected release';
    songList.setAttribute('aria-label', `${releaseTitle} songs`);
    requestAnimationFrame(() => {
      const stillActive = releaseRail.querySelector('.release-card.active[data-release-id]');
      if (stillActive === active && !detail.hidden) songSectionTitle.textContent = 'Songs';
    });
  }

  function queueSelectedTracklistSync() {
    if (queued) return;
    queued = true;
    queueMicrotask(syncSelectedTracklist);
  }

  new MutationObserver(queueSelectedTracklistSync).observe(releaseRail, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  new MutationObserver(queueSelectedTracklistSync).observe(detail, {
    attributes: true,
    attributeFilter: ['hidden'],
  });
  window.addEventListener('popstate', queueSelectedTracklistSync);
  window.addEventListener('pageshow', queueSelectedTracklistSync);
  queueSelectedTracklistSync();
})();
