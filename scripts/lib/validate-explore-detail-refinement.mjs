import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../../assets/runtime/explore-search.js', import.meta.url), 'utf8');
const explore = await readFile(new URL('../../src/catalogue/index.html', import.meta.url), 'utf8');
const catalogue = await readFile(new URL('../../src/catalogue/catalogue.js', import.meta.url), 'utf8');
const listening = await readFile(new URL('../../src/catalogue/listening-library.js', import.meta.url), 'utf8');
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of [
  'playgarbaExploreDetailRefinement',
  "detail.dataset.releaseFilter = hasActiveRelease ? 'true' : 'false';",
  'showAll.hidden = !hasActiveRelease;',
  "songsEyebrow.textContent = hasActiveRelease ? 'Selected release' : 'Songs';",
  "card.setAttribute('aria-current', 'true')",
  'selected-release-context',
  'releaseRail.scrollTo({',
  "behavior: reduced.matches ? 'auto' : 'smooth'",
  '.collection-detail[data-release-filter="true"] .songs-section',
  '.release-card.active::after{content:"✓"',
  '-webkit-line-clamp:2',
  '.play-link::before{content:"▶"',
  '@media(max-width:380px)',
]) {
  if (!runtime.includes(marker)) fail(`Explore detail refinement is missing: ${marker}`);
}

for (const marker of [
  'id="showAllSongs" type="button" class="quiet-button" hidden',
  'id="releaseRail" role="group" aria-label="Albums and releases"',
  'playgarbaExploreRailInteraction',
  "rail.setAttribute('role', 'group');",
  "card.removeAttribute('role')",
  "['ArrowLeft', 'ArrowRight', 'Home', 'End']",
  'focus({ preventScroll: true })',
  'revealHorizontally(rail, next)',
  'pendingReleaseFocusId',
  'data-scroll-left="true"',
  'data-scroll-right="true"',
  "bindRail(rail, 'Essential Garba releases')",
]) {
  if (!explore.includes(marker)) fail(`Explore album-rail interaction is missing: ${marker}`);
}

for (const marker of [
  'function replaceDetailMeta(values = [])',
  'function renderCollectionDetailIdentity(collection = state.active)',
  'function renderReleaseDetailIdentity(release, songs)',
  "els.detailKicker.textContent = `${state.active.title} · Release`;",
  'els.detailTitle.textContent = displayTitle(release);',
  'els.detailDescription.textContent = releaseDescription(release, songs);',
  "'Selected release'",
  'renderReleaseDetailIdentity(release, songs);',
  'renderCollectionDetailIdentity(state.active);',
  "rail.setAttribute('role','group');",
]) {
  if (!catalogue.includes(marker)) fail(`Explore release-detail identity is missing: ${marker}`);
}

for (const marker of [
  "taxonomy: '../data/taxonomy.json'",
  'const displayTitle = (entity)',
  'const taxonomyIdsForSong = (song)',
  'const belongsToVisualGenre = (song, genreId)',
  'function songDescription(song, release)',
  'function releaseDescription(release, songs = [])',
  'function makeSongContext(song, release)',
  "details.className = 'song-context';",
  "summary.textContent = 'About';",
  'song.description',
  'song.story',
  'song.displayTitle',
  '...aliasesFor(song)',
  "test:(song)=>belongsToVisualGenre(song,genre.id)",
  'songHasTaxonomy(song,taxonomyIds)',
]) {
  if (!catalogue.includes(marker)) fail(`Explore catalogue metadata refinement is missing: ${marker}`);
}

for (const marker of [
  'playgarbaReleaseHero',
  "hero.className = 'release-hero-art';",
  "releaseRail.querySelector('.release-card.active[data-release-id]')",
  "entry?.verified !== true || !entry.imageUrl",
  "detailHead.dataset.releaseArtwork = 'true';",
  'delete detailHead.dataset.releaseArtwork;',
  'hero.replaceChildren();',
  'grid-template-columns:84px minmax(0,1fr)!important',
  'grid-template-columns:72px minmax(0,1fr)!important',
  'grid-template-areas:"art kicker" "art title" "desc desc" "meta meta"',
  "img.fetchPriority = 'high';",
  "img.addEventListener('error', () => {",
]) {
  if (!listening.includes(marker)) fail(`Verified release hero is missing: ${marker}`);
}

const inlineModules = [...explore.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((match) => match[1]);
if (!inlineModules.length) fail('Explore must retain its inline interaction/atmosphere modules');
inlineModules.forEach((source, index) => {
  try {
    new Function(source);
  } catch (error) {
    fail(`Explore inline module ${index + 1} has invalid JavaScript: ${error.message}`);
  }
});

try {
  new Function(listening);
} catch (error) {
  fail(`Explore listening/release-hero runtime has invalid JavaScript: ${error.message}`);
}

if (runtime.includes("active.scrollIntoView(")) {
  fail('Selected release reveal must stay horizontal-only and must not use scrollIntoView');
}
if (explore.includes('releaseRail.scrollIntoView(') || explore.includes('next.scrollIntoView(')) {
  fail('Album-rail keyboard navigation must never use two-axis scrollIntoView');
}
if (explore.includes('id="releaseRail" role="list"')) {
  fail('Interactive album rail must preserve native button semantics instead of exposing list-only semantics');
}
if (catalogue.includes("button.setAttribute('role','listitem');")) {
  fail('Release buttons must keep native button semantics in the source runtime');
}
if (listening.includes("entry?.verified !== false") || listening.includes("entry?.imageUrl && entry?.verified !== false")) {
  fail('Large release hero artwork must require explicitly verified artwork');
}
if (listening.includes('release-hero-art fallback')) {
  fail('Release hero must stay text-only when verified artwork is unavailable instead of enlarging a fallback');
}

if (failed) process.exit(1);
console.log('✓ Explore detail hierarchy, verified release hero, release identity, metadata descriptions, taxonomy-driven browsing, album semantics and keyboard navigation are protected');
