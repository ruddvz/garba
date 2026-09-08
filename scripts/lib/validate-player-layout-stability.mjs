import { readFileSync } from 'node:fs';

const app = readFileSync('app.js', 'utf8');
const html = readFileSync('index.html', 'utf8');
const css = readFileSync('styles/80-genre-icon-images.css', 'utf8');

const checks = [
  [app.includes('function reconcileGenreButtons'), 'genre controls must reconcile existing DOM nodes in place'],
  [!app.includes('function renderGenreButtons'), 'destructive genre renderer must stay removed'],
  [!app.includes("container.innerHTML = ''"), 'genre containers must not be cleared during state changes'],
  [app.includes('function revealGenreHorizontally'), 'genre reveal must be owned by the player runtime'],
  [!app.includes('scrollIntoView('), 'player runtime must not use generic two-axis scrollIntoView for genres'],
  [!html.includes("Object.defineProperty(button, 'scrollIntoView'"), 'page-level scrollIntoView monkey patch must stay removed'],
  [html.includes('app.js?v=20260908.2'), 'player runtime version token must include the interaction-stability update'],
  [css.includes('touch-action: pan-x;'), 'genre touch behavior must remain horizontal'],
  [css.includes('overflow-y: hidden !important;'), 'genre strips must not regain vertical overflow'],
  [css.includes('-webkit-line-clamp: 2;'), 'Now Playing title must remain visually bounded to two lines'],
  [css.includes('.app .track-block {') && css.includes('height: 156px;') && css.includes('height: 146px;'), 'Now Playing frame must stay fixed on desktop and mobile'],
  [css.includes('.network-status.show {') && css.includes('font-size: 0;'), 'mobile offline state must not widen the utility row'],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);

if (failures.length) {
  console.error('Player layout stability validation failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('Player layout stability contract OK.');
