import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../../assets/runtime/explore-search.js', import.meta.url), 'utf8');
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

if (runtime.includes("active.scrollIntoView(")) {
  fail('Selected release reveal must stay horizontal-only and must not use scrollIntoView');
}

if (failed) process.exit(1);
console.log('✓ Explore detail hierarchy, selected-release state, mobile rows and horizontal-only reveal are protected');
