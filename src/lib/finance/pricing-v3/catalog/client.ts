import Decimal from 'decimal.js'

import { PricingV3Error } from '../errors'
import type { calculateCatalogQuote } from './quote'

type DeclaredThirdPartyCost = {
  settlement: string
  label: string
  amount: string
  currency: string
  quantity: string
  periodIds: number[]
}

/**
 * Costs the brief declares as paid by the client straight to their supplier (contract 1.4.0, `settlement:
 * 'client_direct'`), in the order declared. They are a note of the quote: they reach no row, no conversion and no
 * total, so a view lists them apart from every amount it adds up.
 *
 * Client-shaped: the declared concept, `amount x quantity` in the currency it was declared in (at the decimals of
 * the declared amount) and the periods it falls in. Never the supplier, the category or the evidence, which stay in
 * the brief. Empty for a brief that declares none, which is every brief written before contract 1.4.0.
 */
export function clientPaidDirectly(brief: { thirdPartyCosts?: readonly DeclaredThirdPartyCost[] } | undefined) {
  return (brief?.thirdPartyCosts ?? [])
    .filter(cost => cost.settlement === 'client_direct')
    .map(cost => ({
      label: cost.label,
      // The whole amount falls in each listed period, as the brief declares a cost of any settlement.
      amount: new Decimal(cost.amount).mul(cost.quantity).toFixed(cost.amount.split('.')[1]?.length ?? 0),
      currency: cost.currency,
      periodIds: [...cost.periodIds]
    }))
}

/**
 * Client allowlist. `amount` and `totals.net` are the final net of every contract (after commercial rounding,
 * discount and uplift). How that net was reached (rounding, uplift, discount) is internal and is never listed here.
 *
 * From contract 1.4.0 a re-invoiced third-party cost is a row like any other: its label and its final net, inside
 * the totals. A cost the client pays directly is listed apart under `clientPaidDirectly`, outside every total; the
 * key is absent when the brief declares none.
 */
export function projectCatalogQuote(result: ReturnType<typeof calculateCatalogQuote>, calculationId: string) {
  if (result.calculationStatus !== 'calculated' || result.reviewStatus !== 'within_policy' || !result.totals)
    throw new PricingV3Error('EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY')

  const paidDirectly = clientPaidDirectly(result.resolution.brief)

  return {
    documentType: 'draft_estimate' as const,
    binding: false,
    calculationId,
    quoteDate: result.resolution.brief!.quoteDate,
    currency: result.totals.currency,
    periods: result.periods.map(p => ({
      periodId: p.periodId,
      lines: p.result.lines.map(l => ({ label: l.label, kind: l.kind, amount: l.net }))
    })),
    totals: { net: result.totals.net, tax: result.totals.tax, grandTotal: result.totals.grandTotal },
    ...(paidDirectly.length ? { clientPaidDirectly: paidDirectly } : {})
  }
}

export function catalogQuoteMarkdown(view: ReturnType<typeof projectCatalogQuote>) {
  const safe = (v: string) => v.replace(/[|\r\n]/g, ' ')

  const rows = view.periods.flatMap(p =>
    p.lines.map(l => `| ${p.periodId} | ${safe(l.label)} | ${l.amount} ${view.currency} |`)
  )

  // After the totals, so that nothing above it reads as including these amounts.
  const paidDirectly = view.clientPaidDirectly?.length
    ? `\nPagado directamente por el cliente a su proveedor. No forma parte de esta estimación ni de su neto o total:\n\n| Mes | Concepto | Importe |\n|---|---|---:|\n${view.clientPaidDirectly
        .map(item => `| ${item.periodIds.join(', ')} | ${safe(item.label)} | ${item.amount} ${item.currency} |`)
        .join('\n')}\n`
    : ''

  return `# Estimación preliminar\n\nFecha: ${view.quoteDate}. No vinculante.\n\n| Mes | Concepto | Importe |\n|---|---|---:|\n${rows.join('\n')}\n\nNeto: ${view.totals.net} ${view.currency}.\nImpuestos: ${view.totals.tax ?? 'Pendientes'}.\nTotal: ${view.totals.grandTotal ?? 'Pendiente de impuestos'}.\n${paidDirectly}`
}
