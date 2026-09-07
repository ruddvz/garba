import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await read(file));
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const [html, bootstrap, bridge, styles, playerCss, releaseCss, sw, pages, catalogue, songs] = await Promise.all([
  read('index.html'),
  read('catalogue-bootstrap.js'),
  read('playback-bridge.js'),
  read('styles.css'),
  read('styles/part-7.css'),
  read('styles/part-8.css'),
  read('sw.js'),
  read('.github/workflows/pages.yml'),
  readJson('data/catalogue/index.json'),
  readJson('data/songs.json'),
]);

for (const marker of ['YT.Player', 'youtube.com/embed/', 'spotifyEmbedUrl', 'stopImmediatePropagation', 'provider-dock', 'playYouTube', 'playSpotify']) {
  if (!bridge.includes(marker)) fail(`Primary in-app playback engine missing marker: ${marker}`);
}
for (const marker of ['appleEmbedUrl', 'embed.music.apple.com', 'amazonEmbedUrl', '/embed/', 'interceptReleaseProvider', 'interceptReleaseProviderKey']) {
  if (!bootstrap.includes(marker)) fail(`Release-provider fallback missing marker: ${marker}`);
}
if ((bridge + bootstrap).includes('window.open(')) fail('Playback code must not redirect play actions with window.open');
if (!html.includes('<script src="catalogue-bootstrap.js"></script>') || !html.includes('<script src="playback-bridge.js"></script>')) fail('index.html must load catalogue bootstrap before the playback bridge');
if (!styles.includes('@import url("styles/part-7.css")') || !styles.includes('@import url("styles/part-8.css")')) fail('styles.css must load both final player layers');

for (const marker of [
  '.provider-dock', '.provider-media iframe', '.source-badge { display: none !important; }',
  '@media (max-width: 700px)', '@media (min-width: 701px) and (max-height: 760px)',
  '@media (max-height: 560px) and (orientation: landscape)', '@media (display-mode: standalone)',
]) {
  if (!playerCss.includes(marker)) fail(`Final player CSS missing marker: ${marker}`);
}
if (!releaseCss.includes('.provider-dock.is-release-provider')) fail('Release-provider CSS is not loaded');

const playbackPaths = Array.isArray(catalogue.playbackSources) ? catalogue.playbackSources : [catalogue.playbackSources].filter(Boolean);
const manifests = await Promise.all(playbackPaths.map(readJson));
const sources = Object.assign({}, ...manifests.map((manifest) => manifest?.songSources || {}));
const supportedProviders = new Set(['youtube', 'spotify', 'apple-music', 'amazon-music']);
const unresolved = [];
const unsupported = [];
for (const song of songs) {
  if (song.audioUrl) continue;
  const source = sources[song.id];
  if (!source) unresolved.push(song.id);
  else if (!supportedProviders.has(source.provider)) unsupported.push(`${song.id}:${source.provider || 'none'}`);
}
if (unresolved.length) fail(`${unresolved.length} songs have no local audio or verified provider source`);
if (unsupported.length) fail(`${unsupported.length} songs resolve to unsupported providers: ${unsupported.slice(0, 5).join(', ')}`);

for (const file of ["'./styles/part-7.css'", "'./styles/part-8.css'"]) if (!sw.includes(file)) fail(`Service worker must precache ${file}`);
for (const marker of ['cacheOfflineCatalogue', 'index.songChunks', 'index.playbackSources', 'data/discovery/sets/']) {
  if (!sw.includes(marker)) fail(`Offline PWA catalogue caching missing marker: ${marker}`);
}
const artworkEntries = [...sw.matchAll(/assets\/backgrounds\/library\/[0-9]{2}-[^'\"]+\.webp/g)];
if (new Set(artworkEntries.map((match) => match[0])).size !== 15) fail('Service worker must cache all 15 approved WebP backgrounds when available');
if (!pages.includes('garba15-2k-q82.zip')) fail('Pages workflow must retain the approved 2K WebP pack extraction');
if (!pages.includes("test \"$(find _site/assets/backgrounds/library -maxdepth 1 -name '*.webp' | wc -l)\" -eq 15")) fail('Pages workflow must verify all 15 WebPs are deployed');

if (failed) process.exit(1);
console.log(`✓ ${songs.length} songs resolve to local audio or a supported in-app provider`);
console.log('✓ YouTube, Spotify, Apple Music and Amazon Music remain inside GARBA');
console.log('✓ phone, tablet, laptop and landscape player CSS is loaded');
console.log('✓ PWA caches catalogue chunks, provider manifests and all 15 approved WebP backgrounds');
