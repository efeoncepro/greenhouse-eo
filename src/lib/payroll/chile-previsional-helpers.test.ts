import { describe, expect, it } from 'vitest'

import {
  getAfpRateForCode,
  getImmForPeriod,
  getSisRate,
  getTopeAfpForPeriod,
  getTopeCesantiaForPeriod,
  getUnemploymentRateForPeriod,
  resolveChileEmployerCostAmounts
} from './chile-previsional-helpers'

describe('chile provisional helpers', () => {
  it('returns null for IMM when no canonical snapshot exists yet', async () => {
    await expect(getImmForPeriod('2026-03-31')).resolves.toBeNull()
  })

  it('resolves AFP rates by code with a safe fallback', async () => {
    await expect(getAfpRateForCode('Unknown AFP', '2026-03-31')).resolves.toBe(0)
  })

  it('returns canonical unemployment and SIS defaults when no postgres snapshot is available', async () => {
    await expect(getSisRate('2026-03-31')).resolves.toBe(0)
    await expect(getUnemploymentRateForPeriod('2026-03-31', 'indefinido')).resolves.toBeCloseTo(0.006, 3)
    await expect(getUnemploymentRateForPeriod('2026-03-31', 'plazo_fijo')).resolves.toBeCloseTo(0.03, 3)
  })

  it('returns canonical topes for AFP and cesantía', async () => {
    await expect(getTopeAfpForPeriod('2026-03-31')).resolves.toBe(0)
    await expect(getTopeCesantiaForPeriod('2026-03-31')).resolves.toBe(0)
  })

  it('derives employer cost amounts for Chile payroll entries', async () => {
    await expect(
      resolveChileEmployerCostAmounts({
        payRegime: 'intl',
        contractType: 'indefinido',
        imponibleBase: 100000,
        periodDate: '2026-03-31'
      })
    ).resolves.toBeNull()

    await expect(
      resolveChileEmployerCostAmounts({
        payRegime: 'chile',
        contractType: 'indefinido',
        imponibleBase: 100000,
        periodDate: '2026-03-31'
      })
    ).resolves.toEqual({
      sisAmount: 0,
      cesantiaAmount: 2400,
      mutualAmount: 930,
      totalCost: 3330
    })
  })
})
