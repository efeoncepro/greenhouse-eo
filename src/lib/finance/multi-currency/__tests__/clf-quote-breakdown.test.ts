import { describe, expect, it } from 'vitest'

import { FinanceValidationError } from '@/lib/finance/shared'

import { deriveClfQuoteBreakdown } from '../clf-quote-breakdown'

/**
 * TASK-1210 Slice 1 (plan TASK-995 §#1.1) — derivación del desglose neto/IVA de
 * cotizaciones CLF (UF) que solo traen el total documental.
 *
 * Fixtures = las totales UF reales del dry-run TASK-995 (las 7 quotes CLF que hoy
 * llegan con `subtotal=0 tax=0` desde HubSpot). Regla dura: NO inventar IVA — la
 * clasificación afecta/exenta sale de `tax_code`, y sin clasificación confiable el
 * helper falla-cerrado (no proyecta).
 */
describe('deriveClfQuoteBreakdown (TASK-1210)', () => {
  const REAL_UF_TOTALS = [128.996, 92.3954, 20.4442, 17.0527, 30.7164, 46.5171, 19.9913]

  it('afecta (cl_vat_19): despeja neto = total / 1.19, IVA = total − neto, identidad total = neto + IVA', () => {
    for (const total of REAL_UF_TOTALS) {
      const b = deriveClfQuoteBreakdown({ totalClf: total, taxCode: 'cl_vat_19' })

      expect(b.isExempt).toBe(false)
      expect(b.subtotalClf).toBeCloseTo(total / 1.19, 8)
      expect(b.taxAmountClf).toBeCloseTo(total - total / 1.19, 8)
      // Identidad documental (en UF, sin redondeo a CLP entero todavía).
      expect(b.subtotalClf + b.taxAmountClf).toBeCloseTo(total, 8)
      // El IVA derivado = neto × 0.19 (consistente con el snapshot fiscal CL).
      expect(b.taxAmountClf).toBeCloseTo(b.subtotalClf * 0.19, 8)
    }
  })

  it('exenta (cl_vat_exempt): neto = total, IVA = 0 — NUNCA gross-up (regla dura)', () => {
    const total = 128.996
    const b = deriveClfQuoteBreakdown({ totalClf: total, taxCode: 'cl_vat_exempt' })

    expect(b.isExempt).toBe(true)
    expect(b.subtotalClf).toBe(total)
    expect(b.taxAmountClf).toBe(0)
  })

  it('fail-closed: tax_code NULL → lanza (no se proyecta, no se inventa IVA)', () => {
    expect(() => deriveClfQuoteBreakdown({ totalClf: 92.3954, taxCode: null })).toThrow(
      FinanceValidationError
    )
  })

  it('fail-closed: cl_vat_non_billable → lanza (clasificación no facturable)', () => {
    expect(() => deriveClfQuoteBreakdown({ totalClf: 17.0527, taxCode: 'cl_vat_non_billable' })).toThrow(
      FinanceValidationError
    )
  })

  it('fail-closed: tax_code desconocido → lanza', () => {
    expect(() => deriveClfQuoteBreakdown({ totalClf: 50, taxCode: 'cl_vat_42' })).toThrow(
      FinanceValidationError
    )
  })

  it('fail-closed: total no positivo → lanza (no hay base para derivar)', () => {
    expect(() => deriveClfQuoteBreakdown({ totalClf: 0, taxCode: 'cl_vat_19' })).toThrow(
      FinanceValidationError
    )
    expect(() => deriveClfQuoteBreakdown({ totalClf: NaN, taxCode: 'cl_vat_19' })).toThrow(
      FinanceValidationError
    )
  })

  it('normaliza el signo: un total negativo (NC) se trata por su magnitud', () => {
    const b = deriveClfQuoteBreakdown({ totalClf: -119, taxCode: 'cl_vat_19' })

    expect(b.subtotalClf).toBeCloseTo(100, 6)
    expect(b.taxAmountClf).toBeCloseTo(19, 6)
  })
})
