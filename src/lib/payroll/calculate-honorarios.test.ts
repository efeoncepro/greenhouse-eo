import { describe, expect, it } from 'vitest'

import { getSiiRetentionRate } from '@/types/hr-contracts'

import { calculateHonorariosTotals } from './calculate-honorarios'

describe('calculateHonorariosTotals', () => {
  it('uses the official 2026 SII retention rate for honorarios', () => {
    expect(getSiiRetentionRate(2026)).toBe(0.1525)

    const totals = calculateHonorariosTotals({
      periodDate: '2026-04-30',
      baseSalary: 1000000,
      fixedBonusAmount: 0,
      bonusOtdAmount: 0,
      bonusRpaAmount: 0,
      bonusOtherAmount: 0
    })

    expect(totals.siiRetentionRate).toBe(0.1525)
    expect(totals.siiRetentionAmount).toBe(152500)
    expect(totals.netTotalCalculated).toBe(847500)
  })

  it('keeps the programmed retention ladder through 2028', () => {
    expect(getSiiRetentionRate(2024)).toBe(0.1375)
    expect(getSiiRetentionRate(2025)).toBe(0.145)
    expect(getSiiRetentionRate(2026)).toBe(0.1525)
    expect(getSiiRetentionRate(2027)).toBe(0.16)
    expect(getSiiRetentionRate(2028)).toBe(0.17)
  })
})
