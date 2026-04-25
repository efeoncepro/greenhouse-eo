import 'server-only'

import type { SubBrandCode } from './tokens'

/**
 * Input contract for the Greenhouse quotation PDF renderer.
 *
 * Only externally-safe fields. Cost columns, cost breakdown, and internal margin
 * data must NEVER reach the PDF — this interface is the firewall.
 */
export interface QuotationPdfLineItem {
  label: string
  description: string | null

  /**
   * Rich HTML description from product_catalog (TASK-603 + TASK-629).
   * Whitelist-sanitized: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>.
   * When present and non-empty, the Scope of Work section renders this
   * instead of the plain `description` field above.
   */
  descriptionRichHtml: string | null

  /**
   * Optional product code / SKU shown as small caption next to the line label.
   */
  productCode: string | null

  /**
   * Optional bundle id grouping multiple line items together. When set, the
   * Commercial Proposal renders these lines under a bundle row with subtotal.
   */
  bundleId: string | null

  /**
   * Optional bundle display name. Only the FIRST line of a bundle needs to set
   * this — subsequent lines with the same `bundleId` inherit it.
   */
  bundleLabel: string | null
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
 * TASK-466 — Optional FX snapshot footer.
 */
export interface QuotationPdfFxFooter {
  outputCurrency: string
  baseCurrency: string
  rate: number
  rateDateResolved: string | null
  source: string | null
  composedViaUsd: boolean
}

/**
 * TASK-629 — Sales rep info for Cover page "Preparada por" block.
 * Resolved from session.tenant.userId → team_members lookup.
 */
export interface QuotationPdfSalesRep {
  name: string
  role: string | null
  email: string | null
  phone: string | null
}

/**
 * TASK-629 — Issuer legal entity. Resolved dynamically from
 * greenhouse_core.organizations where is_operating_entity=TRUE
 * (Decision 7 RESEARCH-005 v1.3). Falls back to DEFAULT_LEGAL_ENTITY.
 */
export interface QuotationPdfLegalEntity {
  legalName: string
  taxId: string
  address: string
  website: string | null
}

/**
 * TASK-629 — Investment timeline milestones. When present the Investment
 * Timeline section is rendered (conditional). Each milestone represents a
 * billing event with date label, milestone name, and amount.
 */
export interface QuotationPdfMilestone {
  dateLabel: string         // "Mayo 2026 · M0", "Junio 2026 · M1", etc.
  title: string             // "Kick-off & onboarding", "Operación mensual #1"
  detail: string | null     // Description below title
  amountLabel: string       // "USD 14,100", "10 × USD 14,200"
}

export interface QuotationPdfPaymentMethods {
  description: string       // Free text describing accepted methods
}

/**
 * TASK-629 — QR verification block. URL is the public verification page
 * with HMAC-signed token (Decision 5 RESEARCH-005 v1.3).
 */
export interface QuotationPdfVerification {
  publicUrl: string         // Full URL with signed token
  shortLabel: string        // For displaying inside the QR's caption
  qrDataUrl: string | null  // PNG data URL ready for <Image src={...}>; null when secret not configured
}

/**
 * TASK-629 — Resolved business line for sub-brand badge in Cover + headers.
 * Computed via fallback chain: quotation.business_line_code_override →
 * majority of line_items.business_line_code → 'efeonce' (Decision 6 v1.3).
 */
export type QuotationPdfSubBrand = SubBrandCode

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

  // ── TASK-629 v2 fields (all optional — backward-compatible) ──────────
  subBrand?: QuotationPdfSubBrand
  salesRep?: QuotationPdfSalesRep | null
  legalEntity?: QuotationPdfLegalEntity | null
  milestones?: QuotationPdfMilestone[]
  paymentMethods?: QuotationPdfPaymentMethods | null
  verification?: QuotationPdfVerification | null

  /**
   * Subtitle / pitch shown under the hero title in the Cover. Limited to
   * ~280 chars to fit visually. Falls back to the first 280 chars of
   * `description` when not provided.
   */
  heroSubtitle?: string | null

  /**
   * Three highlights shown in the Cover stripe. Defaults are derived from
   * totals + currency + duration when not provided.
   */
  coverHighlights?: Array<{
    label: string
    value: string
    hint: string | null
  }>

  /**
   * Forces enterprise treatment regardless of total/lines (Decision 17 v1.4).
   */
  forceEnterpriseTemplate?: boolean

  /**
   * Total in CLP equivalent — used by `computePdfFlags` to decide which
   * conditional sections render. When omitted, the threshold check uses
   * `totals.total` directly assuming currency=CLP.
   */
  totalInClp?: number
}
