import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

async function replaceOnce(file, before, after) {
  const fullPath = path.join(root, file);
  const source = await readFile(fullPath, 'utf8');
  if (source.includes(after)) {
    console.log(`Already updated: ${file}`);
    return false;
  }
  if (!source.includes(before)) throw new Error(`Expected marker not found in ${file}`);
  await writeFile(fullPath, source.replace(before, after));
  console.log(`Updated: ${file}`);
  return true;
}

await replaceOnce(
  'app.js',
  "  if (query) songs = songs.filter((song) => `${song.title} ${song.artist}`.toLowerCase().includes(query));",
  `  if (query) songs = songs.filter((song) => [\n    song.title,\n    song.artist,\n    song.genre,\n    song.category,\n    ...(song.styles || []),\n    ...(song.taxonomyStyles || []),\n  ].filter(Boolean).join(' ').toLowerCase().includes(query));`
);

await replaceOnce(
  'app.js',
  "      copy.textContent = 'Type a song or artist name to see matching results.';",
  "      copy.textContent = 'Type a song, artist, genre or style to see matching results.';"
);

await replaceOnce(
  'src/catalogue/catalogue.js',
  "  ...(song.styles || []),\n  release?.title,",
  "  ...(song.styles || []),\n  ...(song.taxonomyStyles || []),\n  release?.title,"
);
