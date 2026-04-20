import { describe, expect, it } from 'vitest'

import { computeOverrideDelta } from '../override-delta'

describe('computeOverrideDelta (TASK-481)', () => {
  it('returns positive delta when override is above suggested', () => {
    const result = computeOverrideDelta({ suggestedUnitCost: 100, overrideUnitCost: 120 })

    expect(result.deltaAbsolute).toBe(20)
    expect(result.deltaPct).toBe(20)
    expect(result.direction).toBe('above')
    expect(result.hasSuggestedBaseline).toBe(true)
  })

  it('returns negative delta when override is below suggested', () => {
    const result = computeOverrideDelta({ suggestedUnitCost: 100, overrideUnitCost: 80 })

    expect(result.deltaAbsolute).toBe(-20)
    expect(result.deltaPct).toBe(-20)
    expect(result.direction).toBe('below')
  })

  it('returns equal direction when override matches suggested', () => {
    const result = computeOverrideDelta({ suggestedUnitCost: 100, overrideUnitCost: 100 })

    expect(result.deltaAbsolute).toBe(0)
    expect(result.deltaPct).toBe(0)
    expect(result.direction).toBe('equal')
  })

  it('returns null pct when suggested is zero but override is positive', () => {
    const result = computeOverrideDelta({ suggestedUnitCost: 0, overrideUnitCost: 50 })

    expect(result.deltaAbsolute).toBe(50)
    expect(result.deltaPct).toBeNull()
    expect(result.direction).toBe('above')
    expect(result.hasSuggestedBaseline).toBe(true)
  })

  it('returns all nulls with baseline=false when suggested is missing', () => {
    const result = computeOverrideDelta({ suggestedUnitCost: null, overrideUnitCost: 100 })

    expect(result.deltaAbsolute).toBeNull()
    expect(result.deltaPct).toBeNull()
    expect(result.direction).toBeNull()
    expect(result.hasSuggestedBaseline).toBe(false)
  })

  it('returns all nulls when override is not a finite non-negative number', () => {
    const undefinedOverride = computeOverrideDelta({ suggestedUnitCost: 100, overrideUnitCost: undefined })
    const negativeOverride = computeOverrideDelta({ suggestedUnitCost: 100, overrideUnitCost: -5 })
    const nanOverride = computeOverrideDelta({ suggestedUnitCost: 100, overrideUnitCost: Number.NaN })

    for (const result of [undefinedOverride, negativeOverride, nanOverride]) {
      expect(result.deltaAbsolute).toBeNull()
      expect(result.deltaPct).toBeNull()
      expect(result.direction).toBeNull()
    }
    expect(undefinedOverride.hasSuggestedBaseline).toBe(true)
  })

  it('rounds fractional deltas to 4 decimals', () => {
    const result = computeOverrideDelta({ suggestedUnitCost: 100, overrideUnitCost: 100.123456 })

    expect(result.deltaAbsolute).toBe(0.1235)
    expect(result.deltaPct).toBe(0.1235)
  })
})
