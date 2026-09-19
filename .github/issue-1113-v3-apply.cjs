const fs = require('node:fs');

const SONG_2 = 'data/catalogue/songs/songs-02.json';
const SONG_3 = 'data/catalogue/songs/songs-03.json';
const RELEASES = 'data/catalogue/releases/releases-01.json';
const INDEX = 'data/catalogue/index.json';
const PLAYBACK = 'data/playback-sources-de-taali-exact.json';
const RELEASE_ID = 'de-taali-1999';

function read(path) { return JSON.parse(fs.readFileSync(path, 'utf8')); }
function write(path, value, pretty = false) {
  fs.writeFileSync(path, JSON.stringify(value, null, pretty ? 2 : 0) + (pretty ? '\n' : ''));
}
function assert(ok, message) { if (!ok) throw new Error(message); }

const mapping = new Map([
  ['de-taali-1999-01-pethalpur-ma-gujarati-garba-song', [7, 'Falguni Pathak']],
  ['de-taali-1999-02-aavo-to-ramvane-gujarati-garba-song', [1, 'Falguni Pathak']],
  ['de-taali-1999-03-mathe-matu-mahini-gujarati-garba-song', [4, 'Falguni Pathak']],
  ['de-taali-1999-04-nahi-melure-gujarati-garba-song', [5, 'Falguni Pathak']],
  ['de-taali-1999-05-kaun-halave-limbdi-gujarati-garba-song', [6, 'Falguni Pathak']],
  ['de-taali-1999-06-pani-gayatare-gujarati-garba-song', [8, 'Falguni Pathak']],
  ['de-taali-1999-07-sawaa-man-sonu-gujarati-garba-song', [9, 'Falguni Pathak']],
  ['de-taali-1999-08-hadke-pepdo-gujarati-garba-song', [10, 'Falguni Pathak']],
  ['de-taali-1999-09-sora-chayo-chayo-gayoto-gujarati-garba-song', [11, 'Falguni Pathak']],
  ['de-taali-1999-10-nadi-kinare-naliyeri-gujarati-garba-song', [12, 'Falguni Pathak']],
  ['de-taali-1999-11-he-ji-re-riddhi-de-siddhi-de-gujarati-garba-song', [13, 'Hemant Chauhan']],
  ['de-taali-1999-12-rame-ambe-maa-gujarati-garba-song', [14, 'Falguni Pathak']],
  ['de-taali-1999-13-saathiaa-puravo-dware-gujarati-garba-song', [15, 'Falguni Pathak']],
  ['de-taali-1999-14-chhanu-ne-chhapnu-gujarati-garba-song', [16, 'Falguni Pathak']],
  ['de-taali-1999-15-oonchi-talavdi-ni-kor-gujarati-garba-song', [17, 'Falguni Pathak']],
  ['de-taali-1999-16-morli-to-chali-gujarati-garba-song', [18, 'Falguni Pathak']],
  ['de-taali-1999-17-chhailaji-re-gujarati-garba-song', [19, 'Falguni Pathak']],
  ['de-taali-1999-18-najar-na-jaam-gujarati-garba-song', [20, 'Falguni Pathak']],
  ['de-taali-1999-19-taliyo-na-taale-gujarati-garba-song', [21, 'Falguni Pathak']],
  ['de-taali-1999-20-mari-mahisagar-ne-aare-gujarati-garba-song', [25, 'Falguni Pathak']],
]);

const missing = [
  ['de-taali-1999-02-pankhida-pankhida-gujarati-garba-song', 'Pankhida Pankhida (Gujarati Garba Song)', 2, 167],
  ['de-taali-1999-03-maniyaro-te-gujarati-garba-song', 'Maniyaro Te (Gujarati Garba Song)', 3, 42],
  ['de-taali-1999-22-dham-dhammak-dham-gujarati-garba-song', 'Dham Dhammak Dham (Gujarati Garba Song)', 22, 95],
  ['de-taali-1999-23-engineki-siti-gujarati-garba-song', 'Engineki Siti (Gujarati Garba Song)', 23, 100],
  ['de-taali-1999-24-bichhuda-bichhuda-gujarati-garba-song', 'Bichhuda Bichhuda (Gujarati Garba Song)', 24, 119],
  ['de-taali-1999-26-chhand-ane-doha-gujarati-garba-song', 'Chhand Ane Doha (Gujarati Garba Song)', 26, 82],
];

const songs2 = read(SONG_2);
const songs3 = read(SONG_3);
const original = [...songs2, ...songs3].filter(song => song.releaseId === RELEASE_ID);
assert(original.length === 20, `Expected 20 existing De Taali rows, found ${original.length}`);
assert(original.every(song => mapping.has(song.id)), 'Existing De Taali IDs differ from the accepted 20-row baseline');
assert(new Set(original.map(song => song.id)).size === 20, 'Existing De Taali IDs are not unique');
for (const [id] of missing) assert(!original.some(song => song.id === id), `Missing row already exists: ${id}`);

const canonical = original.map(song => {
  const [trackNumber, artist] = mapping.get(song.id);
  return { ...song, artist, trackNumber, artistPrecision: 'track-level' };
});
for (const [id, title, trackNumber, durationSeconds] of missing) {
  canonical.push({
    id,
    title,
    artist: 'Falguni Pathak',
    genre: 'dandiya',
    category: 'raas-dandiya',
    styles: ['dandiya', '1990s'],
    durationSeconds,
    releaseId: RELEASE_ID,
    trackNumber,
    audioUrl: null,
    placeholder: false,
    sourceStatus: 'verified-metadata',
    audioAvailability: 'not-bundled',
    artistPrecision: 'track-level',
    youtubeId: null,
  });
}
canonical.sort((a, b) => a.trackNumber - b.trackNumber);
assert(canonical.length === 26, 'Canonical De Taali programme must contain 26 rows');
assert(canonical.every((row, i) => row.trackNumber === i + 1), 'Canonical track numbers must be exactly 1..26');
assert(canonical.filter(row => row.artist === 'Hemant Chauhan').length === 1 && canonical[12].artist === 'Hemant Chauhan', 'Track 13 must be the sole Hemant Chauhan row');
assert(canonical.every((row, i) => i === 12 || row.artist === 'Falguni Pathak'), 'Tracks other than 13 must be Falguni Pathak');
assert(missing.every(([id]) => canonical.find(row => row.id === id)?.youtubeId === null), 'New rows must fail closed for YouTube');

const base2 = songs2.filter(song => song.releaseId !== RELEASE_ID);
const base3 = songs3.filter(song => song.releaseId !== RELEASE_ID);
write(SONG_2, [...base2, ...canonical.slice(0, 12)]);
write(SONG_3, [...canonical.slice(12), ...base3]);

const releases = read(RELEASES);
const release = releases.find(item => item.id === RELEASE_ID);
assert(release, 'Missing de-taali-1999 release');
assert(release.songCount === 26, `Expected release songCount 26, got ${release.songCount}`);
assert(release.trackImportComplete === false, 'Expected incomplete De Taali release before import');
release.trackImportComplete = true;
release.description = 'A 26-track 1999 Various Artists Dandia release issued by Sony BMG Music Entertainment (India) Pvt. Ltd., catalogued with Raas/Dandiya and Bollywood/filmi material. The canonical 26-track programme is fully imported with source-backed track performers.';
write(RELEASES, releases);

const index = read(INDEX);
assert(index.songCount === 1706, `Expected canonical songCount 1706, got ${index.songCount}`);
assert(index.version === '0.29.9', `Expected catalogue version 0.29.9, got ${index.version}`);
index.songCount = 1712;
index.version = '0.29.10';
write(INDEX, index);

const playback = read(PLAYBACK);
const sourceIds = Object.keys(playback.songSources || {});
assert(sourceIds.length === 20, `Expected 20 existing De Taali playback sources, found ${sourceIds.length}`);
assert(sourceIds.every(id => mapping.has(id)), 'Playback source IDs differ from the accepted 20-row baseline');
const immutableKeys = ['provider', 'sourceUrl', 'sourceType', 'videoId', 'startSeconds', 'evidenceType', 'releaseId'];
const beforeIdentity = Object.fromEntries(sourceIds.map(id => [id, Object.fromEntries(immutableKeys.map(key => [key, playback.songSources[id][key]]))]));
for (const id of sourceIds) playback.songSources[id].trackNumber = mapping.get(id)[0];
playback.version = '0.2.1';
playback.updated = '2026-09-19';
playback.note = 'Issue #1458 preserves the 20 independently verified De Taali playback routes. Issue #1113 reconciles only their canonical 26-track album positions after importing the six metadata-only missing rows. No provider, URL, video ID, start timestamp, source type or evidence identity is changed, and the six newly imported rows remain fail-closed for playback.';
for (const id of sourceIds) {
  for (const key of immutableKeys) assert(playback.songSources[id][key] === beforeIdentity[id][key], `Playback identity changed for ${id}.${key}`);
}
write(PLAYBACK, playback, true);

console.log('De Taali #1113 guarded transform complete: 20 existing IDs preserved, 6 metadata-only rows added, canonical order 1..26 restored.');
