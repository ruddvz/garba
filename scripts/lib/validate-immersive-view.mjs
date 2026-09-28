// Two-view contract: the courtyard artwork and the full Garbo prototype are exclusive renderers;
// playback stays mounted in the production player and reaches the prototype through a same-origin bridge.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [runtime, html, css, sw, pages, agents, app, prototypeHtml, prototypeJs, prototypeCss] = await Promise.all([
  read('assets/runtime/immersive-view.js'),
  read('index.html'),
  read('styles/60-runtime-and-provider.css'),
  read('sw.js'),
  read('.github/workflows/pages.yml'),
  read('AGENTS.md'),
  read('app.js'),
  read('docs/product/prototypes/garbo/index.html'),
  read('docs/product/prototypes/garbo/garbo.js'),
  read('docs/product/prototypes/garbo/garbo.css'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of ["var view = 'simple'", "VIEW_KEY = 'garba:view'", "./garbo/prototype/?live=1&embed=1&v=20260928-6", "classList.toggle('view-immersive'", 'window.GARBA_IMMERSIVE_VIEW', "window.GARBA_IMMERSIVE_PLAYER.snapshot", "event.source !== frame.contentWindow"]) {
  if (!runtime.includes(marker)) fail(`immersive-view.js is missing ${marker}`);
}
// A first visit opens Immersive by the stage in the indoor stadium, and the first tap that isn't on a control starts the song
for (const marker of ["savedView == null && !navigator.webdriver", "atmo.venue = 'stadium'; atmo.listener = 'stage'", 'function armFirstTap(', "window.GARBA_IMMERSIVE_PLAYER.action('play')", 'Tap anywhere to start the garba']) {
  if (!runtime.includes(marker)) fail(`immersive-view.js is missing the first-visit marker ${marker}`);
}
if (!html.includes('<script src="assets/runtime/immersive-view.js?v=20260928-6" defer></script>')) fail('index.html must load the versioned immersive-view.js runtime with defer');
if (html.indexOf('assets/runtime/immersive-view.js') < html.indexOf('src="app.js"')) fail('immersive-view.js must load after app.js');

for (const marker of ['id="moreButton"', 'aria-controls="moreCard"', 'id="moreCard"', 'data-view-switch', 'id="immersiveViewStatus"']) {
  if (!html.includes(marker)) fail(`index.html is missing ${marker}`);
}
if (html.indexOf('class="view-switch"') < html.indexOf('id="moreButton"') || html.indexOf('class="view-switch"') > html.indexOf('id="moreCard"')) fail('The Simple/Immersive switch must sit below More and outside its menu');
if (!html.includes('role="switch"') || !html.includes('aria-checked="false"')) fail('The Simple view must expose an accessible Immersive switch in the off state');
for (const marker of ['class="view-switch-detail"', 'class="view-switch-icon view-switch-icon-simple"', 'class="view-switch-icon view-switch-icon-immersive"']) {
  if (!html.includes(marker)) fail(`index.html is missing the icon-only view switch element ${marker}`);
}
if (html.includes('>Simple<') || html.includes('>Immersive<')) fail('The Simple/Immersive pill must use icons rather than visible text labels');
if (html.slice(html.indexOf('id="moreCard"'), html.indexOf('id="immersiveViewStatus"')).includes('data-view-switch')) fail('The More card must not contain the player view switch');
for (const id of ['atmosphereButton', 'circleButton', 'favouritesButton', 'shareButton']) {
  if (!html.includes(`data-proxy="${id}"`)) fail(`More card has no row for #${id}`);
}
// The Simple renderer keeps its courtyard artwork while Immersive uses a separate full-screen frame.
if (!html.includes('class="world')) fail('index.html must keep the courtyard artwork for Simple view');
// Up next is a stable player anchor, so it stays in the bar at every size
if (/#queueButton[^{]*\{\s*display:\s*none/.test(css)) fail('Up next must stay in the top bar at every size');
for (const marker of ['.garbo-prototype-overlay', '.garbo-prototype-frame', '.view-switch', '.utilities > .view-switch', '.view-switch-detail', '.view-switch-icon-simple', '.view-switch-icon-immersive', '.more-card', '@media (max-width: 1023px)', '@media (min-width: 1024px)', 'prefers-reduced-motion: reduce', 'forced-colors: active']) {
  if (!css.includes(marker)) fail(`styles/60-runtime-and-provider.css is missing ${marker}`);
}
if (!sw.includes("'./assets/runtime/immersive-view.js?v=20260928-6'") || !sw.includes("'/assets/runtime/immersive-view.js'")) fail('sw.js must cache the current immersive-view.js runtime and refresh its path');
if (!pages.includes('public-site/atmosphere')) fail('Pages must publish public-site/atmosphere so /atmosphere/scene.js exists');
if (!pages.includes("s#../../../../public-site/atmosphere/scene.js#../../atmosphere/scene.js#")) fail('Pages must rewrite the canonical source scene URL for the deployed prototype location');
if (!pages.includes('public-site/garbo')) fail('Pages must publish the complete public Garbo prototype for immersive mode');
if (!pages.includes('60-runtime-and-provider.css')) fail('Pages must bundle styles/60-runtime-and-provider.css');
if (!/Distinct Player Views/.test(agents) || !agents.includes('never combine the two visual renderers')) fail('AGENTS.md invariant 1 must describe the distinct Simple and Immersive renderers');
for (const marker of ['window.GARBA_IMMERSIVE_PLAYER', 'syncCatalogue()', 'loadNonstopCatalogue()', "case 'play'", "case 'seek'", "case 'song'", 'includeCatalogue']) {
  if (!app.includes(marker)) fail(`app.js is missing the immersive player API marker ${marker}`);
}
for (const marker of ["get('live') === '1'", "'play'", "'seek'", "'shuffle'", "'circle'", 'nonstopSetsStatus', 'visibleSongCount', 'visibleSetCount', 'appendMoreRow']) {
  if (!prototypeJs.includes(marker)) fail(`The canonical prototype runtime is missing ${marker}`);
}
if (prototypeJs.includes('matches.slice(0, 160)')) fail('Explore must provide progressive access to every song match rather than stopping at 160');
for (const marker of ['loadNonstopCatalogue', 'nonstopSetsStatus', 'snapshot.nonstopSets']) {
  if (!runtime.includes(marker)) fail(`immersive-view.js is missing the full Nonstop handoff marker ${marker}`);
}
if (!prototypeHtml.includes('id="exploreCount"')) fail('The canonical prototype page must expose the live Explore result count');
if (!prototypeHtml.includes('class="proto-states"')) fail('The standalone prototype must keep its prototype-state picker');
if (!prototypeJs.includes("document.querySelector('.proto-states')") || !prototypeJs.includes('prototypeStates.hidden = LIVE_SITE')) fail('Prototype-state controls must be hidden in embedded live mode and remain available standalone');
const guideNote = prototypeHtml.match(/<p class="about-note">([^<]*)<\/p>/)?.[1] || '';
if (!guideNote.includes('Mata ni Pachedi') || !guideNote.includes("Devipujak community")) fail('The Garba guide must preserve its concise Pachedi attribution');
if (/commission|TODO|should be credited/i.test(guideNote)) fail('The live Garba guide must not expose artwork commissioning or editorial task notes');
for (const marker of ['href="garbo.css?v=20260928-7"', 'src="garbo.js?v=20260928-8"', 'src="scene.js?v=20260928-2"', 'src="../../../../public-site/atmosphere/scene.js?v=20260928-6"', 'src="morphicons.js?v=1.7.1"']) {
  if (!prototypeHtml.includes(marker)) fail(`The canonical prototype must version its cached embedded asset URL: ${marker}`);
}
for (const file of ['index.html', 'garbo.js', 'garbo.css']) {
  if (!pages.includes(`docs/product/prototypes/garbo/${file}`) || !pages.includes(`_site/garbo/prototype/`)) {
    fail(`Pages must deploy the canonical prototype ${file} to /garbo/prototype/`);
  }
}
if (!/Garbo player prototype/i.test(prototypeHtml) || !prototypeJs.includes("get('live') === '1'")) fail('The canonical prototype page must support live-site mode');
if (!prototypeHtml.includes('id="circleBridge"')) fail('The prototype must expose the live Garba Circle action');
// Private Garba Circle is findable in both players: a chip above 24/7 LIVE that shows before any circle starts,
// and a Circle button in Immersive's rail. Opening it from Immersive keeps the listener in Immersive.
// Private Garba Circle opens from More; the rail keeps View, Sound and Ideas as icons alone, named for screen readers
const railHtml = prototypeHtml.slice(prototypeHtml.indexOf('<nav class="rail" id="rail"'), prototypeHtml.indexOf('</nav>', prototypeHtml.indexOf('<nav class="rail" id="rail"')));
if (prototypeHtml.includes('id="circleRail"') || !prototypeHtml.includes('id="circleBridge"')) fail('Immersive opens Private Garba Circle from its More tile, not from the rail');
if (railHtml.includes('<span>') || !['aria-label="View"', 'aria-label="Sound"', 'aria-label="Ideas"'].every((m) => railHtml.includes(m))) fail('Immersive\'s rail buttons must be icons alone with accessible names');
if (prototypeCss.includes('.card-open .stage > .np')) fail('An open card must not move the player on a wide screen');
if (!/<button class="circle-perch is-idle" id="circlePerch"(?![^>]*\shidden)[^>]*>/.test(html) || !html.includes('Listen with friends')) fail('The Private Garba Circle chip above 24/7 LIVE must show before a circle starts');
if (/action === 'circle'\) setView\('simple'/.test(runtime)) fail('Opening Private Garba Circle from Immersive must not switch the listener to Simple view');
if (!prototypeHtml.includes('class="view-switch"') || !prototypeHtml.includes('aria-label="Switch to Simple view" data-view-switch') || !prototypeJs.includes("type: 'view'")) fail('Immersive mode must expose a live Simple/Immersive switch outside the prototype More menu');
// The switch's Immersive half, already on, takes the player full screen and back
if (!prototypeHtml.includes('id="fullBtn" aria-label="Full screen" aria-pressed="false"') || !prototypeJs.includes("$('fullBtn').addEventListener('click', function () { setViewMenu(false); toggleFullscreen(); });") || !prototypeJs.includes('if (fullscreenElement()) exitFullscreen();')) fail('The Immersive half of the switch must toggle full screen, and leaving for Simple must leave full screen');
for (const marker of ['class="view-switch-detail"', 'class="view-switch-icon view-switch-icon-simple"', 'class="view-switch-icon view-switch-icon-immersive"']) {
  if (!prototypeHtml.includes(marker)) fail(`The embedded prototype is missing the icon-only view switch element ${marker}`);
}
if (prototypeHtml.includes('>Simple<') || prototypeHtml.includes('>Immersive<')) fail('The embedded prototype mode pill must not render visible text labels');
if (!prototypeJs.includes("viewSwitch.closest('.view-switch').hidden = false")) fail('Live Immersive mode must reveal the switch itself, not only its parent toolbar');
if (!prototypeCss.includes('.lamp-tip') || !prototypeCss.includes('.side-card')) fail('The canonical prototype must include its full player presentation');
// One frame that fails to draw (a hidden frame has no size) must not freeze the venue: the loop books its next frame first
if (!prototypeJs.includes('  function loop(now) {\n    // The next frame is asked for first, so a frame that fails to draw can never stop the venue for good\n    requestAnimationFrame(loop);')) fail('The Immersive draw loop must request its next frame before drawing');
// A tap anywhere on the venue must start the song: the invisible keyboard seek under the lamp takes no pointer
if (/ringSeek|ring-seek/.test(prototypeHtml + prototypeJs + prototypeCss)) fail('The invisible ring seek is gone: the seek bar under the title is the only seek');
if (!prototypeJs.includes('applySeek(bar.value / 1000);')) fail('The seek bar under the title must seek directly');
// The Tally form must stay see-through on the dark card: a dark iframe around Tally's light page gets an opaque white
// backdrop that hides its light question text
if (!prototypeCss.includes('#ideaCard iframe { color-scheme: light; }')) fail('The Ideas card must give the Tally frame its light colour scheme');
for (const file of ['docs/product/prototypes/garbo/ideas.js', 'public-site/garbo/prototype/ideas.js']) {
  if (!(await read(file)).includes('background: transparent; color-scheme: light; }')) fail(`${file} must give the Tally frame its light colour scheme`);
}
// On a phone a home button takes the moon's place in the top bar and opens the switch at the head of the scene pill;
// Hide player takes the link button's place, and Tonight and Play YouTube link open from More. Wider screens keep the
// switch at the head of the pill under More
const moreAt = prototypeHtml.indexOf('id="moreSheet"'), tonightTileAt = prototypeHtml.indexOf('id="tonightOpen"');
if (moreAt < 0 || tonightTileAt < moreAt || tonightTileAt > prototypeHtml.indexOf('</section>', moreAt)) fail('More must carry the Tonight tile that phones use in place of the moon button');
if (!prototypeJs.includes("$('tonightOpen').addEventListener('click', function () { showSheet('tonightSheet');")) fail('The Tonight tile in More must open the Tonight sheet');
if (!prototypeHtml.includes('id="hidePlayerBtn" type="button" aria-label="Hide player" aria-pressed="false"') || !prototypeJs.includes('function setPlayerHidden(off)') || !prototypeCss.includes('.player-off .stage > :not(.lamp-slot), .player-off .rail { display: none; }')) fail('The top bar must carry Hide player, which leaves the venue on the whole screen');
const linkTileAt = prototypeHtml.indexOf('id="linkOpen"');
if (linkTileAt < moreAt || linkTileAt > prototypeHtml.indexOf('</section>', moreAt) || !prototypeJs.includes("$('linkOpen').addEventListener('click'")) fail('More must carry the Play YouTube link tile that phones use in place of the link button');
if (!/<button class="ib" id="tonightBtn"[^>]*>[\s\S]*?<\/button>\s*<button class="ib" id="viewBtn"[^>]*aria-expanded="false"/.test(prototypeHtml) || !prototypeJs.includes("$('viewBtn').addEventListener('click', function () { setViewMenu(!viewMenuOpen()); });") || !prototypeJs.includes("if (viewMenuOpen() && !e.target.closest('.view-switch, #viewBtn, #rail')) setViewMenu(false);")) fail('On a phone the home button must sit in the moon\'s place, open the switch, and close on a tap elsewhere');
for (const marker of ['@media (max-width: 600px), (orientation: landscape) and (max-height: 520px) {', '#tonightBtn, #linkSongBtn, .view-switch { display: none; }', '#viewBtn, #tonightOpen, #linkOpen { display: grid; }', '.view-open { --pill-switch-h: 49px; }', '.view-open .view-switch { display: flex; }', '.app:not(.view-open) .rail { display: none; }']) {
  if (!prototypeCss.includes(marker)) fail(`The phone top bar is missing ${marker}`);
}

// More is a column of icons beside the player, Install sits right after Private Garba Circle, and it opens a guide
// with a tab per kind of device that can ask for the browser's own install prompt
const moreTiles = [...prototypeHtml.slice(moreAt, prototypeHtml.indexOf('</section>', moreAt)).matchAll(/<button class="tile"[^>]*id="([a-zA-Z]+)"/g)].map((m) => m[1]);
if (moreTiles[0] !== 'circleBridge' || moreTiles[1] !== 'installBtn') fail(`More must open with Private Garba Circle then Install PlayGarba, found ${moreTiles.slice(0, 2).join(', ')}`);
if (/class="tile-ic"|<small>/.test(prototypeHtml.slice(moreAt, prototypeHtml.indexOf('</section>', moreAt)))) fail('More tiles are an icon and a name, with no icon background or second line');
if (!prototypeCss.includes('.app.more-open { left: calc(-1 * var(--more-w)); right: var(--more-w); }') || !prototypeJs.includes("app.classList.toggle('more-open', id === 'moreSheet');")) fail('Opening More must move the player aside for the column');
for (const marker of ['id="installSheet"', 'data-install="iphone"', 'data-install="android"', 'data-install="computer"', 'id="installNow"', 'Brave can', 'Safari']) {
  if (!prototypeHtml.includes(marker)) fail(`The install guide is missing ${marker}`);
}
if (!prototypeJs.includes("requestLiveAction('install')") || !app.includes("case 'install': {") || !app.includes('installable: Boolean(state.installPrompt),')) fail('Install now must reach the browser install prompt held by the page');
// Choices are words alone and card titles stand alone
if (prototypeJs.includes('SEG_ICONS') || prototypeHtml.includes('class="card-badge"')) fail('Choices and card titles must not carry icons');
// Icons are Hugeicons Free (Stroke Rounded), credited beside the sprite; the three toggles morph with Morphicons, which
// ships as one vendored script carrying its MIT notice in both copies
if (!prototypeHtml.includes('Icons: Hugeicons Free 4.3.5, Stroke Rounded (hugeicons.com), MIT License')) fail('The Immersive sprite must credit Hugeicons');
for (const id of ['i-play', 'i-pause', 'i-search', 'i-more', 'i-close', 'i-full', 'i-exit-full', 'i-ring', 'i-yt']) {
  if (!prototypeHtml.includes(`<symbol id="${id}"`)) fail(`The Immersive sprite is missing ${id}`);
}
{
  const morphCopies = await Promise.all(['docs/product/prototypes/garbo/morphicons.js', 'public-site/garbo/prototype/morphicons.js'].map(read));
  if (morphCopies[0] !== morphCopies[1] || !morphCopies[0].startsWith('/*! Morphicons 1.7.1') || !morphCopies[0].includes('MIT License') || !morphCopies[0].includes('GarboMorph')) fail('The vendored Morphicons script must match in both copies and carry its MIT notice');
}
for (const marker of ["morphIcon('play', $('playBtn'), 'i-play');", "morphIcon('hide', $('hidePlayerBtn'), 'i-eye-off');", "morphIcon('full', $('fullBtn'), 'i-full',", "reducedMotion: 'user'"]) {
  if (!prototypeJs.includes(marker)) fail(`The toggles must morph their icons: ${marker}`);
}
// Layout from the lamp slot's observer waits a frame: done inside the callback it crops the phone canvas, whose own
// observer then trips a ResizeObserver loop error (a page error in WebKit)
if (!prototypeJs.includes("new ResizeObserver(function () { if (!relayoutFrame) relayoutFrame = requestAnimationFrame(")) fail('The lamp slot observer must lay out on the next frame');
// With the player hidden, a touch screen walks the venue with a floating stick; the scene takes a direction and a
// strength, and showing the player walks you back
{
  const venueScene = await read('public-site/atmosphere/scene.js');
  for (const marker of ['steer: function (x, z) {', 'walkHome: function () {', 'var sk = walkMe.stick;']) if (!venueScene.includes(marker)) fail(`The venue scene must accept a touch stick: ${marker}`);
  for (const marker of ["if (!playerHidden() || e.pointerType === 'mouse' || stick.id !== null || e.target.closest('#lampHit')) return;", 'if (scene.steer) scene.steer(ux, -uy);', 'if (scene.walkHome) scene.walkHome();', 'function standInCircle()']) if (!prototypeJs.includes(marker)) fail(`The Immersive walking stick is missing ${marker}`);
  if (!prototypeCss.includes('.player-off .lamp-slot { touch-action: none; }')) fail('The venue must not scroll or zoom under the walking stick');
  // Nothing is drawn under the thumb: the stick walks you without showing, and a line of words teaches it once
  if (prototypeJs.includes("el('div', 'stick')") || prototypeCss.includes('.stick {') || !prototypeJs.includes("toast('Drag anywhere to walk around');")) fail('Touch walking must not draw a stick over the venue');
}
if (failed) process.exit(1);
console.log('✓ Simple and Immersive use separate renderers, the mode switch sits below More (opened from a home button on Immersive phones), and the deployed Garbo scene path resolves');
