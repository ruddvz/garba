import { LIVE_EXPIRY_SECONDS, RANGE_SECONDS } from './constants.js'
import { hmacPseudonym } from './crypto.js'
function pack(parts) { return parts.map((part) => part || '').join('|') }

export async function normaliseForStorage(event, env, edge, receivedAtMs = Date.now()) {
  const [browserKey, sessionKey, tabKey, searchKey, playbackKey] = await Promise.all([
    hmacPseudonym(env.PGA_HMAC_SECRET, event.browserId, 'browser:'),
    hmacPseudonym(env.PGA_HMAC_SECRET, event.sessionId, 'session:'),
    hmacPseudonym(env.PGA_HMAC_SECRET, event.tabId, 'tab:'),
    hmacPseudonym(env.PGA_HMAC_SECRET, event.searchId, 'search:'),
    hmacPseudonym(env.PGA_HMAC_SECRET, event.playbackId, 'playback:'),
  ])
  const internal = typeof env.INTERNAL_BROWSER_KEYS === 'string'
    ? env.INTERNAL_BROWSER_KEYS.split(',').map((value) => value.trim()).filter(Boolean).includes(browserKey)
    : false
  return {
    ...event, browserKey, sessionKey, tabKey, searchKey, playbackKey, receivedAtMs,
    internal, bot: Boolean(edge.bot),
    geo: pack([edge.country, edge.region]),
    client: pack([edge.device, edge.os, edge.browser]),
    acquisition: pack([event.source, event.medium, event.campaign]),
  }
}
export function eventDataPoint(event) {
  return {
    indexes: [event.browserKey],
    blobs: [
      event.eventName,event.eventId,event.browserKey,event.sessionKey,event.tabKey,event.searchKey,event.playbackKey,
      event.surface,event.displayMode,event.world,event.contentType,event.contentId,event.entryPoint,event.referrerHost,
      event.acquisition,event.geo,event.client,event.buildId,event.errorCode,event.searchTerm,
    ],
    doubles: [event.schemaVersion,event.occurredAtMs,event.receivedAtMs,event.eventValue || 0,event.internal ? 1 : 0,event.bot ? 1 : 0],
  }
}
export function presenceDataPoint(event) {
  return {
    indexes: [event.sessionKey],
    blobs: [
      event.eventId,event.browserKey,event.sessionKey,event.tabKey,event.surface,event.playbackState,event.world,
      event.contentType,event.contentId,event.displayMode,event.geo,event.client,event.buildId,
    ],
    doubles: [event.schemaVersion,event.occurredAtMs,event.receivedAtMs,event.playedMs || 0,event.internal ? 1 : 0,event.bot ? 1 : 0],
  }
}
export async function queryAnalytics(env, sql, fetchImpl = fetch) {
  if (!env.CF_ACCOUNT_ID || !env.ANALYTICS_API_TOKEN) throw new Error('analytics_query_config_missing')
  const response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.ANALYTICS_API_TOKEN}`, 'content-type': 'text/plain; charset=utf-8' },
    body: sql,
  })
  if (!response.ok) throw new Error(`analytics_query_failed:${response.status}`)
  const body = await response.json()
  if (!body || !Array.isArray(body.data)) throw new Error('analytics_query_invalid_response')
  return body.data
}
export function safeRangeSeconds(range) {
  const seconds = RANGE_SECONDS[range]
  if (!seconds) throw new Error('invalid_range')
  return seconds
}
const productionFilter = () => 'double5 = 0 AND double6 = 0'
export function homeWindowSql(dataset, startMs, endMs) {
  return `SELECT
  COUNT(DISTINCT blob3) AS unique_browsers,
  SUM(CASE WHEN blob1 = 'session_started' THEN _sample_interval ELSE 0 END) AS sessions,
  SUM(CASE WHEN blob1 = 'browser_created' THEN _sample_interval ELSE 0 END) AS browser_ids_created,
  SUM(CASE WHEN blob1 = 'playback_started' THEN _sample_interval ELSE 0 END) AS confirmed_play_starts,
  SUM(CASE WHEN blob1 = 'surface_viewed' THEN _sample_interval ELSE 0 END) AS surface_views,
  MAX(double3) AS data_through_ms,
  MAX(_sample_interval) AS max_sample_interval
FROM ${dataset}
WHERE ${productionFilter()} AND double2 >= ${startMs} AND double2 < ${endMs}`
}
export function audienceSummarySql(dataset, range = '7d') {
  const seconds = safeRangeSeconds(range)
  return `SELECT
  COUNT(DISTINCT blob3) AS unique_browsers,
  SUM(CASE WHEN blob1 = 'session_started' THEN _sample_interval ELSE 0 END) AS sessions,
  SUM(CASE WHEN blob1 = 'browser_created' THEN _sample_interval ELSE 0 END) AS new_browser_ids,
  MAX(double3) AS data_through_ms,
  MAX(_sample_interval) AS max_sample_interval
FROM ${dataset}
WHERE ${productionFilter()} AND timestamp > NOW() - INTERVAL '${seconds}' SECOND`
}
export function audienceSql(dataset, range = '7d') {
  const seconds = safeRangeSeconds(range)
  return `SELECT blob17 AS client, blob16 AS geo, blob15 AS acquisition, blob9 AS display_mode,
  SUM(_sample_interval) AS sessions, MAX(double3) AS data_through_ms, MAX(_sample_interval) AS max_sample_interval
FROM ${dataset}
WHERE ${productionFilter()} AND blob1 = 'session_started'
  AND timestamp > NOW() - INTERVAL '${seconds}' SECOND
GROUP BY client, geo, acquisition, display_mode ORDER BY sessions DESC LIMIT 250`
}
export function listeningSql(dataset, range = '7d') {
  const seconds = safeRangeSeconds(range)
  return `SELECT blob1 AS event_name, blob10 AS world, blob11 AS content_type, blob12 AS content_id, blob19 AS detail_code,
  SUM(_sample_interval) AS weighted_events, MAX(double3) AS data_through_ms, MAX(_sample_interval) AS max_sample_interval
FROM ${dataset}
WHERE ${productionFilter()} AND timestamp > NOW() - INTERVAL '${seconds}' SECOND
AND blob1 IN ('play_intent','playback_started','playback_paused','next_requested','previous_requested','playback_unavailable','playback_error','search_submitted','search_zero_results')
GROUP BY event_name, world, content_type, content_id, detail_code ORDER BY weighted_events DESC LIMIT 500`
}
export function liveSql(dataset) {
  return `WITH latest AS (
  SELECT blob3 AS session_key, argMax(blob6, double3) AS playback_state, argMax(blob5, double3) AS surface,
    argMax(blob7, double3) AS world, MAX(double3) AS data_through_ms, MAX(_sample_interval) AS max_sample_interval
  FROM ${dataset}
  WHERE double5 = 0 AND double6 = 0 AND timestamp > NOW() - INTERVAL '${LIVE_EXPIRY_SECONDS}' SECOND
  GROUP BY session_key
)
SELECT COUNT() AS live_now,
  SUM(CASE WHEN playback_state = 'playing' THEN 1 ELSE 0 END) AS listening_now,
  SUM(CASE WHEN playback_state != 'playing' THEN 1 ELSE 0 END) AS browsing_now,
  MAX(data_through_ms) AS data_through_ms,
  MAX(max_sample_interval) AS max_sample_interval
FROM latest`
}
export function listeningTimeWindowSql(dataset, startMs, endMs) {
  return `SELECT SUM(_sample_interval * double4) AS played_ms, MAX(double3) AS data_through_ms,
  MAX(_sample_interval) AS max_sample_interval
FROM ${dataset}
WHERE double5 = 0 AND double6 = 0 AND blob6 = 'playing'
  AND double2 >= ${startMs} AND double2 < ${endMs}`
}
export function listeningTimeSql(dataset, range = '24h') {
  const seconds = safeRangeSeconds(range)
  return `SELECT SUM(_sample_interval * double4) AS played_ms, MAX(double3) AS data_through_ms,
  MAX(_sample_interval) AS max_sample_interval
FROM ${dataset}
WHERE double5 = 0 AND double6 = 0 AND blob6 = 'playing' AND timestamp > NOW() - INTERVAL '${seconds}' SECOND`
}
export function precisionFromRows(rows) {
  const sampled = rows.some((row) => Number(row.max_sample_interval || 1) > 1)
  return { sampled, precision: sampled ? 'estimated' : 'exact' }
}
