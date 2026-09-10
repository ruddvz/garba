import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import process from 'node:process'

if (!globalThis.crypto) globalThis.crypto = webcrypto

import { handleIngest } from '../../src/pga/backend/ingest-worker.js'

const NOW = Date.parse('2026-09-10T04:15:00Z')
const EDGE_IP = '203.0.113.24'

let checks = 0
let failed = false

async function check(name, fn) {
  checks += 1
  try {
    await fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    failed = true
    console.error(`✗ ${name}`)
    console.error(`  ${error instanceof Error ? error.message : String(error)}`)
  }
}

function event(browserId = 'browser-1', eventId = 'event-1') {
  return {
    schema_version: 1,
    event_name: 'session_started',
    event_id: eventId,
    occurred_at: NOW,
    browser_id: browserId,
    session_id: `session-${browserId}`,
    tab_id: `tab-${browserId}`,
    surface: 'player',
    display_mode: 'browser',
    entry_point: 'player',
  }
}

function requestFor(browserId = 'browser-1', { edgeIp = EDGE_IP, eventId = `event-${browserId}` } = {}) {
  const headers = {
    origin: 'https://playgarba.com',
    'content-type': 'application/json',
  }
  if (edgeIp) headers['cf-connecting-ip'] = edgeIp
  return new Request('https://events.playgarba.com/v1/events', {
    method: 'POST',
    headers,
    body: JSON.stringify([event(browserId, eventId)]),
  })
}

function envFixture({ edgeSuccess = true, browserSuccess = true, edgeThrows = false, includeEdgeLimiter = true } = {}) {
  const edgeKeys = []
  const browserKeys = []
  const writes = []
  const env = {
    PGA_HMAC_SECRET: 'test-only-ingest-secret',
    EVENTS: { writeDataPoint(point) { writes.push(point) } },
    PRESENCE: { writeDataPoint(point) { writes.push(point) } },
    BROWSER_RATE_LIMITER: {
      async limit({ key }) {
        browserKeys.push(key)
        return { success: browserSuccess }
      },
    },
  }
  if (includeEdgeLimiter) {
    env.EDGE_RATE_LIMITER = {
      async limit({ key }) {
        edgeKeys.push(key)
        if (edgeThrows) throw new Error('rate limiter unavailable')
        return { success: edgeSuccess }
      },
    }
  }
  return { env, edgeKeys, browserKeys, writes }
}

await check('successful ingestion uses independent browser and pseudonymised edge limiters', async () => {
  const fixture = envFixture()
  const response = await handleIngest(requestFor('browser-a'), fixture.env, { nowMs: NOW })
  assert.equal(response.status, 202)
  assert.deepEqual(fixture.browserKeys, ['browser-a'])
  assert.equal(fixture.edgeKeys.length, 1)
  assert.match(fixture.edgeKeys[0], /^edge:[0-9a-f]{32}$/)
  assert.ok(!fixture.edgeKeys[0].includes(EDGE_IP), 'raw edge IP reached the rate-limit key')
  assert.ok(!JSON.stringify(fixture.writes).includes(EDGE_IP), 'raw edge IP reached analytics storage')
})

await check('rotating browser IDs does not rotate the edge-source flood key', async () => {
  const fixture = envFixture()
  const first = await handleIngest(requestFor('browser-a', { eventId: 'event-a' }), fixture.env, { nowMs: NOW })
  const second = await handleIngest(requestFor('browser-b', { eventId: 'event-b' }), fixture.env, { nowMs: NOW })
  assert.equal(first.status, 202)
  assert.equal(second.status, 202)
  assert.deepEqual(fixture.browserKeys, ['browser-a', 'browser-b'])
  assert.equal(fixture.edgeKeys.length, 2)
  assert.equal(fixture.edgeKeys[0], fixture.edgeKeys[1])
})

await check('different edge sources produce different pseudonymised flood keys', async () => {
  const fixture = envFixture()
  const first = await handleIngest(requestFor('browser-a', { edgeIp: '203.0.113.24', eventId: 'event-a' }), fixture.env, { nowMs: NOW })
  const second = await handleIngest(requestFor('browser-b', { edgeIp: '198.51.100.18', eventId: 'event-b' }), fixture.env, { nowMs: NOW })
  assert.equal(first.status, 202)
  assert.equal(second.status, 202)
  assert.notEqual(fixture.edgeKeys[0], fixture.edgeKeys[1])
})

await check('edge-source flood rejection fails before the browser limiter and writes', async () => {
  const fixture = envFixture({ edgeSuccess: false })
  const response = await handleIngest(requestFor(), fixture.env, { nowMs: NOW })
  assert.equal(response.status, 429)
  assert.equal((await response.json()).error, 'rate_limited')
  assert.equal(fixture.browserKeys.length, 0)
  assert.equal(fixture.writes.length, 0)
})

await check('browser limiter remains an independent primary per-client control', async () => {
  const fixture = envFixture({ browserSuccess: false })
  const response = await handleIngest(requestFor(), fixture.env, { nowMs: NOW })
  assert.equal(response.status, 429)
  assert.equal((await response.json()).error, 'rate_limited')
  assert.equal(fixture.edgeKeys.length, 1)
  assert.equal(fixture.writes.length, 0)
})

await check('missing Cloudflare edge identity fails closed without rate calls or writes', async () => {
  const fixture = envFixture()
  const response = await handleIngest(requestFor('browser-a', { edgeIp: '' }), fixture.env, { nowMs: NOW })
  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, 'edge_identity_missing')
  assert.equal(fixture.edgeKeys.length, 0)
  assert.equal(fixture.browserKeys.length, 0)
  assert.equal(fixture.writes.length, 0)
})

await check('missing edge limiter binding is treated as incomplete ingestion configuration', async () => {
  const fixture = envFixture({ includeEdgeLimiter: false })
  const response = await handleIngest(requestFor(), fixture.env, { nowMs: NOW })
  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, 'ingestion_config_missing')
  assert.equal(fixture.writes.length, 0)
})

await check('rate-limit infrastructure failure fails closed without analytics writes', async () => {
  const fixture = envFixture({ edgeThrows: true })
  const response = await handleIngest(requestFor(), fixture.env, { nowMs: NOW })
  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, 'rate_limit_unavailable')
  assert.equal(fixture.writes.length, 0)
})

if (failed) process.exitCode = 1
else console.log(`PGA ingest abuse validation passed (${checks} checks).`)
