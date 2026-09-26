// Immersive view contract: the courtyard artwork stays the default, the venue scene is opt-in,
// and the More card keeps every top-bar action reachable at every screen size.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [runtime, html, css, sw, pages, agents] = await Promise.all([
  read('assets/runtime/immersive-view.js'),
  read('index.html'),
  read('styles/60-runtime-and-provider.css'),
  read('sw.js'),
  read('.github/workflows/pages.yml'),
  read('AGENTS.md'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of ["var view = 'simple'", "VIEW_KEY = 'garba:view'", "SCENE_SRC = 'atmosphere/scene.js'", "classList.toggle('view-immersive'", 'window.GARBA_IMMERSIVE_VIEW', "setView('simple', true)"]) {
  if (!runtime.includes(marker)) fail(`immersive-view.js is missing ${marker}`);
}
// The scene is fetched only after the listener chooses Immersive
if (/<script[^>]+atmosphere\/scene\.js/.test(html)) fail('index.html must not load the venue scene up front');
if (!html.includes('<script src="assets/runtime/immersive-view.js" defer></script>')) fail('index.html must load assets/runtime/immersive-view.js with defer');
if (html.indexOf('assets/runtime/immersive-view.js') < html.indexOf('src="app.js"')) fail('immersive-view.js must load after app.js');

for (const marker of ['id="moreButton"', 'aria-controls="moreCard"', 'id="moreCard"', 'data-view="simple"', 'data-view="immersive"', 'id="immersiveViewStatus"']) {
  if (!html.includes(marker)) fail(`index.html is missing ${marker}`);
}
for (const id of ['atmosphereButton', 'circleButton', 'favouritesButton', 'shareButton']) {
  if (!html.includes(`data-proxy="${id}"`)) fail(`More card has no row for #${id}`);
}
// The artwork layers stay in the page; Immersive only fades them
if (!html.includes('class="world')) fail('index.html must keep the courtyard artwork world');
// Up next is a stable player anchor, so it stays in the bar at every size
if (/#queueButton[^{]*\{\s*display:\s*none/.test(css)) fail('Up next must stay in the top bar at every size');
for (const marker of ['.immersive-stage', '.app.view-immersive .world-layer', '.more-card', '@media (max-width: 1023px)', '@media (min-width: 1024px)']) {
  if (!css.includes(marker)) fail(`styles/60-runtime-and-provider.css is missing ${marker}`);
}
if (!sw.includes("'./assets/runtime/immersive-view.js'") || !sw.includes("'/assets/runtime/immersive-view.js'")) fail('sw.js must cache and refresh immersive-view.js');
if (!pages.includes('public-site/atmosphere')) fail('Pages must publish public-site/atmosphere so /atmosphere/scene.js exists');
if (!pages.includes('60-runtime-and-provider.css')) fail('Pages must bundle styles/60-runtime-and-provider.css');
if (!/Immersive view/.test(agents)) fail('AGENTS.md invariant 1 must describe the opt-in Immersive view');

if (failed) process.exit(1);
console.log('✓ Immersive view is opt-in, the artwork stays the default, and the More card reaches every top-bar action');
