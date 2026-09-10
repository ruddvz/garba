from pathlib import Path

catalogue_path = Path('src/catalogue/catalogue.js')
listening_path = Path('src/catalogue/listening-library.js')
catalogue = catalogue_path.read_text()
listening = listening_path.read_text()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


old_catalogue_loader = """async function fetchJson(url, fallback = null) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok ? await response.json() : fallback;
  } catch {
    return fallback;
  }
}

async function loadArtists(index) {
  const files = index?.discovery?.artists || [];
  if (!files.length) return [];
  const payloads = await Promise.all(files.map((file) => fetchJson(`../${file}`, null)));
  const seen = new Set();
  return payloads.flatMap((payload) => payload?.artists || []).filter((artist) => artist?.id && !seen.has(artist.id) && seen.add(artist.id));
}
"""
new_catalogue_loader = """const EXPLORE_PAGE_DATA_KEY = '__PLAYGARBA_EXPLORE_PAGE_DATA_V1__';
const EXPLORE_PAGE_DATA_EVENT = 'playgarba:explore-page-data-ready';

function createExplorePageDataStore() {
  const resolved = new Map();
  const inFlight = new Map();
  const artistPromises = new Map();
  const coreKeys = new Set([paths.songs, paths.releases, paths.catalogueIndex, paths.artwork]);
  let corePromise = null;

  const fetchJsonOnce = (url, fallback = null) => {
    const key = String(url);
    if (resolved.has(key)) return Promise.resolve(resolved.get(key));
    if (inFlight.has(key)) return inFlight.get(key);

    const request = (async () => {
      try {
        const response = await fetch(key, { cache: 'no-store' });
        if (!response.ok) return fallback;
        const value = await response.json();
        resolved.set(key, value);
        return value;
      } catch {
        return fallback;
      }
    })();
    inFlight.set(key, request);
    void request.finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });
    return request;
  };

  const loadCore = () => {
    if (!corePromise) {
      corePromise = Promise.all([
        fetchJsonOnce(paths.songs, []),
        fetchJsonOnce(paths.releases, []),
        fetchJsonOnce(paths.catalogueIndex, {}),
        fetchJsonOnce(paths.artwork, { releases: {} }),
      ]).then(([songs, releases, index, artwork]) => ({ songs, releases, index, artwork }));
    }
    return corePromise;
  };

  const loadArtists = async (index = null) => {
    const sourceIndex = index || (await loadCore()).index;
    const files = [...new Set((sourceIndex?.discovery?.artists || []).filter(Boolean))];
    if (!files.length) return [];
    const signature = files.join('\\n');
    if (artistPromises.has(signature)) return artistPromises.get(signature);

    const request = Promise.all(files.map((file) => fetchJsonOnce(`../${file}`, null))).then((payloads) => {
      const seen = new Set();
      const artists = payloads
        .flatMap((payload) => payload?.artists || [])
        .filter((artist) => artist?.id && !seen.has(artist.id) && seen.add(artist.id));
      if (payloads.some((payload) => payload == null)) artistPromises.delete(signature);
      return artists;
    });
    artistPromises.set(signature, request);
    return request;
  };

  const invalidate = (url) => {
    const key = String(url);
    resolved.delete(key);
    if (coreKeys.has(key)) corePromise = null;
  };

  return Object.freeze({ fetchJson: fetchJsonOnce, loadCore, loadArtists, invalidate });
}

const explorePageData = window[EXPLORE_PAGE_DATA_KEY] || createExplorePageDataStore();
if (!window[EXPLORE_PAGE_DATA_KEY]) {
  Object.defineProperty(window, EXPLORE_PAGE_DATA_KEY, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: explorePageData,
  });
}
window.dispatchEvent(new Event(EXPLORE_PAGE_DATA_EVENT));

async function fetchJson(url, fallback = null) {
  return explorePageData.fetchJson(url, fallback);
}

async function loadArtists(index) {
  return explorePageData.loadArtists(index);
}
"""
catalogue = replace_once(catalogue, old_catalogue_loader, new_catalogue_loader, 'catalogue shared loader')

old_init = """  const [songs,releases,genres,taxonomy,index,artwork,curation] = await Promise.all([
    fetchJson(paths.songs,[]),
    fetchJson(paths.releases,[]),
    fetchJson(paths.genres,[]),
    fetchJson(paths.taxonomy,[]),
    fetchJson(paths.catalogueIndex,{}),
    fetchJson(paths.artwork,{releases:{}}),
    fetchJson(paths.curation,{featuredReleaseIds:[]}),
  ]);
  if (!songs.length) throw new Error('Song catalogue unavailable');
"""
new_init = """  const [core,genres,taxonomy,curation] = await Promise.all([
    explorePageData.loadCore(),
    fetchJson(paths.genres,[]),
    fetchJson(paths.taxonomy,[]),
    fetchJson(paths.curation,{featuredReleaseIds:[]}),
  ]);
  const { songs, releases, index, artwork } = core;
  if (!songs.length) {
    explorePageData.invalidate(paths.songs);
    throw new Error('Song catalogue unavailable');
  }
"""
catalogue = replace_once(catalogue, old_init, new_init, 'catalogue init')

old_listening_loader = """async function fetchJson(url, fallback) {
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
"""
new_listening_loader = """const EXPLORE_PAGE_DATA_KEY = '__PLAYGARBA_EXPLORE_PAGE_DATA_V1__';
const EXPLORE_PAGE_DATA_EVENT = 'playgarba:explore-page-data-ready';
let sharedPageDataPromise = null;

function validExplorePageDataStore(store) {
  return Boolean(store && typeof store.loadCore === 'function' && typeof store.loadArtists === 'function' && typeof store.fetchJson === 'function');
}

function loadSharedPageDataStore() {
  const current = window[EXPLORE_PAGE_DATA_KEY];
  if (validExplorePageDataStore(current)) return Promise.resolve(current);
  if (!sharedPageDataPromise) {
    sharedPageDataPromise = new Promise((resolve) => {
      const resolveWhenReady = () => {
        const store = window[EXPLORE_PAGE_DATA_KEY];
        if (validExplorePageDataStore(store)) resolve(store);
      };
      window.addEventListener(EXPLORE_PAGE_DATA_EVENT, resolveWhenReady, { once: true });
      queueMicrotask(resolveWhenReady);
    });
  }
  return sharedPageDataPromise;
}

async function loadCatalogue() {
  if (catalogueData) return catalogueData;
  if (!cataloguePromise) {
    cataloguePromise = loadSharedPageDataStore()
      .then((store) => store.loadCore())
      .then(({ songs, releases, artwork }) => {
        if (!Array.isArray(songs) || !songs.length) throw new Error('Shared Explore catalogue unavailable');
        catalogueData = {
          songById: new Map(songs.filter((song) => song?.id).map((song) => [song.id, song])),
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
"""
listening = replace_once(listening, old_listening_loader, new_listening_loader, 'listening shared loader')

old_artist_loader = """  async function loadArtistIdentityData() {
    if (artistDataPromise) return artistDataPromise;
    artistDataPromise = Promise.all([
      fetchJson('../data/catalogue/index.json', {}),
      fetchJson('../data/artist-artwork.json', { artists: {} }),
    ]).then(async ([index, artwork]) => {
      const files = index?.discovery?.artists || [];
      const payloads = await Promise.all(files.map((file) => fetchJson(`../${file}`, null)));
      const artistById = new Map();
      payloads.flatMap((payload) => payload?.artists || []).forEach((artist) => {
        if (artist?.id && !artistById.has(artist.id)) artistById.set(artist.id, artist);
      });
      return { artistById, artwork: artwork?.artists || {} };
    });
    return artistDataPromise;
  }
"""
new_artist_loader = """  async function loadArtistIdentityData() {
    if (artistDataPromise) return artistDataPromise;
    artistDataPromise = loadSharedPageDataStore().then(async (store) => {
      const [artists, artwork] = await Promise.all([
        store.loadArtists(),
        store.fetchJson('../data/artist-artwork.json', { artists: {} }),
      ]);
      const artistById = new Map();
      artists.forEach((artist) => {
        if (artist?.id && !artistById.has(artist.id)) artistById.set(artist.id, artist);
      });
      return { artistById, artwork: artwork?.artists || {} };
    });
    return artistDataPromise;
  }
"""
listening = replace_once(listening, old_artist_loader, new_artist_loader, 'artist shared loader')

forbidden = [
    "fetchJson('../data/songs.json', [])",
    "fetchJson('../data/releases.json', [])",
    "fetchJson('../data/release-artwork.json', { releases: {} })",
    "fetchJson('../data/catalogue/index.json', {})",
]
for marker in forbidden:
    if marker in listening:
        raise SystemExit(f'listening duplicate fetch remains: {marker}')

for marker in [
    "explorePageData.loadCore()",
    "explorePageData.invalidate(paths.songs)",
    "store.loadCore()",
    "store.loadArtists()",
    "store.fetchJson('../data/artist-artwork.json', { artists: {} })",
]:
    if marker not in catalogue + listening:
        raise SystemExit(f'missing shared-data marker: {marker}')

catalogue_path.write_text(catalogue)
listening_path.write_text(listening)
