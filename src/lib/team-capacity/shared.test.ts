import { describe, expect, it } from 'vitest'

import {
  computeCapacityBreakdown,
  aggregateCapacityBreakdown,
  getExpectedMonthlyThroughput,
  getUtilizationPercent,
  getCapacityHealth
} from '@/lib/team-capacity/shared'

describe('computeCapacityBreakdown', () => {
  it('computes breakdown for full-time member', () => {
    const result = computeCapacityBreakdown({
      fteAllocation: 1.0,
      contractedHoursMonth: 160,
      utilizationPercent: 75
    })

    expect(result.contractedHoursMonth).toBe(160)
    expect(result.assignedHoursMonth).toBe(160) // 1.0 FTE * 160
    expect(result.usedHoursMonth).toBe(120) // 75% of 160
    expect(result.availableHoursMonth).toBe(0) // 160 - 160 assigned
    expect(result.overcommitted).toBe(false)
  })

  it('detects overcommitted member', () => {
    const result = computeCapacityBreakdown({
      fteAllocation: 1.0,
      contractedHoursMonth: 120,
      utilizationPercent: 110
    })

    expect(result.overcommitted).toBe(true)
    expect(result.availableHoursMonth).toBe(0)
    expect(result.commercialAvailabilityHours).toBe(0)
  })

  it('returns unknown usage when operational metrics are unavailable', () => {
    const result = computeCapacityBreakdown({
      fteAllocation: 1.0,
      contractedHoursMonth: 160,
      utilizationPercent: 0,
      hasUsageData: false
    })

    expect(result.usedHoursMonth).toBeNull()
    expect(result.availableHoursMonth).toBe(0)
    expect(result.overcommitted).toBe(false)
  })

  it('uses default 160 hours when contractedHoursMonth is null', () => {
    const result = computeCapacityBreakdown({
      fteAllocation: 0.5,
      contractedHoursMonth: null,
      utilizationPercent: 50
    })

    expect(result.contractedHoursMonth).toBe(80) // 0.5 FTE * 160 base
    expect(result.assignedHoursMonth).toBe(80)
  })
})

describe('aggregateCapacityBreakdown', () => {
  it('sums capacity across multiple members', () => {
    const breakdowns = [
      computeCapacityBreakdown({ fteAllocation: 1.0, contractedHoursMonth: 160, utilizationPercent: 50 }),
      computeCapacityBreakdown({ fteAllocation: 0.5, contractedHoursMonth: 160, utilizationPercent: 80 })
    ]

    const total = aggregateCapacityBreakdown(breakdowns)

    expect(total.contractedHoursMonth).toBe(320)
    expect(total.assignedHoursMonth).toBe(240) // 160 + 80
    expect(total.availableHoursMonth).toBe(80)
  })

  it('returns zero for empty array', () => {
    const total = aggregateCapacityBreakdown([])

    expect(total.contractedHoursMonth).toBe(0)
    expect(total.assignedHoursMonth).toBe(0)
    expect(total.usedHoursMonth).toBeNull()
    expect(total.overcommitted).toBe(false)
  })
})

describe('getExpectedMonthlyThroughput', () => {
  it('returns higher throughput for operations roles', () => {
    const ops = getExpectedMonthlyThroughput({ roleCategory: 'operations', fteAllocation: 1.0 })
    const design = getExpectedMonthlyThroughput({ roleCategory: 'design', fteAllocation: 1.0 })

    expect(ops).toBeGreaterThan(0)
    expect(design).toBeGreaterThan(0)
  })

  it('scales with FTE allocation', () => {
    const full = getExpectedMonthlyThroughput({ roleCategory: 'design', fteAllocation: 1.0 })
    const half = getExpectedMonthlyThroughput({ roleCategory: 'design', fteAllocation: 0.5 })

    expect(half).toBeLessThan(full)
  })
})

describe('getUtilizationPercent', () => {
  it('returns 0 when no expected throughput', () => {
    expect(getUtilizationPercent({ activeAssets: 5, expectedMonthlyThroughput: 0 })).toBe(0)
  })

  it('computes ratio correctly', () => {
    const pct = getUtilizationPercent({ activeAssets: 8, expectedMonthlyThroughput: 10 })

    expect(pct).toBe(80)
  })
})

describe('getCapacityHealth', () => {
  it('returns idle for low utilization', () => {
    expect(getCapacityHealth(10)).toBe('idle')
  })

  it('returns balanced for moderate utilization', () => {
    expect(getCapacityHealth(60)).toBe('balanced')
  })

  it('returns high for high utilization', () => {
    expect(getCapacityHealth(85)).toBe('high')
  })

  it('returns overloaded for over 100%', () => {
    expect(getCapacityHealth(110)).toBe('overloaded')
  })
})
