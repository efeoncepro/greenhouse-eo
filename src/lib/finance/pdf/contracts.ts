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
  total: number
}

export interface QuotationPdfTerm {
  title: string
  bodyResolved: string
  sortOrder: number
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
}
