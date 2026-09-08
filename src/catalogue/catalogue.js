const paths = {
  songs: '../data/songs.json',
  releases: '../data/releases.json',
  genres: '../data/genres.json',
  catalogueIndex: '../data/catalogue/index.json',
  artwork: '../data/release-artwork.json',
};

const visualByGenre = {
  traditional: '../assets/backgrounds/library/15-traditional-canopy-courtyard.webp',
  dandiya: '../assets/backgrounds/library/10-dandiya-silhouette-courtyard.webp',
  devotional: '../assets/backgrounds/library/03-devotional-garba-courtyard.webp',
  folk: '../assets/backgrounds/library/14-gujarati-folk-courtyard.webp',
  sanedo: '../assets/backgrounds/library/04-colourful-garba-courtyard-a.webp',
  fusion: '../assets/backgrounds/library/05-fusion-gujarati-neon.webp',
};

const $ = (id) => document.getElementById(id);
const els = {
  search: $('catalogueSearch'),
  count: $('catalogueCount'),
  sections: $('catalogueSections'),
  home: $('collectionHome'),
  detail: $('collectionDetail'),
  back: $('backToCollections'),
  detailKicker: $('detailKicker'),
  detailTitle: $('detailTitle'),
  detailDescription: $('detailDescription'),
  detailMeta: $('detailMeta'),
  releaseSection: $('releaseSection'),
  releaseRail: $('releaseRail'),
  showAllSongs: $('showAllSongs'),
  songSectionTitle: $('songSectionTitle'),
  songCount: $('songCount'),
  songList: $('catalogueSongList'),
  cardTemplate: $('collectionCardTemplate'),
};

const state = {
  songs: [],
  releases: [],
  genres: [],
  artists: [],
  artwork: {},
  releaseById: new Map(),
  collections: [],
  active: null,
  activeSongs: [],
  activeReleaseId: null,
};

const normalise = (value = '') => String(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\u0a80-\u0aff]+/g, ' ')
  .trim();

const escapeText = (value = '') => String(value);
const formatDuration = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return '';
  return `${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}`;
};
const releaseYear = (release) => Number(release?.originalReleaseYear || String(release?.releaseDate || '').slice(0, 4)) || 0;
const allSongText = (song, release) => normalise([
  song.title,
  song.artist,
  song.genre,
  song.category,
  ...(song.styles || []),
  release?.title,
  release?.artist,
  release?.label,
].filter(Boolean).join(' '));

async function fetchJson(url, fallback = null) {
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

function richerRelease(existing, candidate) {
  if (!existing) return candidate;
  const score = (release) => {
    const artist = String(release?.artist || '');
    return (normalise(artist) !== 'various artists' ? 10 : 0)
      + Math.min(artist.length, 120) / 20
      + (Array.isArray(release?.sources) ? release.sources.length : 0)
      + (release?.label ? 1 : 0)
      + (release?.releaseDate ? 1 : 0);
  };
  return score(candidate) > score(existing) ? candidate : existing;
}

function buildReleaseIndex(rows) {
  const map = new Map();
  rows.forEach((release) => {
    if (!release?.id) return;
    map.set(release.id, richerRelease(map.get(release.id), release));
  });
  return map;
}

function includesTerm(song, release, terms) {
  const text = allSongText(song, release);
  return terms.some((term) => text.includes(normalise(term)));
}

function fixedCollection({ id, title, kicker, description, visual, test }) {
  return { id, title, kicker, description, visual, test };
}

function buildCollections() {
  const c = [];
  const art = visualByGenre;

  c.push(
    fixedCollection({ id:'nonstop', title:'Nonstop Garba', kicker:'Continuous energy', description:'Long-form nonstop releases, continuous Garba albums and set-style catalogue entries.', visual:art.traditional, test:(song, release)=>includesTerm(song, release, ['non stop','nonstop']) }),
    fixedCollection({ id:'live', title:'Live Garba', kicker:'On stage', description:'Live Garba performances, event recordings and United Way-style concert releases.', visual:art.folk, test:(song, release)=>Boolean(release?.live?.isLive)||includesTerm(song, release, ['live garba','live at','live']) }),
    fixedCollection({ id:'current', title:'New generation', kicker:'2020s', description:'Recent Gujarati Garba and folk releases from 2020 onward.', visual:art.fusion, test:(song, release)=>releaseYear(release)>=2020 }),
    fixedCollection({ id:'classics', title:'Garba classics', kicker:'Foundation', description:'Traditional Garba catalogue entries—the core repertoire before modern remixes and crossover styles.', visual:art.traditional, test:(song)=>song.genre==='traditional' }),
    fixedCollection({ id:'dandiya-raas', title:'Dandiya & Raas', kicker:'Raas', description:'Dandiya Raas, Krishna Raas and high-motion circular dance repertoire.', visual:art.dandiya, test:(song, release)=>song.genre==='dandiya'||includesTerm(song, release,['raas','dandiya']) }),
    fixedCollection({ id:'devotional', title:'Devotional Garba', kicker:'Bhakti', description:'Garba centred on Mataji, Shakti, Krishna and devotional traditions.', visual:art.devotional, test:(song)=>song.genre==='devotional' }),
  );

  state.genres.forEach((genre) => {
    c.push(fixedCollection({
      id:`genre-${genre.id}`,
      title:genre.label || genre.name,
      kicker:'By tradition',
      description:`Explore every PlayGarba track currently classified as ${genre.label || genre.name}.`,
      visual:visualByGenre[genre.id] || art.traditional,
      test:(song)=>song.genre===genre.id,
    }));
  });

  const styleCollections = [
    ['krishna-radha','Krishna & Radha','Raas & bhakti',['krishna','radha','kanudo','kanuda'],art.devotional],
    ['mataji-shakti','Mataji & Shakti','Devi Garba',['mataji','ambe','amba','shakti','navdurga','jagdamba','mahakali'],art.devotional],
    ['tran-taali','Tran Taali','Three-clap tradition',['tran taali','tran-taali','three taali','3 taali'],art.traditional],
    ['be-taali','Be Taali','Two-clap tradition',['be taali','be-taali','two taali','2 taali'],art.traditional],
    ['dakla','Dakla','Percussive folk',['dakla'],art.fusion],
    ['timli','Timli','Regional folk dance',['timli'],art.folk],
    ['folk-fusion','Folk fusion','New folk',['folk fusion','folk-fusion','electronic'],art.fusion],
    ['filmi-pop','Filmi & pop Garba','Crossover',['filmi','film','pop garba'],art.fusion],
    ['sanedo-style','Sanedo','Call-and-response',['sanedo'],art.sanedo],
  ];
  styleCollections.forEach(([id,title,kicker,terms,visual]) => c.push(fixedCollection({ id,title,kicker,description:`Songs and releases connected to ${title}.`,visual,test:(song,release)=>includesTerm(song,release,terms) })));

  const decades = [
    [2020,2029,'2020s'],
    [2010,2019,'2010s'],
    [2000,2009,'2000s'],
    [1990,1999,'1990s'],
  ];
  decades.forEach(([from,to,label], index) => c.push(fixedCollection({
    id:`era-${from}`,
    title:label,
    kicker:'By era',
    description:`Garba releases dated from ${from} through ${to}.`,
    visual:[art.fusion,art.folk,art.dandiya,art.traditional][index],
    test:(song,release)=>releaseYear(release)>=from&&releaseYear(release)<=to,
  })));

  state.artists.slice(0, 24).forEach((artist, index) => {
    const names = [artist.name, ...(artist.aliases || [])].map(normalise).filter(Boolean);
    c.push(fixedCollection({
      id:`artist-${artist.id}`,
      title:`${artist.name} Essentials`,
      kicker:'Artist',
      description:`Songs in PlayGarba credited to ${artist.name}, including catalogue aliases where available.`,
      visual:[art.traditional,art.folk,art.dandiya,art.fusion,art.devotional][index % 5],
      test:(song)=>{
        const credit = normalise(song.artist);
        return names.some((name)=>credit.includes(name));
      },
    }));
  });

  return c.map((collection) => {
    const songs = state.songs.filter((song) => collection.test(song, state.releaseById.get(song.releaseId)));
    return { ...collection, songs };
  }).filter((collection) => collection.songs.length > 0);
}

function collectionSection(title, description, collections) {
  if (!collections.length) return;
  const section = document.createElement('section');
  section.className = 'catalogue-section';
  const head = document.createElement('div');
  head.className = 'section-title-row';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const copy = document.createElement('p');
  copy.textContent = description;
  head.append(heading, copy);
  const grid = document.createElement('div');
  grid.className = 'collection-grid';
  collections.forEach((collection) => grid.append(renderCollectionCard(collection)));
  section.append(head, grid);
  els.sections.append(section);
}

function renderCollectionCard(collection) {
  const card = els.cardTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.collectionId = collection.id;
  card.querySelector('.collection-image').style.backgroundImage = `url("${collection.visual}")`;
  card.querySelector('small').textContent = collection.kicker;
  card.querySelector('strong').textContent = collection.title;
  const releaseCount = new Set(collection.songs.map((song)=>song.releaseId).filter(Boolean)).size;
  card.querySelector('.collection-copy span').textContent = `${collection.songs.length.toLocaleString()} songs · ${releaseCount.toLocaleString()} releases`;
  card.addEventListener('click', () => openCollection(collection.id));
  return card;
}

function renderCollectionHome() {
  els.sections.replaceChildren();
  const byId = (id) => state.collections.find((collection) => collection.id === id);
  const featuredIds = ['nonstop','live','current','classics','dandiya-raas','devotional'];
  collectionSection('Featured', 'Broad ways into the library, designed for listening rather than metadata browsing.', featuredIds.map(byId).filter(Boolean));
  collectionSection('Traditions & styles', 'Explore the catalogue by dance form, devotional tradition and musical style.', state.collections.filter((c)=>c.id.startsWith('genre-')||['krishna-radha','mataji-shakti','tran-taali','be-taali','dakla','timli','folk-fusion','filmi-pop','sanedo-style'].includes(c.id)));
  collectionSection('Artist essentials', 'Curated artist identities from PlayGarba discovery data—not automatically split credit strings.', state.collections.filter((c)=>c.id.startsWith('artist-')));
  collectionSection('By era', 'Move through the catalogue by original release year.', state.collections.filter((c)=>c.id.startsWith('era-')));
}

function artworkEntry(releaseId) {
  return state.artwork?.releases?.[releaseId] || null;
}

function makeCover(release, className = 'release-cover') {
  const wrap = document.createElement('span');
  wrap.className = className;
  const entry = artworkEntry(release?.id);
  if (entry?.imageUrl && entry?.verified !== false) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = `${release?.title || 'Release'} cover`;
    img.src = entry.imageUrl;
    img.addEventListener('error', () => {
      img.remove();
      wrap.classList.add('fallback');
      const fallback = document.createElement('span');
      fallback.textContent = initials(release?.title);
      wrap.append(fallback);
    }, { once:true });
    wrap.append(img);
  } else {
    wrap.classList.add('fallback');
    const fallback = document.createElement('span');
    fallback.textContent = initials(release?.title);
    wrap.append(fallback);
  }
  return wrap;
}

function initials(value='') {
  const words = String(value).replace(/[^\p{L}\p{N} ]/gu,' ').trim().split(/\s+/).filter(Boolean);
  return (words.slice(0,2).map((word)=>word[0]).join('') || 'PG').toUpperCase();
}

function releasesForSongs(songs) {
  const counts = new Map();
  songs.forEach((song)=>{ if (song.releaseId) counts.set(song.releaseId,(counts.get(song.releaseId)||0)+1); });
  return [...counts.entries()].map(([id,count])=>({ release:state.releaseById.get(id), count })).filter((item)=>item.release)
    .sort((a,b)=>releaseYear(b.release)-releaseYear(a.release)||b.count-a.count||String(a.release.title).localeCompare(String(b.release.title)));
}

function renderReleases(songs) {
  els.releaseRail.replaceChildren();
  const items = releasesForSongs(songs);
  els.releaseSection.hidden = items.length === 0;
  items.slice(0, 40).forEach(({release,count})=>{
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `release-card${state.activeReleaseId===release.id?' active':''}`;
    button.dataset.releaseId = release.id;
    button.setAttribute('role','listitem');
    button.append(makeCover(release));
    const title = document.createElement('strong');
    title.className = 'release-title';
    title.textContent = release.title;
    const meta = document.createElement('span');
    meta.className = 'release-meta';
    const year = releaseYear(release);
    meta.textContent = [release.artist, year || null, `${count} ${count===1?'song':'songs'}`].filter(Boolean).join(' · ');
    button.append(title,meta);
    button.addEventListener('click',()=>filterToRelease(release.id));
    els.releaseRail.append(button);
  });
}

function songArtwork(song) {
  const release = state.releaseById.get(song.releaseId);
  const cover = makeCover(release, 'song-art');
  if (cover.classList.contains('fallback')) {
    cover.replaceChildren();
    cover.textContent = initials(release?.title || song.title);
  }
  return cover;
}

function renderSongs(songs, title='All songs') {
  els.songList.replaceChildren();
  els.songSectionTitle.textContent = title;
  els.songCount.textContent = `${songs.length.toLocaleString()} ${songs.length===1?'song':'songs'}`;
  if (!songs.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No songs match this catalogue yet.';
    els.songList.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  songs.slice(0, 300).forEach((song)=>{
    const release = state.releaseById.get(song.releaseId);
    const row = document.createElement('div');
    row.className = 'song-row';
    row.setAttribute('role','listitem');
    row.append(songArtwork(song));
    const copy = document.createElement('div');
    copy.className = 'song-copy';
    const titleEl = document.createElement('strong');
    titleEl.textContent = song.title;
    const artist = document.createElement('span');
    artist.textContent = [song.artist, formatDuration(song.durationSeconds)].filter(Boolean).join(' · ');
    copy.append(titleEl,artist);
    const releaseEl = document.createElement('span');
    releaseEl.className = 'song-release';
    releaseEl.textContent = release?.title || '';
    const play = document.createElement('a');
    play.className = 'play-link';
    play.textContent = 'Play';
    play.href = `../?genre=${encodeURIComponent(song.genre || 'traditional')}&song=${encodeURIComponent(song.id)}`;
    play.setAttribute('aria-label',`Play ${song.title} by ${song.artist}`);
    row.append(copy,releaseEl,play);
    fragment.append(row);
  });
  els.songList.append(fragment);
}

function openCollection(id, { updateHash = true } = {}) {
  const collection = state.collections.find((item)=>item.id===id);
  if (!collection) return;
  state.active = collection;
  state.activeSongs = collection.songs;
  state.activeReleaseId = null;
  els.home.hidden = true;
  els.detail.hidden = false;
  els.detailKicker.textContent = collection.kicker;
  els.detailTitle.textContent = collection.title;
  els.detailDescription.textContent = collection.description;
  const releaseCount = new Set(collection.songs.map((song)=>song.releaseId).filter(Boolean)).size;
  els.detailMeta.replaceChildren();
  [`${collection.songs.length.toLocaleString()} songs`,`${releaseCount.toLocaleString()} releases`].forEach((text)=>{
    const pill = document.createElement('span'); pill.textContent=text; els.detailMeta.append(pill);
  });
  renderReleases(collection.songs);
  renderSongs(collection.songs);
  if (updateHash) history.pushState({collection:id},'',`#collection=${encodeURIComponent(id)}`);
  window.scrollTo({top:0,behavior:'smooth'});
}

function filterToRelease(releaseId) {
  if (!state.active) return;
  state.activeReleaseId = releaseId;
  const release = state.releaseById.get(releaseId);
  const songs = state.activeSongs.filter((song)=>song.releaseId===releaseId);
  renderReleases(state.activeSongs);
  renderSongs(songs, release?.title || 'Release songs');
  document.querySelector('.songs-section')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function closeCollection({ updateHash = true } = {}) {
  state.active = null;
  state.activeSongs = [];
  state.activeReleaseId = null;
  els.detail.hidden = true;
  els.home.hidden = false;
  if (updateHash) history.pushState({},'',location.pathname);
  window.scrollTo({top:0,behavior:'smooth'});
}

function searchCatalogue(query) {
  const q = normalise(query);
  if (!q) {
    closeCollection();
    return;
  }
  const terms = q.split(/\s+/).filter(Boolean);
  const songs = state.songs.filter((song)=>{
    const release = state.releaseById.get(song.releaseId);
    const text = allSongText(song,release);
    return terms.every((term)=>text.includes(term));
  });
  state.active = { id:'search', title:`Search: ${query.trim()}`, kicker:'Search results', description:'Matching songs, artists and release metadata from the PlayGarba catalogue.', songs };
  state.activeSongs = songs;
  state.activeReleaseId = null;
  els.home.hidden = true;
  els.detail.hidden = false;
  els.detailKicker.textContent = 'Search results';
  els.detailTitle.textContent = query.trim();
  els.detailDescription.textContent = 'Matching songs, artists and albums from the PlayGarba catalogue.';
  els.detailMeta.replaceChildren();
  const pill = document.createElement('span'); pill.textContent=`${songs.length.toLocaleString()} matches`; els.detailMeta.append(pill);
  renderReleases(songs);
  renderSongs(songs,'Matching songs');
  history.replaceState({search:q},'',`#search=${encodeURIComponent(query.trim())}`);
}

function wireEvents() {
  let timer = null;
  els.search.addEventListener('input',()=>{
    clearTimeout(timer);
    timer = setTimeout(()=>searchCatalogue(els.search.value),90);
  });
  els.back.addEventListener('click',()=>{ els.search.value=''; closeCollection(); });
  els.showAllSongs.addEventListener('click',()=>{
    if (!state.active) return;
    state.activeReleaseId = null;
    renderReleases(state.activeSongs);
    renderSongs(state.activeSongs);
  });
  window.addEventListener('popstate',applyHashState);
}

function applyHashState() {
  const params = new URLSearchParams(location.hash.replace(/^#/,'').replaceAll('&','&'));
  const id = params.get('collection');
  const search = params.get('search');
  if (id) openCollection(id,{updateHash:false});
  else if (search) { els.search.value=search; searchCatalogue(search); }
  else { els.search.value=''; closeCollection({updateHash:false}); }
}

async function init() {
  const [songs,releases,genres,index,artwork] = await Promise.all([
    fetchJson(paths.songs,[]),
    fetchJson(paths.releases,[]),
    fetchJson(paths.genres,[]),
    fetchJson(paths.catalogueIndex,{}),
    fetchJson(paths.artwork,{releases:{}}),
  ]);
  if (!songs.length) throw new Error('Song catalogue unavailable');
  state.songs = songs;
  state.releases = releases;
  state.genres = genres;
  state.artwork = artwork || { releases:{} };
  state.releaseById = buildReleaseIndex(releases);
  state.artists = await loadArtists(index);
  state.collections = buildCollections();
  els.count.textContent = `${songs.length.toLocaleString()} songs · ${state.releaseById.size.toLocaleString()} releases · ${state.collections.length.toLocaleString()} catalogues`;
  renderCollectionHome();
  wireEvents();
  applyHashState();
}

init().catch((error)=>{
  console.error(error);
  els.count.textContent = 'Catalogue temporarily unavailable.';
  els.sections.innerHTML = '<div class="empty">The PlayGarba catalogue could not be loaded. Return to the player and try again when you are online.</div>';
});
