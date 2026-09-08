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
      const songById = new Map((songs || []).filter((song) => song?.id).map((song) => [song.id, song]));
      catalogueData = {
        songById,
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

function makeCard({ song, release, artwork, kind, elapsed = 0 }) {
  const link = document.createElement('a');
  link.className = `personal-listening-card ${kind === 'continue' ? 'is-continue' : 'is-favourite'}`;
  link.href = playerUrl(song);
  link.setAttribute('aria-label', `${kind === 'continue' ? 'Continue listening to' : 'Listen to favourite'} ${song.title} by ${song.artist}`);
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
    const rawPosition = Math.max(0, Number(elapsed || 0));
    const position = duration > 0 ? Math.min(rawPosition, duration) : rawPosition;
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
    .personal-listening-section{margin-bottom:58px}
    .personal-listening-rail{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(270px,360px);gap:12px;overflow-x:auto;overscroll-behavior-inline:contain;padding:2px 2px 10px;scroll-snap-type:x proximity;scrollbar-width:thin}
    .personal-listening-card{display:grid;grid-template-columns:86px minmax(0,1fr);gap:14px;align-items:center;min-height:112px;padding:12px;border:1px solid var(--line);border-radius:22px;background:rgba(255,255,255,.035);color:var(--text);text-decoration:none;scroll-snap-align:start;box-shadow:0 16px 50px rgba(0,0,0,.13);transition:transform .18s ease,border-color .18s ease,background .18s ease}
    .personal-listening-card:hover{transform:translateY(-2px);border-color:rgba(217,178,111,.34);background:rgba(255,255,255,.055)}
    .personal-listening-card:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
    .personal-listening-cover{display:grid;place-items:center;width:86px;aspect-ratio:1;overflow:hidden;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#292d43,#151827);color:#d7c4a6;font-size:1.1rem;font-weight:800;letter-spacing:-.04em}
    .personal-listening-cover img{display:block;width:100%;height:100%;object-fit:cover}
    .personal-listening-copy{display:block;min-width:0}
    .personal-listening-copy small{display:block;margin-bottom:5px;color:var(--accent);font-size:.67rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
    .personal-listening-copy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:1rem;letter-spacing:-.025em}
    .personal-listening-copy>span:not(.personal-listening-progress){display:-webkit-box;overflow:hidden;margin-top:5px;color:var(--muted);font-size:.76rem;line-height:1.35;-webkit-line-clamp:2;-webkit-box-orient:vertical}
    .personal-listening-progress{display:grid;grid-template-columns:minmax(60px,1fr) auto;gap:8px;align-items:center;margin-top:9px;color:var(--muted);font-size:.7rem}
    .personal-listening-progress>span:first-child{height:3px;overflow:hidden;border-radius:999px;background:rgba(245,234,214,.12)}
    .personal-listening-progress>span:first-child>span{display:block;height:100%;border-radius:inherit;background:var(--accent)}
    @media(max-width:640px){.personal-listening-section{margin-bottom:46px}.personal-listening-rail{grid-auto-columns:minmax(250px,82vw);margin-right:-11px;padding-right:11px}.personal-listening-card{grid-template-columns:74px minmax(0,1fr);min-height:100px;padding:10px;border-radius:19px}.personal-listening-cover{width:74px;border-radius:14px}}
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
  description.textContent = continueSong && favouriteSongs.length
    ? 'Pick up where you left off, then revisit songs you saved.'
    : continueSong
      ? 'Pick up where you left off in the PlayGarba player.'
      : 'Songs you saved in the PlayGarba player.';
  head.append(heading, description);

  const rail = document.createElement('div');
  rail.className = 'personal-listening-rail';
  rail.setAttribute('role', 'group');
  rail.setAttribute('aria-label', 'Your PlayGarba listening');

  if (continueSong) {
    const release = releaseById.get(continueSong.releaseId);
    rail.append(makeCard({
      song: continueSong,
      release,
      artwork,
      kind: 'continue',
      elapsed: Number(stored.session.elapsed || 0),
    }));
  }

  for (const song of favouriteSongs) {
    const release = releaseById.get(song.releaseId);
    rail.append(makeCard({ song, release, artwork, kind: 'favourite' }));
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
