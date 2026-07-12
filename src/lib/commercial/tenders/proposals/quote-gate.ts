/**
 * Proposal Studio F0 — el gate de margen del GO (TASK-1392).
 *
 * "NUNCA un GO sin margen sobre loaded cost" era una regla SIN MECANISMO: la Proposal no conocía su
 * costo. La costura es `proposals.quote_id` → `greenhouse_commercial.quotations`, donde el cotizador
 * (el ÚNICO que calcula, sobre loaded cost) ya persiste `effective_margin_pct` y `margin_floor_pct`.
 *
 * Este módulo es PURO (testeable sin DB): recibe la foto de la Quote y decide. FAIL-CLOSED en cada
 * rama: sin quote, sin margen conocido, margen no positivo o bajo el piso declarado → NO hay GO.
 * No aprobar por omisión.
 */

export interface QuoteMarginSnapshot {
  quotationId: string
  status: string | null
  effectiveMarginPct: number | null
  marginFloorPct: number | null
}

export type QuoteMarginGateResult =
  | { ok: true; effectiveMarginPct: number; marginFloorPct: number | null }
  | {
      ok: false
      code: 'quote_missing' | 'margin_unknown' | 'margin_not_positive' | 'margin_below_floor'
      message: string
    }

export const evaluateQuoteMarginGate = (quote: QuoteMarginSnapshot | null): QuoteMarginGateResult => {
  if (!quote) {
    return {
      ok: false,
      code: 'quote_missing',
      message:
        'La propuesta no tiene Quote vinculada: el gate de GO no puede evaluarse y FALLA CERRADO. ' +
        'Vinculá la cotización (attachProposalQuote) antes de decidir el bid.'
    }
  }

  if (quote.effectiveMarginPct === null || Number.isNaN(quote.effectiveMarginPct)) {
    return {
      ok: false,
      code: 'margin_unknown',
      message: `La Quote ${quote.quotationId} no tiene margen efectivo calculado: sin margen conocido no hay GO.`
    }
  }

  if (quote.effectiveMarginPct <= 0) {
    return {
      ok: false,
      code: 'margin_not_positive',
      message: `La Quote ${quote.quotationId} tiene margen efectivo ${quote.effectiveMarginPct}% ≤ 0: fit perfecto con margen negativo es NO-BID.`
    }
  }

  if (quote.marginFloorPct !== null && quote.effectiveMarginPct < quote.marginFloorPct) {
    return {
      ok: false,
      code: 'margin_below_floor',
      message:
        `La Quote ${quote.quotationId} tiene margen efectivo ${quote.effectiveMarginPct}% bajo el piso declarado ` +
        `${quote.marginFloorPct}%: el GO exige margen sobre el piso, no cualquier margen.`
    }
  }

  return { ok: true, effectiveMarginPct: quote.effectiveMarginPct, marginFloorPct: quote.marginFloorPct }
}
