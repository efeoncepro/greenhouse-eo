import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { buildFreshnessSignal } from './bank-freshness'

describe('buildFreshnessSignal', () => {
  it('does not mark a same-day covered bank snapshot as stale only because computed_at is old', () => {
    vi.setSystemTime(new Date('2026-06-20T19:45:00.000Z'))

    const signal = buildFreshnessSignal('2026-06-20T09:00:00.000Z', {
      latestBalanceDate: '2026-06-20',
      expectedFreshThroughDate: '2026-06-20'
    })

    expect(signal.ageSeconds).toBeGreaterThan(3600)
    expect(signal.isStale).toBe(false)

    vi.useRealTimers()
  })

  it('marks a snapshot stale when the materialized balance date does not cover the expected period end', () => {
    vi.setSystemTime(new Date('2026-06-20T19:45:00.000Z'))

    const signal = buildFreshnessSignal('2026-06-20T09:00:00.000Z', {
      latestBalanceDate: '2026-06-19',
      expectedFreshThroughDate: '2026-06-20'
    })

    expect(signal.isStale).toBe(true)

    vi.useRealTimers()
  })

  it('falls back to the operational computed_at threshold when coverage dates are unknown', () => {
    vi.setSystemTime(new Date('2026-06-20T19:45:00.000Z'))

    const signal = buildFreshnessSignal('2026-06-20T09:00:00.000Z')

    expect(signal.isStale).toBe(true)

    vi.useRealTimers()
  })
})
