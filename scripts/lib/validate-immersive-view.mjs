// Immersive view contract: the courtyard artwork stays the default, and the full prototype
// follows the mounted production player through a same-origin message bridge.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [runtime, html, css, sw, pages, agents, app, prototypeHtml, prototypeJs, publicHtml, publicJs, publicCss] = await Promise.all([
  read('assets/runtime/immersive-view.js'),
  read('index.html'),
  read('styles/60-runtime-and-provider.css'),
  read('sw.js'),
  read('.github/workflows/pages.yml'),
  read('AGENTS.md'),
  read('app.js'),
  read('docs/product/prototypes/garbo/index.html'),
  read('docs/product/prototypes/garbo/garbo.js'),
  read('public-site/garbo/prototype/index.html'),
  read('public-site/garbo/prototype/garbo.js'),
  read('public-site/garbo/prototype/garbo.css'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of ["var view = 'simple'", "VIEW_KEY = 'garba:view'", "./garbo/prototype/?live=1&embed=1", "classList.toggle('view-immersive'", 'window.GARBA_IMMERSIVE_VIEW', "window.GARBA_IMMERSIVE_PLAYER.snapshot", "event.source !== frame.contentWindow"]) {
  if (!runtime.includes(marker)) fail(`immersive-view.js is missing ${marker}`);
}
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
for (const marker of ['.garbo-prototype-overlay', '.garbo-prototype-frame', '.app.view-immersive .world-layer', '.more-card', '@media (max-width: 1023px)', '@media (min-width: 1024px)']) {
  if (!css.includes(marker)) fail(`styles/60-runtime-and-provider.css is missing ${marker}`);
}
if (!sw.includes("'./assets/runtime/immersive-view.js'") || !sw.includes("'/assets/runtime/immersive-view.js'")) fail('sw.js must cache and refresh immersive-view.js');
if (!pages.includes('public-site/atmosphere')) fail('Pages must publish public-site/atmosphere so /atmosphere/scene.js exists');
if (!pages.includes('public-site/garbo')) fail('Pages must publish the complete public Garbo prototype for immersive mode');
if (!pages.includes('60-runtime-and-provider.css')) fail('Pages must bundle styles/60-runtime-and-provider.css');
if (!/Immersive view/.test(agents)) fail('AGENTS.md invariant 1 must describe the opt-in Immersive view');
for (const marker of ['window.GARBA_IMMERSIVE_PLAYER', "case 'play'", "case 'seek'", "case 'song'", 'includeCatalogue']) {
  if (!app.includes(marker)) fail(`app.js is missing the immersive player API marker ${marker}`);
}
for (const [name, source] of [['standalone', prototypeJs], ['deployed', publicJs]]) {
  for (const marker of ["get('live') === '1'", "'play'", "'seek'", "'shuffle'", "'circle'", "slice(0, 160)"]) {
    if (!source.includes(marker)) fail(`${name} prototype runtime is missing ${marker}`);
  }
}
if (!prototypeHtml.includes('id="exploreCount"') || !publicHtml.includes('id="exploreCount"')) fail('Both prototype pages must expose the live Explore result count');
if (!/Garbo player prototype/i.test(publicHtml) || !publicJs.includes("get('live') === '1'")) fail('The deployed prototype page must support live-site mode');
if (prototypeJs !== publicJs || (await read('docs/product/prototypes/garbo/garbo.css')) !== publicCss) fail('The deployed prototype runtime and styles must match their canonical prototype files');
if (!prototypeHtml.includes('id="circleBridge"') || !publicHtml.includes('id="circleBridge"')) fail('Both prototype pages must expose the live Garba Circle action');

if (failed) process.exit(1);
console.log('✓ Immersive view is opt-in, the artwork stays the default, and the More card reaches every top-bar action');
