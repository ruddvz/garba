from pathlib import Path

catalogue_path = Path('src/catalogue/catalogue.js')
validator_path = Path('scripts/lib/validate-explore-detail-refinement.mjs')
catalogue = catalogue_path.read_text()
validator = validator_path.read_text()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


catalogue = replace_once(
    catalogue,
    "function fixedCollection({ id, title, kicker, description, visual, test }) {\n  return { id, title, kicker, description, visual, test };\n}",
    "function artistCreditMatches(creditValue, names) {\n  const credit = normalise(creditValue);\n  if (!credit) return false;\n  const paddedCredit = ` ${credit} `;\n  return names.some((name) => name && paddedCredit.includes(` ${name} `));\n}\n\nfunction trustedTrackNumber(song) {\n  const value = Number(song?.trackNumber);\n  return Number.isInteger(value) && value > 0 ? value : null;\n}\n\nfunction trustedReleaseSequence(songs) {\n  if (!Array.isArray(songs) || !songs.length) return null;\n  const pairs = songs.map((song) => ({ song, trackNumber: trustedTrackNumber(song) }));\n  if (pairs.some(({ trackNumber }) => trackNumber == null)) return null;\n  const unique = new Set(pairs.map(({ trackNumber }) => trackNumber));\n  if (unique.size !== pairs.length) return null;\n  return pairs.sort((a, b) => a.trackNumber - b.trackNumber);\n}\n\nfunction orderedReleaseSongs(songs) {\n  const sequence = trustedReleaseSequence(songs);\n  return sequence ? sequence.map(({ song }) => song) : songs;\n}\n\nfunction fixedCollection({ id, title, kicker, description, visual, test }) {\n  return { id, title, kicker, description, visual, test };\n}",
    'helper insertion',
)

catalogue = replace_once(
    catalogue,
    "      test:(song)=>{\n        const credit = normalise(song.artist);\n        return names.some((name)=>credit.includes(name));\n      },",
    "      test:(song)=>artistCreditMatches(song.artist, names),",
    'artist matching',
)

catalogue = replace_once(
    catalogue,
    "function renderSongs(songs, title='All songs', { limit = SONG_BATCH_SIZE } = {}) {\n  els.songList.replaceChildren();\n  els.songSectionTitle.textContent = title;\n  const visible = songs.slice(0, limit);",
    "function renderSongs(songs, title='All songs', { limit = SONG_BATCH_SIZE } = {}) {\n  els.songList.replaceChildren();\n  els.songSectionTitle.textContent = title;\n  const releaseSequence = state.activeReleaseId ? trustedReleaseSequence(songs) : null;\n  const trackNumberBySongId = releaseSequence\n    ? new Map(releaseSequence.map(({ song, trackNumber }) => [song.id, trackNumber]))\n    : null;\n  const visible = songs.slice(0, limit);",
    'release sequence map',
)

catalogue = replace_once(
    catalogue,
    "    empty.className = 'empty';\n    empty.textContent = 'No songs match this catalogue yet.';\n    els.songList.append(empty);",
    "    empty.className = 'empty';\n    const emptyQuery = state.active?.id === 'search' ? els.search.value.trim() : '';\n    empty.textContent = emptyQuery\n      ? `No songs found for “${emptyQuery}”. Try another artist, song or release.`\n      : 'No songs match this catalogue yet.';\n    els.songList.append(empty);",
    'empty search copy',
)

catalogue = replace_once(
    catalogue,
    "    row.setAttribute('role','listitem');\n    row.dataset.songId = song.id;\n    row.append(songArtwork(song));",
    "    row.setAttribute('role','listitem');\n    row.dataset.songId = song.id;\n    const trackNumber = trackNumberBySongId?.get(song.id);\n    if (trackNumber != null) {\n      const sequence = document.createElement('span');\n      sequence.className = 'song-art fallback song-track-number';\n      sequence.textContent = String(trackNumber).padStart(2, '0');\n      sequence.setAttribute('aria-hidden', 'true');\n      row.dataset.trackNumber = String(trackNumber);\n      row.append(sequence);\n    } else {\n      row.append(songArtwork(song));\n    }",
    'track number rendering',
)

catalogue = replace_once(
    catalogue,
    "  const songs = state.activeSongs.filter((song)=>song.releaseId===resolvedReleaseId);",
    "  const songs = orderedReleaseSongs(state.activeSongs.filter((song)=>song.releaseId===resolvedReleaseId));",
    'release ordering',
)

validator_marker = 'const inlineModules = [...explore.matchAll(/<script type="module">([\\s\\S]*?)<\\/script>/g)].map((match) => match[1]);'
validator_guard = '''for (const marker of [
  'function artistCreditMatches(creditValue, names)',
  'paddedCredit.includes(` ${name} `)',
  'test:(song)=>artistCreditMatches(song.artist, names)',
  'function trustedTrackNumber(song)',
  'Number.isInteger(value) && value > 0',
  'function trustedReleaseSequence(songs)',
  'pairs.some(({ trackNumber }) => trackNumber == null)',
  'unique.size !== pairs.length',
  'function orderedReleaseSongs(songs)',
  "sequence.className = 'song-art fallback song-track-number';",
  "row.dataset.trackNumber = String(trackNumber);",
  'const songs = orderedReleaseSongs(state.activeSongs.filter',
  "const emptyQuery = state.active?.id === 'search' ? els.search.value.trim() : '';",
  '? `No songs found for “${emptyQuery}”. Try another artist, song or release.`',
]) {
  if (!catalogue.includes(marker)) fail(`Explore truthful discovery is missing: ${marker}`);
}

if (catalogue.includes('return names.some((name)=>credit.includes(name));')) {
  fail('Artist Essentials must not use loose substring credit matching');
}
if (catalogue.includes("sequence.textContent = String(index + 1)")) {
  fail('Selected release track numbers must never be fabricated from render position');
}
if (catalogue.includes("row.dataset.trackNumber = String(index + 1)")) {
  fail('Selected release data-track-number must never be fabricated from render position');
}

'''
validator = replace_once(validator, validator_marker, validator_guard + validator_marker, 'validator guard insertion')
validator = replace_once(
    validator,
    "console.log('✓ Explore detail hierarchy, verified release and artist artwork, full artist discovery, clean tracklists, rich metadata, taxonomy browsing, album semantics and keyboard navigation are protected');",
    "console.log('✓ Explore detail hierarchy, verified release and artist artwork, full artist discovery, truthful tracklists, rich metadata, taxonomy browsing, album semantics and keyboard navigation are protected');",
    'validator summary',
)

catalogue_path.write_text(catalogue)
validator_path.write_text(validator)
