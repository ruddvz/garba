import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const catalogue = fs.readFileSync('src/catalogue/catalogue.js', 'utf8');
const readinessSource = fs.readFileSync('assets/runtime/route-readiness.js', 'utf8');
const orderingSource = fs.readFileSync('src/catalogue/catalogue-ordering.js', 'utf8');

const readinessSandbox = { URL, window: {} };
vm.runInNewContext(readinessSource, readinessSandbox, { filename: 'assets/runtime/route-readiness.js' });
const { routeReadiness } = readinessSandbox.window.GARBA_ROUTE_READINESS;

const orderingSandbox = {};
vm.runInNewContext(orderingSource, orderingSandbox, { filename: 'src/catalogue/catalogue-ordering.js' });
const { orderCatalogueSongs } = orderingSandbox.PlayGarbaCatalogueOrdering;

const playable = {
  id: 'playable',
  title: 'Zulu playable',
  artist: 'Artist',
  playbackProvider: 'youtube',
  youtubeId: 'abc123xyz00',
  playbackSourceUrl: 'https://www.youtube.com/watch?v=abc123xyz00',
  playbackSourceType: 'official-artist-channel',
};
const referenceOnly = {
  id: 'reference-only',
  title: 'Alpha reference',
  artist: 'Artist',
  playbackProvider: 'youtube',
  youtubeId: 'ref123xyz00',
  playbackSourceUrl: 'https://www.youtube.com/watch?v=ref123xyz00',
  playbackSourceType: 'verified-release-track-reference',
};
const missing = { id: 'missing', title: 'Beta missing', artist: 'Artist' };
const sourceOrder = [referenceOnly, missing, playable];
const tier = (song) => routeReadiness(song).executable ? 0 : 1;

const browse = orderCatalogueSongs(sourceOrder, {
  context: 'browse',
  mode: 'popular',
  availabilityGate: true,
  getAvailabilityTier: tier,
});
assert.equal(browse[0].id, 'playable', 'ordinary browse must put executable recordings before unavailable rows');
assert.deepEqual(sourceOrder.map(({ id }) => id), ['reference-only', 'missing', 'playable'], 'ordering must not mutate caller data');

for (const context of ['search', 'selected-release', 'nonstop']) {
  const protectedOrder = orderCatalogueSongs(sourceOrder, {
    context,
    mode: 'popular',
    availabilityGate: true,
    getAvailabilityTier: tier,
  });
  assert.deepEqual(protectedOrder.map(({ id }) => id), sourceOrder.map(({ id }) => id), `${context} order must remain source-truthful`);
}

assert.match(catalogue, /import '\.\.\/\.\.\/assets\/runtime\/route-readiness\.js';/);
assert.match(catalogue, /globalThis\.PlayGarbaCatalogueOrdering\?\.orderCatalogueSongs \|\| fallbackPlayableFirstOrder/);
assert.match(catalogue, /'selected-release', 'search', 'nonstop', 'continuous', 'queue', 'history', 'user-order'/);
assert.match(catalogue, /return routeReadiness\(song\)\.executable \? 0 : 1;/);
assert.match(catalogue, /if \(state\.activeReleaseId\) return 'selected-release';/);
assert.match(catalogue, /if \(state\.active\?\.id === 'search'\) return 'search';/);
assert.match(catalogue, /if \(state\.active\?\.id === 'nonstop'\) return 'nonstop';/);

const renderStart = catalogue.indexOf("function renderSongs(songs, title='All songs'");
const renderEnd = catalogue.indexOf('\nfunction collectionHash', renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart, 'renderSongs body must be present');
const renderBody = catalogue.slice(renderStart, renderEnd);
const orderingCall = renderBody.indexOf('const orderedSongs = orderedSongsForRender(songs);');
const batchSlice = renderBody.indexOf('orderedSongs.slice(0, limit)');
assert.ok(orderingCall >= 0 && batchSlice > orderingCall, 'playable-first ordering must happen before batching');
assert.match(renderBody, /const readiness = routeReadiness\(song\);/);
assert.match(renderBody, /document\.createElement\(readiness\.executable \? 'a' : 'span'\)/);
assert.match(renderBody, /action\.textContent = 'Unavailable';/);
assert.match(renderBody, /readiness\.executable \? null : 'Unavailable'/);
assert.match(renderBody, /action\.style\.pointerEvents = 'none';/);
assert.match(renderBody, /aria-disabled/);

console.log('Catalogue playable-first integration validation passed.');
