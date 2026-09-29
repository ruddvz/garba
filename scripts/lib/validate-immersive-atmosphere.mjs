import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const exists = async (file) => { try { await access(path.join(root, file)); return true; } catch { return false; } };

const [runtime, manifestText, provider, sw] = await Promise.all([
  read('assets/runtime/immersive-atmosphere.js'),
  read('data/atmosphere-sources.json'),
  read('provider-runtime.js'),
  read('sw.js'),
]);

const manifest = JSON.parse(manifestText);
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

// Engine, player integration and accessibility contract
for (const marker of [
  'GARBA_ATMOSPHERE',
  'GARBA_ATMOSPHERE_ENGINE',
  'HRTF',
  'createConvolver',
  'createDynamicsCompressor',
  'prefers-reduced-motion: reduce',
  'constrainedConnection',
  "app.classList.contains('is-playing')",
  'document.hidden',
  'garba:atmosphere-change',
  "aria-modal', 'true'",
  'setBackgroundInert',
  'navigator.audioSession',
  'Indoor stadium',
  'Outdoors',
  'Sheri',
  'In the circle',
  'Far away',
  'By the stage',
  'function setListener(',
  'function setEnabled(',
  'role="switch"',
  "const INTRO_KEY = 'garba:atmosphere-intro'",
  'event.detail === 0',
  'Full circle',
  'Tap the beat',
  'Be tali',
  'Tran tali',
]) {
  if (!runtime.includes(marker)) fail(`Atmosphere runtime is missing: ${marker}`);
}

for (const marker of [
  '<h2 id="atmosphereTitle">Garba Atmosphere</h2>',
  'class="atmosphere-test"',
  'aria-label="Test Garba Atmosphere"',
  'class="atmosphere-headphone-icon"',
  'class="atmosphere-status" role="status" aria-live="polite"',
  '.atmosphere-status{position:absolute!important;width:1px!important;',
  'type="range" min="5" max="100" step="5"',
  'setTimeout(() => stopPreview({ announce: false }), 6000)',
  'if (state.previewActive) { stopPreview(); return; }',
  'if (active) stopPreview({ announce: false });',
  "state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return 0;",
]) {
  if (!runtime.includes(marker)) fail(`Compact Atmosphere/Test contract is missing: ${marker}`);
}

// Truthfulness: the song is never processed, and the panel says so.
if (!runtime.includes('The song itself plays as YouTube sends it.')) {
  fail('Atmosphere panel must say the song itself is not processed');
}
// Venue names are fine; the retired labels that implied the song itself was being processed are not.
if (/Acoustic Space|Soundstage|Indoor Hall|Outdoor Ground|stadium slapback echo|Palace walls/.test(runtime)) {
  fail('Provider-backed playback must not expose fake source-processing Soundstage modes');
}
if (/youtubeStage[^\n]*createMediaElementSource|createMediaElementSource\([^)]*youtube/i.test(runtime)) {
  fail('Atmosphere must not attempt to process the YouTube player');
}

// Rhythm: claps are synthesised and follow the listener's taps, never a looped recording.
for (const retired of ['rhythmic-clapping.ogg', 'ground-applause.ogg', 'Palmas', '160 BPM']) {
  if (runtime.includes(retired)) fail(`Retired Atmosphere recording is referenced by the runtime: ${retired}`);
}
for (const marker of ['function buildClap(', 'function buildStick(', 'function schedule(until)', 'async function registerTap()', 'setTempo(bpm, firstBeat, { locked: true })']) {
  if (!runtime.includes(marker)) fail(`Beat-locked synthesis contract is missing: ${marker}`);
}
if (/setTimeout\([^)]*playTransient|Math\.random\(\) < 0\.35 \? 'applause'/.test(runtime)) {
  fail('Claps and sticks must be scheduled on the beat, not at random intervals');
}

for (const retired of [
  'Place a subtle venue layer beneath the song',
  'Live Ground can add a very quiet public-domain',
  'Paused with the music',
  '>Headphones<',
]) {
  if (runtime.includes(retired)) fail(`Retired Atmosphere panel copy returned: ${retired}`);
}

const setModeStart = runtime.indexOf('async function setMode(');
const syncPlaybackStart = runtime.indexOf('function syncPlaybackState()', setModeStart);
if (setModeStart < 0 || syncPlaybackStart <= setModeStart) {
  fail('Atmosphere mode/playback synchronisation functions are missing');
} else {
  const setModeSource = runtime.slice(setModeStart, syncPlaybackStart);
  if (setModeSource.includes('previewCurrentMode(')) {
    fail('Selecting an Atmosphere mode while paused must not auto-preview it');
  }
  if (!setModeSource.includes('if (state.playbackActive) await buildScene({ smooth: true });\n    else scheduleIdleSuspend();')) {
    fail('Mode selection must follow real playback and otherwise stay quiet');
  }
}

const syncPlaybackSource = syncPlaybackStart >= 0
  ? runtime.slice(syncPlaybackStart, runtime.indexOf('function trustedPlaybackUnlock(', syncPlaybackStart))
  : '';
if (!syncPlaybackSource.includes('} else if (!state.previewActive) {\n      applyMasterLevel({ quick: true });\n      scheduleIdleSuspend();')) {
  fail('Ordinary pause must silence Atmosphere unless an explicit Test is active');
}

for (const marker of [
  'function loadAtmosphereRuntime()',
  "script.src = 'assets/runtime/immersive-atmosphere.js'",
  'loadAtmosphereRuntime();',
]) {
  if (!provider.includes(marker)) fail(`Playback bootstrap is missing Atmosphere loader: ${marker}`);
}

// Source manifest
if (manifest.version !== '2.0.0') fail('Atmosphere source manifest version must be 2.0.0');
if (manifest.runtimePolicy?.allowRemoteOnDataSaver !== false) fail('Remote Atmosphere audio must stay disabled on Data Saver');
if (manifest.runtimePolicy?.requireNoEmbeddedMusic !== true) fail('Atmosphere sources must reject embedded music');
if (manifest.runtimePolicy?.fallback !== 'procedural-local-scene') fail('Atmosphere must retain its procedural local fallback');
if (manifest.runtimePolicy?.songProcessing !== 'none') fail('Atmosphere manifest must declare that songs are not processed');

const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
const enabledSources = sources.filter((source) => source.enabled);
if (!enabledSources.length) fail('At least one enabled Atmosphere ambience source is required');
const localOrHttps = (url) => /^https:\/\//.test(url) || /^assets\/audio\/[a-z0-9-]+\.(ogg|m4a)$/.test(url);
for (const source of enabledSources) {
  if (source.license !== 'public-domain') fail(`Enabled Atmosphere source ${source.id} must be public-domain`);
  if (source.containsMusic !== false) fail(`Enabled Atmosphere source ${source.id} must explicitly contain no music`);
  if (!/^https:\/\//.test(source.sourcePage || '')) fail(`Enabled Atmosphere source ${source.id} must cite its source page`);
  const urls = [source.audioUrl, ...(source.files || []).map((file) => file.url)].filter(Boolean);
  if (!urls.length) fail(`Enabled Atmosphere source ${source.id} has no audio file`);
  for (const url of urls) {
    if (!localOrHttps(url)) fail(`Atmosphere source ${source.id} must use HTTPS or a bundled assets/audio file: ${url}`);
    if (!/^https:/.test(url) && !await exists(url)) fail(`Atmosphere source ${source.id} file is missing: ${url}`);
  }
}
for (const source of sources.filter((item) => item.license !== 'public-domain')) {
  if (source.enabled) fail(`Non-public-domain Atmosphere source ${source.id} must stay disabled`);
}

for (const marker of [
  "'./assets/runtime/immersive-atmosphere.js'",
  "'/assets/runtime/immersive-atmosphere.js'",
]) {
  if (!sw.includes(marker)) fail(`PWA Atmosphere packaging is missing: ${marker}`);
}
// Anything sw.js precaches must still exist, or the service worker install fails.
for (const match of sw.matchAll(/'\.\/(assets\/audio\/[^']+)'/g)) {
  if (!await exists(match[1])) fail(`sw.js precaches a missing Atmosphere file: ${match[1]}`);
}

// Listening room: a public page that runs the same engine, linked from the panel and deployed by Pages.
const [room, roomScript, pages] = await Promise.all([
  read('public-site/atmosphere/index.html'),
  read('public-site/atmosphere/atmosphere.js'),
  read('.github/workflows/pages.yml'),
]);
if (!runtime.includes('href="./atmosphere/"')) fail('Atmosphere panel must link to the listening room');
if (!pages.includes('public-site/atmosphere \\')) fail('Pages must deploy public-site/atmosphere');
for (const marker of ['<script src="../assets/runtime/immersive-atmosphere.js"></script>', 'role="switch"', 'id="tap"']) {
  if (!room.includes(marker)) fail(`Listening room is missing: ${marker}`);
}
if (!roomScript.includes('GARBA_ATMOSPHERE_ENGINE')) fail('Listening room must use the shared Atmosphere engine');
if (!room.includes("never the song itself")) fail('Listening room must say the song itself is not processed');

// The microphone beat follower: opt-in, hears the speaker (echo cancellation off), and its estimator finds a
// steady 120 BPM beat in a synthetic low-end signal to within 1.5 BPM and 25 ms
for (const marker of ['function createBeatFollower(', 'echoCancellation: false', 'function estimateBeat(', 'createBeatFollower, playDandiyaTap };', "Follow the song's beat", 'Nothing is recorded or sent.']) {
  if (!runtime.includes(marker)) fail(`Atmosphere runtime is missing the beat follower marker: ${marker}`);
}
// Every press outside the Simple player (which taps from app.js) knocks two dandiya sticks together, once
for (const marker of ['function playDandiyaTap(', "script[src*=\"app.js\"]", 'window.__garbaDandiyaTaps', "addEventListener(window.PointerEvent ? 'pointerdown' : 'touchstart', tapFor"]) {
  if (!runtime.includes(marker)) fail(`Atmosphere runtime is missing the dandiya tap marker: ${marker}`);
}
// The venue answers the song's locked beat through its reverb only; YouTube's own audio is never touched
for (const marker of ['function buildThump(', 'nodes.room.connect(nodes.roomCut).connect(nodes.send)', 'function roomAt(', "if (!room || !state.tempo?.locked) return 0;", "setTempo(bpm, firstBeat, { locked: true })", "setTempo(bpm, anchor, { locked: true })"]) {
  if (!runtime.includes(marker)) fail(`Atmosphere runtime is missing the venue echo marker: ${marker}`);
}
for (const id of ['outdoors', 'stadium', 'sheri']) if (!/room: \{ level: [\d.]+, cut: \d+ \}/.test(runtime.slice(runtime.indexOf(`    ${id}: {`), runtime.indexOf(`    ${id}: {`) + 1600))) fail(`Venue ${id} has no echo room`);
if (/nodes\.room[^C]*connect\(nodes\.(dry|bus|near|out)\)/.test(runtime)) fail('The venue echo must go only into the reverb, never dry');
{
  const body = runtime.slice(runtime.indexOf('function estimateBeat('), runtime.indexOf('const BEAT_WORKLET'));
  const estimateBeat = new Function(`${body}; return estimateBeat;`)();
  const hop = 512 / 44100, beats = [], frames = [];
  for (let t = 0.4; t < 8; t += 0.5) beats.push(t);
  for (let f = 0; f * hop < 8; f += 1) {
    const t = f * hop; let e = 0.01 * (1 + ((f * 7919) % 13) / 13);
    for (const b of beats) { const d = t - b; if (d >= 0 && d < 0.2) e += Math.exp(-d / 0.04); }
    frames.push([t, e]);
  }
  const est = estimateBeat(frames);
  const nearest = est ? beats.reduce((m, b) => (Math.abs(b - est.lastBeat) < Math.abs(m - est.lastBeat) ? b : m), 0) : 0;
  if (!est || Math.abs(est.bpm - 120) > 1.5 || Math.abs(est.lastBeat - nearest) > 0.025) fail(`Beat estimator missed a steady 120 BPM beat: ${JSON.stringify(est)}`);
}

// The venue scene's staging: the band drawn in full up close, a deep stage with a riser, a proper indoor ceiling,
// the crowd with bodies and cloth near the stage, rigging for the chhatris, and the mandap over the sheri takht
{
  const scene = await read('public-site/atmosphere/scene.js');
  for (const marker of ['function performer(', 'function micStand(', 'function drawCeiling(', 'function jhummar(', 'function backRich(', 'function backHead(', 'function sheriMandap(', 'function chhatriRig(', 'function armsFor(', "cachedLayer('stadiumCeiling', drawCeiling)", 'o.riserZ = zF + depth * 0.72', 'if (m.h * p.s >= 58) {', 'var rich = h >= (QP >= 1 ? 40 : 90)', "feedTag = 'DRONE';"]) {
    if (!scene.includes(marker)) fail(`Venue scene is missing the staging marker: ${marker}`);
  }
  // The stage screen is a drone feed of detailed people from above, with no name on it, rendered as its own image
  for (const marker of ['function droneFeed(', 'function person2(', 'if (rr < 7) {', 'function shotAt(', 'function dronePos(', 'function droneInSky(', 'droneInSky(t);', 'DRONE_AIR']) if (!scene.includes(marker)) fail(`Venue scene is missing the drone marker: ${marker}`);
  // Singers keep to lanes of their own and don't copy each other's moves
  for (const marker of ['lane: [slot - half, slot + half]', 'busy.indexOf(pick(r))']) if (!scene.includes(marker)) fail(`Venue scene is missing the singer-lane marker: ${marker}`);
  if (/brandMark|drawMark|PlayGarba\.com/.test(scene)) fail('The stage screen must not carry the PlayGarba.com name or mark');
  // The singers are the song's own: a lineup and a song key from the page; a new key walks the old lineup off stage
  // left and the new one on from the right
  for (const marker of ['function syncLineup(', 'function lineupFor(', 'patch.singers !== undefined', 'patch.songKey !== undefined', "m.tx = o.x0 + 0.2", "m.cx = o.x1 - 0.2"]) if (!scene.includes(marker)) fail(`Venue scene is missing the singer-lineup marker: ${marker}`);
  // The handover sits inside the song transition: off in the song's last seconds, about five seconds on a pick, after the walk back from the DJ
  for (const marker of ['function paceFrom(', 'function songLeft(', 'function walkPace(', 'function leaveLineup(', 'function camLead(', "lineupKeys[id] = 'back|'", 'm.spd || 2']) if (!scene.includes(marker)) fail(`Venue scene is missing the singer-handover marker: ${marker}`);
  for (const file of ['docs/product/prototypes/garbo/garbo.js', 'public-site/garbo/prototype/garbo.js']) {
    const garbo = await read(file);
    for (const marker of ['singers: lineup.length ? lineup : null, songKey: songKey || null', 'function voiceOf(', 'NOT_A_SINGER']) if (!garbo.includes(marker)) fail(`${file} does not send the singer lineup: ${marker}`);
  }
  // Heavy effects step down with the scene's own quality level
  for (const marker of ['&& QP >= 1) {', 'if (st.on && !reduce && QP >= 1) {']) if (!scene.includes(marker)) fail(`Venue scene does not gate a heavy effect on quality: ${marker}`);
  // Each kind of device gets its own budget, a device that keeps dropping frames settles at 30 a second, and the
  // crowd below the drawn area is not drawn
  for (const marker of ['function deviceTier(', "name: 'phone'", "name: 'tablet'", 'PIXELS = TIER.pixels', 'QD = TIER.density', 'slowFor > TIER.slowMs', 'else capMs = 30;', 'ms - lastMs < capMs', 'setCrop: function (c)', 'it.p.y - it.p.s * 3 > H']) if (!scene.includes(marker)) fail(`Venue scene is missing the device budget marker: ${marker}`);
  // Phones and tablets only allocate and draw the venue down to the controls; a hidden Immersive frame draws nothing
  const stageCopies = await Promise.all(['docs/product/prototypes/garbo/scene.js', 'public-site/garbo/prototype/scene.js'].map(read));
  if (stageCopies[0] !== stageCopies[1]) fail('The deployed Garbo scene.js must match its canonical source');
  for (const marker of ["this.v.tier === 'desktop'", 'VenueStage.prototype.cropTo', 'l.y * (c.h || H) / H']) if (!stageCopies[0].includes(marker)) fail(`Garbo scene is missing the visible-area crop marker: ${marker}`);
  // The only shade is one soft oval behind the player (no band under the top bar, none across the bottom), and hiding
  // the player keeps the venue framed as it was instead of zooming into the space the player leaves
  for (const marker of ['var sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);', "document.querySelectorAll('.stage > .time, .stage > .transport, .stage > .dial')", 'this.box && this.box.size === size ? this.box :']) if (!stageCopies[0].includes(marker)) fail(`Garbo scene is missing the player shade or framing marker: ${marker}`);
  if (/createLinearGradient\(0, 0, 0, top/.test(stageCopies[0]) || stageCopies[0].includes("fillRect(0, a + 120, W, H)")) fail('Garbo scene must not shade a band under the top bar or across the bottom of the venue');
  for (const file of ['docs/product/prototypes/garbo/garbo.js', 'public-site/garbo/prototype/garbo.js']) {
    if (!(await read(file)).includes('if (!document.hidden && !frameHidden()) {')) fail(`${file} must not draw the venue while the Immersive frame is hidden`);
  }
  // Colours arrive both as hex and as rgb() strings from other shading; both must shade to a valid colour
  const body = scene.slice(scene.indexOf('    function shadeRaw('), scene.indexOf('    // Cloth or skin wrapped round a body'));
  const shadeRaw = new Function('lerp', `${body}; return shadeRaw;`)((a, b, t) => a + (b - a) * t);
  for (const [input, f] of [['#8e1b2c', -0.3], ['rgb(142,27,44)', -0.3], ['#f3e6d0', 0.2], ['rgb(10, 20, 30)', 0.5]]) {
    const out = shadeRaw(input, f);
    if (!/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/.test(out)) fail(`shade(${input}, ${f}) gave an invalid colour: ${out}`);
  }
  if (shadeRaw('#8e1b2c', -0.3) !== shadeRaw('rgb(142,27,44)', -0.3)) fail('shade() must treat hex and rgb() forms of the same colour alike');
  // The stages: steps at each end, three blank lit sponsor blocks on the outdoor stage front, side screens outdoors that
  // take turns between a sponsor slide and a close-up of the lead singer, the indoor corner screens and Sheri's flex
  // banners as sponsor spaces. Singers hold a handheld mic under the mouth, drawn over their face, and the crowd lowers
  // its phones when the song stops.
  for (const marker of ['arrays: 13, sponsors: 3, sideScreens: true', 'function litPanel(', 'function sideScreens(', 'function singerCloseUp(', 'function flexBanner(', 'function holdMic(', 'function handMic(', "'crowd', 'taali'", 'function phoneK(', 'phonesUp + (st.on ? 1 : -1) * dt * 0.9', 'var ax = sd < 0 ? o.x0 + 0.5 : o.x1 - 2.3']) {
    if (!scene.includes(marker)) fail(`Venue scene is missing the stage, sponsor, singer or crowd marker: ${marker}`);
  }
  if ((scene.match(/handMic\(m\);/g) || []).length < 3) fail('Every singer drawing path must draw the handheld mic after the face');
  // Walking eases in and out with the couple on your spot and a stride that keeps time with the pace; the garbo's
  // platform is walked round; dancers passing the camera keep their full design and fade out as a whole; stalls up
  // close show their wares
  for (const marker of ['walkMe.vx += dvx; walkMe.vz += dvz;', 'd.step = (d.step || 0) + Math.max(sp, gap > 0.2 ? 1 : 0) * dt * 5.2;', 'var rr = Math.hypot(walkMe.x, walkMe.z), ko = KEEP_OUT + 0.45;', 'function nearFigure(', "nearFigure(p, d, T, beatPh, Math.min(1, fade * 1.25)); return;", 'var near = 0, dk = 0;', 'function stallWares(']) {
    if (!scene.includes(marker)) fail(`Venue scene is missing the walking, near-camera or stall marker: ${marker}`);
  }
  // #1815: people walking towards the camera stay solid and lit until right at the lens, and tonight's moon is drawn
  // with a lit face, seas and earthshine from its real phase
  for (const marker of ['function nearFade(z) { return Math.max(0, Math.min(1, (z - 2.7) / 0.9)); }', 'var rich = h >= 56 / Math.min(1, QP) && !near;', 'fade: nearFade(p.z)', '(st.on ? 0.8 : 1) * Math.max(0, Math.min(1, (p.z - 6) / 10))', 'function litShape(b, r, k)', 'var MARIA = [', 'function moonInfo(age)']) {
    if (!scene.includes(marker)) fail(`Venue scene is missing the near-camera or moon marker: ${marker}`);
  }
  // Up close, faces are drawn properly and clothes carry embroidery bands and mirror work; the stage screen cuts from
  // the drone's passes to ground-level close-ups of the couple, a child, a dancer and the lead singer, marked LIVE
  for (const marker of ['function faceHD(', 'function embBand(', 'function mirrorDisc(', 'function closeShot(', "close: 'couple'", "close: 'singer'", "close: 'kid'", "close: 'star'", "if (sh0.close && closeShot(id, sh0, rx, ry, rw, rh, t)) { feedTag = 'LIVE'; return; }", 'g.fillText(feedTag, cx0, ty0);']) {
    if (!scene.includes(marker)) fail(`Venue scene is missing the close-up detail or drone close-up marker: ${marker}`);
  }
  // The view turns: it looks ahead as you walk, swings round to face a stall you walk up to, orbits round you so you
  // stay in frame, and the two of you are seen from behind walking away or looking at a stall; the garbo fades as the
  // camera passes right by it
  for (const marker of ['var cam = { x: 0, y: 4, z: -15, yaw: 0 }, cosY = 1, sinY = 0;', 'zc = dx * sinY + dz * cosY', 'za = depth(a[0], a[2])', 'yawTo = Math.max(-1.25, Math.min(1.25, Math.atan2(sl0.x - walkMe.x, sl0.z - walkMe.z)));', 'ct = [pv.x + rx0 * cY + rz0 * sY, ct[1], pv.z - rx0 * sY + rz0 * cY];', 'if (d.coupleRole && walkMe.on && walkMe.away', 'var lampA = Math.max(0, Math.min(1, (it.p.z - 2.6) / 4));']) {
    if (!scene.includes(marker)) fail(`Venue scene is missing the turning walk marker: ${marker}`);
  }
  // Setting off, the view first comes round behind the two of you, centred, and you move only once it's there; it then
  // follows from that distance. Walking up to the stage puts you By the stage (asked of the player, which owns that
  // choice), and stepping back from the stage or from far off takes you onto the ground again.
  for (const marker of ['function followCam(id)', "if (following) ct = followCam(st.venue);", "(following ? '/walk' : '')", 'if (walkMe.frame > 0) { walkMe.frame -= dt; vx = vz = 0; }', 'if (walkMe.frame > 0 && !walk) walkMe.frame = 0;', 'var STAGE_LINE = {', "askListener('stage');", "if (st.listener === 'stage' && !(dir === 'down' && askListener('circle'))) return;", "if (st.listener === 'far' && !askListener('circle')) return;", 'if (!opts.onListener || st.listener === id) return false;']) {
    if (!scene.includes(marker)) fail(`Venue scene is missing the frame-first walk or stage walk-up marker: ${marker}`);
  }
  // With the player hidden, the ground it covered fills with more dancers: they arrive and leave gradually, and only
  // while a song plays, never at the DJ's table
  for (const marker of ['var FILL = {', 'L.fill = fillFor(id, main);', 'var fillOn = !!st.fill && st.on && !st.dj;', 'fade: a * nearFade(p.z)', 'if (fillK > 0.3) L.fill.forEach(']) {
    if (!scene.includes(marker)) fail(`Venue scene is missing the hidden-player dancer marker: ${marker}`);
  }
  const wrapper = await read('docs/product/prototypes/garbo/scene.js');
  if (!wrapper.includes('var hidden = !this.dj && !(np.width && np.height);') || !wrapper.includes('this.v.set({ fill: hidden });')) fail('The Immersive scene wrapper must tell the venue when the player is hidden, so the ground it covered fills with dancers');
  if (!wrapper.includes("document.querySelector('#atmoListeners button[data-id=\"' + id + '\"]')")) fail('The Immersive scene wrapper must hand a walk-made place change to View, which owns it');
  if (scene.includes('walkMe.ox')) fail('Walking must follow from a fixed place behind the couple, not keep the offset the view happened to start at');
  // You and your partner can carry your own names and faces. A face goes on the head, seen from the front or from behind,
  // and only in the tag when the figure is too small (a transparent cut-out is worn like a singer's head, a photo is cropped round), the two tags make room for however long the names are, and a replaced face is let go.
  for (const marker of ["youName: '', partnerName: '', youFace: null, partnerFace: null, youFaceCut: false, partnerFaceCut: false", 'function coupleFace(', 'function cutHead(', 'wearFace(coupleFace(mine), mine, x, y - h * 0.885, h);', 'wearFace(coupleFace(youSeat), youSeat, ga.who.headAt.x, ga.who.headAt.y + hs * 0.085, hs);', 'function wearFace(', 'function faceDisc(', 'if (d.coupleRole && headFaceFits(h)) {', 'faceOnHead: headFaceFits(h)', 'tagLayout(coupleWord(true), zs, youTagFace).w', 'delete faceCache[old]']) {
    if (!scene.includes(marker)) fail(`Venue scene is missing the couple name and face marker: ${marker}`);
  }
  // A name is plain canvas text: cleaned of control and direction-override characters, capped at 10 characters,
  // and blank falls back to the word. Scripts and emoji come through whole.
  const nameBody = scene.slice(scene.indexOf('    var NAME_MAX = 10;'), scene.indexOf('    function coupleWord('));
  const cleanName = new Function(`${nameBody}; return cleanName;`)();
  const ch = (...codes) => String.fromCodePoint(...codes);
  const show = (v) => (typeof v === 'string' ? JSON.stringify(v).replace(/[^ -~]/gu, (c) => `<U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}>`) : String(v));
  const gujarati = ch(0x0aa7, 0x0ab0, 0x0acd, 0x0aae, 0x0abf, 0x0ab2);
  for (const [input, want] of [
    ['  Rudra  ', 'Rudra'],
    ['Ru   dra  D', 'Ru dra D'],
    [`Ru${ch(0x202e)}dra${ch(0x2066)}`, 'Rudra'],
    [`Dol${ch(0x200b)}ly${ch(0x2028)}${ch(0xfeff)}`, 'Dolly'],
    [`Ru${ch(0x07)}dra`, 'Rudra'],
    [gujarati, gujarati],
    [`${ch(0x1f483)} Dolly`, `${ch(0x1f483)} Dolly`],
    ['x'.repeat(40), 'x'.repeat(10)],
    ['Krupansu Sorath', 'Krupansu S'],
    ['   ', ''],
    [42, ''],
    [null, ''],
  ]) {
    const got = cleanName(input);
    if (got !== want) fail(`cleanName(${show(input)}) gave ${show(got)}, expected ${show(want)}`);
  }
  // Immersive View: two fields filled in with you and yours (10 characters, one line), a face picker, and a seek bar
  // under the title. Names and faces live in sessionStorage only and never go into localStorage or a link.
  for (const dir of ['docs/product/prototypes/garbo', 'public-site/garbo/prototype']) {
    const [page, js] = await Promise.all([read(`${dir}/index.html`), read(`${dir}/garbo.js`)]);
    for (const marker of ['id="youName" type="text" maxlength="10" value="you"', 'id="partnerName" type="text" maxlength="10" value="yours"', 'id="youFacePick"', 'id="partnerFacePick"', 'id="faceFile" type="file"', 'id="cropView"', 'class="seek-bar" id="seekBar" type="range"']) {
      if (!page.includes(marker)) fail(`${dir}/index.html is missing ${marker}`);
    }
    for (const marker of ["COUPLE_KEY = 'garbo-couple'", 'sessionStorage.setItem(COUPLE_KEY', 'function cutoutOf(', 'youFaceCut: C.youFaceCut', 'applySeek(bar.value / 1000);', 'if (!barHeld)']) {
      if (!js.includes(marker)) fail(`${dir}/garbo.js is missing ${marker}`);
    }
    if (/localStorage\.setItem\(COUPLE_KEY/.test(js) || /COUPLE_KEY[^\n]*location/.test(js)) fail(`${dir}/garbo.js must keep names and faces in sessionStorage only`);
  }
  if (!/function coupleWord\(you\) \{ return cleanName\(you \? st\.youName : st\.partnerName\) \|\| \(you \? 'you' : 'yours'\); \}/.test(scene)) fail("A blank name must fall back to 'you' and 'yours'");
}

if (failed) process.exit(1);
console.log('✓ Garba Atmosphere venues, listening position, beat-locked claps, truthful copy, public-domain sources and PWA packaging are coherent');
