import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const index = JSON.parse(
  await readFile(resolve(root, "data/catalogue/index.json"), "utf8"),
);

async function merge(paths) {
  const parts = await Promise.all(
    paths.map(async (path) =>
      JSON.parse(await readFile(resolve(root, path), "utf8")),
    ),
  );
  return parts.flat();
}

async function readOptionalJson(path, fallback) {
  try {
    return JSON.parse(await readFile(resolve(root, path), "utf8"));
  } catch {
    return fallback;
  }
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

function youtubeIdFromUrl(url = "") {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.split("/").filter(Boolean)[0] || null;
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

function chooseReleaseSource(release) {
  const sources = Array.isArray(release?.sources) ? release.sources : [];
  const scored = sources.map((source) => {
    const provider = providerFromPlatform(source.platform);
    const url = source.url || "";
    let score = 0;
    if (provider === "spotify") score += 60;
    if (provider === "youtube") score += 55;
    if (provider === "apple-music") score += 50;
    if (provider === "amazon-music") score += 45;
    if (provider === "qobuz") score += 40;
    if (provider === "bandcamp") score += 40;
    if (String(source.kind || "").includes("official")) score += 8;
    if (/\/track\//i.test(url) || /\/song\//i.test(url)) score += 12;
    return { source, provider, score };
  }).filter((entry) => entry.source?.url);
  scored.sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

const songs = await merge(index.songChunks);
const releases = await merge(index.releaseChunks);
const freeSources = await merge(index.freeSourceChunks);

if (songs.length !== index.songCount) {
  throw new Error(`Expected ${index.songCount} songs, got ${songs.length}`);
}
if (releases.length !== index.releaseCount) {
  throw new Error(`Expected ${index.releaseCount} releases, got ${releases.length}`);
}
if (freeSources.length !== index.freeSourceCount) {
  throw new Error(
    `Expected ${index.freeSourceCount} free/access sources, got ${freeSources.length}`,
  );
}

const explicitPlaybackPaths = (Array.isArray(index.playbackSources) ? index.playbackSources : [index.playbackSources])
  .filter(Boolean)
  .filter((path) => path !== index.generatedFiles?.releasePlayback);
const explicitManifests = await Promise.all(
  explicitPlaybackPaths.map((path) => readOptionalJson(path, { songSources: {} })),
);
const explicitSongSources = Object.assign(
  {},
  ...explicitManifests.map((manifest) => manifest?.songSources || {}),
);

const releasesById = new Map(releases.map((release) => [release.id, release]));
const releasePlayback = {};
let releaseFallbackCount = 0;
let explicitPlaybackCount = 0;
let localAudioCount = 0;
let unresolvedCount = 0;

for (const song of songs) {
  if (song.audioUrl) {
    localAudioCount += 1;
    continue;
  }
  if (explicitSongSources[song.id]) {
    explicitPlaybackCount += 1;
    continue;
  }
  const release = releasesById.get(song.releaseId);
  const chosen = chooseReleaseSource(release);
  if (!chosen) {
    unresolvedCount += 1;
    continue;
  }
  const videoId = chosen.provider === "youtube" ? youtubeIdFromUrl(chosen.source.url) : null;
  releasePlayback[song.id] = {
    provider: chosen.provider,
    sourceUrl: chosen.source.url,
    sourceType: "verified-release-source",
    releaseId: release.id,
    releaseTitle: release.title,
    ...(videoId ? { videoId } : {}),
  };
  releaseFallbackCount += 1;
}

const releasePlaybackManifest = {
  version: index.version,
  generated: true,
  note: "Release-level provider fallbacks. Exact track and timestamp mappings in curated manifests take priority.",
  songSources: releasePlayback,
};
const playbackCoverage = {
  version: index.version,
  songCount: songs.length,
  localAudio: localAudioCount,
  explicitProvider: explicitPlaybackCount,
  verifiedReleaseFallback: releaseFallbackCount,
  unresolvedWithoutVerifiedReleaseSource: unresolvedCount,
  interactionFallback: "provider-search",
};

await Promise.all([
  writeFile(
    resolve(root, index.generatedFiles.songs),
    `${JSON.stringify(songs, null, 2)}\n`,
  ),
  writeFile(
    resolve(root, index.generatedFiles.releases),
    `${JSON.stringify(releases, null, 2)}\n`,
  ),
  writeFile(
    resolve(root, index.generatedFiles.freeSources),
    `${JSON.stringify(freeSources, null, 2)}\n`,
  ),
  writeFile(
    resolve(root, index.generatedFiles.releasePlayback),
    `${JSON.stringify(releasePlaybackManifest, null, 2)}\n`,
  ),
  writeFile(
    resolve(root, index.generatedFiles.playbackCoverage),
    `${JSON.stringify(playbackCoverage, null, 2)}\n`,
  ),
]);

console.log(
  `Built ${songs.length} songs, ${releases.length} releases, ${freeSources.length} free/access sources.`,
);
console.log(
  `Playback coverage: ${localAudioCount} local, ${explicitPlaybackCount} explicit provider, ${releaseFallbackCount} verified release fallback, ${unresolvedCount} unresolved release source.`,
);
