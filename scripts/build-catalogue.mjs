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
]);

console.log(
  `Built ${songs.length} songs, ${releases.length} releases, ${freeSources.length} free/access sources.`,
);
