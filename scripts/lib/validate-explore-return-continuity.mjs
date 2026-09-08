import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const runtime = await readFile(path.join(root, 'src/catalogue/listening-library.js'), 'utf8');

const checks = [
  [runtime.includes("const EXPLORE_RETURN_STATE_KEY = 'playgarbaExploreReturn';"), 'Explore return context must use history-entry state'],
  [runtime.includes('history.replaceState({ ...currentState, [EXPLORE_RETURN_STATE_KEY]: context }'), 'Listen navigation must attach return context to the current history entry'],
  [runtime.includes("const songRows = document.querySelectorAll('#catalogueSongList .song-row').length;"), 'return context must remember progressive song-list depth'],
  [runtime.includes('linkTop: link.getBoundingClientRect().top'), 'return context must remember the selected link viewport offset'],
  [runtime.includes('restoreFocus: event.detail === 0 || document.activeElement === link'), 'keyboard focus intent must be preserved'],
  [runtime.includes("document.querySelector('#catalogueSongList .song-more')"), 'return restoration must be able to rebuild progressively loaded rows'],
  [runtime.includes('more.click();'), 'return restoration must replay progressive loading before alignment'],
  [runtime.includes("a.play-link[href], a.personal-listening-card[href]"), 'both catalogue Listen links and Your listening cards must participate in continuity'],
  [runtime.includes("window.scrollTo({ top: Math.max(0, Number(context.scrollY) || 0), left: 0, behavior: 'auto' });"), 'return restoration must restore the saved scroll position without animation'],
  [runtime.includes('if (event.persisted) queueListeningRender();') && runtime.includes('else restoreExploreReturnState();'), 'BFCache returns must be left to the browser while rebuilt returns restore manually'],
  [!runtime.includes("localStorage.setItem(EXPLORE_RETURN_STATE_KEY"), 'Explore return context must not become a persistent user preference'],
  [!runtime.includes("sessionStorage.setItem(EXPLORE_RETURN_STATE_KEY"), 'Explore return context must remain scoped to the exact browser history entry'],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length) {
  console.error('Explore return continuity validation failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('✓ Explore → player → Back continuity is regression-guarded');
