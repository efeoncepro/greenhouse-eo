import { describe, expect, it } from 'vitest'

import {
  addMonthsToPeriod,
  buildNuboxSyncPlan,
  comparePeriods,
  normalizePeriod
} from '@/lib/nubox/sync-plan'

describe('nubox sync plan', () => {
  it('normalizes valid periods and rejects invalid ones', () => {
    expect(normalizePeriod('2026-04')).toBe('2026-04')
    expect(normalizePeriod('2026-13')).toBeNull()
    expect(normalizePeriod('2026-4')).toBeNull()
  })

  it('adds months across year boundaries', () => {
    expect(addMonthsToPeriod('2026-01', -1)).toBe('2025-12')
    expect(addMonthsToPeriod('2026-12', 1)).toBe('2027-01')
  })

  it('compares periods lexicographically', () => {
    expect(comparePeriods('2026-03', '2026-03')).toBe(0)
    expect(comparePeriods('2026-02', '2026-03')).toBeLessThan(0)
    expect(comparePeriods('2026-04', '2026-03')).toBeGreaterThan(0)
  })

  it('builds a hot window plus one rotating historical period', () => {
    const plan = buildNuboxSyncPlan({
      now: new Date('2026-04-13T12:00:00Z'),
      historyStartPeriod: '2023-01',
      hotWindowMonths: 3,
      historicalBatchMonths: 1,
      historicalCursorPeriod: '2024-10'
    })

    expect(plan.hotPeriods).toEqual(['2026-04', '2026-03', '2026-02'])
    expect(plan.historicalPeriods).toEqual(['2024-10'])
    expect(plan.periods).toEqual(['2026-04', '2026-03', '2026-02', '2024-10'])
    expect(plan.nextHistoricalCursor).toBe('2024-11')
    expect(plan.windowStartPeriod).toBe('2024-10')
    expect(plan.windowEndPeriod).toBe('2026-04')
  })

  it('wraps the historical cursor when it reaches the hot window boundary', () => {
    const plan = buildNuboxSyncPlan({
      now: new Date('2026-04-13T12:00:00Z'),
      historyStartPeriod: '2026-01',
      hotWindowMonths: 3,
      historicalBatchMonths: 2,
      historicalCursorPeriod: '2026-01'
    })

    expect(plan.hotPeriods).toEqual(['2026-04', '2026-03', '2026-02'])
    expect(plan.historicalPeriods).toEqual(['2026-01'])
    expect(plan.nextHistoricalCursor).toBe('2026-01')
  })

  it('skips historical sweep when history start overlaps the hot window', () => {
    const plan = buildNuboxSyncPlan({
      now: new Date('2026-04-13T12:00:00Z'),
      historyStartPeriod: '2026-03',
      hotWindowMonths: 3,
      historicalBatchMonths: 2,
      historicalCursorPeriod: '2026-03'
    })

    expect(plan.historicalPeriods).toEqual([])
    expect(plan.periods).toEqual(['2026-04', '2026-03', '2026-02'])
    expect(plan.nextHistoricalCursor).toBeNull()
  })
})
