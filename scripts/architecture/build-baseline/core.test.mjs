import assert from 'node:assert/strict'
import test from 'node:test'

import { percentile, sanitize, summarizeSamples } from './core.mjs'

test('percentile uses nearest-rank', () => {
  assert.equal(percentile([10, 20, 30, 40, 50], 0.5), 30)
  assert.equal(percentile([], 0.95), null)
})

test('sanitize removes sensitive keys and redacts urls/tokens', () => {
  const result = sanitize({
    token: 'secret',
    nested: { email: 'x@example.com', safe: 'https://example.com/private', id: 'abcdefghijklmnopqrstuvwxyz1234567890' }
  })

  assert.deepEqual(result, { nested: { safe: '[redacted-url]', id: '[redacted-token]' } })
})

test('sanitize preserves git commit hashes required by the evidence contract', () => {
  assert.equal(sanitize('3672064b5aabbccddeeff0011223344556677889'), '3672064b5aabbccddeeff0011223344556677889')
})

test('summary does not invent p95 with fewer than five samples', () => {
  const summary = summarizeSamples([
    { status: 'ok', durationMs: 10, peakRssBytes: 100 },
    { status: 'ok', durationMs: 20, peakRssBytes: 200 },
    { status: 'ok', durationMs: 30, peakRssBytes: 300 }
  ])

  assert.equal(summary.durationMs.p50, 20)
  assert.equal(summary.durationMs.p95, null)
  assert.equal(summary.peakTreeRssBytes.p50, null)
  assert.equal(summary.confidence, 'low')
})

test('summary reports aggregate process-tree RSS separately from legacy timed RSS', () => {
  const summary = summarizeSamples([
    {
      status: 'ok',
      durationMs: 10,
      peakRssBytes: 100,
      processProfile: { summary: { peakTreeRssBytes: 300 } }
    },
    {
      status: 'ok',
      durationMs: 20,
      peakRssBytes: 200,
      processProfile: { summary: { peakTreeRssBytes: 500 } }
    },
    {
      status: 'ok',
      durationMs: 30,
      peakRssBytes: 300,
      processProfile: { summary: { peakTreeRssBytes: 700 } }
    }
  ])

  assert.equal(summary.peakRssBytes.p50, 200)
  assert.equal(summary.peakTreeRssBytes.p50, 500)
  assert.equal(summary.peakTreeRssBytes.p95, null)
})
