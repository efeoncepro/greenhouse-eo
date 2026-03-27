import { describe, expect, it } from 'vitest'

import type { BonusProrationConfig } from '@/types/payroll'

import { calculateOtdBonus, calculateRpaBonus } from './bonus-proration'

const config: BonusProrationConfig = {
  otdThreshold: 89,
  otdFloor: 70,
  rpaThreshold: 3,
  rpaFullPayoutThreshold: 1.7,
  rpaSoftBandEnd: 2,
  rpaSoftBandFloorFactor: 0.8
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
    // (79.5 - 70) / (89 - 70) = 9.5/19 = 0.5
    const result = calculateOtdBonus(79.5, 1000, config)

    expect(result).toEqual({ amount: 500, prorationFactor: 0.5, qualifies: true })
  })

  it('returns proportional proration at 80%', () => {
    // (80 - 70) / (89 - 70) = 10/19 = 0.5263 (rounded to 4 decimals)
    const result = calculateOtdBonus(80, 1000, config)

    expect(result.prorationFactor).toBe(0.5263)
    expect(result.amount).toBe(526.3)
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
    // (73 - 70) / (89 - 70) = 3/19 = 0.1579
    // 333 * 0.1579 = 52.5807 → rounded to 52.58
    const result = calculateOtdBonus(73, 333, config)

    expect(result.prorationFactor).toBe(0.1579)
    expect(result.amount).toBe(52.58)
  })
})

describe('calculateRpaBonus', () => {
  it('returns full bonus when rpaAvg is 0', () => {
    const result = calculateRpaBonus(0, 1000, config)

    expect(result).toEqual({ amount: 1000, prorationFactor: 1, qualifies: true })
  })

  it('returns full bonus while rpaAvg stays inside full-payout band', () => {
    const result = calculateRpaBonus(1.5, 1000, config)

    expect(result).toEqual({ amount: 1000, prorationFactor: 1, qualifies: true })
  })

  it('starts soft-band proration between 1.7 and 2.0', () => {
    const result = calculateRpaBonus(1.8, 1000, config)

    expect(result).toEqual({ amount: 933.3, prorationFactor: 0.9333, qualifies: true })
  })

  it('reaches soft-band floor factor at 2.0', () => {
    const result = calculateRpaBonus(2.0, 1000, config)

    expect(result).toEqual({ amount: 800, prorationFactor: 0.8, qualifies: true })
  })

  it('declines from soft-band floor factor down to zero before threshold', () => {
    const result = calculateRpaBonus(2.5, 1000, config)

    expect(result).toEqual({ amount: 400, prorationFactor: 0.4, qualifies: true })
  })

  it('returns 0 when rpaAvg equals threshold exactly', () => {
    const result = calculateRpaBonus(3, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
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

  it('clamps negative rpaAvg to full payout', () => {
    const result = calculateRpaBonus(-1, 1000, config)

    expect(result.prorationFactor).toBe(1)
    expect(result.amount).toBe(1000)
    expect(result.qualifies).toBe(true)
  })

  it('rounds factor to 4 decimal places inside the soft band', () => {
    const result = calculateRpaBonus(1.9, 1000, config)

    expect(result.prorationFactor).toBe(0.8667)
    expect(result.amount).toBe(866.7)
  })
})
