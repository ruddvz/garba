const LETTER_NUMBER_MARK_RE = /[\p{L}\p{N}\p{M}]/u;
const LETTER_RE = /\p{L}/u;
const MARK_RE = /\p{M}/u;
const LATIN_RE = /\p{Script=Latin}/u;
const LATIN_TOKEN_RE = /^[\p{Script=Latin}\p{M}]+$/u;

function flattenStrings(value, target = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenStrings(item, target);
    return target;
  }
  if (value === null || value === undefined) return target;
  const text = String(value).trim();
  if (text) target.push(text);
  return target;
}

/**
 * Normalize search text without discarding non-Latin scripts.
 *
 * Gujarati vowel/sign marks are meaningful characters, so punctuation is collapsed
 * while Unicode letters, numbers and combining marks are preserved.
 */
export function normalizeSearchText(value = '') {
  const source = String(value ?? '').normalize('NFKC').toLowerCase();
  let result = '';
  let pendingSpace = false;

  for (const character of source) {
    if (LETTER_NUMBER_MARK_RE.test(character)) {
      if (pendingSpace && result) result += ' ';
      result += character;
      pendingSpace = false;
    } else {
      pendingSpace = true;
    }
  }

  return result.trim();
}

/**
 * Fold diacritics only when a combining mark belongs to a Latin base letter.
 * Non-Latin marks, including Gujarati vowel/sign marks, are retained.
 */
export function foldLatinDiacritics(value = '') {
  const source = String(value ?? '').normalize('NFD');
  let result = '';
  let previousBaseWasLatin = false;

  for (const character of source) {
    if (MARK_RE.test(character)) {
      if (!previousBaseWasLatin) result += character;
      continue;
    }

    result += character;
    previousBaseWasLatin = LETTER_RE.test(character) && LATIN_RE.test(character);
  }

  return result.normalize('NFC');
}

export function normalizeSearchVariants(value = '') {
  const direct = normalizeSearchText(value);
  const latinFolded = normalizeSearchText(foldLatinDiacritics(value));
  return [...new Set([direct, latinFolded].filter(Boolean))];
}

function normalizeValues(value) {
  const variants = [];
  for (const item of flattenStrings(value)) variants.push(...normalizeSearchVariants(item));
  return [...new Set(variants)];
}

function tokensFrom(values) {
  const tokens = new Set();
  for (const value of values) {
    for (const token of value.split(/\s+/u)) {
      if (token) tokens.add(token);
    }
  }
  return [...tokens];
}

/**
 * Build a search-only view of a record. Callers supply reviewed aliases and context
 * terms. No transliteration, translation, availability or provider inference occurs.
 */
export function createSearchDocument(record = {}) {
  const title = normalizeValues(record.title);
  const titleAliases = normalizeValues(record.titleAliases ?? record.aliases);
  const artist = normalizeValues(record.artist);
  const artistAliases = normalizeValues(record.artistAliases);
  const taxonomy = normalizeValues(record.taxonomyTerms ?? record.taxonomy);
  const release = normalizeValues(record.releaseTerms ?? record.release);
  const all = [...new Set([
    ...title,
    ...titleAliases,
    ...artist,
    ...artistAliases,
    ...taxonomy,
    ...release,
  ])];

  return {
    id: String(record.id ?? ''),
    title,
    titleAliases,
    artist,
    artistAliases,
    taxonomy,
    release,
    all,
    tokens: tokensFrom(all),
  };
}

function relation(values, query, weights, labels) {
  let best = null;

  for (const value of values) {
    let candidate = null;
    if (value === query) candidate = { score: weights.exact, matchedBy: labels.exact };
    else if (value.startsWith(query)) candidate = { score: weights.prefix, matchedBy: labels.prefix };
    else if (value.includes(query)) candidate = { score: weights.contains, matchedBy: labels.contains };

    if (candidate && (!best || candidate.score > best.score)) best = candidate;
  }

  return best;
}

function isLatinTypoToken(token) {
  const length = [...token].length;
  return length >= 4 && length <= 24 && LATIN_TOKEN_RE.test(token);
}

function withinOneEdit(left, right) {
  const a = [...left];
  const b = [...right];
  if (Math.abs(a.length - b.length) > 1) return false;

  if (a.length === b.length) {
    let differences = 0;
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index] && ++differences > 1) return false;
    }
    return differences === 1;
  }

  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let shortIndex = 0;
  let longIndex = 0;
  let skipped = 0;

  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1;
      longIndex += 1;
      continue;
    }
    if (++skipped > 1) return false;
    longIndex += 1;
  }

  return true;
}

function termCoverage(document, query) {
  const queryTokens = query.split(/\s+/u).filter(Boolean);
  if (!queryTokens.length) return null;
  let usedTypo = false;

  for (const queryToken of queryTokens) {
    if (document.all.some((candidate) => candidate.includes(queryToken))) continue;

    const typoMatch = isLatinTypoToken(queryToken)
      && document.tokens.some((candidate) => isLatinTypoToken(candidate) && withinOneEdit(queryToken, candidate));

    if (!typoMatch) return null;
    usedTypo = true;
  }

  return { usedTypo };
}

const FIELD_RULES = [
  ['title', { exact: 120, prefix: 100, contains: 84 }, 'title'],
  ['titleAliases', { exact: 108, prefix: 92, contains: 76 }, 'title-alias'],
  ['artist', { exact: 68, prefix: 58, contains: 50 }, 'artist'],
  ['artistAliases', { exact: 64, prefix: 54, contains: 46 }, 'artist-alias'],
  ['taxonomy', { exact: 34, prefix: 30, contains: 26 }, 'taxonomy'],
  ['release', { exact: 22, prefix: 18, contains: 14 }, 'release'],
];

function scoreQueryVariant(document, query) {
  const coverage = termCoverage(document, query);
  if (!coverage) return null;

  let best = {
    score: coverage.usedTypo ? 4 : 8,
    matchedBy: coverage.usedTypo ? 'latin-one-edit' : 'terms',
  };

  for (const [field, weights, label] of FIELD_RULES) {
    const candidate = relation(document[field], query, weights, {
      exact: `${label}-exact`,
      prefix: `${label}-prefix`,
      contains: `${label}-contains`,
    });
    if (candidate && candidate.score > best.score) best = candidate;
  }

  return best;
}

/**
 * Score relevance only. Availability/readiness is intentionally excluded and must be
 * handled by the owning browse/playback contract, never inferred from URLs/providers.
 */
export function scoreSearchRecord(record, query) {
  const document = createSearchDocument(record);
  const variants = normalizeSearchVariants(query);
  if (!variants.length) return null;

  let best = null;
  for (const variant of variants) {
    const candidate = scoreQueryVariant(document, variant);
    if (candidate && (!best || candidate.score > best.score)) best = candidate;
  }

  if (!best) return null;
  return {
    ...best,
    id: document.id,
    normalizedTitle: document.title[0] ?? '',
    normalizedArtist: document.artist[0] ?? '',
  };
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function compareSearchResults(left, right) {
  if (left.score !== right.score) return right.score - left.score;
  return compareText(left.normalizedTitle, right.normalizedTitle)
    || compareText(left.normalizedArtist, right.normalizedArtist)
    || compareText(left.id, right.id);
}

/**
 * Return ranked wrappers around the original records. The input array and records are
 * never sorted or mutated in place.
 */
export function rankSearchRecords(records, query) {
  if (!Array.isArray(records)) return [];

  return records
    .map((record) => {
      const result = scoreSearchRecord(record, query);
      return result ? { record, ...result } : null;
    })
    .filter(Boolean)
    .sort(compareSearchResults);
}
