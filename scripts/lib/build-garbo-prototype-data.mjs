// Builds the small real-catalogue sample used by the standalone Garbo player prototype.
// Usage: node scripts/lib/build-garbo-prototype-data.mjs
// Output: docs/product/prototypes/garbo/sample.json
//
// The sample is read-only presentation input. It copies canonical fields verbatim and
// never adds tempo, step, taal or credit facts that the catalogue does not hold.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const list = (value, key) => (Array.isArray(value) ? value : value?.[key] || []);
const GENRES = ['traditional', 'dandiya', 'devotional', 'folk', 'sanedo', 'fusion'];
const PER_GENRE = 8;
const GUJARATI = /[઀-૿]/;

const index = await readJson('data/catalogue/index.json');
const genreLabels = new Map((await readJson('data/genres.json')).map((genre) => [genre.id, { id: genre.id, name: genre.name, label: genre.label }]));

const songs = [];
for (const file of index.songChunks) songs.push(...list(await readJson(file), 'songs'));
const releases = new Map();
for (const file of index.releaseChunks) for (const release of list(await readJson(file), 'releases')) releases.set(release.id, release);

// Exact YouTube routes only. Provenance-only rows (Amazon, Spotify, unresolved) are not playable.
const exactRoutes = new Map();
for (const file of index.playbackSources) {
  let data;
  try { data = await readJson(file); } catch { continue; }
  const sources = data?.songSources;
  if (!sources || Array.isArray(sources)) continue;
  for (const [id, source] of Object.entries(sources)) {
    if (source?.provider === 'youtube' && source.videoId && source.playbackRole !== 'provenance-only') exactRoutes.set(id, source.videoId);
  }
}
const isPlayable = (song) => Boolean(song.youtubeId || exactRoutes.has(song.id));

const retired = new Set(index.retiredSongIds || []);
const byId = (a, b) => a.id.localeCompare(b.id);

function releaseView(id) {
  const release = releases.get(id);
  if (!release) return null;
  return {
    id: release.id,
    title: release.displayTitle || release.title,
    script: GUJARATI.test(release.title) ? 'gu' : 'latn',
    year: release.originalReleaseYear ?? null
  };
}

function songView(song) {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    genre: song.genre,
    durationSeconds: Number.isFinite(song.durationSeconds) && song.durationSeconds > 0 ? song.durationSeconds : null,
    release: releaseView(song.releaseId),
    playable: isPlayable(song)
  };
}

const eligible = songs.filter((song) => !retired.has(song.id) && !song.placeholder).sort(byId);
const picked = [];
for (const genre of GENRES) {
  const pool = eligible.filter((song) => song.genre === genre && isPlayable(song));
  picked.push(...pool.slice(0, PER_GENRE).map(songView));
}

// One real Gujarati-titled release whose tracks have no exact route yet, to show the
// Gujarati-first title treatment and the truthful "not playable yet" state.
const gujaratiRelease = [...releases.values()].filter((release) => GUJARATI.test(release.title)).sort(byId)
  .find((release) => eligible.some((song) => song.releaseId === release.id && !isPlayable(song)));
if (gujaratiRelease) {
  const track = eligible.filter((song) => song.releaseId === gujaratiRelease.id && !isPlayable(song)).sort((a, b) => a.trackNumber - b.trackNumber)[0];
  if (track) picked.push(songView(track));
}

// The longest playable title, for the long-title state.
const longest = eligible.filter(isPlayable).sort((a, b) => b.title.length - a.title.length || a.id.localeCompare(b.id))[0];
if (longest && !picked.some((song) => song.id === longest.id)) picked.push(songView(longest));

// Official Nonstop sets with source-published chapters.
const setsIndex = await readJson('data/discovery/sets/index.json');
const sets = [];
for (const chunk of setsIndex.chunks) sets.push(...list(await readJson(path.join('data/discovery/sets', chunk)), 'sets'));
const nonstop = sets
  .filter((set) => set.setType === 'official-nonstop' && set.source?.provider === 'youtube' && set.source.embeddable !== false && Array.isArray(set.segments) && set.segments.length >= 6)
  .sort((a, b) => a.id.localeCompare(b.id))
  .slice(0, 4)
  .map((set) => {
    const last = set.segments[set.segments.length - 1];
    return {
      id: set.id,
      title: set.title,
      artists: set.artists || [],
      year: set.year ?? null,
      durationSeconds: Number.isFinite(last.endSeconds) ? last.endSeconds : null,
      chapters: set.segments.map((segment) => ({ title: segment.title, startSeconds: segment.startSeconds }))
    };
  });

const output = {
  purpose: 'Presentation sample for the standalone Garbo prototype (issue #1649). Not a catalogue source.',
  generatedBy: 'scripts/lib/build-garbo-prototype-data.mjs',
  catalogueVersion: index.version,
  genres: GENRES.map((id) => genreLabels.get(id) || { id, name: id, label: id }),
  songs: picked,
  nonstopSets: nonstop
};

const target = path.join(root, 'docs/product/prototypes/garbo/sample.json');
await writeFile(target, JSON.stringify(output, null, 2) + '\n');
console.log(`✓ wrote ${path.relative(root, target)}: ${picked.length} songs (${picked.filter((song) => song.playable).length} playable), ${nonstop.length} Nonstop sets`);
