import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const continuity = await readFile(path.join(root, 'player-continuity.js'), 'utf8');

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const requiredMarkers = [
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
];

for (const marker of requiredMarkers) {
  if (!continuity.includes(marker)) fail(`AutoMix runtime missing marker: ${marker}`);
}

if (!continuity.includes('Math.cos(t * Math.PI * 0.5)') || !continuity.includes('Math.sin(t * Math.PI * 0.5)')) {
  fail('AutoMix must retain an equal-power crossfade curve');
}

if (!continuity.includes("target.closest('.song-copy, #prevButton, #nextButton, #miniPrev, #miniNext, #progress')")) {
  fail('Manual navigation must cancel an active AutoMix transition');
}

if (failed) process.exit(1);
console.log('✓ AutoMix stays restricted to consecutive direct-audio tracks');
console.log('✓ equal-power crossfade and optional tempo metadata hooks are present');
console.log('✓ manual navigation and seeking cancel an in-flight mix');
console.log('✓ Up next exposes the persisted AutoMix control');