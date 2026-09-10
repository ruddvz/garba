import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'

if (!globalThis.crypto) globalThis.crypto = webcrypto

import { handleAdmin } from '../admin-worker.js'
import { resetJwksCacheForTests } from '../lib/crypto.js'

const NOW = Date.parse('2026-09-10T07:30:00Z')
const REVISION = '1234567890abcdef1234567890abcdef12345678'
const TEAM_DOMAIN = 'https://example.cloudflareaccess.com'
const HEALTH_ORIGIN = 'https://pga.playgarba.com'

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

async function accessFixture(path = '/api/health') {
  resetJwksCacheForTests()
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  publicJwk.kid = 'test-key'
  publicJwk.alg = 'RS256'
  const header = base64url(JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iss: TEAM_DOMAIN,
    aud: ['pga-aud'],
    exp: Math.floor(NOW / 1000) + 600,
    iat: Math.floor(NOW / 1000),
    sub: 'founder',
  }))
  const data = new TextEncoder().encode(`${header}.${payload}`)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, data)
  const token = `${header}.${payload}.${Buffer.from(signature).toString('base64url')}`
  return {
    request: new Request(`${HEALTH_ORIGIN}${path}`, { headers: { 'cf-access-jwt-assertion': token } }),
    env: {
      TEAM_DOMAIN,
      POLICY_AUD: 'pga-aud',
      PGA_EXPECTED_REVISION: REVISION,
      PGA_GITHUB_REPOSITORY: 'ruddvz/garba',
      PGA_REQUIRED_CHECKS: 'validate',
      PGA_GITHUB_TOKEN: 'server-only-test-token',
    },
    jwksFetch: async () => Response.json({ keys: [publicJwk] }),
  }
}

function responseAt(url, body = '', { status = 200, headers = {} } = {}) {
  const response = new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    { status, headers: { 'content-type': 'application/json', ...headers } },
  )
  Object.defineProperty(response, 'url', { configurable: true, value: url })
  return response
}

function externalEvidenceFetch({ productionStatus = 200 } = {}) {
  return async (input, init = {}) => {
    const url = String(input)
    if (url === 'https://playgarba.com/') {
      return responseAt(url, '<!doctype html><title>PlayGarba</title>', {
        status: productionStatus,
        headers: { 'content-type': 'text/html' },
      })
    }
    if (url === 'https://playgarba.com/build-info.json') {
      return responseAt(url, {
        generatedAt: new Date(NOW - 60_000).toISOString(),
        deployment: { origin: 'https://playgarba.com' },
        build: { revision: REVISION, workflowRunId: 'run-1' },
        catalogue: { version: 'test-v1', activeSongs: 100, ordinaryListeningSongs: 90 },
        playback: { youtubePlayable: 80, migrationBacklog: 20 },
      })
    }
    if (url.startsWith('https://api.github.com/repos/ruddvz/garba/commits/')) {
      assert.equal(init.headers.authorization, 'Bearer server-only-test-token')
      return responseAt(url, {
        check_runs: [{
          id: 42,
          name: 'validate',
          status: 'completed',
          conclusion: 'success',
          completed_at: new Date(NOW - 90_000).toISOString(),
          details_url: 'https://github.com/ruddvz/garba/actions/runs/42',
        }],
      })
    }
    throw new Error(`unexpected_health_fetch:${url}`)
  }
}

function healthyObservations(overrides = {}) {
  const currentIso = new Date(NOW - 60_000).toISOString()
  return {
    playback: {
      completed: true,
      state: 'success',
      confirmedStart: true,
      controlsResponsive: true,
      contentId: 'song:test',
      checkedAt: NOW - 60_000,
      sourceUrl: 'https://github.com/ruddvz/garba/actions/runs/1',
    },
    catalogue: {
      completed: true,
      state: 'success',
      ok: true,
      errors: 0,
      warnings: 0,
      revision: REVISION,
      checkedAt: NOW - 60_000,
      sourceUrl: 'https://github.com/ruddvz/garba/actions/runs/2',
    },
    telemetry: {
      payload: {
        status: 'complete',
        generatedAt: currentIso,
        dataThrough: currentIso,
        sources: [{ name: 'analytics-engine-live', status: 'complete' }],
        data: {},
      },
      checkedAt: NOW - 60_000,
      sourceUrl: `${HEALTH_ORIGIN}/api/live`,
    },
    rollups: {
      payload: {
        status: 'complete',
        generatedAt: currentIso,
        dataThrough: currentIso,
        sources: [{ name: 'd1-rollups', status: 'complete' }],
        data: { rollups: [{ id: 1, status: 'complete', data_through_ms: NOW - 60_000 }] },
      },
      checkedAt: NOW - 60_000,
      sourceUrl: `${HEALTH_ORIGIN}/api/health`,
    },
    pwa: {
      completed: true,
      ok: true,
      controlled: true,
      state: 'success',
      activeVersion: 'pga-v1',
      expectedVersion: 'pga-v1',
      checkedAt: NOW - 60_000,
      sourceUrl: 'https://github.com/ruddvz/garba/actions/runs/3',
    },
    ...overrides,
  }
}

async function callHealth({ observations = healthyObservations(), productionStatus = 200 } = {}) {
  const fixture = await accessFixture()
  const response = await handleAdmin(fixture.request, fixture.env, {
    nowMs: NOW,
    fetchImpl: fixture.jwksFetch,
    healthFetchImpl: externalEvidenceFetch({ productionStatus }),
    healthObservations: observations,
  })
  return { response, payload: await response.json() }
}

test('protected Health returns the canonical founder presentation without leaking server credentials', async () => {
  const { response, payload } = await callHealth()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(payload.schemaVersion, 'pga-health-presentation/v1')
  assert.equal(payload.status, 'healthy')
  assert.equal(payload.complete, true)
  assert.equal(payload.subsystems.length, 8)
  assert.deepEqual(payload.subsystems.map((row) => row.name), [
    'production', 'playback', 'deployment', 'ci', 'catalogue', 'telemetry', 'rollups', 'pwa',
  ])
  assert.equal(JSON.stringify(payload).includes('server-only-test-token'), false)
})

test('stale operational evidence cannot remain healthy', async () => {
  const oldIso = new Date(NOW - 60 * 60 * 1000).toISOString()
  const observations = healthyObservations({
    telemetry: {
      payload: {
        status: 'complete',
        generatedAt: oldIso,
        dataThrough: oldIso,
        sources: [{ name: 'analytics-engine-live', status: 'complete' }],
        data: {},
      },
      checkedAt: NOW,
      sourceUrl: `${HEALTH_ORIGIN}/api/live`,
    },
  })
  const { payload } = await callHealth({ observations })
  const telemetry = payload.subsystems.find((row) => row.name === 'telemetry')
  assert.equal(telemetry.status, 'stale')
  assert.notEqual(payload.status, 'healthy')
  assert.ok(payload.problems.some((problem) => problem.subsystem === 'telemetry'))
})

test('a failed production probe is shown as a critical failed subsystem, not transport success masquerading as green', async () => {
  const { response, payload } = await callHealth({ productionStatus: 503 })
  assert.equal(response.status, 200)
  assert.equal(payload.status, 'failed')
  assert.equal(payload.subsystems.find((row) => row.name === 'production').status, 'failed')
  assert.equal(payload.problems[0].subsystem, 'production')
})

test('Health remains protected before any operational evidence is collected', async () => {
  let healthFetches = 0
  const response = await handleAdmin(new Request(`${HEALTH_ORIGIN}/api/health`), {
    TEAM_DOMAIN,
    POLICY_AUD: 'pga-aud',
  }, {
    nowMs: NOW,
    healthFetchImpl: async () => {
      healthFetches += 1
      throw new Error('must_not_fetch')
    },
  })
  assert.equal(response.status, 401)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(healthFetches, 0)
})
