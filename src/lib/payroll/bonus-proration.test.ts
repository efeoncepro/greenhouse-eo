import { describe, expect, it } from 'vitest'

import type { BonusProrationConfig } from '@/types/payroll'

import { calculateOtdBonus, calculateRpaBonus } from './bonus-proration'

const config: BonusProrationConfig = {
  otdThreshold: 94,
  otdFloor: 70,
  rpaThreshold: 3
}

describe('calculateOtdBonus', () => {
  it('returns 100% when otdPercent >= threshold', () => {
    const result = calculateOtdBonus(95, 1000, config)

    expect(result).toEqual({ amount: 1000, prorationFactor: 1, qualifies: true })
  })

  it('returns 100% when otdPercent equals threshold exactly', () => {
    const result = calculateOtdBonus(94, 1000, config)

    expect(result).toEqual({ amount: 1000, prorationFactor: 1, qualifies: true })
  })

  it('returns linear proration between floor and threshold', () => {
    // (82 - 70) / (94 - 70) = 12/24 = 0.5
    const result = calculateOtdBonus(82, 1000, config)

    expect(result).toEqual({ amount: 500, prorationFactor: 0.5, qualifies: true })
  })

  it('returns proportional proration at 80%', () => {
    // (80 - 70) / (94 - 70) = 10/24 = 0.4167 (rounded to 4 decimals)
    const result = calculateOtdBonus(80, 1000, config)

    expect(result.prorationFactor).toBe(0.4167)
    expect(result.amount).toBe(416.7)
    expect(result.qualifies).toBe(true)
  })

  it('returns 0 at floor boundary', () => {
    // (70 - 70) / (94 - 70) = 0
    const result = calculateOtdBonus(70, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: true })
  })

  it('returns 0 when otdPercent < floor', () => {
    const result = calculateOtdBonus(69, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('returns 0 for null otdPercent', () => {
    const result = calculateOtdBonus(null, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('returns 0 for NaN', () => {
    const result = calculateOtdBonus(NaN, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('returns 0 for Infinity', () => {
    const result = calculateOtdBonus(Infinity, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('returns 0 when bonusAmount is 0', () => {
    const result = calculateOtdBonus(95, 0, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('returns 0 when bonusAmount is negative', () => {
    const result = calculateOtdBonus(95, -100, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('rounds amount to 2 decimal places', () => {
    // (73 - 70) / (94 - 70) = 3/24 = 0.125
    // 333 * 0.125 = 41.625 → rounded to 41.63
    const result = calculateOtdBonus(73, 333, config)

    expect(result.prorationFactor).toBe(0.125)
    expect(result.amount).toBe(41.63)
  })
})

describe('calculateRpaBonus', () => {
  it('returns full bonus when rpaAvg is 0', () => {
    // (3 - 0) / 3 = 1.0
    const result = calculateRpaBonus(0, 1000, config)

    expect(result).toEqual({ amount: 1000, prorationFactor: 1, qualifies: true })
  })

  it('returns inverse proration for rpaAvg 1.5', () => {
    // (3 - 1.5) / 3 = 0.5
    const result = calculateRpaBonus(1.5, 1000, config)

    expect(result).toEqual({ amount: 500, prorationFactor: 0.5, qualifies: true })
  })

  it('returns 0 factor when rpaAvg equals threshold exactly', () => {
    // (3 - 3) / 3 = 0 — qualifies true but amount 0
    const result = calculateRpaBonus(3, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: true })
  })

  it('returns 0 when rpaAvg exceeds threshold', () => {
    const result = calculateRpaBonus(3.1, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('returns 0 for null rpaAvg', () => {
    const result = calculateRpaBonus(null, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('returns 0 for NaN', () => {
    const result = calculateRpaBonus(NaN, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('returns 0 for negative bonusAmount', () => {
    const result = calculateRpaBonus(1.5, -100, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('clamps factor for negative rpaAvg', () => {
    // (3 - (-1)) / 3 = 4/3 = 1.3333 → Math.max(0, 1.3333) = 1.3333
    // Note: the code only clamps to min 0, not max 1 — this documents that behavior
    const result = calculateRpaBonus(-1, 1000, config)

    expect(result.prorationFactor).toBe(1.3333)
    expect(result.amount).toBe(1333.3)
    expect(result.qualifies).toBe(true)
  })

  it('rounds factor to 4 decimal places', () => {
    // (3 - 1.1) / 3 = 1.9/3 = 0.63333... → 0.6333
    const result = calculateRpaBonus(1.1, 1000, config)

    expect(result.prorationFactor).toBe(0.6333)
    expect(result.amount).toBe(633.3)
  })
})
