import test from 'node:test'
import assert from 'node:assert/strict'
import { json, corsHeaders, withSecurityHeaders } from '../lib/http.js'

test('corsHeaders sets base CORS headers', () => {
  const headers = corsHeaders(null, 'https://example.com')
  assert.equal(headers.get('vary'), 'Origin')
  assert.equal(headers.get('access-control-allow-methods'), 'POST, OPTIONS')
  assert.equal(headers.get('access-control-allow-headers'), 'content-type')
  assert.equal(headers.get('access-control-max-age'), '600')
  assert.equal(headers.has('access-control-allow-origin'), false)
})

test('corsHeaders sets allow-origin when origin matches allowedOrigin', () => {
  const headers = corsHeaders('https://example.com', 'https://example.com')
  assert.equal(headers.get('access-control-allow-origin'), 'https://example.com')
})

test('corsHeaders does not set allow-origin when origin mismatches', () => {
  const headers = corsHeaders('https://malicious.com', 'https://example.com')
  assert.equal(headers.has('access-control-allow-origin'), false)
})

test('json helper creates a JSON response with nosniff and default no-store cache control', async () => {
  const response = json({ hello: 'world' })
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  const body = await response.json()
  assert.deepEqual(body, { hello: 'world' })
})

test('json helper preserves existing headers including explicit cache-control', () => {
  const response = json({}, { headers: { 'x-custom': 'value', 'cache-control': 'max-age=3600' } })
  assert.equal(response.headers.get('x-custom'), 'value')
  assert.equal(response.headers.get('cache-control'), 'max-age=3600')
})

test('withSecurityHeaders adds strict security and caching headers to an existing response', async () => {
  const baseResponse = new Response('ok', { status: 201, statusText: 'Created', headers: { 'x-custom': 'value' } })
  const secureResponse = withSecurityHeaders(baseResponse)
  assert.equal(secureResponse.status, 201)
  assert.equal(secureResponse.statusText, 'Created')
  assert.equal(secureResponse.headers.get('x-custom'), 'value')
  assert.equal(secureResponse.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(secureResponse.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(secureResponse.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()')
  assert.equal(secureResponse.headers.get('cache-control'), 'no-store')
  assert.equal(await secureResponse.text(), 'ok')
})
