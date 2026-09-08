import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const index = await readJson('data/catalogue/index.json');
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };
const isHttps = (value) => typeof value === 'string' && /^https:\/\//.test(value);
const flatten = async (files = []) => (await Promise.all(files.map(readJson))).flatMap((value) => Array.isArray(value) ? value : []);

function youtubeIdFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com')) return url.searchParams.get('v');
  } catch {
    return null;
  }
  return null;
}

function countById(rows = []) {
  const counts = new Map();
  for (const row of rows) {
    const id = String(row?.id || '').trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

const sourceSongs = await flatten(index.songChunks);
const sourceReleases = await flatten(index.releaseChunks);
const retiredSongList = Array.isArray(index.retiredSongIds) ? index.retiredSongIds : [];
const retiredReleaseList = Array.isArray(index.retiredReleaseIds) ? index.retiredReleaseIds : [];
const retiredSongIds = new Set(retiredSongList);
const retiredReleaseIds = new Set(retiredReleaseList);

if (retiredSongIds.size !== retiredSongList.length) fail('Catalogue manifest contains duplicate retiredSongIds');
if (retiredReleaseIds.size !== retiredReleaseList.length) fail('Catalogue manifest contains duplicate retiredReleaseIds');

const sourceSongCounts = countById(sourceSongs);
const sourceReleaseCounts = countById(sourceReleases);
for (const id of retiredSongIds) {
  if (sourceSongCounts.get(id) !== 1) fail(`Retired song ${id} must exist exactly once in source shards`);
}
for (const id of retiredReleaseIds) {
  if (sourceReleaseCounts.get(id) !== 1) fail(`Retired release ${id} must exist exactly once in source shards`);
}

const songs = sourceSongs.filter((song) => !retiredSongIds.has(song.id));
const releases = sourceReleases.filter((release) => !retiredReleaseIds.has(release.id));
const songIds = new Set(songs.map((song) => song.id));
const songsById = new Map(songs.map((song) => [song.id, song]));
const releaseIds = new Set(releases.map((release) => release.id));

for (const song of sourceSongs) {
  if (retiredSongIds.has(song.id) && !retiredReleaseIds.has(song.releaseId)) {
    fail(`Retired song ${song.id} must belong to an explicitly retired release`);
  }
}
for (const song of songs) {
  if (retiredReleaseIds.has(song.releaseId)) fail(`Active song ${song.id} references retired release ${song.releaseId}`);
}

if (songs.length !== index.songCount) fail(`Catalogue index expects ${index.songCount} canonical songs, found ${songs.length}`);
if (releases.length !== index.releaseCount) fail(`Catalogue index expects ${index.releaseCount} canonical releases, found ${releases.length}`);

const playbackFiles = Array.isArray(index.playbackSources) ? index.playbackSources : [index.playbackSources].filter(Boolean);
for (const file of playbackFiles) {
  const map = await readJson(file);
  for (const [songId, source] of Object.entries(map.songSources || {})) {
    if (!songIds.has(songId)) fail(`${file} references unknown or retired song ${songId}`);
    if (!source.provider) fail(`${file}:${songId} missing provider`);
    if (source.sourceUrl && !isHttps(source.sourceUrl)) fail(`${file}:${songId} has non-HTTPS sourceUrl`);
    if (source.provider === 'youtube') {
      if (!source.videoId) fail(`${file}:${songId} YouTube source missing videoId`);
      const urlVideoId = source.sourceUrl ? youtubeIdFromUrl(source.sourceUrl) : null;
      if (source.sourceUrl && !urlVideoId) fail(`${file}:${songId} YouTube sourceUrl is not a watch URL`);
      if (urlVideoId && source.videoId && urlVideoId !== source.videoId) fail(`${file}:${songId} YouTube videoId does not match sourceUrl`);
    }
    if (source.startSeconds != null && (!Number.isInteger(source.startSeconds) || source.startSeconds < 0)) {
      fail(`${file}:${songId} has invalid startSeconds`);
    }
    if (source.releaseId && !releaseIds.has(source.releaseId)) fail(`${file}:${songId} references unknown or retired release ${source.releaseId}`);
    if (source.releaseId && songsById.get(songId)?.releaseId !== source.releaseId) {
      fail(`${file}:${songId} route release ${source.releaseId} does not match the song release`);
    }
  }
}

const discovery = index.discovery || {};
const artistFiles = discovery.artists || [];
const recommendationFiles = discovery.recommendations || [];
const artistIds = new Set();
for (const file of artistFiles) {
  const data = await readJson(file);
  for (const artist of data.artists || []) {
    if (!artist.id || !artist.name) fail(`${file} has artist without id/name`);
    if (artistIds.has(artist.id)) fail(`Duplicate discovery artist id: ${artist.id}`);
    artistIds.add(artist.id);
    for (const url of artist.sources || []) if (!isHttps(url)) fail(`${file}:${artist.id} has invalid source URL`);
  }
}

const recommendationIds = new Set();
for (const file of recommendationFiles) {
  const recommendations = await readJson(file);
  for (const recommendation of recommendations) {
    if (!recommendation.id || !recommendation.title) fail(`${file} has recommendation without id/title`);
    if (recommendationIds.has(recommendation.id)) fail(`Duplicate recommendation id: ${recommendation.id}`);
    recommendationIds.add(recommendation.id);
    if (!Array.isArray(recommendation.sourceUrls) || recommendation.sourceUrls.length === 0) fail(`${recommendation.id} has no source URLs`);
    for (const url of recommendation.sourceUrls || []) if (!isHttps(url)) fail(`${recommendation.id} has invalid source URL`);
  }
}

let setCount = 0;
let chapterCount = 0;
if (discovery.setsIndex) {
  const setIndex = await readJson(discovery.setsIndex);
  const setIds = new Set();
  for (const chunkName of setIndex.chunks || []) {
    const file = path.posix.join(path.posix.dirname(discovery.setsIndex), chunkName);
    const data = await readJson(file);
    for (const set of data.sets || []) {
      setCount += 1;
      if (!set.id || !set.title) fail(`${file} has set without id/title`);
      if (setIds.has(set.id)) fail(`Duplicate live/nonstop set id: ${set.id}`);
      setIds.add(set.id);
      if (!set.source?.provider || !isHttps(set.source?.url)) fail(`${set.id} missing valid provider/source URL`);
      if (set.source.provider === 'youtube' && !set.source.videoId) fail(`${set.id} missing YouTube videoId`);
      if (set.linkedReleaseId && !releaseIds.has(set.linkedReleaseId)) fail(`${set.id} links unknown or retired release ${set.linkedReleaseId}`);
      let previousStart = -1;
      for (const segment of set.segments || []) {
        chapterCount += 1;
        if (!segment.title) fail(`${set.id} has untitled segment`);
        if (!Number.isFinite(segment.startSeconds) || segment.startSeconds < 0) fail(`${set.id}:${segment.title} has invalid startSeconds`);
        if (segment.startSeconds < previousStart) fail(`${set.id} segment order is not chronological at ${segment.title}`);
        if (segment.endSeconds != null && (!Number.isFinite(segment.endSeconds) || segment.endSeconds <= segment.startSeconds)) fail(`${set.id}:${segment.title} has invalid endSeconds`);
        previousStart = segment.startSeconds;
      }
    }
  }
}

if (failed) process.exit(1);
console.log(`✓ canonical discovery catalogue: ${songs.length} songs, ${releases.length} releases, ${retiredSongIds.size} retired songs, ${retiredReleaseIds.size} retired releases`);
console.log(`✓ discovery artists: ${artistIds.size}`);
console.log(`✓ recommendation signals: ${recommendationIds.size}`);
console.log(`✓ live/nonstop sets: ${setCount}`);
console.log(`✓ timestamped set chapters: ${chapterCount}`);
console.log(`✓ playback source maps: ${playbackFiles.length}`);
