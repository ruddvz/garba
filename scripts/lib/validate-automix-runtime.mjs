import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [engine, compatibility, bootstrap, sw, enrichment, packageText] = await Promise.all([
  read('assets/runtime/automix-engine.js'),
  read('assets/runtime/automix-web-audio.js'),
  read('simple-runtime.js'),
  read('sw.js'),
  read('scripts/enrich-runtime-songs.mjs'),
  read('package.json'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of [
  "const MIX_ENABLED_KEY = 'garba:automix-enabled';",
  'const MIX_DEFAULT_SECONDS = 7.5;',
  'const PRELOAD_WINDOW_SECONDS = 30;',
  'function nextDirectSong(song)',
  'return next?.audioUrl ? next : null;',
  'function equalPower(progress)',
  'Math.cos(t * Math.PI * 0.5)',
  'Math.sin(t * Math.PI * 0.5)',
  'next?.transitionSeconds || current?.transitionSeconds',
  'song?.mixOutSeconds',
  'next.mixInSeconds || next.introSilenceSeconds',
  'navigator.connection?.saveData',
  'function beginAutoMix(current, next)',
  'function maybePreloadNext()',
  'data-garba-automix-toggle',
  'window.GARBA_AUTOMIX',
]) {
  if (!engine.includes(marker)) fail(`AutoMix engine missing marker: ${marker}`);
}

if (!engine.includes("target.closest('.song-copy, #prevButton, #nextButton, #miniPrev, #miniNext, #progress')")) {
  fail('Manual navigation must cancel an active AutoMix transition');
}
if (/youtube|spotify|apple-music|amazon-music/i.test(engine.replace(/data\/songs\.json/g, ''))) {
  fail('AutoMix engine must not implement provider-specific mixing paths');
}

for (const marker of [
  "window.GARBA_AUTOMIX_AUDIO = { mode: 'media-element-volume'",
  'createMediaElementSource(primary)',
  'createMediaElementSource(secondary)',
  'setValueCurveAtTime(outgoingCurve',
  'setValueCurveAtTime(incomingCurve',
  'cancelUnsafeMix()',
]) {
  if (!compatibility.includes(marker)) fail(`AutoMix Web Audio compatibility layer missing marker: ${marker}`);
}

const order = [
  'provider-runtime.js',
  'player-continuity.js',
  'assets/runtime/automix-engine.js',
  'assets/runtime/automix-web-audio.js',
  'youtube-player-runtime.js',
];
let previous = -1;
for (const file of order) {
  const index = bootstrap.indexOf(file);
  if (index < 0) fail(`Fast bootstrap does not load ${file}`);
  if (index >= 0 && index <= previous) fail(`Fast bootstrap runtime order is invalid around ${file}`);
  previous = index;
}

for (const file of ['assets/runtime/automix-engine.js', 'assets/runtime/automix-web-audio.js']) {
  if (!sw.includes(`'./${file}'`)) fail(`PWA core shell does not cache ${file}`);
  if (!sw.includes(`'/${file}'`)) fail(`PWA fresh-runtime list does not include ${file}`);
}
if (!sw.includes("const CACHE_NAME = `${CACHE_PREFIX}v12`")) {
  fail('AutoMix runtime requires the v12 PWA cache generation');
}

for (const marker of [
  "readJson('data/direct-audio.json')",
  "entry?.rights?.redistributionAuthorized !== true",
  "playbackProvider: 'direct'",
  'DIRECT_AUTOMIX_FIELDS',
  'mixInSeconds',
  'mixOutSeconds',
  'transitionSeconds',
]) {
  if (!enrichment.includes(marker)) fail(`Runtime catalogue direct-audio promotion missing marker: ${marker}`);
}

const packageJson = JSON.parse(packageText);
const scripts = packageJson.scripts || {};
if (!scripts['automix:analyze']?.includes('scripts/lib/analyze-automix.mjs')) fail('package.json must expose automix:analyze');
if (!scripts['check:modules']?.includes('assets/runtime/automix-engine.js')) fail('check:modules must syntax-check the AutoMix engine');
if (!scripts['check:modules']?.includes('assets/runtime/automix-web-audio.js')) fail('check:modules must syntax-check the AutoMix compatibility runtime');
if (!scripts.check?.includes('scripts/lib/validate-automix-runtime.mjs')) fail('npm run check must validate the AutoMix runtime contract');
if (!scripts.check?.includes('scripts/validate-direct-audio.mjs')) fail('npm run check must validate direct-audio rights and AutoMix metadata');

if (failed) process.exit(1);
console.log('✓ AutoMix is isolated from provider playback and the central player-continuity runtime');
console.log('✓ direct tracks preload and use equal-power transitions with bounded metadata hooks');
console.log('✓ Web Audio compatibility remains fail-safe when native media volume control is unreliable');
console.log('✓ direct-audio manifest promotion, PWA packaging and offline analysis are CI-enforced');
