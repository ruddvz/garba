from pathlib import Path
import shutil


source_core = Path('src/search/search-core.js')
runtime_core = Path('assets/runtime/search-core.js')
if not source_core.exists():
    raise SystemExit('expected src/search/search-core.js before move')
if runtime_core.exists():
    raise SystemExit('assets/runtime/search-core.js already exists unexpectedly')
runtime_core.parent.mkdir(parents=True, exist_ok=True)
shutil.move(source_core, runtime_core)


test_path = Path('scripts/lib/test-search-core.mjs')
test_source = test_path.read_text()
old_test = '../../src/search/search-core.js'
new_test = '../../assets/runtime/search-core.js'
if test_source.count(old_test) != 1:
    raise SystemExit(f'expected exactly one search-core fixture path, found {test_source.count(old_test)}')
test_path.write_text(test_source.replace(old_test, new_test))


nonstop_path = Path('nonstop-browser.js')
nonstop = nonstop_path.read_text()

old_state = """    startingSetId: null,
  };"""
new_state = """    startingSetId: null,
    searchCore: null,
    searchCorePromise: null,
  };"""
if nonstop.count(old_state) != 1:
    raise SystemExit('unexpected Nonstop state shape')
nonstop = nonstop.replace(old_state, new_state)

anchor = """  function setSearchText(set) {
    return [
      set.title,
      set.artistsText,
      set.series,
      set.volume,
      set.setType,
      ...(Array.isArray(set.categories) ? set.categories : []),
      ...(Array.isArray(set.tags) ? set.tags : []),
      ...(Array.isArray(set.segments) ? set.segments.slice(0, 20).map((segment) => segment.title) : []),
    ].filter(Boolean).join(' ').toLowerCase();
  }
"""
addition = anchor + r'''

  function fallbackNormalize(value = '') {
    return String(value ?? '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
      .trim();
  }

  function fallbackSearchSets(sets, query) {
    const needle = fallbackNormalize(query);
    if (!needle) return [...sets];
    const terms = needle.split(/\s+/u).filter(Boolean);
    return sets.filter((set) => {
      const haystack = fallbackNormalize(setSearchText(set));
      return terms.every((term) => haystack.includes(term));
    });
  }

  function searchRecordForSet(set) {
    return {
      id: set.id,
      title: set.title,
      artist: set.artistsText,
      taxonomyTerms: [
        set.series,
        set.setType,
        ...(Array.isArray(set.categories) ? set.categories : []),
        ...(Array.isArray(set.tags) ? set.tags : []),
        ...(Array.isArray(set.genres) ? set.genres : []),
        ...(Array.isArray(set.styles) ? set.styles : []),
      ].filter(Boolean),
      releaseTerms: [
        set.volume,
        ...(Array.isArray(set.segments) ? set.segments.slice(0, 20).map((segment) => segment.title) : []),
      ].filter(Boolean),
    };
  }

  async function loadSearchCore() {
    if (state.searchCore) return state.searchCore;
    if (!state.searchCorePromise) {
      state.searchCorePromise = import('./assets/runtime/search-core.js')
        .then((module) => {
          if (typeof module.rankSearchRecords !== 'function') throw new Error('Search core is missing rankSearchRecords');
          state.searchCore = module;
          return module;
        })
        .catch((error) => {
          console.warn('Shared Nonstop search core unavailable; using Unicode-safe fallback.', error);
          return null;
        });
    }
    return state.searchCorePromise;
  }

  function searchSets(sets, query) {
    const needle = String(query ?? '').trim();
    if (!needle) return [...sets];
    const rankSearchRecords = state.searchCore?.rankSearchRecords;
    if (typeof rankSearchRecords !== 'function') return fallbackSearchSets(sets, needle);

    const byId = new Map(sets.map((set) => [set.id, set]));
    return rankSearchRecords(sets.map(searchRecordForSet), needle)
      .map(({ record }) => byId.get(record.id))
      .filter(Boolean);
  }
'''
if nonstop.count(anchor) != 1:
    raise SystemExit('unexpected setSearchText block')
nonstop = nonstop.replace(anchor, addition)

old_match = """  function matchesQuery(set, query) {
    const needle = String(query || '').trim().toLowerCase();
    return !needle || setSearchText(set).includes(needle);
  }

"""
if nonstop.count(old_match) != 1:
    raise SystemExit('unexpected matchesQuery block')
nonstop = nonstop.replace(old_match, '')

old_load = """      await loadAllSets();
      renderBrowser();"""
new_load = """      await Promise.all([loadAllSets(), loadSearchCore()]);
      renderBrowser();"""
if nonstop.count(old_load) != 1:
    raise SystemExit('unexpected Nonstop open loading block')
nonstop = nonstop.replace(old_load, new_load)

old_render = """    const searched = sets.filter((set) => matchesQuery(set, state.browserQuery));
    const filtered = sortForView(searched.filter((set) => matchesCategory(set, state.browserCategory)), state.browserCategory);"""
new_render = """    const searched = searchSets(sets, state.browserQuery);
    const categoryFiltered = searched.filter((set) => matchesCategory(set, state.browserCategory));
    const filtered = state.browserQuery.trim()
      ? categoryFiltered
      : sortForView(categoryFiltered, state.browserCategory);"""
if nonstop.count(old_render) != 1:
    raise SystemExit('unexpected Nonstop render search block')
nonstop = nonstop.replace(old_render, new_render)
nonstop_path.write_text(nonstop)


validator_path = Path('scripts/validate-youtube-player-runtime.mjs')
validator = validator_path.read_text()
old_marker = """  'id=\"nonstopBrowserSearch\"',
  'function matchesQuery(set, query)',
  'function trapBrowserFocus(event)',"""
new_marker = """  'id=\"nonstopBrowserSearch\"',
  \"import('./assets/runtime/search-core.js')\",
  'function fallbackNormalize(value',
  'function searchSets(sets, query)',
  'rankSearchRecords(sets.map(searchRecordForSet), needle)',
  'Promise.all([loadAllSets(), loadSearchCore()])',
  'function trapBrowserFocus(event)',"""
if validator.count(old_marker) != 1:
    raise SystemExit('unexpected Nonstop validator marker block')
validator_path.write_text(validator.replace(old_marker, new_marker))
