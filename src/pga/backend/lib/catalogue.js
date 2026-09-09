const DEFAULT_PUBLIC_ORIGIN = 'https://playgarba.com'
const CACHE_TTL_MS = 5 * 60 * 1000

let cached = null

function cleanOrigin(value) {
  const input = String(value || DEFAULT_PUBLIC_ORIGIN).trim()
  try {
    const url = new URL(input)
    return `${url.protocol}//${url.host}`
  } catch {
    return DEFAULT_PUBLIC_ORIGIN
  }
}

function canonicalReleaseId(release) {
  return String(release?.canonicalReleaseId || release?.id || '').trim() || null
}

function canonicalSongId(song) {
  return String(song?.canonicalSongId || song?.id || '').trim() || null
}

export function buildCatalogueIdentityIndex(songs = [], releases = []) {
  const rawSongs = new Map((Array.isArray(songs) ? songs : []).filter((song) => song?.id).map((song) => [String(song.id), song]))
  const rawReleases = new Map((Array.isArray(releases) ? releases : []).filter((release) => release?.id).map((release) => [String(release.id), release]))
  const song = new Map()
  const release = new Map()

  for (const item of rawReleases.values()) {
    const canonicalId = canonicalReleaseId(item)
    const canonical = rawReleases.get(canonicalId) || item
    const identity = {
      contentType: 'release',
      contentId: canonicalId,
      label: canonical.title || item.title || canonicalId,
      artist: canonical.artist || item.artist || null,
    }
    release.set(String(item.id), identity)
    release.set(canonicalId, identity)
  }

  for (const item of rawSongs.values()) {
    const canonicalId = canonicalSongId(item)
    const canonical = rawSongs.get(canonicalId) || item
    const releaseIdentity = release.get(String(canonical.releaseId || item.releaseId || '')) || null
    const identity = {
      contentType: 'song',
      contentId: canonicalId,
      label: canonical.title || item.title || canonicalId,
      artist: canonical.artist || item.artist || null,
      releaseId: releaseIdentity?.contentId || canonical.releaseId || item.releaseId || null,
      releaseTitle: releaseIdentity?.label || null,
    }
    song.set(String(item.id), identity)
    song.set(canonicalId, identity)
  }

  return { song, release }
}

export function resolveCatalogueIdentity(index, contentType, contentId) {
  if (!contentId) return null
  const type = String(contentType || '').toLowerCase()
  if (type === 'song' || type === 'track') return index?.song?.get(String(contentId)) || null
  if (type === 'release' || type === 'album') return index?.release?.get(String(contentId)) || null
  return null
}

export function enrichListeningRows(rows = [], index) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const identity = resolveCatalogueIdentity(index, row.content_type, row.content_id)
    return {
      ...row,
      canonical_id: identity?.contentId || row.content_id || null,
      content_label: identity?.label || null,
      artist: identity?.artist || null,
      release_title: identity?.releaseTitle || null,
      identity_status: identity ? 'resolved' : (row.content_id ? 'unresolved' : 'not-applicable'),
    }
  })
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, { headers: { accept: 'application/json' }, cache: 'no-store' })
  if (!response.ok) throw new Error(`catalogue_fetch_${response.status}`)
  const value = await response.json()
  if (!Array.isArray(value)) throw new Error('catalogue_payload_invalid')
  return value
}

export async function loadCatalogueIdentityIndex(env = {}, options = {}) {
  const nowMs = options.nowMs ?? Date.now()
  const origin = cleanOrigin(env.PUBLIC_ORIGIN || options.publicOrigin)
  if (cached && cached.origin === origin && cached.expiresAt > nowMs) return cached.index

  const fetchImpl = options.catalogueFetchImpl || options.fetchImpl || fetch
  const [songs, releases] = await Promise.all([
    fetchJson(fetchImpl, `${origin}/data/songs.json`),
    fetchJson(fetchImpl, `${origin}/data/releases.json`),
  ])
  const index = buildCatalogueIdentityIndex(songs, releases)
  cached = { origin, expiresAt: nowMs + (options.cacheTtlMs ?? CACHE_TTL_MS), index }
  return index
}

export function resetCatalogueIdentityCacheForTests() {
  cached = null
}
