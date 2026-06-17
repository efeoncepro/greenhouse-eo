import { describe, expect, it } from 'vitest'

import { evaluateMemberMetricFreshness, resolvePeriodInTimeZone } from './materialized-freshness'

const NOW = new Date('2026-06-17T12:00:00.000Z')

describe('ICO materialized member metric freshness', () => {
  it('marks current-period cache stale when source snapshots are newer', () => {
    const decision = evaluateMemberMetricFreshness({
      periodYear: 2026,
      periodMonth: 6,
      materializedAt: '2026-06-01T07:15:41.675Z',
      sourceFreshnessAt: '2026-06-16T07:17:33.268Z',
      now: NOW
    })

    expect(decision).toMatchObject({
      status: 'stale',
      reason: 'source_snapshot_newer'
    })
  })

  it('marks current-period cache stale when it is older than the safety age even without source freshness', () => {
    const decision = evaluateMemberMetricFreshness({
      periodYear: 2026,
      periodMonth: 6,
      materializedAt: '2026-06-01T07:15:41.675Z',
      sourceFreshnessAt: null,
      now: NOW
    })

    expect(decision).toMatchObject({
      status: 'stale',
      reason: 'current_period_cache_too_old'
    })
  })

  it('keeps historical periods materialized when no newer source evidence exists', () => {
    const decision = evaluateMemberMetricFreshness({
      periodYear: 2026,
      periodMonth: 5,
      materializedAt: '2026-06-01T07:15:41.675Z',
      sourceFreshnessAt: null,
      now: NOW
    })

    expect(decision).toMatchObject({
      status: 'fresh',
      reason: 'historical_period'
    })
  })

  it('uses America/Santiago as the default operational period', () => {
    expect(resolvePeriodInTimeZone(new Date('2026-06-01T02:30:00.000Z'))).toEqual({
      year: 2026,
      month: 5
    })
  })
})
