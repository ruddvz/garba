import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [host, runtime, page, player, app, serviceWorker, home, pages, nonstop, youtubeRuntime] = await Promise.all([
  read('assets/runtime/immersive-view.js'),
  read('scripts/lib/validate-immersive-view.mjs'),
  read('public-site/garbo/immersive/index.html'),
  read('public-site/garbo/immersive/garbo.js'),
  read('app.js'),
  read('sw.js'),
  read('index.html'),
  read('.github/workflows/pages.yml'),
  read('nonstop-browser.js'),
  read('youtube-player-runtime.js'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };
const has = (source, marker, label) => {
  if (!source.includes(marker)) fail(`${label} is missing ${marker}`);
};

for (const marker of [
  "isLocalDev ? './public-site/garbo/immersive/?live=1&embed=1&v=20261002-2' : './garbo/immersive/?live=1&embed=1&v=20261002-2'",
  'if (!frame.src)',
  'frame.contentWindow.postMessage({ channel: CHANNEL, type: \'state\', snapshot: snapshot }',
  'event.source !== frame.contentWindow',
  'window.GARBA_IMMERSIVE_PLAYER.snapshot',
  "if (overlay) overlay.hidden = true;",
]) has(host, marker, 'Immersive host');

for (const marker of [
  'Standalone mode uses the sample catalogue',
  'the embedded venue receives the production catalogue',
  'src="garbo.js?v=20261003-17"',
  'src="venue3d/venue3d.js?v=',
]) has(page, marker, '3D page');

const liveBranchStart = player.indexOf('if (LIVE_SITE) {', player.indexOf('function startRuntime()'));
const liveBranchEnd = player.indexOf('  } else {', liveBranchStart);
if (liveBranchStart < 0 || liveBranchEnd < 0) fail('3D runtime must separate live boot from standalone sample boot');
else {
  const liveBoot = player.slice(liveBranchStart, liveBranchEnd);
  for (const marker of ['setMode(\'loading\')', 'startRuntime()']) has(liveBoot, marker, '3D live boot');
  if (/fetch\(|initYtPlayer\(\)/.test(liveBoot)) fail('Live boot must not load sample data or initialize a prototype YouTube player');
}
const sampleFetchAt = player.indexOf("fetch('../shared/sample.json')");
const standaloneBranchAt = player.indexOf('  } else {', player.indexOf('if (LIVE_SITE) {', player.indexOf('function startRuntime')));
if (sampleFetchAt < 0 || standaloneBranchAt < 0 || sampleFetchAt < standaloneBranchAt) fail('Only standalone mode may load sample.json');
for (const marker of [
  'function requestLiveAction(action, value)',
  'pendingLiveActions.push({ action: action, value: value, requestId: requestId })',
  'function flushPendingLiveActions()',
  'lastNonstopRequestId = requestId',
  "message.type === 'action-result'",
  "This Nonstop set couldn't start.",
  'Forward the user\'s selection during the click gesture',
  'flushPendingLiveActions();',
  'requestLiveAction(\'load-nonstop-catalogue\')',
  'event.origin !== location.origin || event.source !== window.parent',
]) has(player, marker, '3D live bridge');

const playerRuntime = player.slice(player.indexOf('/* ---------- standalone YouTube audio/video player ----------'), player.indexOf('/* ---------- queue ----------'));
for (const marker of ['function failPlayback(', 'onError: function (event)', 'failPlayback(message)', '}, 15000);']) has(playerRuntime, marker, 'Standalone provider handling');
if (playerRuntime.includes('}, 1300);') || /setMode\(S\.live \|\| S\.hosted \? 'live' : 'playing'\)/.test(playerRuntime)) {
  fail('Standalone playback must never claim Playing from a timer without YouTube confirmation');
}
for (const marker of [
  'if (LIVE_SITE || ytPlayer || ytApiLoading) return;',
  'if (LIVE_SITE) return;',
  "requestLiveAction('play')",
  "requestLiveAction('song', song.id)",
  "requestLiveAction('seek', f)",
  "requestLiveAction('volume', S.volume)",
  "requestLiveAction('favourite')",
  "requestLiveAction('circle')",
  "requestLiveAction('live')",
]) has(player, marker, '3D player controls');

const actionNames = new Set([...player.matchAll(/requestLiveAction\(\s*'([a-z-]+)'/g)].map((match) => match[1]));
for (const action of actionNames) {
  if (action === 'load-nonstop-catalogue') {
    has(host, "message.action === 'load-nonstop-catalogue'", 'Immersive action bridge');
  } else {
    has(app, `case '${action}'`, 'Production player action API');
  }
}
has(host, 'Promise.resolve(actionResult).then', 'Immersive asynchronous action result bridge');
has(app, 'Promise.resolve(window.GARBA_NONSTOP.play(value)).then(Boolean, () => false)', 'Production Nonstop action result');
for (const marker of [
  'const nonstopSet = window.GARBA_NONSTOP?.activeSet || null;',
  'const nonstopTrack = window.GARBA_NONSTOP?.activeTrack || null;',
  'id: nonstopTrack.id',
  'playing: nonstopSet ? Boolean(player?.playing)',
  'durationSeconds: nonstopTrack?.durationSeconds || nonstopSet?.durationSeconds',
  'upNext: (nonstopSet ? [] : getUpNextSongs()',
]) has(app, marker, 'Production Nonstop snapshot');
for (const marker of ['get activeTrack() { return state.activeTrack; }', 'togglePlayback()', 'pausePlayback()', 'async function advanceNonstop()', 'advance: advanceNonstop']) {
  has(nonstop, marker, 'Nonstop playback owner');
}
for (const marker of ['function pause(song = activeSong)', 'function advance()', 'window.GARBA_NONSTOP.advance()', 'pause,']) {
  has(youtubeRuntime, marker, 'Shared YouTube transport');
}
has(app, 'nonstop.togglePlayback?.()', 'Production Nonstop play/pause routing');
has(app, 'window.GARBA_NONSTOP?.stop?.({ restoreSession: false })', 'Live mode handoff from Nonstop');
has(app, 'window.GARBA_YOUTUBE_PLAYER?.seekTo?.(Math.max(0, Math.min(1, value)) * duration)', 'Production Nonstop seek routing');
has(player, "['prevBtn', 'nextBtn', 'heartBtn'].forEach(function (id) { $(id).hidden = nonstopActive; });", '3D Nonstop transport controls');
for (const marker of [
  "requestLiveAction(dir < 0 ? 'previous' : 'next')",
  "requestLiveAction(kind === 'next' ? 'queue-next' : 'queue-add'",
]) has(player, marker, '3D navigation/queue controls');
for (const action of ['previous', 'next', 'queue-next', 'queue-add']) has(app, `case '${action}'`, 'Production player action API');
for (const marker of ['playPending: false', 'state.playPending = true', 'state.playPending = false', 'loading: Boolean(state.playPending)']) has(app, marker, 'Production provider loading snapshot');
has(player, "setMode(snapshot.loading ? 'loading'", '3D provider state handling');

for (const key of ["k === 'j'", "k === 'l'", "k === 'k'", "k === 'N'", "k === 'P'"]) has(player, key, '3D keyboard controls');
for (const marker of [
  "const CACHE_NAME = `${CACHE_PREFIX}v47`",
  "'./assets/runtime/immersive-view.js?v=20261003-1'",
  "'/assets/runtime/immersive-view.js'",
]) has(serviceWorker, marker, 'PWA runtime cache');
has(home, 'assets/runtime/immersive-view.js?v=20261003-1', 'Homepage runtime');
has(runtime, '20261002-2', 'Immersive validator cache contract');
has(pages, 'public-site/garbo', 'Pages deployment');
has(host, "document.documentElement.classList.toggle('garba-immersive', view === 'immersive')", 'Immersive view state');
// Ask Kukdu has one panel in both views: the venue's dark card, drawn by Kukdu's own stylesheet, with no ring round him
const ask = await read('assets/runtime/ask-playgarba.js');
for (const marker of ['rgba(22,14,11,.95)', 'border:1px solid rgba(214,176,111,.22)', '.ask-a-content{flex:1;min-width:0;padding:15px 16px;border-radius:5px 17px 17px 17px;background:#221612']) has(ask, marker, 'Ask Kukdu dark card');
if (/\.ask-(?:mark|a-avatar)\{[^}]*box-shadow/.test(ask)) fail('Ask Kukdu shows a ring round Kukdu');
if (/garba-immersive \.ask-/.test(host)) fail('Ask Kukdu needs no Immersive-only copy of its card');

if (failed) process.exit(1);
console.log('✓ Immersive opens the 3D venue while the persistent production player owns playback');
console.log('✓ Live mode waits for production state, queues early actions, and never loads sample songs or a second YouTube player');
console.log('✓ Standalone mode reports playback only after provider confirmation and routes every live control through the host');
console.log('✓ Installed app cache and Pages deployment include the current Immersive runtime');
console.log('✓ Ask Kukdu opens in the venue\'s dark card in Simple and Immersive alike, with no ring round Kukdu');
