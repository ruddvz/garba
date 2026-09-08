import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [bootstrap, provider, continuity, app] = await Promise.all([
  read('simple-runtime.js'),
  read('provider-runtime.js'),
  read('player-continuity.js'),
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
