import 'server-only'

/**
 * Input contract for the Greenhouse quotation PDF renderer.
 *
 * Only externally-safe fields. Cost columns, cost breakdown, and internal margin
 * data must NEVER reach the PDF — this interface is the firewall.
 */
export interface QuotationPdfLineItem {
  label: string
  description: string | null
  quantity: number
  unit: string
  unitPrice: number
  subtotalAfterDiscount: number
}

export interface QuotationPdfTotals {
  subtotal: number
  totalDiscount: number

  /**
   * Total including IVA when applicable. For exempt / non-billable quotes
   * this equals `subtotal - totalDiscount` (IVA is zero). The `tax` block
   * below carries the explicit breakdown.
   */
  total: number

  /**
   * TASK-530: explicit IVA block for the PDF. Optional — legacy quotes
   * without a persisted tax snapshot render `Subtotal` → `Total` directly.
   */
  tax?: {

    /** Canonical code: `cl_vat_19` / `cl_vat_exempt` / `cl_vat_non_billable`. */
    code: string

    /** Human-readable Spanish label (e.g. "IVA 19%", "IVA Exento"). */
    label: string

    /** Rate as decimal — null for exempt / non-billable. */
    rate: number | null

    /** Amount in the quote currency. 0 for exempt / non-billable. */
    amount: number

    /** True when the code represents an exempt / non-billable case. */
    isExempt: boolean
  } | null
}

export interface QuotationPdfTerm {
  title: string
  bodyResolved: string
  sortOrder: number
}

/**
 * TASK-466 — Optional FX snapshot footer. Rendered by the PDF document when
 * the quote output currency required a conversion (i.e. the snapshot differs
 * from the canonical USD anchor, or was composed via USD). For USD-direct or
 * pure-CLP quotes this field may be omitted.
 */
export interface QuotationPdfFxFooter {
  outputCurrency: string
  baseCurrency: string
  rate: number
  rateDateResolved: string | null
  source: string | null
  composedViaUsd: boolean
}

export interface RenderQuotationPdfInput {
  quotationId: string
  quotationNumber: string
  versionNumber: number
  currency: string
  quoteDate: string
  validUntil: string | null
  clientName: string | null
  organizationName: string | null
  description: string | null
  lineItems: QuotationPdfLineItem[]
  totals: QuotationPdfTotals
  terms: QuotationPdfTerm[]
  fxFooter?: QuotationPdfFxFooter | null
}
