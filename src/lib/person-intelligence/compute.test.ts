import { describe, expect, it } from 'vitest'

import {
  normalizeRpa,
  computeQualityIndex,
  computeDedicationIndex,
  computeDerivedMetrics,
  type IcoInput,
  type CapacityInput,
  type CompensationInput
} from './compute'

describe('normalizeRpa', () => {
  it('returns 100 for RPA 1.0 (perfect)', () => {
    expect(normalizeRpa(1.0)).toBe(100)
  })

  it('returns ~50 for RPA 3.0 (mid range)', () => {
    expect(normalizeRpa(3.0)).toBe(50)
  })

  it('returns 0 for RPA >= 5.0 (ceiling)', () => {
    expect(normalizeRpa(5.0)).toBe(0)
    expect(normalizeRpa(10.0)).toBe(0)
  })

  it('returns null for null/zero/negative', () => {
    expect(normalizeRpa(null)).toBeNull()
    expect(normalizeRpa(0)).toBeNull()
    expect(normalizeRpa(-1)).toBeNull()
  })

  it('returns 75 for RPA 2.0', () => {
    expect(normalizeRpa(2.0)).toBe(75)
  })
})

describe('computeQualityIndex', () => {
  it('returns high score for good metrics (low RPA, high OTD, high FTR)', () => {
    const score = computeQualityIndex(1.0, 95, 90)

    expect(score).toBeGreaterThanOrEqual(90)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns low score for bad metrics (high RPA, low OTD, low FTR)', () => {
    const score = computeQualityIndex(4.0, 30, 20)

    expect(score).toBeLessThan(30)
  })

  it('returns null when RPA is null', () => {
    expect(computeQualityIndex(null, 90, 80)).toBeNull()
  })

  it('handles null OTD/FTR by treating as 0', () => {
    const score = computeQualityIndex(1.0, null, null)

    // Only RPA contributes: 100 * 0.4 = 40
    expect(score).toBe(40)
  })

  it('clamps between 0-100', () => {
    const score = computeQualityIndex(1.0, 100, 100)

    expect(score).toBeLessThanOrEqual(100)
    expect(score).toBeGreaterThanOrEqual(0)
  })
})

describe('computeDedicationIndex', () => {
  it('returns high score for good utilization and zero variance', () => {
    const score = computeDedicationIndex(80, 0)

    expect(score).toBe(80)
  })

  it('penalizes high allocation variance', () => {
    const noVariance = computeDedicationIndex(80, 0)
    const highVariance = computeDedicationIndex(80, 0.5)

    expect(highVariance).toBeLessThan(noVariance!)
  })

  it('returns 0 for 100% variance (fully misallocated)', () => {
    expect(computeDedicationIndex(80, 1.0)).toBe(0)
  })

  it('caps utilization at 100%', () => {
    const over = computeDedicationIndex(120, 0)
    const at100 = computeDedicationIndex(100, 0)

    expect(over).toBe(at100)
  })

  it('returns null for null utilization', () => {
    expect(computeDedicationIndex(null, 0)).toBeNull()
  })
})

describe('computeDerivedMetrics', () => {
  const baseIco: IcoInput = {
    rpaAvg: 1.5,
    otdPct: 85,
    ftrPct: 80,
    throughputCount: 20,
    activeTasks: 15
  }

  const baseCapacity: CapacityInput = {
    totalFte: 1.0,
    contractedHoursMonth: 160,
    roleCategory: 'design'
  }

  const baseComp: CompensationInput = {
    monthlyTotalComp: 2000000
  }

  it('computes all 6 metrics', () => {
    const result = computeDerivedMetrics(baseIco, baseCapacity, baseComp)

    expect(result.utilizationPct).toBeTypeOf('number')
    expect(result.allocationVariance).toBe(0) // 1.0 FTE - 1.0 = 0
    expect(result.costPerAsset).toBe(100000) // 2M / 20
    expect(result.costPerHour).toBe(12500) // 2M / 160
    expect(result.qualityIndex).toBeTypeOf('number')
    expect(result.dedicationIndex).toBeTypeOf('number')
  })

  it('returns null cost_per_asset when throughput is 0', () => {
    const result = computeDerivedMetrics(
      { ...baseIco, throughputCount: 0 },
      baseCapacity,
      baseComp
    )

    expect(result.costPerAsset).toBeNull()
  })

  it('returns null cost metrics when compensation is null', () => {
    const result = computeDerivedMetrics(
      baseIco,
      baseCapacity,
      { monthlyTotalComp: null }
    )

    expect(result.costPerAsset).toBeNull()
    expect(result.costPerHour).toBeNull()
  })

  it('computes positive allocation variance for overallocated', () => {
    const result = computeDerivedMetrics(
      baseIco,
      { ...baseCapacity, totalFte: 1.3 },
      baseComp
    )

    expect(result.allocationVariance).toBeCloseTo(0.3, 2)
  })

  it('computes negative allocation variance for underallocated', () => {
    const result = computeDerivedMetrics(
      baseIco,
      { ...baseCapacity, totalFte: 0.5 },
      baseComp
    )

    expect(result.allocationVariance).toBeCloseTo(-0.5, 2)
  })

  it('handles null ICO metrics gracefully', () => {
    const result = computeDerivedMetrics(
      { rpaAvg: null, otdPct: null, ftrPct: null, throughputCount: null, activeTasks: null },
      baseCapacity,
      baseComp
    )

    expect(result.qualityIndex).toBeNull()
    expect(result.costPerAsset).toBeNull()
    expect(result.utilizationPct).toBeTypeOf('number') // 0 active / expected = 0%
  })
})
