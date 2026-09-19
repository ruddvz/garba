from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one guarded match, found {count}')
    file.write_text(text.replace(old, new, 1))


replace_once(
    'src/catalogue/catalogue.js',
    '''function orderedSongsForRender(songs) {
  const sortMode = currentCatalogueSortMode();
  return orderCatalogueSongs(songs, {
    context: currentSongOrderingContext(),
    mode: sortMode === CATALOGUE_SORT_DEFAULT ? 'popular' : sortMode,
    availabilityGate: true,
    getAvailabilityTier: catalogueAvailabilityTier,
    getChronology: catalogueChronology,
  });
}''',
    '''function orderedSongsForRender(songs) {
  const sortMode = currentCatalogueSortMode();
  if (sortMode === CATALOGUE_SORT_DEFAULT) {
    return fallbackPlayableFirstOrder(songs, {
      context: currentSongOrderingContext(),
      getAvailabilityTier: catalogueAvailabilityTier,
    });
  }
  return orderCatalogueSongs(songs, {
    context: currentSongOrderingContext(),
    mode: sortMode,
    availabilityGate: true,
    getAvailabilityTier: catalogueAvailabilityTier,
    getChronology: catalogueChronology,
  });
}'''
)

replace_once(
    'scripts/lib/validate-catalogue-ordering-integration.mjs',
    "assert.match(catalogue, /getChronology: catalogueChronology/);",
    "assert.match(catalogue, /getChronology: catalogueChronology/);\nassert.match(catalogue, /if \\(sortMode === CATALOGUE_SORT_DEFAULT\\) \\{[\\s\\S]*fallbackPlayableFirstOrder\\(songs, \\{/);"
)
