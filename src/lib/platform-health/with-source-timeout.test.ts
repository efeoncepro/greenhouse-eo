import { describe, it, expect } from 'vitest'

import { withSourceTimeout } from './with-source-timeout'

describe('withSourceTimeout', () => {
  it('returns ok with the resolved value when the producer succeeds in time', async () => {
    const result = await withSourceTimeout(async () => ({ count: 7 }), {
      source: 'test_source',
      timeoutMs: 1_000
    })

    expect(result.status).toBe('ok')
    expect(result.value).toEqual({ count: 7 })
    expect(result.source).toBe('test_source')
    expect(result.error).toBeNull()
    expect(result.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('returns timeout when the producer exceeds the budget', async () => {
    const result = await withSourceTimeout(
      () => new Promise<string>(resolve => setTimeout(() => resolve('late'), 200)),
      { source: 'slow_source', timeoutMs: 50 }
    )

    expect(result.status).toBe('timeout')
    expect(result.value).toBeNull()
    expect(result.error).toContain("source 'slow_source'")
    expect(result.error).toContain('50ms')
  })

  it('returns error and redacts the rejection message', async () => {
    const result = await withSourceTimeout(
      async () => {
        throw new Error('bearer Bearer abc1234567890def is leaking')
      },
      { source: 'broken_source' }
    )

    expect(result.status).toBe('error')
    expect(result.value).toBeNull()
    expect(result.error).not.toContain('abc1234567890def')
    expect(result.error).toContain('[redacted:bearer]')
  })

  it('returns not_configured when isUnavailable signals a sentinel', async () => {
    const result = await withSourceTimeout(async () => ({ enabled: false }), {
      source: 'feature_off_source',
      isUnavailable: value => value.enabled === false
    })

    expect(result.status).toBe('not_configured')
    expect(result.value).toEqual({ enabled: false })
    expect(result.error).toBeNull()
  })

  it('records duration in milliseconds', async () => {
    const result = await withSourceTimeout(
      () => new Promise<number>(resolve => setTimeout(() => resolve(42), 30)),
      { source: 'measured_source' }
    )

    expect(result.status).toBe('ok')
    expect(result.durationMs).toBeGreaterThanOrEqual(30)
    expect(result.durationMs).toBeLessThan(2_000)
  })
})
