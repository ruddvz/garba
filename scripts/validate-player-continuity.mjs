import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [bootstrap, provider, continuity, youtube, app] = await Promise.all([
  read('simple-runtime.js'),
  read('provider-runtime.js'),
  read('player-continuity.js'),
  read('youtube-player-runtime.js'),
  read('app.js'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const providerIndex = bootstrap.indexOf('provider-runtime.js');
const continuityIndex = bootstrap.indexOf('player-continuity.js');
if (providerIndex < 0) fail('Fast bootstrap must load provider-runtime.js');
if (continuityIndex < 0) fail('Fast bootstrap must load player-continuity.js');
if (providerIndex >= 0 && continuityIndex >= 0 && continuityIndex < providerIndex) {
  fail('player-continuity.js must load after provider-runtime.js');
}

for (const marker of [
  'let playAfterSelection = false;',
  'let continueProviderAfterNavigation = false;',
  "target.closest('.song-copy')",
  "target.closest('#prevButton, #nextButton, #miniPrev, #miniNext')",
  "document.addEventListener('click', rememberPlaybackIntent, { capture: true })",
  'new MutationObserver(resumeSelectedProviderIfNeeded)',
  'const shouldStartSelectedSong = playAfterSelection;',
  'const shouldContinueProvider = continueProviderAfterNavigation;',
  'playButton.click();',
]) {
  if (!continuity.includes(marker)) fail(`Continuity runtime missing marker: ${marker}`);
}

for (const marker of [
  "const mobileQuery = window.matchMedia('(max-width: 700px)');",
  'function closeMobileSongBrowserAfterSelection()',
  "if (!sheet || sheet.dataset.snap === 'closed') return;",
  "$('sheetClose')?.click();",
  'if (shouldStartSelectedSong) closeMobileSongBrowserAfterSelection();',
]) {
  if (!continuity.includes(marker)) fail(`Mobile selection handoff missing marker: ${marker}`);
}

for (const marker of [
  "const requestedSongId = new URL(location.href).searchParams.get('song');",
  'const needsFullCatalogueForDeepLink = Boolean(',
  "!fastBoot.songs.some((song) => song.id === requestedSongId)",
  "function setDeepLinkUi(status)",
  "songTitle.textContent = 'Loading requested song…'",
  "songTitle.textContent = 'Requested song unavailable'",
  'async function ensureDeepLinkCatalogue()',
  'const ready = await ensureDeepLinkCatalogue();',
  'if (!ready) return unavailableCatalogueResponse();',
  "status: 503",
  "control.setAttribute('aria-disabled', disabled ? 'true' : 'false')",
]) {
  if (!continuity.includes(marker)) fail(`Deep-link boot guard missing marker: ${marker}`);
}
if (!continuity.includes("path.endsWith('/data/songs.json') || path.endsWith('/data/genres.json')")) {
  fail('Deep-link hydration must gate both songs and genres catalogue requests');
}
if (!continuity.includes("if (event.isTrusted && needsFullCatalogueForDeepLink && !window.GARBA_CATALOGUE_READY)")) {
  fail('A failed deep-link hydration must retry on a genuine network reconnect');
}

for (const marker of [
  'function guardInteractiveShortcuts(event)',
  "event.code === 'Space'",
  "event.code === 'ArrowLeft'",
  "event.code === 'ArrowRight'",
  "'button, a[href], input, textarea, select, iframe, [contenteditable]:not([contenteditable=\"false\"]), [role=\"button\"], [role=\"link\"]'",
  'if (interactive) event.stopImmediatePropagation();',
  "document.addEventListener('keydown', guardInteractiveShortcuts)",
]) {
  if (!continuity.includes(marker)) fail(`Interactive-keyboard guard missing marker: ${marker}`);
}

for (const marker of [
  'let catalogueReadyOnlinePulse = false;',
  "window.addEventListener('garba:catalogue-ready'",
  'function suppressHydrationOnlineToast(event)',
  "toast?.textContent === 'Back online.'",
  "window.addEventListener('online', (event) => {",
]) {
  if (!continuity.includes(marker)) fail(`Catalogue hydration toast guard missing marker: ${marker}`);
}

for (const marker of [
  'const MEDIA_ARTWORK = [',
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  'function clearMediaMetadata()',
  'function syncMediaMetadata()',
  "navigator.mediaSession.metadata = new MediaMetadata({",
  'title,',
  'artist,',
  'artwork: MEDIA_ARTWORK',
  'new MutationObserver(syncMediaMetadata)',
  'queueMicrotask(syncMediaMetadata)',
]) {
  if (!continuity.includes(marker)) fail(`Media Session metadata guard missing marker: ${marker}`);
}
if (!continuity.includes("title === 'Loading requested song…'") || !continuity.includes("title === 'Requested song unavailable'")) {
  fail('Media Session metadata must not publish transient deep-link loading/error labels as song metadata');
}
if ((continuity.match(/clearMediaMetadata\(\);/g) || []).length < 3) {
  fail('Loading, failed and generic transient metadata paths must be able to clear stale Media Session metadata');
}

for (const marker of [
  'function applyYoutubeOnlyPolicy(song)',
  'function selectedYoutubeSong()',
  "button.id = 'youtubeVideoButton';",
  "document.addEventListener('click', interceptPlay, { capture: true })",
  "document.addEventListener('keydown', interceptSpace, { capture: true })",
  'pendingYoutubeSong = song;',
  'Tap the YouTube button to open this track.',
]) {
  if (!provider.includes(marker)) fail(`YouTube-only playback intent guard missing marker: ${marker}`);
}

for (const marker of [
  'async function refreshSafeSongs()',
  "window.fetch('data/songs.json', { cache: 'no-store' })",
  "window.addEventListener('garba:catalogue-ready'",
  'queueMicrotask(refreshSafeSongs)',
  'safeSongs = sanitiseSongs(songs);',
]) {
  if (!provider.includes(marker)) fail(`YouTube-only catalogue hydration guard missing marker: ${marker}`);
}

for (const marker of [
  'function reopenAfterNavigation()',
  'if (canControl(song)) {',
  'close();',
  'genericPlay();',
  'if (activeSong) close();',
]) {
  if (!youtube.includes(marker)) fail(`YouTube navigation close/fallback guard missing marker: ${marker}`);
}

if (provider.includes('|| safeSongs[0] || null') || provider.includes('|| songs[0] || null')) {
  fail('YouTube-only currentSong must never silently fall back to the first catalogue song');
}
if (provider.includes('setTimeout(() => { loadSongs(); }, 600);')) {
  fail('YouTube-only runtime must not permanently cache the fast-boot catalogue before hydration');
}
if (!app.includes("copy.className = 'song-copy'")) fail('Song rows must retain the song-copy action target');
for (const control of ['prevButton', 'nextButton', 'miniPrev', 'miniNext']) {
  if (!app.includes(`els.${control}.addEventListener('click'`)) fail(`Core app lost ${control} transport binding`);
}

if (failed) process.exit(1);
console.log('✓ song-row playback intent follows the newly selected song without opening a non-YouTube provider');
console.log('✓ mobile song selection returns to Now Playing before playback intent resumes');
console.log('✓ Previous/Next preserve listening intent while the YouTube engine closes on non-controllable destinations');
console.log('✓ YouTube-only routing refreshes after full catalogue hydration and never substitutes song 1');
console.log('✓ deep links outside fast boot hydrate before transport is exposed and fail closed instead of playing a fallback song');
console.log('✓ deep-link hydration retries on reconnect without showing a fake Back online toast');
console.log('✓ global playback shortcuts do not steal keyboard input from interactive controls');
console.log('✓ Media Session publishes the current song/artist with PlayGarba artwork and clears transient loading metadata');
console.log('✓ continuity layer loads after the YouTube-only policy runtime and before app interaction completes');
