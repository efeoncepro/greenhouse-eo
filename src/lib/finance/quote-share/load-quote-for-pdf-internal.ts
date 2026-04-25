import 'server-only'

import { query } from '@/lib/db'
import { listQuotationTerms } from '@/lib/commercial/governance/terms-store'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import type {
  QuotationPdfFxFooter,
  QuotationPdfLegalEntity,
  QuotationPdfSalesRep,
  QuotationPdfVerification,
  RenderQuotationPdfInput
} from '@/lib/finance/pdf/contracts'
import {
  buildShortVerificationLabel,
  buildVerificationUrl,
  computePdfContentHash,
  generateVerificationQrDataUrl
} from '@/lib/finance/pdf/qr-verification'
import { DEFAULT_LEGAL_ENTITY } from '@/lib/finance/pdf/tokens'
import { extractQuotationFxSnapshot } from '@/lib/finance/quotation-fx-snapshot'

/**
 * TASK-631 Fase 4 — Internal PDF input loader.
 *
 * Same data model as `loadPublicQuoteView` but without HMAC token check.
 * For server-side use only by `getOrCreateQuotePdfBuffer` which is itself
 * gated by either authenticated portal access or by the public-page loader
 * that already validated the token.
 *
 * Throws if the quote does not exist.
 */

interface QuoteHeaderRow extends Record<string, unknown> {
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
}

interface OrgRow extends Record<string, unknown> {
  organization_name: string | null
  legal_name: string | null
}

interface LineRow extends Record<string, unknown> {
  label: string
  description: string | null
  quantity: string | number | null
  unit: string | null
  unit_price: string | number | null
  subtotal_after_discount: string | number | null
  product_code: string | null
  product_description_rich_html: string | null
}

interface OperatingEntityRow extends Record<string, unknown> {
  legal_name: string | null
  tax_id: string | null
  registered_address: string | null
  website: string | null
}

interface SalesRepRow extends Record<string, unknown> {
  full_name: string | null
  job_title: string | null
  work_email: string | null
  phone: string | null
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

export const loadInternalPdfInputForQuote = async (
  quotationId: string,
  versionNumber: number,
  options: { actorUserId?: string | null } = {}
): Promise<RenderQuotationPdfInput> => {
  const identity = await resolveQuotationIdentity(quotationId)

  if (!identity) {
    throw new Error(`Quotation not found: ${quotationId}`)
  }

  const headerRows = await query<QuoteHeaderRow>(
    `SELECT quotation_number, current_version, currency, quote_date, valid_until,
            description, client_name_cache, organization_id,
            total_price_before_discount, total_discount, total_price,
            exchange_rates,
            tax_code, tax_rate_snapshot, tax_amount_snapshot, is_tax_exempt
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1`,
    [identity.quotationId]
  )

  const header = headerRows[0]

  if (!header) {
    throw new Error(`Quotation header not found: ${quotationId}`)
  }

  const currency = String(header.currency || 'CLP').toUpperCase()

  const lineRows = await query<LineRow>(
    `SELECT li.label, li.description, li.quantity, li.unit, li.unit_price,
            li.subtotal_after_discount,
            pc.product_code,
            pc.description_rich_html AS product_description_rich_html
       FROM greenhouse_commercial.quotation_line_items li
       LEFT JOIN greenhouse_commercial.product_catalog pc
         ON pc.product_id = li.product_id
       WHERE li.quotation_id = $1 AND li.version_number = $2
       ORDER BY li.sort_order ASC NULLS LAST, li.created_at ASC NULLS LAST`,
    [identity.quotationId, versionNumber]
  )

  let organizationName: string | null = null

  if (header.organization_id) {
    const orgRows = await query<OrgRow>(
      `SELECT organization_name, legal_name
         FROM greenhouse_core.organizations
         WHERE organization_id = $1`,
      [header.organization_id]
    )

    organizationName = orgRows[0]?.organization_name || orgRows[0]?.legal_name || null
  }

  const allTerms = await listQuotationTerms(identity.quotationId)

  const terms = allTerms
    .filter(t => t.included)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(t => ({
      title: t.title ?? '',
      bodyResolved: t.bodyResolved,
      sortOrder: t.sortOrder
    }))

  let legalEntity: QuotationPdfLegalEntity = DEFAULT_LEGAL_ENTITY

  try {
    const entityRows = await query<OperatingEntityRow>(
      `SELECT legal_name, tax_id, registered_address, website
         FROM greenhouse_core.organizations
         WHERE is_operating_entity = TRUE
         ORDER BY created_at ASC LIMIT 1`
    )

    const e = entityRows[0]

    if (e?.legal_name && e.tax_id && e.registered_address) {
      legalEntity = {
        legalName: e.legal_name,
        taxId: e.tax_id,
        address: e.registered_address,
        website: e.website ?? null
      }
    }
  } catch {
    // best-effort
  }

  const fxSnapshot = extractQuotationFxSnapshot(header.exchange_rates)
  let fxFooter: QuotationPdfFxFooter | null = null

  if (fxSnapshot) {
    const shouldRender =
      fxSnapshot.outputCurrency !== fxSnapshot.baseCurrency || fxSnapshot.composedViaUsd

    if (shouldRender) {
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

  const totalNet = toNumberSafe(header.total_price)
  const taxAmount = toNumberSafe(header.tax_amount_snapshot)
  const total = totalNet + taxAmount

  // Sales rep (best-effort, only if actorUserId provided)
  let salesRep: QuotationPdfSalesRep | null = null

  if (options.actorUserId) {
    try {
      const memberRows = await query<SalesRepRow>(
        `SELECT tm.full_name, tm.job_title, tm.work_email, tm.phone
           FROM greenhouse.team_members tm
           INNER JOIN greenhouse.client_users cu ON cu.member_id = tm.member_id
           WHERE cu.user_id = $1 LIMIT 1`,
        [options.actorUserId]
      )

      const member = memberRows[0]

      if (member?.full_name) {
        salesRep = {
          name: member.full_name,
          role: member.job_title ?? 'Account Lead',
          email: member.work_email ?? null,
          phone: member.phone ?? null
        }
      }
    } catch {
      // best-effort
    }
  }

  // QR verification block (signed token + PNG data URL)
  let verification: QuotationPdfVerification | null = null

  try {
    const pdfHash = computePdfContentHash({
      quotationId: identity.quotationId,
      versionNumber,
      total,
      currency,
      lineCount: lineRows.length
    })

    const tokenInput = { quotationId: identity.quotationId, versionNumber, pdfHash }
    const publicUrl = buildVerificationUrl(tokenInput)

    if (publicUrl) {
      const qrDataUrl = await generateVerificationQrDataUrl(tokenInput)

      verification = {
        publicUrl,
        shortLabel: buildShortVerificationLabel(tokenInput),
        qrDataUrl
      }
    }
  } catch {
    // best-effort
  }

  return {
    quotationId: identity.quotationId,
    quotationNumber: header.quotation_number || identity.quotationId,
    versionNumber,
    currency,
    quoteDate: toIsoDate(header.quote_date),
    validUntil: toIsoDateNullable(header.valid_until),
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
    terms,
    fxFooter,
    legalEntity,
    subBrand: 'efeonce',
    salesRep,
    verification
  }
}
