import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const index = await readJson('data/catalogue/index.json');
const songsPath = index.generatedFiles?.songs || 'data/songs.json';
const songs = await readJson(songsPath);
const sourcePaths = Array.isArray(index.playbackSources) ? index.playbackSources.filter(Boolean) : [];
if (!sourcePaths.length) throw new Error('No playback source manifests are declared in data/catalogue/index.json');

const manifests = await Promise.all(sourcePaths.map((file) => readJson(file)));
const routes = Object.assign({}, ...manifests.map((manifest) => manifest?.songSources || {}));
let enriched = 0;
let direct = 0;
const missing = [];

const runtimeSongs = songs.map((song) => {
  const next = { ...song };
  if (song.audioUrl) {
    direct += 1;
    return next;
  }

  const route = routes[song.id];
  if (!route?.provider || (!route.sourceUrl && !route.videoId)) {
    missing.push(song.id);
    return next;
  }

  next.playbackProvider = route.provider;
  next.playbackSourceUrl = route.sourceUrl || `https://www.youtube.com/watch?v=${encodeURIComponent(route.videoId)}`;
  next.playbackSourceType = route.sourceType || 'verified-provider-source';
  if (route.videoId) next.youtubeId = route.videoId;
  if (Number.isFinite(Number(route.startSeconds))) {
    next.youtubeStartSeconds = Math.max(0, Math.floor(Number(route.startSeconds)));
  } else {
    delete next.youtubeStartSeconds;
  }
  enriched += 1;
  return next;
});

if (missing.length) {
  throw new Error(`${missing.length} songs have no direct audio or verified runtime route. First missing: ${missing.slice(0, 8).join(', ')}`);
}

await writeFile(path.join(root, songsPath), `${JSON.stringify(runtimeSongs, null, 2)}\n`);
console.log(`Enriched runtime catalogue: ${enriched} provider-routed songs, ${direct} direct-audio songs, ${missing.length} unresolved.`);
