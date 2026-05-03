import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ChilePrevHelpers from '@/lib/payroll/chile-previsional-helpers'

const mockGetImmForPeriod = vi.fn(async () => 1_200_000)
const mockGetTopeAfpForPeriod = vi.fn(async () => 0)
const mockGetTopeCesantiaForPeriod = vi.fn(async () => 0)

vi.mock('@/lib/payroll/chile-previsional-helpers', async () => {
  const actual = await vi.importActual<typeof ChilePrevHelpers>('@/lib/payroll/chile-previsional-helpers')

  return {
    ...actual,
    getImmForPeriod: async () => mockGetImmForPeriod(),
    getTopeAfpForPeriod: async () => mockGetTopeAfpForPeriod(),
    getTopeCesantiaForPeriod: async () => mockGetTopeCesantiaForPeriod(),
    resolveChileAfpRateSplitForCompensation: async () => null
  }
})

import { calculatePayrollTotals } from './calculate-chile-deductions'

describe('calculatePayrollTotals', () => {
  beforeEach(() => {
    mockGetImmForPeriod.mockResolvedValue(1_200_000)
    mockGetTopeAfpForPeriod.mockResolvedValue(0)
    mockGetTopeCesantiaForPeriod.mockResolvedValue(0)
  })

  it('includes recurring fixed bonus in international gross and net totals', async () => {
    const totals = await calculatePayrollTotals({
      payRegime: 'international',
      baseSalary: 2000,
      remoteAllowance: 100,
      colacionAmount: 0,
      movilizacionAmount: 0,
      fixedBonusAmount: 150,
      bonusOtdAmount: 200,
      bonusRpaAmount: 50,
      bonusOtherAmount: 25
    })

    expect(totals.grossTotal).toBe(2525)
    expect(totals.netTotalCalculated).toBe(2525)
  })

  it('treats recurring fixed bonus as imponible for Chile payroll', async () => {
    const totals = await calculatePayrollTotals({
      payRegime: 'chile',
      baseSalary: 1000000,
      remoteAllowance: 80000,
      colacionAmount: 0,
      movilizacionAmount: 0,
      fixedBonusAmount: 120000,
      bonusOtdAmount: 100000,
      bonusRpaAmount: 50000,
      bonusOtherAmount: 30000,
      afpName: 'Modelo',
      afpRate: 0.1144,
      healthSystem: 'fonasa',
      unemploymentRate: 0.006,
      contractType: 'indefinido',
      hasApv: false,
      apvAmount: 0,
      ufValue: null,
      taxAmount: 50000
    })

    expect(totals.grossTotal).toBe(1380000)
    expect(totals.chileTaxableBase).toBe(1052480)
    expect(totals.netTotalCalculated).toBe(1082480)
  })

  it('applies monthly legal gratification for Chile payroll and includes it in imponible totals', async () => {
    const totals = await calculatePayrollTotals({
      payRegime: 'chile',
      baseSalary: 1000000,
      remoteAllowance: 0,
      colacionAmount: 0,
      movilizacionAmount: 0,
      fixedBonusAmount: 0,
      bonusOtdAmount: 0,
      bonusRpaAmount: 0,
      bonusOtherAmount: 0,
      gratificacionLegalMode: 'mensual_25pct',
      afpName: 'Modelo',
      afpRate: 0.1144,
      healthSystem: 'fonasa',
      unemploymentRate: 0.006,
      contractType: 'indefinido',
      hasApv: false,
      apvAmount: 0,
      ufValue: null,
      taxAmount: 0,
      periodDate: '2026-03-31'
    })

    expect(totals.chileGratificacionLegalAmount).toBe(250000)
    expect(totals.grossTotal).toBe(1250000)
    expect(totals.chileTaxableBase).toBeGreaterThan(0)
    expect(totals.netTotalCalculated).toBeLessThan(totals.grossTotal)
  })

  it('does not add legal gratification when mode is ninguna', async () => {
    const totals = await calculatePayrollTotals({
      payRegime: 'chile',
      baseSalary: 1000000,
      remoteAllowance: 0,
      colacionAmount: 0,
      movilizacionAmount: 0,
      fixedBonusAmount: 0,
      bonusOtdAmount: 0,
      bonusRpaAmount: 0,
      bonusOtherAmount: 0,
      gratificacionLegalMode: 'ninguna',
      afpName: 'Modelo',
      afpRate: 0.1144,
      healthSystem: 'fonasa',
      unemploymentRate: 0.006,
      contractType: 'indefinido',
      hasApv: false,
      apvAmount: 0,
      ufValue: null,
      taxAmount: 0,
      periodDate: '2026-03-31'
    })

    expect(totals.chileGratificacionLegalAmount).toBeNull()
    expect(totals.grossTotal).toBe(1000000)
  })

  it('adds colacion and movilizacion to net total without changing imponible base', async () => {
    const totals = await calculatePayrollTotals({
      payRegime: 'chile',
      baseSalary: 1000,
      remoteAllowance: 0,
      colacionAmount: 100,
      movilizacionAmount: 50,
      fixedBonusAmount: 0,
      bonusOtdAmount: 0,
      bonusRpaAmount: 0,
      bonusOtherAmount: 0,
      gratificacionLegalMode: 'ninguna',
      afpName: 'Modelo',
      afpRate: 0,
      afpCotizacionRate: 0,
      afpComisionRate: 0,
      healthSystem: 'isapre',
      healthPlanUf: 0,
      unemploymentRate: 0,
      contractType: 'indefinido',
      hasApv: false,
      apvAmount: 0,
      ufValue: 0,
      taxAmount: 0,
      periodDate: '2026-03-31'
    })

    expect(totals.chileTaxableBase).toBe(1000)
    expect(totals.netTotalCalculated).toBe(1150)
    expect(totals.grossTotal).toBe(1150)
    expect(totals.chileAfpCotizacionAmount).toBe(0)
    expect(totals.chileAfpComisionAmount).toBe(0)
  })

  it('applies separate AFP/health and cesantia caps when PREVIRED topes exist', async () => {
    mockGetTopeAfpForPeriod.mockResolvedValue(2)
    mockGetTopeCesantiaForPeriod.mockResolvedValue(1)

    const totals = await calculatePayrollTotals({
      payRegime: 'chile',
      baseSalary: 1000,
      remoteAllowance: 0,
      colacionAmount: 0,
      movilizacionAmount: 0,
      fixedBonusAmount: 0,
      bonusOtdAmount: 0,
      bonusRpaAmount: 0,
      bonusOtherAmount: 0,
      gratificacionLegalMode: 'ninguna',
      afpName: 'Modelo',
      afpRate: 0.1,
      afpCotizacionRate: 0.1,
      afpComisionRate: 0,
      healthSystem: 'fonasa',
      unemploymentRate: null,
      contractType: 'indefinido',
      hasApv: false,
      apvAmount: 0,
      ufValue: 100,
      taxAmount: 0,
      periodDate: '2026-03-31'
    })

    expect(totals.chileAfpAmount).toBe(20)
    expect(totals.chileHealthAmount).toBe(14)
    expect(totals.chileUnemploymentAmount).toBe(0.6)
    expect(totals.chileEmployerCesantiaAmount).toBe(2.4)
  })

  it('fails closed if honorarios reaches the Chile dependent helper', async () => {
    await expect(
      calculatePayrollTotals({
        payRegime: 'chile',
        baseSalary: 1000,
        remoteAllowance: 0,
        colacionAmount: 0,
        movilizacionAmount: 0,
        fixedBonusAmount: 0,
        bonusOtdAmount: 0,
        bonusRpaAmount: 0,
        bonusOtherAmount: 0,
        gratificacionLegalMode: 'ninguna',
        contractType: 'honorarios',
        ufValue: null,
        taxAmount: 0,
        periodDate: '2026-03-31'
      })
    ).rejects.toThrow('Chile dependent payroll totals require an indefinido or plazo_fijo contract.')
  })
})
