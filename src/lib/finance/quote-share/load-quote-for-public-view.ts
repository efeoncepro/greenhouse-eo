import 'server-only'

import { query } from '@/lib/db'
import { listQuotationTerms } from '@/lib/commercial/governance/terms-store'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import {
  computePdfContentHash,
  computeVerificationToken
} from '@/lib/finance/pdf/qr-verification'
import { extractQuotationFxSnapshot } from '@/lib/finance/quotation-fx-snapshot'
import { DEFAULT_LEGAL_ENTITY } from '@/lib/finance/pdf/tokens'

import type {
  QuotationPdfFxFooter,
  QuotationPdfLegalEntity,
  QuotationPdfLineItem,
  QuotationPdfSubBrand,
  QuotationPdfTerm,
  QuotationPdfTotals
} from '@/lib/finance/pdf/contracts'

interface QuotationHeaderRow extends Record<string, unknown> {
  quotation_number: string
  current_version: number
  currency: string
  quote_date: string | Date | null
  valid_until: string | Date | null
  description: string | null
  client_name_cache: string | null
  organization_id: string | null
  total_price_before_discount: string | number | null
  total_discount: string | number | null
  total_price: string | number | null
  exchange_rates: unknown
  tax_code: string | null
  tax_rate_snapshot: string | number | null
  tax_amount_snapshot: string | number | null
  is_tax_exempt: boolean | null
  status: string | null
  accepted_at: string | Date | null
  accepted_by_name: string | null
  accepted_by_role: string | null
}

interface QuotationOrgRow extends Record<string, unknown> {
  organization_name: string | null
  legal_name: string | null
}

interface QuotationLineRow extends Record<string, unknown> {
  label: string
  description: string | null
  quantity: string | number | null
  unit: string | null
  unit_price: string | number | null
  subtotal_after_discount: string | number | null
  sort_order: number | null
  created_at: string | Date | null
  product_code: string | null
  product_description_rich_html: string | null
}

interface OperatingEntityRow extends Record<string, unknown> {
  legal_name: string | null
  tax_id: string | null
  registered_address: string | null
  website: string | null
}

const toNumberSafe = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const toIsoDate = (value: string | Date | null): string => {
  if (!value) return new Date().toISOString().slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const toIsoDateNullable = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

export interface PublicQuoteViewModel {
  quotationId: string
  quotationNumber: string
  versionNumber: number
  currency: string
  quoteDate: string
  validUntil: string | null
  status: string
  clientName: string | null
  organizationName: string | null
  description: string | null
  lineItems: QuotationPdfLineItem[]
  totals: QuotationPdfTotals
  terms: QuotationPdfTerm[]
  fxFooter: QuotationPdfFxFooter | null
  subBrand: QuotationPdfSubBrand
  legalEntity: QuotationPdfLegalEntity

  /** Whether the validUntil has passed today (computed server-side) */
  isExpired: boolean

  /** Whether the requested version is still the current_version of the quote */
  isLatestVersion: boolean
  currentVersion: number

  /** Acceptance state — populated when accepted_at is set on the quotation */
  acceptedAt: string | null
  acceptedByName: string | null
  acceptedByRole: string | null
}

export type PublicQuoteAuthOutcome =
  | { kind: 'ok'; view: PublicQuoteViewModel }
  | { kind: 'not-found' }
  | { kind: 'invalid-token' }
  | { kind: 'no-secret' }

/**
 * Loads the quote view-model for a public URL while validating the HMAC
 * signed token against the same content hash the PDF generator used.
 *
 * Returns kinds:
 * - `ok` — token matches, view ready to render
 * - `not-found` — quotation does not exist
 * - `invalid-token` — quotation exists but token doesn't match (altered or wrong link)
 * - `no-secret` — server lacks GREENHOUSE_QUOTE_VERIFICATION_SECRET
 */
export const loadPublicQuoteView = async (input: {
  quotationId: string
  versionNumber: number
  token: string
}): Promise<PublicQuoteAuthOutcome> => {
  const identity = await resolveQuotationIdentity(input.quotationId)

  if (!identity) return { kind: 'not-found' }

  const headerRows = await query<QuotationHeaderRow>(
    `SELECT quotation_number, current_version, currency, quote_date, valid_until,
            description, client_name_cache, organization_id,
            total_price_before_discount, total_discount, total_price,
            exchange_rates,
            tax_code, tax_rate_snapshot, tax_amount_snapshot, is_tax_exempt,
            status,
            accepted_at, accepted_by_name, accepted_by_role
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1`,
    [identity.quotationId]
  )

  const header = headerRows[0]

  if (!header) return { kind: 'not-found' }

  // Use the version requested by the URL (the token was signed against
  // its content). Track current_version separately to surface "newer
  // version available" to the client when they look at an old link.
  const versionNumber = input.versionNumber
  const currentVersion = Number(header.current_version ?? input.versionNumber)
  const isLatestVersion = currentVersion === versionNumber
  const currency = String(header.currency || 'CLP').toUpperCase()

  const lineRows = await query<QuotationLineRow>(
    `SELECT li.label,
            li.description,
            li.quantity,
            li.unit,
            li.unit_price,
            li.subtotal_after_discount,
            li.sort_order,
            li.created_at,
            pc.product_code,
            pc.description_rich_html AS product_description_rich_html
       FROM greenhouse_commercial.quotation_line_items li
       LEFT JOIN greenhouse_commercial.product_catalog pc
         ON pc.product_id = li.product_id
       WHERE li.quotation_id = $1 AND li.version_number = $2
       ORDER BY li.sort_order ASC NULLS LAST, li.created_at ASC NULLS LAST`,
    [identity.quotationId, versionNumber]
  )

  const totalNet = toNumberSafe(header.total_price)
  const taxAmount = toNumberSafe(header.tax_amount_snapshot)
  const total = totalNet + taxAmount

  // Verify the token using the same content hash the PDF used
  const expectedHash = computePdfContentHash({
    quotationId: identity.quotationId,
    versionNumber,
    total,
    currency,
    lineCount: lineRows.length
  })

  const expectedToken = computeVerificationToken({
    quotationId: identity.quotationId,
    versionNumber,
    pdfHash: expectedHash
  })

  if (!expectedToken) return { kind: 'no-secret' }

  if (expectedToken !== input.token) return { kind: 'invalid-token' }

  // Token matches — load remaining context
  let organizationName: string | null = null

  if (header.organization_id) {
    const orgRows = await query<QuotationOrgRow>(
      `SELECT organization_name, legal_name
         FROM greenhouse_core.organizations
         WHERE organization_id = $1`,
      [header.organization_id]
    )

    const org = orgRows[0]

    organizationName = org?.organization_name || org?.legal_name || null
  }

  const allTerms = await listQuotationTerms(identity.quotationId)

  const includedTerms = allTerms
    .filter(term => term.included)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(term => ({
      title: term.title ?? '',
      bodyResolved: term.bodyResolved,
      sortOrder: term.sortOrder
    }))

  // Legal entity (best-effort, falls back to default)
  let legalEntity: QuotationPdfLegalEntity = DEFAULT_LEGAL_ENTITY

  try {
    const entityRows = await query<OperatingEntityRow>(
      `SELECT legal_name, tax_id, registered_address, website
         FROM greenhouse_core.organizations
         WHERE is_operating_entity = TRUE
         ORDER BY created_at ASC
         LIMIT 1`
    )

    const entity = entityRows[0]

    if (entity?.legal_name && entity.tax_id && entity.registered_address) {
      legalEntity = {
        legalName: entity.legal_name,
        taxId: entity.tax_id,
        address: entity.registered_address,
        website: entity.website ?? null
      }
    }
  } catch {
    // best-effort
  }

  // FX footer (only when currency required conversion)
  const fxSnapshot = extractQuotationFxSnapshot(header.exchange_rates)
  let fxFooter: QuotationPdfFxFooter | null = null

  if (fxSnapshot) {
    const shouldRenderFooter =
      fxSnapshot.outputCurrency !== fxSnapshot.baseCurrency || fxSnapshot.composedViaUsd

    if (shouldRenderFooter) {
      fxFooter = {
        outputCurrency: fxSnapshot.outputCurrency,
        baseCurrency: fxSnapshot.baseCurrency,
        rate: fxSnapshot.rate,
        rateDateResolved: fxSnapshot.rateDateResolved,
        source: fxSnapshot.source,
        composedViaUsd: fxSnapshot.composedViaUsd
      }
    }
  }

  // Compute expiration
  const validUntilStr = toIsoDateNullable(header.valid_until)
  let isExpired = false

  if (validUntilStr) {
    const validUntilDate = new Date(validUntilStr)
    const today = new Date()

    today.setHours(0, 0, 0, 0)
    isExpired = validUntilDate < today
  }

  const view: PublicQuoteViewModel = {
    quotationId: identity.quotationId,
    quotationNumber: header.quotation_number || identity.quotationId,
    versionNumber,
    currency,
    quoteDate: toIsoDate(header.quote_date),
    validUntil: validUntilStr,
    status: header.status ?? 'unknown',
    clientName: header.client_name_cache || organizationName || null,
    organizationName,
    description: header.description || null,
    lineItems: lineRows.map(row => ({
      label: row.label,
      description: row.description,
      descriptionRichHtml: row.product_description_rich_html ?? null,
      productCode: row.product_code ?? null,
      bundleId: null,
      bundleLabel: null,
      quantity: toNumberSafe(row.quantity),
      unit: row.unit || 'unit',
      unitPrice: toNumberSafe(row.unit_price),
      subtotalAfterDiscount: toNumberSafe(row.subtotal_after_discount)
    })),
    totals: {
      subtotal: toNumberSafe(header.total_price_before_discount),
      totalDiscount: toNumberSafe(header.total_discount),
      total,
      tax: header.tax_code
        ? {
            code: header.tax_code,
            label:
              header.tax_code === 'cl_vat_19'
                ? `IVA ${Number(header.tax_rate_snapshot ?? 0.19) * 100}%`
                : header.tax_code === 'cl_vat_exempt'
                  ? 'IVA Exento'
                  : 'No Afecto a IVA',
            rate:
              header.tax_rate_snapshot !== null && header.tax_rate_snapshot !== undefined
                ? Number(header.tax_rate_snapshot)
                : null,
            amount: taxAmount,
            isExempt: Boolean(header.is_tax_exempt)
          }
        : null
    },
    terms: includedTerms,
    fxFooter,
    subBrand: 'efeonce',
    legalEntity,
    isExpired,
    isLatestVersion,
    currentVersion,
    acceptedAt:
      header.accepted_at instanceof Date
        ? header.accepted_at.toISOString()
        : (header.accepted_at as string | null),
    acceptedByName: header.accepted_by_name,
    acceptedByRole: header.accepted_by_role
  }

  return { kind: 'ok', view }
}
