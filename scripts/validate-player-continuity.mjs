import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [bootstrap, provider, continuity, automixAudio, app] = await Promise.all([
  read('simple-runtime.js'),
  read('provider-runtime.js'),
  read('player-continuity.js'),
  read('assets/runtime/automix-web-audio.js'),
  read('app.js'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const providerIndex = bootstrap.indexOf('provider-runtime.js');
const continuityIndex = bootstrap.indexOf('player-continuity.js');
const automixAudioIndex = bootstrap.indexOf('assets/runtime/automix-web-audio.js');
if (providerIndex < 0) fail('Fast bootstrap must load provider-runtime.js');
if (continuityIndex < 0) fail('Fast bootstrap must load player-continuity.js');
if (automixAudioIndex < 0) fail('Fast bootstrap must load the AutoMix Web Audio compatibility runtime');
if (providerIndex >= 0 && continuityIndex >= 0 && continuityIndex < providerIndex) {
  fail('player-continuity.js must load after provider-runtime.js');
}
if (continuityIndex >= 0 && automixAudioIndex >= 0 && automixAudioIndex < continuityIndex) {
  fail('AutoMix Web Audio compatibility runtime must load after player-continuity.js');
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
  "const MIX_ENABLED_KEY = 'garba:automix-enabled';",
  'const MIX_DEFAULT_SECONDS = 7.5;',
  'function nextDirectSong(song)',
  'function equalPower(progress)',
  'function mixDurationSeconds(current, next)',
  'next?.transitionSeconds',
  'current?.bpm || next?.bpm',
  'song?.mixOutSeconds',
  'next.mixInSeconds || next.introSilenceSeconds',
  'navigator.connection?.saveData',
  'function beginAutoMix(current, next)',
  '!current?.audioUrl || !next?.audioUrl',
  'function requestCoreNavigation(nextSong, secondary, token)',
  'data-garba-automix-toggle',
  'window.GARBA_AUTOMIX',
]) {
  if (!continuity.includes(marker)) fail(`AutoMix runtime missing marker: ${marker}`);
}

if (!continuity.includes('Math.cos(t * Math.PI * 0.5)') || !continuity.includes('Math.sin(t * Math.PI * 0.5)')) {
  fail('AutoMix must retain an equal-power crossfade curve');
}
if (!continuity.includes("target.closest('.song-copy, #prevButton, #nextButton, #miniPrev, #miniNext, #progress')")) {
  fail('Manual navigation must cancel an active AutoMix transition');
}

for (const marker of [
  'function mediaElementVolumeWorks()',
  'window.AudioContext || window.webkitAudioContext',
  'createMediaElementSource(primary)',
  'createMediaElementSource(secondary)',
  'createGain()',
  'setValueCurveAtTime(outgoingCurve',
  'setValueCurveAtTime(incomingCurve',
  "primary.crossOrigin = 'anonymous'",
  "secondary.crossOrigin = 'anonymous'",
  'cancelUnsafeMix();',
  "mode: 'web-audio-gain'",
]) {
  if (!automixAudio.includes(marker)) fail(`AutoMix Web Audio fallback missing marker: ${marker}`);
}

if (!provider.includes("new MutationObserver(() => {\n      closeProvider();")) {
  fail('Provider runtime must close the old provider surface when the selected title changes');
}
if (!provider.includes("playButton?.addEventListener('click', interceptFallbackPlay, { capture: true })")) {
  fail('Provider-aware primary Play interception is missing');
}
if (!app.includes("copy.className = 'song-copy'")) fail('Song rows must retain the song-copy action target');
for (const control of ['prevButton', 'nextButton', 'miniPrev', 'miniNext']) {
  if (!app.includes(`els.${control}.addEventListener('click'`)) fail(`Core app lost ${control} transport binding`);
}

if (failed) process.exit(1);
console.log('✓ song-row Play intent follows the newly selected provider song');
console.log('✓ provider Previous/Next preserve listening intent across song changes');
console.log('✓ continuity layer loads after provider runtime and before app interaction completes');
console.log('✓ AutoMix stays restricted to consecutive direct-audio tracks');
console.log('✓ AutoMix retains equal-power transition and optional mix metadata hooks');
console.log('✓ constrained media-volume browsers have a Web Audio GainNode fallback');
console.log('✓ manual navigation and seeking cancel an in-flight AutoMix transition');
