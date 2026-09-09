import { SCHEMA_VERSION } from './lib/constants.js'
import {
  homeWindowSql,
  listeningTimeWindowSql,
  precisionFromRows,
  queryAnalytics,
} from './lib/analytics.js'
import { replaceDailyMetrics, setRollupRun } from './lib/d1.js'
import { istDayBounds, previousClosedIstDate, shiftIstDate } from './lib/time.js'

const DEFAULT_EVENTS_DATASET = 'playgarba_events_v1'
const DEFAULT_PRESENCE_DATASET = 'playgarba_presence_v1'
const REPAIR_DAYS = 7

function first(rows) {
  return rows[0] || {}
}

function finiteOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export async function rollupDay(env, dayIst, options = {}) {
  if (!env.DB) throw new Error('d1_binding_missing')
  const startedAt = new Date(options.nowMs ?? Date.now()).toISOString()
  await setRollupRun(env.DB, dayIst, 'running', { startedAt, nowMs: options.nowMs })

  const { startUtcMs, endUtcMs } = istDayBounds(dayIst)
  const eventsDataset = env.EVENTS_DATASET_NAME || DEFAULT_EVENTS_DATASET
  const presenceDataset = env.PRESENCE_DATASET_NAME || DEFAULT_PRESENCE_DATASET
  const query = options.queryAnalytics || queryAnalytics

  try {
    const [eventRows, listeningRows] = await Promise.all([
      query(env, homeWindowSql(eventsDataset, startUtcMs, endUtcMs), options.fetchImpl),
      query(env, listeningTimeWindowSql(presenceDataset, startUtcMs, endUtcMs), options.fetchImpl),
    ])
    const event = first(eventRows)
    const listening = first(listeningRows)
    const precision = precisionFromRows([...eventRows, ...listeningRows])
    const dataThroughMs = Math.max(
      finiteOrZero(event.data_through_ms),
      finiteOrZero(listening.data_through_ms),
    ) || null

    const metrics = {
      sessions: finiteOrZero(event.sessions),
      confirmed_play_starts: finiteOrZero(event.confirmed_play_starts),
      surface_views: finiteOrZero(event.surface_views),
      listening_ms: finiteOrZero(listening.played_ms),
      unique_browsers_daily: finiteOrZero(event.unique_browsers),
      browser_ids_created: finiteOrZero(event.browser_ids_created),
    }

    await replaceDailyMetrics(env.DB, dayIst, metrics, {
      ...precision,
      dataThroughMs,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date(options.nowMs ?? Date.now()).toISOString(),
    })
    await setRollupRun(env.DB, dayIst, 'complete', {
      startedAt,
      nowMs: options.nowMs,
      dataThroughMs,
      schemaVersion: SCHEMA_VERSION,
    })
    return { dayIst, status: 'complete', metrics, ...precision, dataThroughMs }
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.slice(0, 120) : 'rollup_failed'
    await setRollupRun(env.DB, dayIst, 'failed', {
      startedAt,
      nowMs: options.nowMs,
      errorCode,
      schemaVersion: SCHEMA_VERSION,
    })
    throw error
  }
}

export async function runRepairWindow(env, options = {}) {
  const nowMs = options.nowMs ?? Date.now()
  const latestClosed = previousClosedIstDate(nowMs)
  const results = []
  const failures = []

  for (let offset = REPAIR_DAYS - 1; offset >= 0; offset -= 1) {
    const dayIst = shiftIstDate(latestClosed, -offset)
    try {
      results.push(await rollupDay(env, dayIst, { ...options, nowMs }))
    } catch (error) {
      failures.push({
        dayIst,
        error: error instanceof Error ? error.message : 'rollup_failed',
      })
    }
  }

  if (failures.length) {
    const error = new Error(`rollup_repair_failed:${failures.length}`)
    error.failures = failures
    throw error
  }
  return results
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runRepairWindow(env, { nowMs: controller.scheduledTime }))
  },
}
