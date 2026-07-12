import { describe, expect, it } from 'vitest'

import { evaluateQuoteMarginGate } from '../quote-gate'

/**
 * TASK-1392 — el gate de GO es FAIL-CLOSED en cada rama: "NUNCA un GO sin margen sobre loaded
 * cost" deja de ser una regla sin mecanismo. No aprobar por omisión.
 */
describe('evaluateQuoteMarginGate', () => {
  const base = { quotationId: 'qt-probe', status: 'approved', marginFloorPct: null }

  it('sin Quote vinculada → quote_missing (el gate no puede evaluarse)', () => {
    expect(evaluateQuoteMarginGate(null)).toMatchObject({ ok: false, code: 'quote_missing' })
  })

  it('margen desconocido (null) → margin_unknown, nunca aprobar por omisión', () => {
    expect(evaluateQuoteMarginGate({ ...base, effectiveMarginPct: null })).toMatchObject({
      ok: false,
      code: 'margin_unknown'
    })
  })

  it('margen 0 o negativo → NO-BID aunque el fit sea perfecto', () => {
    expect(evaluateQuoteMarginGate({ ...base, effectiveMarginPct: 0 })).toMatchObject({
      ok: false,
      code: 'margin_not_positive'
    })
    expect(evaluateQuoteMarginGate({ ...base, effectiveMarginPct: -12.5 })).toMatchObject({
      ok: false,
      code: 'margin_not_positive'
    })
  })

  it('margen bajo el piso declarado → margin_below_floor', () => {
    expect(
      evaluateQuoteMarginGate({ ...base, effectiveMarginPct: 18, marginFloorPct: 25 })
    ).toMatchObject({ ok: false, code: 'margin_below_floor' })
  })

  it('margen positivo sobre el piso → GO, y el resultado registra el margen que aprobó', () => {
    expect(evaluateQuoteMarginGate({ ...base, effectiveMarginPct: 32, marginFloorPct: 25 })).toEqual({
      ok: true,
      effectiveMarginPct: 32,
      marginFloorPct: 25
    })
  })
})
