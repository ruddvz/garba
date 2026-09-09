import { SCHEMA_VERSION } from './constants.js'

function asIso(ms = Date.now()) {
  return new Date(ms).toISOString()
}

function metricRow(dayIst, metric, value, meta, dimensionType = '', dimensionValue = '') {
  if (!Number.isFinite(Number(value))) return null
  return {
    dayIst,
    metric,
    dimensionType,
    dimensionValue,
    value: Number(value),
    precision: meta.precision || 'unknown',
    sampled: meta.sampled ? 1 : 0,
    dataThroughMs: Number.isFinite(Number(meta.dataThroughMs)) ? Number(meta.dataThroughMs) : null,
    schemaVersion: meta.schemaVersion || SCHEMA_VERSION,
    updatedAt: meta.updatedAt || asIso(),
  }
}

export async function replaceDailyMetrics(db, dayIst, metrics, meta = {}) {
  const rows = []
  for (const [metric, value] of Object.entries(metrics)) {
    const row = metricRow(dayIst, metric, value, meta)
    if (row) rows.push(row)
  }
  if (!rows.length) throw new Error('rollup_has_no_metrics')

  const deleteStatement = db.prepare('DELETE FROM daily_metrics WHERE day_ist = ?').bind(dayIst)
  const insert = db.prepare(`INSERT INTO daily_metrics (
    day_ist, metric, dimension_type, dimension_value, value, precision, sampled,
    data_through_ms, schema_version, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const statements = [deleteStatement]
  for (const row of rows) {
    statements.push(insert.bind(
      row.dayIst,
      row.metric,
      row.dimensionType,
      row.dimensionValue,
      row.value,
      row.precision,
      row.sampled,
      row.dataThroughMs,
      row.schemaVersion,
      row.updatedAt,
    ))
  }
  await db.batch(statements)
  return rows.length
}

export async function setRollupRun(db, dayIst, state, options = {}) {
  const now = asIso(options.nowMs)
  const completedAt = state === 'complete' || state === 'failed' ? now : null
  const startedAt = options.startedAt || now
  await db.prepare(`INSERT INTO rollup_runs (
    day_ist, status, started_at, completed_at, error_code, data_through_ms, schema_version, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(day_ist) DO UPDATE SET
    status = excluded.status,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at,
    error_code = excluded.error_code,
    data_through_ms = excluded.data_through_ms,
    schema_version = excluded.schema_version,
    updated_at = excluded.updated_at`).bind(
    dayIst,
    state,
    startedAt,
    completedAt,
    options.errorCode || null,
    Number.isFinite(Number(options.dataThroughMs)) ? Number(options.dataThroughMs) : null,
    options.schemaVersion || SCHEMA_VERSION,
    now,
  ).run()
}

export async function getLifetimeMetrics(db) {
  const result = await db.prepare(`SELECT metric,
    SUM(value) AS value,
    MAX(sampled) AS sampled,
    MAX(data_through_ms) AS data_through_ms
  FROM daily_metrics
  WHERE dimension_type = '' AND dimension_value = ''
    AND metric IN ('sessions','confirmed_play_starts','surface_views','listening_ms')
  GROUP BY metric`).all()
  const data = {}
  let dataThroughMs = null
  for (const row of result.results || []) {
    const sampled = Boolean(row.sampled)
    data[row.metric] = {
      value: Number(row.value || 0),
      sampled,
      precision: sampled ? 'estimated' : 'exact',
    }
    if (Number.isFinite(Number(row.data_through_ms))) {
      dataThroughMs = Math.max(dataThroughMs || 0, Number(row.data_through_ms))
    }
  }
  return { data, dataThroughMs }
}

export async function getDailySeries(db, metric, days = 30) {
  const boundedDays = Math.max(1, Math.min(366, Number(days) || 30))
  const result = await db.prepare(`SELECT day_ist, value, precision, sampled, data_through_ms
    FROM daily_metrics
    WHERE metric = ? AND dimension_type = '' AND dimension_value = ''
    ORDER BY day_ist DESC
    LIMIT ?`).bind(metric, boundedDays).all()
  return (result.results || []).reverse().map((row) => ({
    day: row.day_ist,
    value: Number(row.value),
    precision: row.precision,
    sampled: Boolean(row.sampled),
    dataThroughMs: row.data_through_ms == null ? null : Number(row.data_through_ms),
  }))
}

export async function getRollupHealth(db) {
  return db.prepare(`SELECT day_ist, status, completed_at, error_code, data_through_ms, schema_version, updated_at
    FROM rollup_runs
    ORDER BY day_ist DESC
    LIMIT 14`).all().then((result) => result.results || [])
}
