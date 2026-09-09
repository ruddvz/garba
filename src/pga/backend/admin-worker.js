import {
  audienceSql,
  audienceSummarySql,
  homeWindowSql,
  listeningSql,
  listeningTimeSql,
  listeningTimeWindowSql,
  liveSql,
  precisionFromRows,
  queryAnalytics,
  safeRangeSeconds,
} from './lib/analytics.js'
import { verifyAccessJwt } from './lib/crypto.js'
import { getDailySeries, getLifetimeMetrics, getRollupHealth } from './lib/d1.js'
import { json, withSecurityHeaders } from './lib/http.js'
import { istDateKey, istDayBounds } from './lib/time.js'

const EVENTS_DATASET = 'playgarba_events_v1'
const PRESENCE_DATASET = 'playgarba_presence_v1'

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function dateOrNull(ms) {
  const number = Number(ms)
  return Number.isFinite(number) && number > 0 ? new Date(number).toISOString() : null
}

function metric(value, precision) {
  return {
    value: numberOrZero(value),
    precision: precision.precision,
    sampled: precision.sampled,
  }
}

function source(name, ok, extra = {}) {
  return { name, status: ok ? 'complete' : 'unavailable', ...extra }
}

function envelope({ status, data, sources, dataThroughMs = null, window = null, statusCode = 200 }) {
  return json({
    status,
    generatedAt: new Date().toISOString(),
    dataThrough: dateOrNull(dataThroughMs),
    window,
    sources,
    data,
  }, { status: statusCode })
}

async function analyticsQuery(env, sql, options) {
  return (options.queryAnalytics || queryAnalytics)(env, sql, options.fetchImpl)
}

async function home(env, options = {}) {
  const nowMs = options.nowMs ?? Date.now()
  const dateKey = istDateKey(nowMs)
  const { startUtcMs, endUtcMs } = istDayBounds(dateKey)
  const eventsDataset = env.EVENTS_DATASET_NAME || EVENTS_DATASET
  const presenceDataset = env.PRESENCE_DATASET_NAME || PRESENCE_DATASET

  const [todayResult, listeningResult, lifetimeResult, seriesResult] = await Promise.allSettled([
    analyticsQuery(env, homeWindowSql(eventsDataset, startUtcMs, endUtcMs), options),
    analyticsQuery(env, listeningTimeWindowSql(presenceDataset, startUtcMs, endUtcMs), options),
    env.DB ? getLifetimeMetrics(env.DB) : Promise.reject(new Error('d1_binding_missing')),
    env.DB ? getDailySeries(env.DB, 'sessions', 30) : Promise.reject(new Error('d1_binding_missing')),
  ])

  const todayOk = todayResult.status === 'fulfilled'
  const listeningOk = listeningResult.status === 'fulfilled'
  const lifetimeOk = lifetimeResult.status === 'fulfilled'
  const seriesOk = seriesResult.status === 'fulfilled'
  if (!todayOk && !listeningOk && !lifetimeOk) {
    return envelope({
      status: 'unavailable',
      statusCode: 503,
      data: null,
      sources: [source('analytics-engine', false), source('d1-rollups', false)],
      window: { from: new Date(startUtcMs).toISOString(), to: new Date(endUtcMs).toISOString(), timezone: 'Asia/Kolkata' },
    })
  }

  const todayRows = todayOk ? todayResult.value : []
  const listeningRows = listeningOk ? listeningResult.value : []
  const today = todayRows[0] || {}
  const listening = listeningRows[0] || {}
  const todayPrecision = precisionFromRows(todayRows)
  const listeningPrecision = precisionFromRows(listeningRows)
  const lifetime = lifetimeOk ? lifetimeResult.value : { data: {}, dataThroughMs: null }
  const dataThroughMs = Math.max(
    numberOrZero(today.data_through_ms),
    numberOrZero(listening.data_through_ms),
    numberOrZero(lifetime.dataThroughMs),
  ) || null

  const status = todayOk && listeningOk && lifetimeOk ? 'complete' : 'partial'
  return envelope({
    status,
    dataThroughMs,
    window: { from: new Date(startUtcMs).toISOString(), to: new Date(endUtcMs).toISOString(), timezone: 'Asia/Kolkata' },
    sources: [
      source('analytics-engine', todayOk && listeningOk, {
        sampled: todayPrecision.sampled || listeningPrecision.sampled,
      }),
      source('d1-rollups', lifetimeOk),
    ],
    data: {
      today: todayOk ? {
        uniqueBrowsers: metric(today.unique_browsers, todayPrecision),
        sessions: metric(today.sessions, todayPrecision),
        confirmedPlayStarts: metric(today.confirmed_play_starts, todayPrecision),
        surfaceViews: metric(today.surface_views, todayPrecision),
      } : null,
      listeningTodayMs: listeningOk ? metric(listening.played_ms, listeningPrecision) : null,
      lifetime: lifetimeOk ? lifetime.data : null,
      sessionsDaily: seriesOk ? seriesResult.value : null,
    },
  })
}

async function live(env, options = {}) {
  const dataset = env.PRESENCE_DATASET_NAME || PRESENCE_DATASET
  try {
    const rows = await analyticsQuery(env, liveSql(dataset), options)
    const row = rows[0] || {}
    const precision = precisionFromRows(rows)
    return envelope({
      status: 'complete',
      dataThroughMs: row.data_through_ms,
      sources: [source('analytics-engine', true, { sampled: precision.sampled })],
      data: {
        liveNow: metric(row.live_now, precision),
        listeningNow: metric(row.listening_now, precision),
        browsingNow: metric(row.browsing_now, precision),
        expirySeconds: 120,
      },
    })
  } catch {
    return envelope({ status: 'unavailable', statusCode: 503, data: null, sources: [source('analytics-engine', false)] })
  }
}

async function audience(env, request, options = {}) {
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || '30d'
  safeRangeSeconds(range)
  const dataset = env.EVENTS_DATASET_NAME || EVENTS_DATASET
  try {
    const [summaryRows, breakdownRows] = await Promise.all([
      analyticsQuery(env, audienceSummarySql(dataset, range), options),
      analyticsQuery(env, audienceSql(dataset, range), options),
    ])
    const summary = summaryRows[0] || {}
    const precision = precisionFromRows([...summaryRows, ...breakdownRows])
    const returning = Math.max(0, numberOrZero(summary.unique_browsers) - numberOrZero(summary.new_browser_ids))
    return envelope({
      status: 'complete',
      dataThroughMs: Math.max(
        numberOrZero(summary.data_through_ms),
        ...breakdownRows.map((row) => numberOrZero(row.data_through_ms)),
      ) || null,
      sources: [source('analytics-engine', true, { sampled: precision.sampled })],
      data: {
        range,
        summary: {
          uniqueBrowsers: metric(summary.unique_browsers, precision),
          sessions: metric(summary.sessions, precision),
          newBrowserIds: metric(summary.new_browser_ids, precision),
          returningBrowserIds: metric(returning, precision),
        },
        breakdowns: breakdownRows.map((row) => ({
          client: row.client || 'unknown|unknown|unknown',
          geography: row.geo || 'ZZ|unknown',
          acquisition: row.acquisition || '||',
          displayMode: row.display_mode || 'unknown',
          sessions: metric(row.sessions, precision),
        })),
      },
    })
  } catch (error) {
    const code = error instanceof Error && error.message === 'invalid_range' ? 400 : 503
    return envelope({ status: 'unavailable', statusCode: code, data: null, sources: [source('analytics-engine', false)] })
  }
}

async function listening(env, request, options = {}) {
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || '30d'
  safeRangeSeconds(range)
  const eventsDataset = env.EVENTS_DATASET_NAME || EVENTS_DATASET
  const presenceDataset = env.PRESENCE_DATASET_NAME || PRESENCE_DATASET
  try {
    const [eventRows, timeRows] = await Promise.all([
      analyticsQuery(env, listeningSql(eventsDataset, range), options),
      analyticsQuery(env, listeningTimeSql(presenceDataset, range), options),
    ])
    const precision = precisionFromRows([...eventRows, ...timeRows])
    const dataThroughMs = Math.max(
      ...eventRows.map((row) => numberOrZero(row.data_through_ms)),
      ...timeRows.map((row) => numberOrZero(row.data_through_ms)),
    ) || null
    return envelope({
      status: 'complete',
      dataThroughMs,
      sources: [source('analytics-engine', true, { sampled: precision.sampled })],
      data: {
        range,
        listeningMs: metric(timeRows[0]?.played_ms, precision),
        rows: eventRows.map((row) => ({
          eventName: row.event_name,
          world: row.world || null,
          contentType: row.content_type || null,
          contentId: row.content_id || null,
          errorCode: row.detail_code || null,
          events: metric(row.weighted_events, precision),
        })),
      },
    })
  } catch (error) {
    const code = error instanceof Error && error.message === 'invalid_range' ? 400 : 503
    return envelope({ status: 'unavailable', statusCode: code, data: null, sources: [source('analytics-engine', false)] })
  }
}

async function health(env) {
  if (!env.DB) return envelope({ status: 'unavailable', statusCode: 503, data: null, sources: [source('d1-rollups', false)] })
  try {
    const runs = await getRollupHealth(env.DB)
    const latest = runs[0] || null
    return envelope({
      status: latest?.status === 'complete' ? 'complete' : runs.length ? 'partial' : 'partial',
      dataThroughMs: latest?.data_through_ms,
      sources: [source('d1-rollups', true)],
      data: { rollups: runs },
    })
  } catch {
    return envelope({ status: 'unavailable', statusCode: 503, data: null, sources: [source('d1-rollups', false)] })
  }
}

export async function handleAdmin(request, env, options = {}) {
  if (request.method !== 'GET') return withSecurityHeaders(json({ error: 'method_not_allowed' }, { status: 405 }))
  const auth = await verifyAccessJwt(request, env, options)
  if (!auth.ok) return withSecurityHeaders(json({ error: 'access_denied', reason: auth.reason }, { status: 401 }))

  const path = new URL(request.url).pathname
  let response
  try {
    if (path === '/api/home') response = await home(env, options)
    else if (path === '/api/live') response = await live(env, options)
    else if (path === '/api/audience') response = await audience(env, request, options)
    else if (path === '/api/listening') response = await listening(env, request, options)
    else if (path === '/api/health') response = await health(env)
    else response = json({ error: 'not_found' }, { status: 404 })
  } catch (error) {
    console.error('pga_admin_query_failed', { reason: error instanceof Error ? error.message : 'unknown' })
    response = json({ status: 'unavailable', error: 'query_unavailable' }, { status: 503 })
  }
  return withSecurityHeaders(response)
}

export default {
  fetch(request, env) {
    return handleAdmin(request, env)
  },
}
