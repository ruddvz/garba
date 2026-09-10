import test from 'node:test'
import assert from 'node:assert/strict'

import { replaceDailyMetrics, setRollupRun } from '../lib/d1.js'

class FakeStatement {
  constructor(db, sql, args = []) {
    this.db = db
    this.sql = sql
    this.args = args
  }

  bind(...args) {
    return new FakeStatement(this.db, this.sql, args)
  }

  async run() {
    this.db.runs.push({ sql: this.sql, args: this.args })
    return { success: true }
  }
}

class FakeDb {
  constructor() {
    this.batches = []
    this.runs = []
  }

  prepare(sql) {
    return new FakeStatement(this, sql)
  }

  async batch(statements) {
    this.batches.push(statements.map((statement) => ({ sql: statement.sql, args: statement.args })))
    return []
  }
}

const META = {
  precision: 'exact',
  sampled: false,
  dataThroughMs: 0,
  schemaVersion: 'test-schema',
  updatedAt: '2026-09-10T00:00:00.000Z',
}

test('replaceDailyMetrics preserves finite numeric values including zero', async () => {
  const db = new FakeDb()
  const count = await replaceDailyMetrics(
    db,
    '2026-09-10',
    { sessions: 0, listening_ms: 125.5 },
    META,
  )

  assert.equal(count, 2)
  assert.equal(db.batches.length, 1)
  const inserts = db.batches[0].filter(({ sql }) => sql.startsWith('INSERT INTO daily_metrics'))
  assert.deepEqual(inserts.map(({ args }) => args[4]), [0, 125.5])
  assert.deepEqual(inserts.map(({ args }) => args[7]), [0, 0])
})

test('replaceDailyMetrics rejects coercible and non-finite metric values before mutation', async () => {
  const invalidValues = [true, false, '', '12', null, undefined, NaN, Infinity, -Infinity]

  for (const value of invalidValues) {
    const db = new FakeDb()
    await assert.rejects(
      replaceDailyMetrics(db, '2026-09-10', { sessions: 10, listening_ms: value }, META),
      /invalid_metric_value/,
    )
    assert.equal(db.batches.length, 0, `unexpected D1 batch for ${String(value)}`)
    assert.equal(db.runs.length, 0, `unexpected D1 run for ${String(value)}`)
  }
})

test('replaceDailyMetrics accepts absent freshness and finite non-negative numeric freshness', async () => {
  const cases = [
    [{}, null],
    [{ dataThroughMs: null }, null],
    [{ dataThroughMs: 0 }, 0],
    [{ dataThroughMs: 1_789_034_000_000 }, 1_789_034_000_000],
  ]

  for (const [meta, expected] of cases) {
    const db = new FakeDb()
    await replaceDailyMetrics(db, '2026-09-10', { sessions: 1 }, {
      precision: 'exact',
      sampled: false,
      updatedAt: META.updatedAt,
      ...meta,
    })
    const insert = db.batches[0].find(({ sql }) => sql.startsWith('INSERT INTO daily_metrics'))
    assert.equal(insert.args[7], expected)
  }
})

test('replaceDailyMetrics rejects malformed explicit freshness before mutation', async () => {
  const invalidValues = [true, false, '', '0', NaN, Infinity, -Infinity, -1]

  for (const value of invalidValues) {
    const db = new FakeDb()
    await assert.rejects(
      replaceDailyMetrics(db, '2026-09-10', { sessions: 1 }, { ...META, dataThroughMs: value }),
      /invalid_data_through_ms/,
    )
    assert.equal(db.batches.length, 0, `unexpected D1 batch for ${String(value)}`)
  }
})

test('setRollupRun preserves optional and valid numeric freshness', async () => {
  const cases = [
    [{}, null],
    [{ dataThroughMs: null }, null],
    [{ dataThroughMs: 0 }, 0],
    [{ dataThroughMs: 1_789_034_000_000 }, 1_789_034_000_000],
  ]

  for (const [options, expected] of cases) {
    const db = new FakeDb()
    await setRollupRun(db, '2026-09-10', 'complete', {
      nowMs: 0,
      startedAt: '1970-01-01T00:00:00.000Z',
      ...options,
    })
    assert.equal(db.runs.length, 1)
    assert.equal(db.runs[0].args[5], expected)
  }
})

test('setRollupRun rejects malformed explicit freshness before mutation', async () => {
  const invalidValues = [true, false, '', '0', NaN, Infinity, -Infinity, -1]

  for (const value of invalidValues) {
    const db = new FakeDb()
    await assert.rejects(
      setRollupRun(db, '2026-09-10', 'complete', { nowMs: 0, dataThroughMs: value }),
      /invalid_data_through_ms/,
    )
    assert.equal(db.runs.length, 0, `unexpected D1 run for ${String(value)}`)
    assert.equal(db.batches.length, 0, `unexpected D1 batch for ${String(value)}`)
  }
})

test('setRollupRun preserves omitted and valid numeric evaluation clocks', async () => {
  const zeroDb = new FakeDb()
  await setRollupRun(zeroDb, '2026-09-10', 'complete', { nowMs: 0 })
  assert.equal(zeroDb.runs[0].args[3], '1970-01-01T00:00:00.000Z')
  assert.equal(zeroDb.runs[0].args[7], '1970-01-01T00:00:00.000Z')

  const positiveNowMs = 1_789_034_000_000
  const positiveDb = new FakeDb()
  await setRollupRun(positiveDb, '2026-09-10', 'complete', { nowMs: positiveNowMs })
  assert.equal(positiveDb.runs[0].args[7], new Date(positiveNowMs).toISOString())

  const defaultDb = new FakeDb()
  const before = Date.now()
  await setRollupRun(defaultDb, '2026-09-10', 'running')
  const after = Date.now()
  const persistedNow = Date.parse(defaultDb.runs[0].args[7])
  assert.ok(persistedNow >= before && persistedNow <= after)
})

test('setRollupRun rejects malformed explicit evaluation clocks before mutation', async () => {
  const invalidValues = [
    null,
    true,
    false,
    '',
    '0',
    '1789034000000',
    NaN,
    Infinity,
    -Infinity,
    -1,
    8_640_000_000_000_001,
  ]

  for (const value of invalidValues) {
    const db = new FakeDb()
    await assert.rejects(
      setRollupRun(db, '2026-09-10', 'complete', { nowMs: value }),
      /invalid_rollup_time/,
    )
    assert.equal(db.runs.length, 0, `unexpected D1 run for ${String(value)}`)
    assert.equal(db.batches.length, 0, `unexpected D1 batch for ${String(value)}`)
  }
})
