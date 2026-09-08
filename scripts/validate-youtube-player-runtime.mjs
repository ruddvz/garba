import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [runtime, nonstop, styles, mobileStyles, bootstrap, styleIndex, pages] = await Promise.all([
  read('youtube-player-runtime.js'),
  read('nonstop-browser.js'),
  read('styles/60-runtime-and-provider.css'),
  read('styles/70-mobile-playback-coordination.css'),
  read('simple-runtime.js'),
  read('styles.css'),
  read('.github/workflows/pages.yml'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const requiredRuntimeSignals = [
  'https://www.youtube.com/iframe_api',
  'new window.YT.Player',
  'player.playVideo',
  'player.pauseVideo',
  'player.seekTo',
  'loadVideoById',
  'controls: 0',
  'playsinline: 1',
  'enablejsapi: 1',
  'playbackSearchOnly',
  'verified-unchaptered-youtube-release',
  'youtubeStage',
  'provider-dock',
];

for (const signal of requiredRuntimeSignals) {
  if (!runtime.includes(signal)) fail(`YouTube runtime is missing required signal ${JSON.stringify(signal)}`);
}

const prohibitedPatterns = [
  [/googlevideo/i, 'raw googlevideo delivery'],
  [/videoplayback/i, 'raw YouTube videoplayback URLs'],
  [/youtube-dl/i, 'youtube-dl extraction'],
  [/yt-dlp/i, 'yt-dlp extraction'],
  [/signatureCipher/i, 'YouTube signature-cipher parsing'],
  [/get_video_info/i, 'undocumented get_video_info access'],
  [/skipAd/i, 'ad-skipping controls'],
  [/removeAds/i, 'ad-removal controls'],
  [/blockAds/i, 'ad-blocking controls'],
];

for (const [pattern, label] of prohibitedPatterns) {
  if (pattern.test(runtime) || pattern.test(nonstop)) fail(`YouTube runtime must not implement ${label}`);
}

if (!/\.provider-media\s*\{[^}]*min-width:\s*200px;[^}]*min-height:\s*200px;/s.test(styles)) {
  fail('Visible provider media contract must keep a minimum 200×200 viewport');
}
if (!/\.provider-media iframe\s*\{[^}]*min-width:\s*200px;[^}]*min-height:\s*200px;/s.test(styles)) {
  fail('Embedded provider iframe must keep a minimum 200×200 viewport');
}

for (const marker of [
  'body:has(#youtubeStage.open[aria-hidden="false"]) #youtubeStage',
  'width: 216px;',
  'height: 200px;',
  'min-width: 200px;',
  'min-height: 200px;',
  '#songSheet[data-snap="medium"]',
  '#songSheet[data-snap="full"]',
  'height: clamp(220px, 48dvh, calc(100dvh - 320px));',
]) {
  if (!mobileStyles.includes(marker)) fail(`Mobile YouTube/sheet layout contract missing marker: ${marker}`);
}
if (!styleIndex.includes('@import url("styles/70-mobile-playback-coordination.css");')) {
  fail('Mobile playback coordination stylesheet must load after the base runtime styles locally');
}
const mobileLayerIndex = pages.indexOf('styles/70-mobile-playback-coordination.css');
const outputIndex = pages.indexOf('> _site/styles.css');
if (!(mobileLayerIndex >= 0 && outputIndex > mobileLayerIndex)) {
  fail('Pages must flatten the mobile playback coordination layer into production styles.css');
}

for (const marker of [
  "const DEFAULT_SET_ID = 'set-aditya-ochhav-2023'",
  "button.textContent = 'Nonstop'",
  "strip.insertBefore(button, strip.firstElementChild)",
  "url.searchParams.set('nonstop', set.id)",
  "playbackProvider: 'youtube'",
  'youtubeStartSeconds: 0',
  'durationSeconds: 0',
  'window.GARBA_YOUTUBE_PLAYER.open(state.activeTrack, { autoplay: true, resume: false })',
  "$('progress')?.addEventListener('input', captureSeek, { capture: true })",
  'function restorePreviousSession(previous)',
  'function captureMainNavigation(event)',
  "target.closest('#prevButton, #nextButton, #miniPrev, #miniNext')",
  'data-play-mode',
  '#genreStrip{grid-row:6!important',
  '#browseActions{grid-row:7!important',
]) {
  if (!nonstop.includes(marker)) fail(`Direct Nonstop playback contract missing marker: ${marker}`);
}
if (nonstop.includes('window.open(')) {
  fail('Primary Nonstop playback must not open an external provider window');
}
if (nonstop.includes('nonstop-overlay') || nonstop.includes('youtube-nocookie.com/embed/')) {
  fail('Primary Nonstop playback must reuse the PlayGarba provider engine instead of a separate modal/embed player');
}

const providerIndex = bootstrap.indexOf('provider-runtime.js');
const continuityIndex = bootstrap.indexOf('player-continuity.js');
const youtubeIndex = bootstrap.indexOf('youtube-player-runtime.js');
if (!(providerIndex >= 0 && continuityIndex > providerIndex && youtubeIndex > continuityIndex)) {
  fail('YouTube runtime must load after provider-runtime and player-continuity route sanitisation');
}

if (failed) process.exit(1);
console.log('✓ YouTube playback uses the documented IFrame Player API and GARBA transport controls');
console.log('✓ no raw-stream extraction, cipher parsing, ad skipping or ad-removal mechanism is present');
console.log('✓ the embedded YouTube player retains a visible minimum 200×200 viewport');
console.log('✓ mobile Browse/Search reserves space for the visible YouTube player instead of rendering underneath it');
console.log('✓ Pages flattens the mobile playback coordination layer into the PWA-cached production stylesheet');
console.log('✓ Nonstop is a first-class PlayGarba mode that reuses the controllable YouTube engine and restores the prior listening state on exit');
console.log('✓ Nonstop sits before the genre strip and Explore remains a separate lower discovery action');
console.log('✓ route-truth sanitisation runs before YouTube autoplay decisions');
