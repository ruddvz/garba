import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const index = read('src/pga/app/index.html')
const client = read('src/pga/app/health.js')
const css = read('src/pga/app/health.css')
const worker = read('src/pga/backend/admin-worker.js')
const collector = read('src/pga/health/collector.js')
const presentation = read('src/pga/health/presentation.js')

for (const token of [
  'id="healthState"',
  'id="healthContent"',
  'id="healthOverallStatus"',
  'id="healthProblems"',
  'id="healthSubsystems"',
  'id="healthAccessibilitySummary"',
  'href="./health.css"',
  'src="./health.js"',
]) {
  assert.ok(index.includes(token), `PGA Health shell is missing ${token}`)
}

for (const status of ['healthy', 'degraded', 'stale', 'unknown', 'failed']) {
  assert.ok(client.includes(`'${status}'`), `Health client must preserve ${status} state`)
  assert.ok(css.includes(`data-status="${status}"`), `Health CSS must distinguish ${status} without relying on copy alone`)
}

for (const subsystem of ['production', 'playback', 'deployment', 'ci', 'catalogue', 'telemetry', 'rollups', 'pwa']) {
  assert.ok(client.includes(`'${subsystem}'`), `Health client is missing canonical subsystem ${subsystem}`)
}

assert.ok(client.includes("fetch('/api/health'"), 'Health client must use only the protected Health endpoint')
assert.ok(client.includes("credentials: 'same-origin'"), 'Health request must stay same-origin')
assert.ok(client.includes("cache: 'no-store'"), 'Health request must opt out of client caching')
assert.ok(client.includes("response.status === 401 || response.status === 403"), 'Health UI must preserve auth-expired state')
assert.ok(client.includes('safeSourceUrl'), 'Health evidence links must be sanitised')
assert.ok(client.includes("url.protocol !== 'https:'"), 'Health evidence links must be HTTPS-only')
assert.equal(client.includes('.innerHTML'), false, 'Health client must not inject evidence with innerHTML')
assert.equal(client.includes('localStorage'), false, 'Health client must not persist private Health evidence')
assert.equal(client.includes('sessionStorage'), false, 'Health client must not persist private Health evidence')

assert.ok(worker.includes("import { collectHealthSnapshot } from '../health/collector.js'"), 'Admin Worker must reuse canonical collector')
assert.ok(worker.includes("import { buildHealthPresentation } from '../health/presentation.js'"), 'Admin Worker must reuse canonical presentation')
assert.ok(worker.includes("else if (path === '/api/health') response = await health(env, options)"), 'Protected routing must wire Health after Access verification')
assert.ok(worker.indexOf('verifyAccessJwt(request, env, options)') < worker.indexOf("path === '/api/health'"), 'Access verification must run before Health routing')
assert.ok(worker.includes('PGA_GITHUB_TOKEN'), 'Health collector may receive the server-side GitHub credential')
assert.equal(client.includes('PGA_GITHUB_TOKEN'), false, 'Server-side GitHub credential must never reach browser code')
assert.ok(worker.includes('HEALTH_FRESHNESS_BUDGETS'), 'Health endpoint must supply explicit freshness budgets')

assert.ok(collector.includes('return composeHealthSnapshot(healthObservations'), 'Collector must still terminate at canonical snapshot composition')
assert.ok(presentation.includes("schemaVersion: PRESENTATION_SCHEMA"), 'Presentation model remains canonical UI boundary')

console.log('PGA Health integration contract: OK')
