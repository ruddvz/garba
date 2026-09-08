import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const index = JSON.parse(await readFile(resolve(root, "data/catalogue/index.json"), "utf8"));

async function merge(paths) {
  const parts = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"))));
  return parts.flat();
}

async function readOptionalJson(path, fallback) {
  try { return JSON.parse(await readFile(resolve(root, path), "utf8")); }
  catch { return fallback; }
}

function providerFromPlatform(platform = "") {
  const value = String(platform).toLowerCase();
  if (value.includes("spotify")) return "spotify";
  if (value.includes("youtube")) return "youtube";
  if (value.includes("apple")) return "apple-music";
  if (value.includes("amazon")) return "amazon-music";
  if (value.includes("qobuz")) return "qobuz";
  if (value.includes("bandcamp")) return "bandcamp";
  if (value.includes("soundcloud")) return "soundcloud";
  return "external";
}

function providerFromSource(source = {}) {
  const rawUrl = String(source.url || "").trim();
  if (rawUrl) {
    try {
      const host = new URL(rawUrl).hostname.toLowerCase();
      if (host === "open.spotify.com" || host.endsWith(".spotify.com")) return "spotify";
      if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")) return "youtube";
      if (host === "music.apple.com" || host.endsWith(".music.apple.com")) return "apple-music";
      if (host.startsWith("music.amazon.") || host.includes(".music.amazon.")) return "amazon-music";
      if (host === "qobuz.com" || host.endsWith(".qobuz.com")) return "qobuz";
      if (host === "bandcamp.com" || host.endsWith(".bandcamp.com")) return "bandcamp";
      if (host === "soundcloud.com" || host.endsWith(".soundcloud.com")) return "soundcloud";
      return "external";
    } catch {
      // Fall back to the platform label only when the URL itself cannot be parsed.
    }
  }
  return providerFromPlatform(source.platform);
}

function sourceScope(provider, rawUrl = "") {
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.toLowerCase();
    if (provider === "spotify") {
      if (pathname.includes("/album/")) return "release";
      if (pathname.includes("/track/")) return "track";
    }
    if (provider === "apple-music") {
      if (pathname.includes("/song/") || url.searchParams.has("i")) return "track";
      if (pathname.includes("/album/")) return "release";
    }
    if (provider === "amazon-music") {
      if (pathname.includes("/tracks/")) return "track";
      if (pathname.includes("/albums/")) return "release";
    }
    if (provider === "youtube") return "media";
    if (/\/albums?\//.test(pathname)) return "release";
  } catch {
    return "unknown";
  }
  return "unknown";
}

function youtubeIdFromUrl(url = "") {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.split("/").filter(Boolean)[0] || null;
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
  } catch { return null; }
  return null;
}

function chooseReleaseSource(release) {
  const sources = Array.isArray(release?.sources) ? release.sources : [];
  const songCount = Number(release?.songCount);
  const isMultiSong = Number.isFinite(songCount) && songCount > 1;
  const isSingleSong = songCount === 1;
  const scored = sources.map((source) => {
    const url = source.url || "";
    let provider = providerFromSource(source);
    const youtubeId = provider === "youtube" ? youtubeIdFromUrl(url) : null;
    if (provider === "youtube" && !youtubeId) provider = "external";
    const scope = sourceScope(provider, url);
    const kind = String(source.kind || "").toLowerCase();
    let score = 0;
    if (provider === "spotify") score += 60;
    if (provider === "youtube") score += 55;
    if (provider === "apple-music") score += 50;
    if (provider === "amazon-music") score += 45;
    if (provider === "qobuz" || provider === "bandcamp") score += 40;
    if (String(source.kind || "").includes("official")) score += 8;

    if (isMultiSong) {
      // A release page is useful for every song on an album. One track URL is not.
      // Prefer release-shaped sources and strongly demote track-shaped references.
      if (scope === "release") score += 45;
      if (scope === "track") score -= 45;
      if (scope === "release" && (kind.includes("album") || kind.includes("catalogue"))) score += 8;
      if (scope === "track" && kind.includes("track")) score -= 15;
    } else if (isSingleSong) {
      if (scope === "track") score += 20;
      if (scope === "release") score += 10;
    } else if (scope === "release") {
      score += 15;
    }

    return { source, provider, scope, score };
  }).filter((entry) => entry.source?.url);
  scored.sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

const normalise = (value = "") => String(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9\u0a80-\u0aff]+/g, " ")
  .trim();

function titleSimilarity(a, b) {
  const aa = new Set(normalise(a).split(/\s+/).filter(Boolean));
  const bb = new Set(normalise(b).split(/\s+/).filter(Boolean));
  if (!aa.size || !bb.size) return 0;
  let shared = 0;
  for (const token of aa) if (bb.has(token)) shared += 1;
  return shared / Math.max(aa.size, bb.size);
}

const setSourceRank = {
  "official-artist-channel": 6,
  "artist-channel": 5,
  "verified-label-channel": 4,
  "label-channel": 4,
  "verified-distributor-channel": 3,
  "official-streaming-catalogue": 3,
  "community-upload": 1,
};

async function loadDiscoverySets() {
  const setsIndexPath = index.discovery?.setsIndex;
  if (!setsIndexPath) return [];
  const setsIndex = await readOptionalJson(setsIndexPath, { chunks: [] });
  const base = dirname(setsIndexPath);
  const chunks = await Promise.all((setsIndex.chunks || []).map((chunk) => readOptionalJson(`${base}/${chunk}`, { sets: [] })));
  return chunks.flatMap((chunk) => Array.isArray(chunk?.sets) ? chunk.sets : []);
}

function makePerformanceResolver(sets) {
  const candidates = [];
  for (const set of sets) {
    const source = set?.source || {};
    if (source.provider !== "youtube" || !source.videoId || !Array.isArray(set.segments)) continue;
    const sourceType = set.officiality || set.setType || "youtube";
    const rank = setSourceRank[sourceType] || 0;
    if (rank <= 1) continue;
    for (const segment of set.segments) {
      const startSeconds = Number(segment?.startSeconds);
      const segmentTitle = normalise(segment?.title);
      if (!segmentTitle || !Number.isFinite(startSeconds)) continue;
      candidates.push({ set, source, sourceType, rank, segment, startSeconds, segmentTitle });
    }
  }

  return (song) => {
    if (!song?.title) return null;
    const songTitle = normalise(song.title);
    const songTokens = songTitle.split(/\s+/).filter(Boolean);
    const matches = [];
    for (const candidate of candidates) {
      const exact = songTitle === candidate.segmentTitle;
      const similarity = exact ? 1 : titleSimilarity(song.title, candidate.segment.title);
      const threshold = songTokens.length <= 1 ? 1 : 0.9;
      if (similarity < threshold) continue;
      // When the verified chapter belongs to the selected song's own release,
      // prefer it over a higher-ranked but different performance with the same
      // traditional title. This keeps album-jukebox timestamps faithful to the
      // catalogue recording while retaining the normal quality order elsewhere.
      const releaseMatch = candidate.set.linkedReleaseId && candidate.set.linkedReleaseId === song.releaseId;
      matches.push({
        candidate,
        similarity,
        score: (releaseMatch ? 1000 : 0) + similarity * 100 + candidate.rank * 10 + (exact ? 10 : 0),
      });
    }
    matches.sort((a, b) => b.score - a.score);
    const best = matches[0];
    if (!best) return null;
    const { candidate, similarity } = best;
    return {
      provider: "youtube",
      videoId: candidate.source.videoId,
      sourceUrl: candidate.source.url || `https://www.youtube.com/watch?v=${candidate.source.videoId}`,
      sourceType: "verified-performance-chapter",
      startSeconds: candidate.startSeconds,
      performanceSetId: candidate.set.id,
      performanceTitle: candidate.set.title,
      performanceOfficiality: candidate.sourceType,
      segmentTitle: candidate.segment.title,
      matchScore: Number(similarity.toFixed(3)),
      note: "Verified live/nonstop performance version. This may differ from the catalogue studio recording.",
    };
  };
}

const songs = await merge(index.songChunks);
const releases = await merge(index.releaseChunks);
const freeSources = await merge(index.freeSourceChunks);
const discoverySets = await loadDiscoverySets();
const findPerformance = makePerformanceResolver(discoverySets);

if (songs.length !== index.songCount) throw new Error(`Expected ${index.songCount} songs, got ${songs.length}`);
if (releases.length !== index.releaseCount) throw new Error(`Expected ${index.releaseCount} releases, got ${releases.length}`);
if (freeSources.length !== index.freeSourceCount) throw new Error(`Expected ${index.freeSourceCount} free/access sources, got ${freeSources.length}`);

const explicitPlaybackPaths = (Array.isArray(index.playbackSources) ? index.playbackSources : [index.playbackSources])
  .filter(Boolean)
  .filter((path) => path !== index.generatedFiles?.releasePlayback);
const explicitManifests = await Promise.all(explicitPlaybackPaths.map((path) => readOptionalJson(path, { songSources: {} })));
const explicitSongSources = Object.assign({}, ...explicitManifests.map((manifest) => manifest?.songSources || {}));

const releasesById = new Map(releases.map((release) => [release.id, release]));
const generatedPlayback = {};
let releaseFallbackCount = 0;
let releaseTrackReferenceCount = 0;
let performanceChapterCount = 0;
let explicitPlaybackCount = 0;
let localAudioCount = 0;
let unresolvedCount = 0;

for (const song of songs) {
  if (song.audioUrl) { localAudioCount += 1; continue; }
  if (explicitSongSources[song.id]) { explicitPlaybackCount += 1; continue; }

  const performance = findPerformance(song);
  if (performance) {
    generatedPlayback[song.id] = performance;
    performanceChapterCount += 1;
    continue;
  }

  const release = releasesById.get(song.releaseId);
  const chosen = chooseReleaseSource(release);
  if (!chosen) { unresolvedCount += 1; continue; }
  const videoId = chosen.provider === "youtube" ? youtubeIdFromUrl(chosen.source.url) : null;
  const isMultiSong = Number(release?.songCount) > 1;
  const isTrackReference = isMultiSong && chosen.scope === "track";
  generatedPlayback[song.id] = {
    provider: chosen.provider,
    sourceUrl: chosen.source.url,
    sourceType: isTrackReference ? "verified-release-track-reference" : "verified-release-source",
    releaseId: release.id,
    releaseTitle: release.title,
    releaseSourceScope: chosen.scope,
    ...(videoId ? { videoId } : {}),
  };
  if (isTrackReference) releaseTrackReferenceCount += 1;
  else releaseFallbackCount += 1;
}

const releasePlaybackManifest = {
  version: index.version,
  generated: true,
  note: "Generated routes. Verified chaptered YouTube performances are preferred before release-level provider fallbacks. A track-shaped URL inherited from a multi-song release is retained only as a labelled release reference and is never exact-song playback. Curated song mappings override this file.",
  songSources: generatedPlayback,
};
const playbackCoverage = {
  version: index.version,
  songCount: songs.length,
  localAudio: localAudioCount,
  explicitProvider: explicitPlaybackCount,
  verifiedPerformanceChapter: performanceChapterCount,
  verifiedReleaseFallback: releaseFallbackCount,
  verifiedReleaseTrackReference: releaseTrackReferenceCount,
  unresolvedWithoutVerifiedReleaseSource: unresolvedCount,
  interactionFallback: "provider-search",
};

await Promise.all([
  writeFile(resolve(root, index.generatedFiles.songs), `${JSON.stringify(songs, null, 2)}\n`),
  writeFile(resolve(root, index.generatedFiles.releases), `${JSON.stringify(releases, null, 2)}\n`),
  writeFile(resolve(root, index.generatedFiles.freeSources), `${JSON.stringify(freeSources, null, 2)}\n`),
  writeFile(resolve(root, index.generatedFiles.releasePlayback), `${JSON.stringify(releasePlaybackManifest, null, 2)}\n`),
  writeFile(resolve(root, index.generatedFiles.playbackCoverage), `${JSON.stringify(playbackCoverage, null, 2)}\n`),
]);

console.log(`Built ${songs.length} songs, ${releases.length} releases, ${freeSources.length} free/access sources.`);
console.log(`Playback coverage: ${localAudioCount} local, ${explicitPlaybackCount} explicit provider, ${performanceChapterCount} verified performance chapter, ${releaseFallbackCount} verified release fallback, ${releaseTrackReferenceCount} release track reference, ${unresolvedCount} unresolved release source.`);
