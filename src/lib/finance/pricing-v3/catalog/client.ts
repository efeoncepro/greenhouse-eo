import type { calculateCatalogQuote } from './quote'

export function projectCatalogQuote(result: ReturnType<typeof calculateCatalogQuote>, calculationId: string) {
  if (result.calculationStatus !== 'calculated' || result.reviewStatus !== 'within_policy' || !result.totals)
    throw new Error('EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY')

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
    totals: { net: result.totals.net, tax: result.totals.tax, grandTotal: result.totals.grandTotal }
  }
}

export function catalogQuoteMarkdown(view: ReturnType<typeof projectCatalogQuote>) {
  const safe = (v: string) => v.replace(/[|\r\n]/g, ' ')

  const rows = view.periods.flatMap(p =>
    p.lines.map(l => `| ${p.periodId} | ${safe(l.label)} | ${l.amount} ${view.currency} |`)
  )

  return `# Estimación preliminar\n\nFecha: ${view.quoteDate}. No vinculante.\n\n| Mes | Concepto | Importe |\n|---|---|---:|\n${rows.join('\n')}\n\nNeto: ${view.totals.net} ${view.currency}.\nImpuestos: ${view.totals.tax ?? 'Pendientes'}.\nTotal: ${view.totals.grandTotal ?? 'Pendiente de impuestos'}.\n`
}
