import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const source = await readFile(path.join(root, 'nonstop-browser.js'), 'utf8');
const smoke = await readFile(path.join(root, '.github/browser/browser-smoke.spec.mjs'), 'utf8');

let failed = false;
const fail = (message) => {
  console.error(`✗ ${message}`);
  failed = true;
};

for (const marker of [
  'function visualGenreForSet(set)',
  "['raas-dandiya', 'dandiya']",
  "['mataji-devotional', 'devotional']",
  "['folk-lokgeet', 'folk']",
  "['sanedo', 'sanedo']",
  "['electronic-fusion', 'fusion']",
  'genre: visualGenreForSet(set)',
  'function syncMainTransport(active)',
  "queueButton.setAttribute('aria-label', 'Browse Nonstop Garba recordings')",
  "queueBadge?.classList.remove('show')",
  "#queueButton, #prevButton, #nextButton, #miniPrev, #miniNext",
  'function captureNonstopKeyboard(event)',
  "document.addEventListener('keydown', captureNonstopKeyboard, { capture: true })",
  "state.metadataObserver.observe(queueBadge, { childList: true, characterData: true, subtree: true })",
  'function recordingPresentation(set)',
  "label: 'Chaptered recording'",
  "label: 'Full recording'",
  'One recording · ${chapterCount} chapter',
  'One full recording · no chapter map',
  'One full recording · ${tracklistCount} songs listed · no timestamps',
  'const eyebrowText = `Nonstop · ${recording.label}`',
  'album: recording.mediaAlbum',
  'class="nonstop-set-recording"',
  'class="nonstop-set-badge recording"',
  'one choice = one recording · chapters stay inside the recording',
]) {
  if (!source.includes(marker)) fail(`Nonstop UX contract is missing: ${marker}`);
}

const trackForSetStart = source.indexOf('function trackForSet(set)');
const trackForSetEnd = source.indexOf('\n  function ', trackForSetStart + 1);
const trackForSet = trackForSetStart >= 0
  ? source.slice(trackForSetStart, trackForSetEnd > trackForSetStart ? trackForSetEnd : undefined)
  : '';
if (!trackForSet) fail('Nonstop synthetic-track builder is missing');
if (trackForSet.includes("genre: 'traditional'")) fail('Nonstop synthetic tracks must not hard-code every set as Traditional');

const navigationStart = source.indexOf('function captureMainNavigation(event)');
const navigationEnd = source.indexOf('\n  function ', navigationStart + 1);
const navigation = navigationStart >= 0
  ? source.slice(navigationStart, navigationEnd > navigationStart ? navigationEnd : undefined)
  : '';
if (!navigation.includes('openBrowser();')) fail('Nonstop Queue/Previous/Next must open the Nonstop chooser');
if (navigation.includes("announce('Nonstop Garba plays continuously.")) fail('Nonstop transport must not stop at a toast instead of offering the chooser');

for (const marker of [
  "sets.first().locator('.nonstop-set-recording')",
  "sets.first().locator('.nonstop-set-badge.recording')",
  "toContainText('one choice = one recording')",
]) {
  if (!smoke.includes(marker)) fail(`Browser smoke coverage is missing the Nonstop recording contract: ${marker}`);
}

if (/\b(?:tracks?|songs?)\s+up\s+next\b/i.test(source)) {
  fail('Nonstop UI must not describe chapters inside one recording as queued tracks/songs');
}

if (failed) process.exit(1);
console.log('✓ Nonstop sets remain one recording and Queue/Previous/Next route to the Nonstop chooser');
console.log('✓ chooser cards distinguish chaptered recordings from full recordings without implying separate queued audio');
console.log('✓ Now Playing and Media Session metadata identify the active Nonstop recording format');
console.log('✓ browser smoke tests assert the one-recording language and recording-format badge');
console.log('✓ Nonstop synthetic tracks derive their visual genre from verified set categories');
console.log('✓ Nonstop queue accessibility state is reasserted when ordinary queue metadata changes');
