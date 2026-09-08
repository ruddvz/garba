const aliasGroups = [
  ['aditya gadhvi', 'aditya gadvi'],
  ['jigardan gadhavi', 'jigardan gadhvi', 'jigrra'],
  ['geeta rabari', 'geetaben rabari', 'geeta ben rabari'],
  ['kirtidan gadhvi', 'kirtidan gadhavi'],
  ['aishwarya majmudar', 'aishwarya majumdar'],
  ['osman mir', 'osman meer'],
  ['falguni pathak', 'falguni paathak'],
];

const aliasMap = new Map();
for (const group of aliasGroups) {
  const canonical = group[0];
  for (const alias of group) aliasMap.set(alias, canonical);
}

export function normaliseArtistName(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(?:dr|shri|smt)\.?\s+/g, '')
    .replace(/[^a-z0-9\u0a80-\u0aff]+/g, ' ')
    .trim();
}

export function canonicalArtistKey(value = '') {
  const normalised = normaliseArtistName(value);
  return aliasMap.get(normalised) || normalised;
}

export function splitArtistCredits(value) {
  if (Array.isArray(value)) return value.flatMap(splitArtistCredits);
  const text = String(value || '').trim();
  if (!text) return [];
  return text
    .replace(/\b(?:feat\.?|ft\.?|featuring|with)\b/gi, ',')
    .replace(/\s+(?:&|and|x|\+)\s+/gi, ',')
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function artistKeys(value) {
  return new Set(splitArtistCredits(value).map(canonicalArtistKey).filter(Boolean));
}

function identityResult({ compatible, status, shared, releaseMatch, songKeys, performerKeys }) {
  return {
    compatible,
    status,
    shared,
    releaseMatch,
    songArtists: [...songKeys],
    performanceArtists: [...performerKeys],
  };
}

export function performanceArtistIdentity(song, set, segment = null) {
  const songKeys = artistKeys(song?.artists || song?.artist);
  const setKeys = artistKeys(set?.artists || set?.artist);
  const segmentKeys = artistKeys(segment?.artists || segment?.artist);
  const performerKeys = segmentKeys.size ? segmentKeys : setKeys;
  const releaseMatch = Boolean(set?.linkedReleaseId && set.linkedReleaseId === song?.releaseId);
  const shared = [...songKeys].filter((key) => performerKeys.has(key));

  // A chapter may exist purely as published browsing/search metadata. It remains
  // useful in the Nonstop catalogue, but it must never become generated exact
  // playback for a canonical song unless a curator explicitly opts it back in.
  if (segment?.routingEligible === false) {
    return identityResult({ compatible: false, status: 'metadata-only', shared, releaseMatch, songKeys, performerKeys });
  }

  if (!songKeys.size || !performerKeys.size) {
    return identityResult({ compatible: false, status: 'unknown', shared, releaseMatch, songKeys, performerKeys });
  }

  // A chapter-specific performer credit is authoritative. Do not allow the wider
  // set roster to rescue a chapter that is explicitly credited to another artist.
  if (segmentKeys.size && !shared.length) {
    return identityResult({ compatible: false, status: 'conflict', shared, releaseMatch, songKeys, performerKeys });
  }

  // Without chapter-level credits, a multi-artist set does not tell us which
  // performer sings a particular title. Only accept when the canonical song
  // itself credits the complete set collaboration; otherwise fail closed.
  if (!segmentKeys.size && setKeys.size > 1) {
    const fullSetCollaboration = [...setKeys].every((key) => songKeys.has(key));
    if (!fullSetCollaboration) {
      return identityResult({ compatible: false, status: 'unknown', shared, releaseMatch, songKeys, performerKeys });
    }
  }

  if (!shared.length) {
    return identityResult({ compatible: false, status: 'conflict', shared, releaseMatch, songKeys, performerKeys });
  }

  const status = songKeys.size === 1 && performerKeys.size === 1
    ? 'same-artist'
    : 'collaboration-compatible';

  return identityResult({ compatible: true, status, shared, releaseMatch, songKeys, performerKeys });
}
