import test from 'node:test'
import assert from 'node:assert/strict'

import { withSecurityHeaders } from '../lib/http.js'

test('withSecurityHeaders adds required security headers', () => {
  const originalResponse = new Response('ok', { status: 200, statusText: 'OK' })
  const newResponse = withSecurityHeaders(originalResponse)

  assert.equal(newResponse.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(newResponse.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(newResponse.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()')
  assert.equal(newResponse.headers.get('cache-control'), 'no-store')
})

test('withSecurityHeaders preserves existing headers', () => {
  const originalResponse = new Response('ok', {
    headers: { 'x-custom-header': 'custom-value' }
  })
  const newResponse = withSecurityHeaders(originalResponse)

  assert.equal(newResponse.headers.get('x-custom-header'), 'custom-value')
  assert.equal(newResponse.headers.get('x-content-type-options'), 'nosniff')
})

test('withSecurityHeaders overwrites existing security headers', () => {
  const originalResponse = new Response('ok', {
    headers: {
      'x-content-type-options': 'wrong-value',
      'referrer-policy': 'unsafe-url',
      'cache-control': 'public, max-age=3600'
    }
  })
  const newResponse = withSecurityHeaders(originalResponse)

  assert.equal(newResponse.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(newResponse.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(newResponse.headers.get('cache-control'), 'no-store')
})

test('withSecurityHeaders preserves status, statusText, and body', async () => {
  const originalResponse = new Response('hello world', { status: 201, statusText: 'Created' })
  const newResponse = withSecurityHeaders(originalResponse)

  assert.equal(newResponse.status, 201)
  assert.equal(newResponse.statusText, 'Created')
  const text = await newResponse.text()
  assert.equal(text, 'hello world')
})
