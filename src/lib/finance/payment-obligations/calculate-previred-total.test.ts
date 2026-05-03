import { describe, expect, it } from 'vitest'

import {
  calculatePreviredEntryBreakdown,
  calculatePreviredTotal,
  type PreviredEntryInput
} from './calculate-previred-total'

const buildEntry = (overrides: Partial<PreviredEntryInput>): PreviredEntryInput => ({
  chile_afp_amount: 0,
  chile_health_amount: 0,
  chile_unemployment_amount: 0,
  chile_apv_amount: 0,
  chile_employer_cesantia_amount: 0,
  chile_employer_mutual_amount: 0,
  chile_employer_sis_amount: 0,
  ...overrides
})

describe('calculatePreviredEntryBreakdown — anti-regresion fórmula 7-columnas', () => {
  it('suma EXACTA de las 7 columnas (regression: TASK-759 V2 fix)', () => {
    const entry = buildEntry({
      chile_afp_amount: 100,
      chile_health_amount: 70,
      chile_unemployment_amount: 6,
      chile_apv_amount: 50,
      chile_employer_cesantia_amount: 24,
      chile_employer_mutual_amount: 9,
      chile_employer_sis_amount: 16
    })

    const breakdown = calculatePreviredEntryBreakdown(entry)

    // 100 + 70 + 6 + 50 + 24 + 9 + 16 = 275
    expect(breakdown.total).toBe(275)
    expect(breakdown.afpEmployee).toBe(100)
    expect(breakdown.healthEmployee).toBe(70)
    expect(breakdown.unemploymentEmployee).toBe(6)
    expect(breakdown.apvEmployee).toBe(50)
    expect(breakdown.cesantiaEmployer).toBe(24)
    expect(breakdown.mutualEmployer).toBe(9)
    expect(breakdown.sisEmployer).toBe(16)
  })

  it('NO double-cuenta employer_total_cost (bug original que daba $33k en vez de $271k)', () => {
    // Sintoma del bug: el calculator viejo solo sumaba employer_total_cost
    // (= cesantia + mutual + sis = $49 en este caso) e ignoraba las 4 columnas
    // de empleado. El fix DEBE sumar empleado + empleador, NO solo employer.
    const entry = buildEntry({
      chile_afp_amount: 100,
      chile_health_amount: 70,
      chile_unemployment_amount: 6,
      chile_apv_amount: 0,
      chile_employer_cesantia_amount: 24,
      chile_employer_mutual_amount: 9,
      chile_employer_sis_amount: 16
    })

    const breakdown = calculatePreviredEntryBreakdown(entry)

    // 100 + 70 + 6 + 0 + 24 + 9 + 16 = 225 (NOT 49)
    expect(breakdown.total).toBe(225)
    expect(breakdown.total).not.toBe(49) // employer-only sum (bug histórico)
  })

  it('soporta string inputs de BigQuery / pg numeric (parsea)', () => {
    const entry = buildEntry({
      chile_afp_amount: '100' as unknown as number,
      chile_health_amount: '70.50' as unknown as number,
      chile_employer_cesantia_amount: '24' as unknown as number
    })

    const breakdown = calculatePreviredEntryBreakdown(entry)

    expect(breakdown.afpEmployee).toBe(100)
    expect(breakdown.healthEmployee).toBe(70.5)
    expect(breakdown.cesantiaEmployer).toBe(24)
    expect(breakdown.total).toBe(194.5)
  })

  it('NULL inputs se tratan como 0 (degradación silenciosa segura)', () => {
    const entry = {
      chile_afp_amount: null,
      chile_health_amount: 70,
      chile_unemployment_amount: null,
      chile_apv_amount: null,
      chile_employer_cesantia_amount: null,
      chile_employer_mutual_amount: null,
      chile_employer_sis_amount: null
    }

    const breakdown = calculatePreviredEntryBreakdown(entry)

    expect(breakdown.total).toBe(70)
  })
})

describe('calculatePreviredTotal — agregación multi-entry', () => {
  it('suma totales across N entries', () => {
    const entries = [
      buildEntry({ chile_afp_amount: 100, chile_health_amount: 50 }),
      buildEntry({ chile_afp_amount: 200, chile_employer_cesantia_amount: 30 })
    ]

    expect(calculatePreviredTotal(entries)).toBe(150 + 230)
  })

  it('lista vacía → 0', () => {
    expect(calculatePreviredTotal([])).toBe(0)
  })

  it('Sky Airline real-world test (period 2026-04 ish)', () => {
    // Aproxima el caso real: 1 colaborador chile con cotizaciones representativas.
    // Total esperado por colaborador típico CLP: ~45,000 (varía por sueldo).
    const entry = buildEntry({
      chile_afp_amount: 100_000, // 10% bruto de \$1M
      chile_health_amount: 70_000, // 7%
      chile_unemployment_amount: 6_000, // 0.6%
      chile_apv_amount: 0,
      chile_employer_cesantia_amount: 24_000, // 2.4%
      chile_employer_mutual_amount: 9_000, // 0.9%
      chile_employer_sis_amount: 16_000 // 1.6%
    })

    const total = calculatePreviredTotal([entry])

    expect(total).toBe(225_000)
  })
})
