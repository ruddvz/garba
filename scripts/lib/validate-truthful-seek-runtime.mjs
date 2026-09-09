import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [runtime, pages, pkg] = await Promise.all([
  read('assets/runtime/seek-state.js'),
  read('.github/workflows/pages.yml'),
  read('package.json'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of [
  "progress.disabled = !seekable",
  "const youtubeStage = document.getElementById('youtubeStage')",
  "youtubeStage.classList.contains('is-loading')",
  'GARBA_YOUTUBE_PLAYER?.activeSongId',
  "progress.setAttribute('aria-disabled', String(!seekable))",
  'GARBA_SEEK_STATE_RUNTIME',
]) {
  if (!runtime.includes(marker)) fail(`Seek-state runtime is missing: ${marker}`);
}

if (/observe\(document\.(?:body|documentElement)/.test(runtime)) {
  fail('Seek-state runtime must not observe the whole document for playback-local seek changes');
}

const stageObserver = /new MutationObserver\(scheduleSync\)\.observe\(youtubeStage,\s*\{\s*attributes:\s*true,\s*attributeFilter:\s*\['class', 'aria-hidden'\],\s*\}\);/s;
if (!stageObserver.test(runtime)) {
  fail('Seek-state runtime must observe only YouTube stage class/aria-hidden attributes');
}

const durationObserver = /new MutationObserver\(scheduleSync\)\.observe\(durationTime,\s*\{\s*subtree:\s*true,\s*childList:\s*true,\s*characterData:\s*true,\s*\}\);/s;
if (!durationObserver.test(runtime)) {
  fail('Seek-state runtime must observe only duration text mutations for YouTube seek readiness');
}

const legacyBundle = pages.includes('cat app.js assets/runtime/seek-state.js > _site/app.js');
const extendedBundle = /cat\s+\\\s*\n\s*app\.js\s+\\\s*\n\s*assets\/runtime\/seek-state\.js\s+\\\s*\n(?:\s*assets\/runtime\/[^\n]+\s+\\\s*\n)*\s*> _site\/app\.js/.test(pages);
if (!legacyBundle && !extendedBundle) {
  fail('Pages seek-state packaging must fold app.js and assets/runtime/seek-state.js into _site/app.js');
}
if (!pages.includes("grep -q 'GARBA_SEEK_STATE_RUNTIME' _site/app.js")) {
  fail("Pages seek-state packaging is missing: grep -q 'GARBA_SEEK_STATE_RUNTIME' _site/app.js");
}

if (extendedBundle && pages.includes('assets/runtime/continuous-set-state.js')) {
  const appIndex = pages.indexOf('            app.js');
  const seekIndex = pages.indexOf('            assets/runtime/seek-state.js');
  const continuousIndex = pages.indexOf('            assets/runtime/continuous-set-state.js');
  const outputIndex = pages.indexOf('            > _site/app.js');
  if (!(appIndex >= 0 && appIndex < seekIndex && seekIndex < continuousIndex && continuousIndex < outputIndex)) {
    fail('Extended app bundle must preserve app.js → seek-state → continuous-set ordering before _site/app.js');
  }
}

if (!pkg.includes('node --check assets/runtime/seek-state.js')) fail('check:modules must syntax-check assets/runtime/seek-state.js');
if (!pkg.includes('node scripts/lib/validate-truthful-seek-runtime.mjs')) fail('npm run check must validate truthful seek packaging');

if (failed) process.exit(1);
console.log('✓ seek remains disabled for unseekable provider playback');
console.log('✓ direct audio and ready controllable YouTube playback can enable seek');
console.log('✓ seek observation is bounded to playback-local stage and duration state');
console.log('✓ Pages folds the seek runtime into the network-first app.js payload, including extended bundled runtimes');
