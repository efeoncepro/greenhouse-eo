// TASK-530: client-safe Chile IVA constants.
//
// Mirror of the seed rows in `greenhouse_finance.tax_codes`. This file has
// no `server-only` import so the builder / summary dock / detail views can
// preview `Neto / IVA / Total` before the quote is persisted. The server
// still re-resolves the real rate from the catalogue at issue time — these
// constants are purely for optimistic UI.

export const DEFAULT_CHILE_IVA_RATE = 0.19

/** The canonical Chile quote tax codes as persisted in the catalogue. */
export const QUOTE_TAX_CODE_VALUES = ['cl_vat_19', 'cl_vat_exempt', 'cl_vat_non_billable'] as const

export type QuoteTaxCodeValue = (typeof QUOTE_TAX_CODE_VALUES)[number]

/** Rate for each canonical code — null for exempt / non-billable. */
export const QUOTE_TAX_CODE_RATES: Record<QuoteTaxCodeValue, number | null> = {
  cl_vat_19: DEFAULT_CHILE_IVA_RATE,
  cl_vat_exempt: null,
  cl_vat_non_billable: null
}

/** Human-readable Spanish label for each code (mirrors `labelEs` in the DB). */
export const QUOTE_TAX_CODE_LABELS: Record<QuoteTaxCodeValue, string> = {
  cl_vat_19: 'IVA 19%',
  cl_vat_exempt: 'IVA Exento',
  cl_vat_non_billable: 'No Afecto a IVA'
}

export const isQuoteTaxCodeValue = (value: unknown): value is QuoteTaxCodeValue =>
  typeof value === 'string' && (QUOTE_TAX_CODE_VALUES as readonly string[]).includes(value)

/**
 * Client-side preview of the Chile tax amounts for a given net amount and
 * tax code. Mirrors {@link computeChileTaxAmounts} for `vat_output` /
 * `vat_exempt` / `vat_non_billable` but stays synchronous and free of any
 * server imports. Amounts are rounded to 2 decimals.
 */
export const previewChileTaxAmounts = (
  netAmount: number,
  taxCode: QuoteTaxCodeValue = 'cl_vat_19'
): { taxableAmount: number; taxAmount: number; totalAmount: number } => {
  if (!Number.isFinite(netAmount) || netAmount < 0) {
    return { taxableAmount: 0, taxAmount: 0, totalAmount: 0 }
  }

  const rate = QUOTE_TAX_CODE_RATES[taxCode]
  const taxable = Math.round(netAmount * 100) / 100

  if (rate === null) {
    return { taxableAmount: taxable, taxAmount: 0, totalAmount: taxable }
  }

  const tax = Math.round(taxable * rate * 100) / 100

  return { taxableAmount: taxable, taxAmount: tax, totalAmount: Math.round((taxable + tax) * 100) / 100 }
}
