import { describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — deterministic previsional + tax helpers (no DB)
// ---------------------------------------------------------------------------

vi.mock('@/lib/payroll/chile-previsional-helpers', async () => {
  const actual = await vi.importActual(
    '@/lib/payroll/chile-previsional-helpers'
  )

  return {
    ...actual,
    getImmForPeriod: async () => 539_000,
    getAfpRateForCode: async () => 0.1046,
    resolveChileAfpRateSplitForCompensation: async () => null,
    getUnemploymentRateForPeriod: async () => 0.006,
    resolveChileEmployerCostAmounts: async () => ({
      sisAmount: 0,
      cesantiaAmount: 0,
      mutualAmount: 0,
      totalCost: 0
    })
  }
})

/**
 * Simplified Chilean tax bracket mock (2026-style).
 * Continuous piecewise linear: tax = max(0, base_utm * rate − deduction) * utm
 */
vi.mock('@/lib/payroll/compute-chile-tax', () => ({
  computeChileTax: async ({
    taxableBaseClp,
    utmValue
  }: {
    taxableBaseClp: number
    taxTableVersion: string | null
    utmValue: number | null
  }) => {
    if (!utmValue || utmValue <= 0) return { taxAmountClp: 0, computed: false }

    const utm = taxableBaseClp / utmValue
    let taxUtm = 0

    if (utm <= 13.5) taxUtm = 0
    else if (utm <= 30) taxUtm = utm * 0.04 - 0.54
    else if (utm <= 50) taxUtm = utm * 0.08 - 1.74
    else if (utm <= 70) taxUtm = utm * 0.135 - 4.49
    else if (utm <= 90) taxUtm = utm * 0.23 - 11.14
    else if (utm <= 120) taxUtm = utm * 0.304 - 17.8
    else taxUtm = utm * 0.35 - 23.32

    return { taxAmountClp: Math.round(Math.max(0, taxUtm) * utmValue), computed: true }
  }
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { computeGrossFromNet } from './reverse-payroll'

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

const PERIOD = '2026-03-31'
const UTM = 69_641
const UF = 39_300

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeGrossFromNet', () => {
  it('converges for Fonasa without gratificación', async () => {
    const result = await computeGrossFromNet({
      desiredNetClp: 800_000,
      periodDate: PERIOD,
      remoteAllowance: 0,
      afpRate: 0.1046,
      afpCotizacionRate: 0.10,
      afpComisionRate: 0.0046,
      healthSystem: 'fonasa',
      contractType: 'indefinido',
      unemploymentRate: 0.006,
      taxTableVersion: '2026-03',
      utmValue: UTM
    })

    expect(result.converged).toBe(true)
    expect(result.iterations).toBeLessThanOrEqual(50)
    expect(Math.abs(result.netTotalWithTax - 800_000)).toBeLessThanOrEqual(1)
    expect(result.baseSalary).toBeGreaterThan(800_000)
  })

  it('converges for Fonasa with gratificación mensual 25%', async () => {
    const result = await computeGrossFromNet({
      desiredNetClp: 595_656,
      periodDate: PERIOD,
      remoteAllowance: 0,
      gratificacionLegalMode: 'mensual_25pct',
      afpRate: 0.1046,
      afpCotizacionRate: 0.10,
      afpComisionRate: 0.0046,
      healthSystem: 'fonasa',
      contractType: 'indefinido',
      unemploymentRate: 0.006,
      taxTableVersion: '2026-03',
      utmValue: UTM
    })

    expect(result.converged).toBe(true)
    expect(result.forward.chileGratificacionLegalAmount).toBeGreaterThan(0)
    expect(Math.abs(result.netTotalWithTax - 595_656)).toBeLessThanOrEqual(1)
  })

  it('converges for Isapre with plan in UF', async () => {
    const result = await computeGrossFromNet({
      desiredNetClp: 1_200_000,
      periodDate: PERIOD,
      remoteAllowance: 100_000,
      colacionAmount: 50_000,
      movilizacionAmount: 30_000,
      gratificacionLegalMode: 'mensual_25pct',
      afpRate: 0.1046,
      afpCotizacionRate: 0.10,
      afpComisionRate: 0.0046,
      healthSystem: 'isapre',
      healthPlanUf: 3.5,
      contractType: 'indefinido',
      unemploymentRate: 0.006,
      ufValue: UF,
      taxTableVersion: '2026-03',
      utmValue: UTM
    })

    expect(result.converged).toBe(true)
    expect(result.forward.chileHealthSystem).toBe('isapre')
    expect(Math.abs(result.netTotalWithTax - 1_200_000)).toBeLessThanOrEqual(1)
  })

  it('converges with APV deduction', async () => {
    const result = await computeGrossFromNet({
      desiredNetClp: 700_000,
      periodDate: PERIOD,
      remoteAllowance: 0,
      afpRate: 0.1046,
      afpCotizacionRate: 0.10,
      afpComisionRate: 0.0046,
      healthSystem: 'fonasa',
      contractType: 'indefinido',
      unemploymentRate: 0.006,
      hasApv: true,
      apvAmount: 50_000,
      taxTableVersion: '2026-03',
      utmValue: UTM
    })

    expect(result.converged).toBe(true)
    expect(result.forward.chileApvAmount).toBe(50_000)
    expect(Math.abs(result.netTotalWithTax - 700_000)).toBeLessThanOrEqual(1)
  })

  it('converges for plazo fijo contract (3% unemployment)', async () => {
    const result = await computeGrossFromNet({
      desiredNetClp: 500_000,
      periodDate: PERIOD,
      remoteAllowance: 0,
      afpRate: 0.1046,
      afpCotizacionRate: 0.10,
      afpComisionRate: 0.0046,
      healthSystem: 'fonasa',
      contractType: 'plazo_fijo',
      unemploymentRate: 0.03,
      taxTableVersion: '2026-03',
      utmValue: UTM
    })

    expect(result.converged).toBe(true)
    expect(Math.abs(result.netTotalWithTax - 500_000)).toBeLessThanOrEqual(1)
    expect(result.baseSalary).toBeGreaterThan(500_000)
  })

  it('converges for high salary in upper tax bracket', async () => {
    const result = await computeGrossFromNet({
      desiredNetClp: 5_000_000,
      periodDate: PERIOD,
      remoteAllowance: 200_000,
      gratificacionLegalMode: 'mensual_25pct',
      afpRate: 0.1046,
      afpCotizacionRate: 0.10,
      afpComisionRate: 0.0046,
      healthSystem: 'isapre',
      healthPlanUf: 5.0,
      contractType: 'indefinido',
      unemploymentRate: 0.006,
      ufValue: UF,
      taxTableVersion: '2026-03',
      utmValue: UTM
    })

    expect(result.converged).toBe(true)
    expect(result.taxAmountClp).toBeGreaterThan(0)
    expect(Math.abs(result.netTotalWithTax - 5_000_000)).toBeLessThanOrEqual(1)
  })

  it('round-trips: forward(reverse(net)) ≈ net within ±$1', async () => {
    const desiredNet = 750_000

    const result = await computeGrossFromNet({
      desiredNetClp: desiredNet,
      periodDate: PERIOD,
      remoteAllowance: 80_000,
      colacionAmount: 40_000,
      movilizacionAmount: 20_000,
      gratificacionLegalMode: 'mensual_25pct',
      afpRate: 0.1046,
      afpCotizacionRate: 0.10,
      afpComisionRate: 0.0046,
      healthSystem: 'fonasa',
      contractType: 'indefinido',
      unemploymentRate: 0.006,
      taxTableVersion: '2026-03',
      utmValue: UTM
    })

    expect(result.converged).toBe(true)
    expect(result.baseSalary).toBeGreaterThan(0)
    expect(Math.abs(result.netTotalWithTax - desiredNet)).toBeLessThanOrEqual(1)

    // The forward result must be internally consistent
    expect(result.forward.grossTotal).toBeGreaterThan(result.netTotalWithTax)
    expect(result.forward.chileTotalDeductions).toBeGreaterThan(0)
  })

  it('converges without tax computation (no UTM/version)', async () => {
    const result = await computeGrossFromNet({
      desiredNetClp: 600_000,
      periodDate: PERIOD,
      remoteAllowance: 0,
      afpRate: 0.1046,
      afpCotizacionRate: 0.10,
      afpComisionRate: 0.0046,
      healthSystem: 'fonasa',
      contractType: 'indefinido',
      unemploymentRate: 0.006,
      taxTableVersion: null,
      utmValue: null
    })

    expect(result.converged).toBe(true)
    expect(result.taxAmountClp).toBe(0)
    expect(Math.abs(result.netTotalWithTax - 600_000)).toBeLessThanOrEqual(1)
  })

  it('includes non-imponible allowances in the forward result', async () => {
    const colacion = 50_000
    const movilizacion = 30_000

    const result = await computeGrossFromNet({
      desiredNetClp: 900_000,
      periodDate: PERIOD,
      remoteAllowance: 0,
      colacionAmount: colacion,
      movilizacionAmount: movilizacion,
      afpRate: 0.1046,
      afpCotizacionRate: 0.10,
      afpComisionRate: 0.0046,
      healthSystem: 'fonasa',
      contractType: 'indefinido',
      unemploymentRate: 0.006,
      taxTableVersion: '2026-03',
      utmValue: UTM
    })

    expect(result.converged).toBe(true)
    expect(result.forward.chileColacionAmount).toBe(colacion)
    expect(result.forward.chileMovilizacionAmount).toBe(movilizacion)
  })

  it('handles low salary near minimum wage', async () => {
    const result = await computeGrossFromNet({
      desiredNetClp: 400_000,
      periodDate: PERIOD,
      remoteAllowance: 0,
      afpRate: 0.1046,
      afpCotizacionRate: 0.10,
      afpComisionRate: 0.0046,
      healthSystem: 'fonasa',
      contractType: 'indefinido',
      unemploymentRate: 0.006,
      taxTableVersion: '2026-03',
      utmValue: UTM
    })

    expect(result.converged).toBe(true)
    expect(result.taxAmountClp).toBe(0) // Low salary → exempt bracket
    expect(Math.abs(result.netTotalWithTax - 400_000)).toBeLessThanOrEqual(1)
  })
})
