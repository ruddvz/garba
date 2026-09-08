const SESSION_KEY = 'garba:session';
const FAVOURITES_KEY = 'garba:favourites';
const MAX_FAVOURITES = 6;

const sections = document.getElementById('catalogueSections');
const catalogueCount = document.getElementById('catalogueCount');
let cataloguePromise = null;
let catalogueData = null;

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
  link.setAttribute('aria-label', `${kind === 'continue' ? 'Continue listening to' : 'Listen to favourite'} ${song.title} by ${song.artist}`);
  if (kind === 'favourite') link.addEventListener('click', () => primeFavouriteSession(song));
  link.append(coverFor(song, release, artwork));

  const copy = document.createElement('span');
  copy.className = 'personal-listening-copy';
  const kicker = document.createElement('small');
  kicker.textContent = kind === 'continue' ? 'Continue listening' : 'Favourite';
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
    .personal-listening-section .section-title-row{margin-bottom:14px}
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
    @media(max-width:640px){.personal-listening-section{margin-bottom:36px}.personal-listening-rail{grid-auto-columns:minmax(250px,82vw);margin-right:-17px;padding-right:17px}.personal-listening-card{grid-template-columns:76px minmax(0,1fr);min-height:102px;padding:10px;border-radius:21px}.personal-listening-cover{width:76px;border-radius:15px}.personal-listening-section .section-title-row p{display:none}}
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
  heading.textContent = 'Your listening';
  const description = document.createElement('p');
  description.textContent = continueSong
    ? 'Pick up where you left off, then revisit songs you saved.'
    : 'Songs you saved in the PlayGarba player.';
  head.append(heading, description);

  const rail = document.createElement('div');
  rail.className = 'personal-listening-rail';
  rail.setAttribute('aria-label', 'Your PlayGarba listening');

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

function startWhenReady() {
  const stored = listeningState();
  if (!hasListeningState(stored)) return;
  if (catalogueReady()) {
    void renderListeningLibrary();
    return;
  }
  const observer = new MutationObserver(() => {
    if (!catalogueReady()) return;
    observer.disconnect();
    void renderListeningLibrary();
  });
  if (sections) observer.observe(sections, { childList: true, subtree: false });
  if (catalogueCount) observer.observe(catalogueCount, { childList: true, characterData: true, subtree: true });
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted && catalogueData) void renderListeningLibrary();
});
window.addEventListener('storage', (event) => {
  if ((event.key === SESSION_KEY || event.key === FAVOURITES_KEY) && catalogueData) void renderListeningLibrary();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && catalogueData) void renderListeningLibrary();
});

startWhenReady();
