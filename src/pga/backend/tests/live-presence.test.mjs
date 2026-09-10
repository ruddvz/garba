import test from 'node:test'
import assert from 'node:assert/strict'

import {
  liveBreakdownSql,
  liveSql,
  liveTrendSql,
} from '../lib/analytics.js'
import { LIVE_EXPIRY_SECONDS } from '../lib/constants.js'

const SECOND = 1000
const MINUTE = 60 * SECOND
const NOW = Date.parse('2026-09-10T04:00:00.000Z')

function liveRows(rows, nowMs = NOW, expiryMs = LIVE_EXPIRY_SECONDS * SECOND) {
  const latestTabs = new Map()
  for (const row of rows) {
    if (row.internal || row.bot) continue
    if (!Number.isFinite(row.receivedAtMs)) continue
    if (row.receivedAtMs > nowMs || nowMs - row.receivedAtMs >= expiryMs) continue
    const key = `${row.sessionKey}|${row.tabKey}`
    const prior = latestTabs.get(key)
    if (!prior || row.receivedAtMs > prior.receivedAtMs) latestTabs.set(key, row)
  }

  const sessions = new Map()
  for (const row of latestTabs.values()) {
    const prior = sessions.get(row.sessionKey)
    const candidate = {
      sessionKey: row.sessionKey,
      isListening: row.playbackState === 'playing',
      surface: row.surface || '',
      world: row.world || '',
      displayMode: row.displayMode || 'unknown',
      receivedAtMs: row.receivedAtMs,
      sampleInterval: Math.max(1, Number(row.sampleInterval) || 1),
    }
    if (!prior) {
      sessions.set(row.sessionKey, candidate)
      continue
    }

    const isListening = prior.isListening || candidate.isListening
    const contextCandidateWins = candidate.isListening !== prior.isListening
      ? candidate.isListening
      : candidate.receivedAtMs > prior.receivedAtMs
    sessions.set(row.sessionKey, {
      ...(contextCandidateWins ? candidate : prior),
      isListening,
      sampleInterval: Math.max(prior.sampleInterval, candidate.sampleInterval),
      receivedAtMs: Math.max(prior.receivedAtMs, candidate.receivedAtMs),
    })
  }

  let liveNow = 0
  let listeningNow = 0
  let browsingNow = 0
  for (const session of sessions.values()) {
    liveNow += session.sampleInterval
    if (session.isListening) listeningNow += session.sampleInterval
    else browsingNow += session.sampleInterval
  }
  return { liveNow, listeningNow, browsingNow, sessions: [...sessions.values()] }
}

function trendRows(rows, nowMs = NOW, minutes = 30) {
  const boundedMinutes = Math.max(5, Math.min(60, Math.floor(Number(minutes) || 30)))
  const cutoff = nowMs - boundedMinutes * MINUTE
  const latestTabs = new Map()
  for (const row of rows) {
    if (row.internal || row.bot) continue
    if (!Number.isFinite(row.receivedAtMs) || row.receivedAtMs <= cutoff || row.receivedAtMs > nowMs) continue
    const minute = Math.floor(row.receivedAtMs / MINUTE) * MINUTE
    const key = `${minute}|${row.sessionKey}|${row.tabKey}`
    const prior = latestTabs.get(key)
    if (!prior || row.receivedAtMs > prior.receivedAtMs) latestTabs.set(key, { ...row, minute })
  }

  const sessions = new Map()
  for (const row of latestTabs.values()) {
    const key = `${row.minute}|${row.sessionKey}`
    const prior = sessions.get(key)
    const interval = Math.max(1, Number(row.sampleInterval) || 1)
    sessions.set(key, {
      minute: row.minute,
      listening: Boolean(prior?.listening || row.playbackState === 'playing'),
      interval: Math.max(prior?.interval || 1, interval),
    })
  }

  const buckets = new Map()
  for (const row of sessions.values()) {
    const bucket = buckets.get(row.minute) || { minute: row.minute, active: 0, listening: 0, browsing: 0 }
    bucket.active += row.interval
    if (row.listening) bucket.listening += row.interval
    else bucket.browsing += row.interval
    buckets.set(row.minute, bucket)
  }
  return [...buckets.values()].sort((a, b) => a.minute - b.minute)
}

function heartbeat(overrides = {}) {
  return {
    sessionKey: 'session-a',
    tabKey: 'tab-a',
    playbackState: 'none',
    surface: 'player',
    world: '',
    displayMode: 'browser',
    receivedAtMs: NOW - 10 * SECOND,
    sampleInterval: 1,
    internal: false,
    bot: false,
    ...overrides,
  }
}

test('Live SQL collapses tabs before sessions and sample-weights active-session estimates', () => {
  const sql = liveSql('playgarba_presence_v1')
  assert.match(sql, /GROUP BY session_key, tab_key/)
  assert.match(sql, /GROUP BY session_key/)
  assert.match(sql, /MAX\(if\(playback_state = 'playing', 1, 0\)\) AS is_listening/)
  assert.match(sql, /SUM\(sample_interval\) AS live_now/)
  assert.match(sql, /SUM\(CASE WHEN is_listening = 1 THEN sample_interval ELSE 0 END\) AS listening_now/)
  assert.match(sql, /INTERVAL '120' SECOND/)
  assert.match(sql, /double5 = 0 AND double6 = 0/)
  assert.doesNotMatch(sql, /COUNT\(\) AS live_now/)
})

test('A newer browsing sibling tab cannot overwrite a still-live playing tab', () => {
  const result = liveRows([
    heartbeat({ tabKey: 'playing-tab', playbackState: 'playing', world: 'traditional', receivedAtMs: NOW - 40 * SECOND }),
    heartbeat({ tabKey: 'browse-tab', playbackState: 'none', surface: 'explore', receivedAtMs: NOW - 5 * SECOND }),
  ])
  assert.deepEqual(
    { liveNow: result.liveNow, listeningNow: result.listeningNow, browsingNow: result.browsingNow },
    { liveNow: 1, listeningNow: 1, browsingNow: 0 },
  )
  assert.equal(result.sessions[0].world, 'traditional')
  assert.equal(result.sessions[0].surface, 'player')
})

test('Multiple tabs count one shared session and latest state wins within each tab', () => {
  const result = liveRows([
    heartbeat({ tabKey: 'tab-a', playbackState: 'playing', receivedAtMs: NOW - 70 * SECOND }),
    heartbeat({ tabKey: 'tab-a', playbackState: 'paused', receivedAtMs: NOW - 20 * SECOND }),
    heartbeat({ tabKey: 'tab-b', playbackState: 'none', receivedAtMs: NOW - 10 * SECOND }),
  ])
  assert.equal(result.liveNow, 1)
  assert.equal(result.listeningNow, 0)
  assert.equal(result.browsingNow, 1)
})

test('Expired, internal and bot heartbeats do not create ghost live sessions', () => {
  const result = liveRows([
    heartbeat({ sessionKey: 'expired', receivedAtMs: NOW - 120 * SECOND }),
    heartbeat({ sessionKey: 'internal', internal: true }),
    heartbeat({ sessionKey: 'bot', bot: true }),
    heartbeat({ sessionKey: 'real', playbackState: 'playing' }),
  ])
  assert.equal(result.liveNow, 1)
  assert.equal(result.listeningNow, 1)
})

test('If the playing tab expires but a browsing sibling remains fresh, the session becomes browsing', () => {
  const result = liveRows([
    heartbeat({ tabKey: 'old-playing', playbackState: 'playing', receivedAtMs: NOW - 121 * SECOND }),
    heartbeat({ tabKey: 'fresh-browse', playbackState: 'none', receivedAtMs: NOW - 3 * SECOND }),
  ])
  assert.deepEqual(
    { liveNow: result.liveNow, listeningNow: result.listeningNow, browsingNow: result.browsingNow },
    { liveNow: 1, listeningNow: 0, browsingNow: 1 },
  )
})

test('Sampled sessions use the surviving session sample interval instead of raw row count', () => {
  const result = liveRows([
    heartbeat({ sessionKey: 'sampled', tabKey: 'one', playbackState: 'playing', sampleInterval: 8 }),
    heartbeat({ sessionKey: 'sampled', tabKey: 'two', playbackState: 'none', sampleInterval: 8 }),
    heartbeat({ sessionKey: 'exact', tabKey: 'one', playbackState: 'none', sampleInterval: 1 }),
  ])
  assert.equal(result.liveNow, 9)
  assert.equal(result.listeningNow, 8)
  assert.equal(result.browsingNow, 1)
})

test('Live breakdown exposes only coarse product context and weighted aggregate counts', () => {
  const sql = liveBreakdownSql('playgarba_presence_v1')
  assert.match(sql, /surface/)
  assert.match(sql, /world/)
  assert.match(sql, /display_mode/)
  assert.match(sql, /SUM\(sample_interval\) AS sessions/)
  assert.match(sql, /listening_sessions/)
  assert.match(sql, /browsing_sessions/)
  assert.match(sql, /GROUP BY surface, world, display_mode/)
  assert.doesNotMatch(sql, /geo/)
  assert.doesNotMatch(sql, /content_id/)
  assert.doesNotMatch(sql, /browser_key/)
})

test('Thirty-minute trend collapses tabs per shared session within each minute', () => {
  const rows = trendRows([
    heartbeat({ sessionKey: 'one', tabKey: 'a', playbackState: 'playing', receivedAtMs: NOW - 65 * SECOND }),
    heartbeat({ sessionKey: 'one', tabKey: 'b', playbackState: 'none', receivedAtMs: NOW - 55 * SECOND }),
    heartbeat({ sessionKey: 'two', tabKey: 'a', playbackState: 'none', receivedAtMs: NOW - 55 * SECOND }),
  ])
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], {
    minute: Math.floor((NOW - 65 * SECOND) / MINUTE) * MINUTE,
    active: 1,
    listening: 1,
    browsing: 0,
  })
  assert.deepEqual(rows[1], {
    minute: Math.floor((NOW - 55 * SECOND) / MINUTE) * MINUTE,
    active: 2,
    listening: 0,
    browsing: 2,
  })
})

test('Trend SQL is bounded to 5-60 minutes and keeps sample-aware tab/session collapse', () => {
  const normal = liveTrendSql('playgarba_presence_v1', 30)
  assert.match(normal, /INTERVAL '30' MINUTE/)
  assert.match(normal, /GROUP BY minute_bucket, session_key, tab_key/)
  assert.match(normal, /GROUP BY minute_bucket, session_key/)
  assert.match(normal, /SUM\(sample_interval\) AS active_sessions/)
  assert.match(normal, /ORDER BY minute_bucket ASC/)

  assert.match(liveTrendSql('playgarba_presence_v1', 1), /INTERVAL '5' MINUTE/)
  assert.match(liveTrendSql('playgarba_presence_v1', 999), /INTERVAL '60' MINUTE/)
  assert.match(liveTrendSql('playgarba_presence_v1', 'not-a-number'), /INTERVAL '30' MINUTE/)
})

test('Live expiry remains two minutes so a missed 45-second heartbeat can recover without long ghost sessions', () => {
  assert.equal(LIVE_EXPIRY_SECONDS, 120)
})
