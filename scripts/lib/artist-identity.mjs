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

export function performanceArtistIdentity(song, set, segment = null) {
  const songKeys = artistKeys(song?.artists || song?.artist);
  const performerKeys = new Set([
    ...artistKeys(set?.artists || set?.artist),
    ...artistKeys(segment?.artists || segment?.artist),
  ]);

  const shared = [...songKeys].filter((key) => performerKeys.has(key));
  const releaseMatch = Boolean(set?.linkedReleaseId && set.linkedReleaseId === song?.releaseId);

  if (!songKeys.size || !performerKeys.size) {
    return {
      compatible: false,
      status: 'unknown',
      shared,
      releaseMatch,
      songArtists: [...songKeys],
      performanceArtists: [...performerKeys],
    };
  }

  if (!shared.length) {
    return {
      compatible: false,
      status: 'conflict',
      shared,
      releaseMatch,
      songArtists: [...songKeys],
      performanceArtists: [...performerKeys],
    };
  }

  const status = songKeys.size === 1 && performerKeys.size === 1
    ? 'same-artist'
    : 'collaboration-compatible';

  return {
    compatible: true,
    status,
    shared,
    releaseMatch,
    songArtists: [...songKeys],
    performanceArtists: [...performerKeys],
  };
}
