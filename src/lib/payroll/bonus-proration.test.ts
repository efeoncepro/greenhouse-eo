import { describe, expect, it } from 'vitest'

import type { BonusProrationConfig } from '@/types/payroll'

import {
  calculateOtdBonus,
  calculateOtdBonusForMember,
  calculateRpaBonus,
  calculateRpaBonusForMember,
  guardDemoMemberBonus
} from './bonus-proration'

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

// ════════════════════════════════════════════════════════════════════════════
// TASK-910 Slice 5 — Defense in depth canonical for demo members.
// guardDemoMemberBonus + calculateRpaBonusForMember + calculateOtdBonusForMember
// ════════════════════════════════════════════════════════════════════════════

describe('TASK-910 Slice 5 — guardDemoMemberBonus canonical', () => {
  it('returns null cuando member NO es demo (consumer procede a calc puro)', () => {
    expect(guardDemoMemberBonus({ isDemo: false })).toBeNull()
  })

  it('returns null cuando isDemo undefined (default safe — legacy member)', () => {
    expect(guardDemoMemberBonus({})).toBeNull()
  })

  it('returns null cuando isDemo null', () => {
    expect(guardDemoMemberBonus({ isDemo: null })).toBeNull()
  })

  it('returns null cuando member null/undefined (defensive — bonus puro safe)', () => {
    expect(guardDemoMemberBonus(null)).toBeNull()
    expect(guardDemoMemberBonus(undefined)).toBeNull()
  })

  it('returns ZERO BonusResult cuando isDemo === true (canonical demo member)', () => {
    const result = guardDemoMemberBonus({ isDemo: true })

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('returns null cuando isDemo truthy pero NO strictly true (anti-coersion)', () => {
    // Strict === true es load-bearing. Si llegara isDemo='true' string o 1,
    // el caller debe arreglar upstream — NO procesar como demo defensive.
    expect(guardDemoMemberBonus({ isDemo: 'true' as unknown as boolean })).toBeNull()
    expect(guardDemoMemberBonus({ isDemo: 1 as unknown as boolean })).toBeNull()
  })
})

describe('TASK-910 Slice 5 — calculateRpaBonusForMember canonical', () => {
  it('demo member SIEMPRE retorna $0 bonus + qualifies=false (defense in depth)', () => {
    // Aún con rpaAvg perfecto (1.0 = far below threshold), demo member → $0
    const result = calculateRpaBonusForMember({ isDemo: true }, 1.0, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('demo member con rpaAvg null retorna $0 + qualifies=false', () => {
    const result = calculateRpaBonusForMember({ isDemo: true }, null, 1000, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('real member (isDemo=false) procede a calc puro normal', () => {
    const result = calculateRpaBonusForMember({ isDemo: false }, 1.0, 1000, config)

    // rpaAvg=1.0 < rpaFullPayoutThreshold (1.7) → 100% canonical
    expect(result).toEqual({ amount: 1000, prorationFactor: 1, qualifies: true })
  })

  it('member null/undefined procede a calc puro (defensive — fetchKpis filter principal)', () => {
    // El filter principal canonical vive en fetchKpisForPeriod upstream.
    // Si caller pierde acceso al member object, calc puro sigue funcionando.
    const result = calculateRpaBonusForMember(null, 1.0, 1000, config)

    expect(result.qualifies).toBe(true)
  })
})

describe('TASK-910 Slice 5 — calculateOtdBonusForMember canonical', () => {
  it('demo member SIEMPRE retorna $0 (defense in depth) — incluso con OTD 100%', () => {
    const result = calculateOtdBonusForMember({ isDemo: true }, 100, 500, config)

    expect(result).toEqual({ amount: 0, prorationFactor: 0, qualifies: false })
  })

  it('real member con OTD 100% retorna 100% bonus canonical', () => {
    const result = calculateOtdBonusForMember({ isDemo: false }, 100, 500, config)

    expect(result.qualifies).toBe(true)
    expect(result.amount).toBe(500)
  })

  it('demo member NUNCA es tocado por OTD calc (defense in depth crítico)', () => {
    // Anti-regresión TASK-877 follow-up bug class. Demo members con
    // tareas "completadas" en demo NUNCA deben generar bonus real.
    const result = calculateOtdBonusForMember({ isDemo: true }, 95, 1000, config)

    expect(result.amount).toBe(0)
  })
})
