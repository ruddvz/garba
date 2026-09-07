import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const index = await readJson('data/catalogue/index.json');
const songsPath = index.generatedFiles?.songs || 'data/songs.json';
const releasesPath = index.generatedFiles?.releases || 'data/releases.json';
const [songs, releases] = await Promise.all([readJson(songsPath), readJson(releasesPath)]);
const releasesById = new Map(releases.map((release) => [release.id, release]));
const sourcePaths = Array.isArray(index.playbackSources) ? index.playbackSources.filter(Boolean) : [];
if (!sourcePaths.length) throw new Error('No playback source manifests are declared in data/catalogue/index.json');

const manifests = await Promise.all(sourcePaths.map((file) => readJson(file)));
const routes = Object.assign({}, ...manifests.map((manifest) => manifest?.songSources || {}));
let enriched = 0;
let direct = 0;
let exactTrackFallbacks = 0;
let singleReleaseFallbacks = 0;
let unchapteredYoutubeReleaseFallbacks = 0;
let artistCatalogueFallbacks = 0;
let playlistReferenceFallbacks = 0;
const missing = [];

function isExactTrackUrl(provider, sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    const pathname = url.pathname.toLowerCase();
    if (provider === 'spotify') return /\/(?:intl-[^/]+\/)?track\/[^/]+/.test(pathname);
    if (provider === 'apple-music') return pathname.includes('/song/') || url.searchParams.has('i');
    if (provider === 'amazon-music') return /\/tracks\/[^/]+/.test(pathname);
  } catch {
    return false;
  }
  return false;
}

function isReleaseSpecificUrl(provider, sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    const pathname = url.pathname.toLowerCase();
    if (provider === 'spotify') return pathname.includes('/album/');
    if (provider === 'apple-music') return pathname.includes('/album/');
    if (provider === 'amazon-music') return pathname.includes('/albums/');
    if (provider === 'youtube') return url.hostname === 'youtu.be' || (url.hostname.includes('youtube.com') && pathname === '/watch');
  } catch {
    return false;
  }
  return false;
}

function pageReferenceKind(provider, sourceUrl) {
  try {
    const pathname = new URL(sourceUrl).pathname.toLowerCase();
    if ((provider === 'spotify' || provider === 'apple-music') && pathname.includes('/artist/')) return 'artist';
    if (provider === 'spotify' && pathname.includes('/playlist/')) return 'playlist';
  } catch {
    return '';
  }
  return '';
}

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
  if (next.playbackSourceType === 'verified-release-source') {
    const release = releasesById.get(song.releaseId);
    const pageKind = pageReferenceKind(next.playbackProvider, next.playbackSourceUrl);
    if (isExactTrackUrl(next.playbackProvider, next.playbackSourceUrl)) {
      next.playbackSourceType = 'verified-track-source';
      exactTrackFallbacks += 1;
    } else if (Number(release?.songCount) === 1 && isReleaseSpecificUrl(next.playbackProvider, next.playbackSourceUrl)) {
      next.playbackSourceType = 'verified-single-release-source';
      singleReleaseFallbacks += 1;
    } else if (
      next.playbackProvider === 'youtube'
      && Number(release?.songCount) > 1
      && isReleaseSpecificUrl(next.playbackProvider, next.playbackSourceUrl)
      && !Number.isFinite(Number(route.startSeconds))
    ) {
      next.playbackSourceType = 'verified-unchaptered-youtube-release';
      unchapteredYoutubeReleaseFallbacks += 1;
    } else if (pageKind === 'artist') {
      next.playbackSourceType = 'verified-artist-catalogue-source';
      artistCatalogueFallbacks += 1;
    } else if (pageKind === 'playlist') {
      next.playbackSourceType = 'verified-playlist-reference';
      playlistReferenceFallbacks += 1;
    }
  }
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
console.log(`Enriched runtime catalogue: ${enriched} provider-routed songs, ${direct} direct-audio songs, ${exactTrackFallbacks} exact track fallbacks, ${singleReleaseFallbacks} one-song release fallbacks, ${unchapteredYoutubeReleaseFallbacks} unchaptered multi-song YouTube fallbacks, ${artistCatalogueFallbacks} artist catalogue references, ${playlistReferenceFallbacks} playlist references, ${missing.length} unresolved.`);
