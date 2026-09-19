from pathlib import Path
import shutil


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one guarded match, found {count}: {old[:80]!r}')
    file.write_text(text.replace(old, new, 1))


replace_once(
    'src/catalogue/index.html',
    '          <span id="songCount"></span>',
    '''          <div class="section-heading-actions">
            <label class="catalogue-sort" id="catalogueSortField">
              <span>Sort</span>
              <select id="catalogueSort" aria-label="Sort catalogue songs">
                <option value="playable-first">Playable first</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </label>
            <span id="songCount"></span>
          </div>'''
)

replace_once(
    'src/catalogue/index.html',
    '  <script type="module" src="catalogue.js"></script>',
    '  <script src="../assets/runtime/catalogue-ordering.js"></script>\n  <script type="module" src="catalogue.js"></script>'
)

replace_once(
    'src/catalogue/catalogue.js',
    "  songCount: $('songCount'),\n  songList: $('catalogueSongList'),",
    "  songCount: $('songCount'),\n  sort: $('catalogueSort'),\n  sortField: $('catalogueSortField'),\n  songList: $('catalogueSongList'),"
)

replace_once(
    'src/catalogue/catalogue.js',
    "  loadFailed: false,\n  returnFocusTarget: null,\n};",
    "  loadFailed: false,\n  returnFocusTarget: null,\n  sortMode: 'playable-first',\n};"
)

replace_once(
    'src/catalogue/catalogue.js',
    '''function orderedSongsForRender(songs) {
  return orderCatalogueSongs(songs, {
    context: currentSongOrderingContext(),
    mode: 'popular',
    availabilityGate: true,
    getAvailabilityTier: catalogueAvailabilityTier,
  });
}''',
    '''const CATALOGUE_SORT_DEFAULT = 'playable-first';
const CATALOGUE_SORT_MODES = new Set([CATALOGUE_SORT_DEFAULT, 'newest', 'oldest']);

function normaliseCatalogueSortMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return CATALOGUE_SORT_MODES.has(mode) ? mode : CATALOGUE_SORT_DEFAULT;
}

function catalogueChronology(song) {
  const release = state.releaseById.get(song?.releaseId);
  return release?.originalReleaseYear || release?.releaseDate || null;
}

function currentCatalogueSortMode() {
  return normaliseCatalogueSortMode(state.sortMode);
}

function orderedSongsForRender(songs) {
  const sortMode = currentCatalogueSortMode();
  return orderCatalogueSongs(songs, {
    context: currentSongOrderingContext(),
    mode: sortMode === CATALOGUE_SORT_DEFAULT ? 'popular' : sortMode,
    availabilityGate: true,
    getAvailabilityTier: catalogueAvailabilityTier,
    getChronology: catalogueChronology,
  });
}

function syncSortControl() {
  if (!els.sort || !els.sortField) return;
  const visible = Boolean(
    state.active
    && state.active.id !== 'search'
    && state.active.id !== 'nonstop'
    && !state.activeReleaseId
  );
  els.sortField.hidden = !visible;
  els.sort.disabled = !visible;
  els.sort.value = currentCatalogueSortMode();
}

function applyCatalogueSort(value, { updateHistory = true } = {}) {
  const nextMode = normaliseCatalogueSortMode(value);
  const changed = nextMode !== currentCatalogueSortMode();
  state.sortMode = nextMode;
  syncSortControl();
  if (!state.active || state.active.id === 'search' || state.active.id === 'nonstop' || state.activeReleaseId) return;
  renderSongs(state.activeSongs);
  if (updateHistory) {
    const nextState = { collection: state.active.id };
    if (nextMode !== CATALOGUE_SORT_DEFAULT) nextState.sort = nextMode;
    history.replaceState(nextState, '', collectionHash(state.active.id, '', nextMode));
  }
  if (changed) {
    const label = nextMode === CATALOGUE_SORT_DEFAULT ? 'Playable first' : nextMode === 'newest' ? 'Newest' : 'Oldest';
    announce(`Songs sorted by ${label}.`);
  }
}'''
)

replace_once(
    'src/catalogue/catalogue.js',
    "function renderSongs(songs, title='All songs', { limit = SONG_BATCH_SIZE } = {}) {\n  els.songList.replaceChildren();",
    "function renderSongs(songs, title='All songs', { limit = SONG_BATCH_SIZE } = {}) {\n  syncSortControl();\n  els.songList.replaceChildren();"
)

replace_once(
    'src/catalogue/catalogue.js',
    '''function collectionHash(collectionId, releaseId = '') {
  const params = new URLSearchParams();
  params.set('collection', collectionId);
  if (releaseId) params.set('release', releaseId);
  return `#${params.toString()}`;
}''',
    '''function collectionHash(collectionId, releaseId = '', sortMode = currentCatalogueSortMode()) {
  const params = new URLSearchParams();
  params.set('collection', collectionId);
  if (releaseId) params.set('release', releaseId);
  const normalisedSort = normaliseCatalogueSortMode(sortMode);
  if (normalisedSort !== CATALOGUE_SORT_DEFAULT) params.set('sort', normalisedSort);
  return `#${params.toString()}`;
}'''
)

replace_once(
    'src/catalogue/catalogue.js',
    "  els.share?.addEventListener('click',()=>{ void shareExploreState(); });\n  els.showAllSongs.addEventListener('click',()=>showAllSongs());",
    "  els.share?.addEventListener('click',()=>{ void shareExploreState(); });\n  els.sort?.addEventListener('change',()=>applyCatalogueSort(els.sort.value));\n  els.showAllSongs.addEventListener('click',()=>showAllSongs());"
)

replace_once(
    'src/catalogue/catalogue.js',
    "  const releaseId = params.get('release');\n  const search = params.get('search');\n  if (id && openCollection(id,{updateHash:false,focusHeading:false})) {",
    "  const releaseId = params.get('release');\n  const search = params.get('search');\n  state.sortMode = normaliseCatalogueSortMode(params.get('sort'));\n  if (els.sort) els.sort.value = currentCatalogueSortMode();\n  if (id && openCollection(id,{updateHash:false,focusHeading:false})) {"
)

css_path = Path('src/catalogue/catalogue.css')
css = css_path.read_text()
marker = '/* Issue #771 catalogue sort control */'
if marker in css:
    raise SystemExit('catalogue.css: issue #771 sort marker already present')
css += '''\n\n/* Issue #771 catalogue sort control */
.section-heading-actions {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 12px;
  min-width: 0;
}
.catalogue-sort {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted-strong);
  font-size: .72rem;
  font-weight: 650;
  letter-spacing: .01em;
}
.catalogue-sort[hidden] { display: none; }
.catalogue-sort select {
  min-height: 42px;
  padding: 0 34px 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  color: var(--text);
  background-color: rgba(9, 9, 13, .78);
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 15px) 18px, calc(100% - 10px) 18px;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  font: inherit;
  color-scheme: dark;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}
.catalogue-sort select:hover { border-color: rgba(255, 255, 255, .3); }
.catalogue-sort select:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.catalogue-sort select:disabled { cursor: default; opacity: .58; }

@media (max-width: 560px) {
  .songs-section .section-heading { align-items: flex-start; }
  .section-heading-actions { align-items: flex-end; flex-direction: column; gap: 8px; }
  .catalogue-sort { gap: 7px; }
  .catalogue-sort select { min-height: 44px; }
}
'''
css_path.write_text(css)

runtime_mirror = Path('assets/runtime/catalogue-ordering.js')
if runtime_mirror.exists():
    raise SystemExit('assets/runtime/catalogue-ordering.js already exists unexpectedly')
shutil.copyfile('src/catalogue/catalogue-ordering.js', runtime_mirror)

Path('scripts/lib/validate-catalogue-ordering-integration.mjs').write_text(r'''import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const catalogue = fs.readFileSync('src/catalogue/catalogue.js', 'utf8');
const indexHtml = fs.readFileSync('src/catalogue/index.html', 'utf8');
const catalogueCss = fs.readFileSync('src/catalogue/catalogue.css', 'utf8');
const readinessSource = fs.readFileSync('assets/runtime/route-readiness.js', 'utf8');
const orderingSource = fs.readFileSync('src/catalogue/catalogue-ordering.js', 'utf8');
const orderingRuntime = fs.readFileSync('assets/runtime/catalogue-ordering.js', 'utf8');

assert.equal(orderingRuntime, orderingSource, 'browser ordering runtime mirror must stay byte-identical to the pure source helper');

const readinessSandbox = { URL, window: {} };
vm.runInNewContext(readinessSource, readinessSandbox, { filename: 'assets/runtime/route-readiness.js' });
const { routeReadiness } = readinessSandbox.window.GARBA_ROUTE_READINESS;

const orderingSandbox = {};
vm.runInNewContext(orderingSource, orderingSandbox, { filename: 'src/catalogue/catalogue-ordering.js' });
const { orderCatalogueSongs } = orderingSandbox.PlayGarbaCatalogueOrdering;

const makePlayable = (id, title, youtubeId) => ({
  id,
  title,
  artist: 'Artist',
  playbackProvider: 'youtube',
  youtubeId,
  playbackSourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
  playbackSourceType: 'official-artist-channel',
});
const olderPlayable = makePlayable('older-playable', 'Older playable', 'abc123xyz00');
const newerPlayable = makePlayable('newer-playable', 'Newer playable', 'def123xyz00');
const referenceOnly = {
  id: 'reference-only',
  title: 'Reference only',
  artist: 'Artist',
  playbackProvider: 'youtube',
  youtubeId: 'ref123xyz00',
  playbackSourceUrl: 'https://www.youtube.com/watch?v=ref123xyz00',
  playbackSourceType: 'verified-release-track-reference',
};
const sourceOrder = [referenceOnly, olderPlayable, newerPlayable];
const tier = (song) => routeReadiness(song).executable ? 0 : 1;
const chronology = new Map([
  ['older-playable', 1995],
  ['newer-playable', '2026-09-01'],
  ['reference-only', '2027-01-01'],
]);

const playableFirst = orderCatalogueSongs(sourceOrder, {
  context: 'browse',
  mode: 'popular',
  availabilityGate: true,
  getAvailabilityTier: tier,
});
assert.deepEqual(playableFirst.slice(0, 2).map(({ id }) => id).sort(), ['newer-playable', 'older-playable'], 'ordinary browse must put executable recordings before unavailable rows');

const newest = orderCatalogueSongs(sourceOrder, {
  context: 'browse',
  mode: 'newest',
  availabilityGate: true,
  getAvailabilityTier: tier,
  getChronology: (song) => chronology.get(song.id),
});
assert.deepEqual(newest.map(({ id }) => id), ['newer-playable', 'older-playable', 'reference-only'], 'Newest must keep availability first, then descending chronology');

const oldest = orderCatalogueSongs(sourceOrder, {
  context: 'browse',
  mode: 'oldest',
  availabilityGate: true,
  getAvailabilityTier: tier,
  getChronology: (song) => chronology.get(song.id),
});
assert.deepEqual(oldest.map(({ id }) => id), ['older-playable', 'newer-playable', 'reference-only'], 'Oldest must keep availability first, then ascending chronology');
assert.deepEqual(sourceOrder.map(({ id }) => id), ['reference-only', 'older-playable', 'newer-playable'], 'ordering must not mutate caller data');

for (const context of ['search', 'selected-release', 'nonstop']) {
  const protectedOrder = orderCatalogueSongs(sourceOrder, {
    context,
    mode: 'newest',
    availabilityGate: true,
    getAvailabilityTier: tier,
    getChronology: (song) => chronology.get(song.id),
  });
  assert.deepEqual(protectedOrder.map(({ id }) => id), sourceOrder.map(({ id }) => id), `${context} order must remain source-truthful`);
}

assert.match(catalogue, /import '\.\.\/\.\.\/assets\/runtime\/route-readiness\.js';/);
assert.match(catalogue, /globalThis\.PlayGarbaCatalogueOrdering\?\.orderCatalogueSongs \|\| fallbackPlayableFirstOrder/);
assert.match(catalogue, /const CATALOGUE_SORT_DEFAULT = 'playable-first';/);
assert.match(catalogue, /new Set\(\[CATALOGUE_SORT_DEFAULT, 'newest', 'oldest'\]\)/);
assert.match(catalogue, /getChronology: catalogueChronology/);
assert.match(catalogue, /release\?\.originalReleaseYear \|\| release\?\.releaseDate \|\| null/);
assert.match(catalogue, /params\.set\('sort', normalisedSort\)/);
assert.match(catalogue, /els\.sort\?\.addEventListener\('change'/);
assert.match(catalogue, /if \(state\.activeReleaseId\) return 'selected-release';/);
assert.match(catalogue, /if \(state\.active\?\.id === 'search'\) return 'search';/);
assert.match(catalogue, /if \(state\.active\?\.id === 'nonstop'\) return 'nonstop';/);

const orderingScript = indexHtml.indexOf('<script src="../assets/runtime/catalogue-ordering.js"></script>');
const catalogueModule = indexHtml.indexOf('<script type="module" src="catalogue.js"></script>');
assert.ok(orderingScript >= 0 && catalogueModule > orderingScript, 'ordering runtime must load before catalogue.js captures the shared helper');
assert.match(indexHtml, /<option value="playable-first">Playable first<\/option>/);
assert.match(indexHtml, /<option value="newest">Newest<\/option>/);
assert.match(indexHtml, /<option value="oldest">Oldest<\/option>/);
assert.doesNotMatch(indexHtml, /<option[^>]*>\s*Popular\s*<\/option>/i, 'Popular must not be exposed without a reviewed ranking source');
assert.match(catalogueCss, /\/\* Issue #771 catalogue sort control \*\//);
assert.match(catalogueCss, /\.catalogue-sort select/);

const renderStart = catalogue.indexOf("function renderSongs(songs, title='All songs'");
const renderEnd = catalogue.indexOf('\nfunction collectionHash', renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart, 'renderSongs body must be present');
const renderBody = catalogue.slice(renderStart, renderEnd);
const orderingCall = renderBody.indexOf('const orderedSongs = orderedSongsForRender(songs);');
const batchSlice = renderBody.indexOf('orderedSongs.slice(0, limit)');
assert.ok(orderingCall >= 0 && batchSlice > orderingCall, 'catalogue ordering must happen before batching');
assert.match(renderBody, /syncSortControl\(\);/);
assert.match(renderBody, /const readiness = routeReadiness\(song\);/);
assert.match(renderBody, /document\.createElement\(readiness\.executable \? 'a' : 'span'\)/);
assert.match(renderBody, /action\.textContent = 'Unavailable';/);
assert.match(renderBody, /aria-disabled/);

console.log('Catalogue browse sort integration validation passed.');
''')
