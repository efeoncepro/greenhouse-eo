import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { recordAudit } from '@/lib/commercial/governance/audit-log'
import { listQuotationTerms } from '@/lib/commercial/governance/terms-store'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { getFinanceQuoteDetailFromCanonical } from '@/lib/finance/quotation-canonical-store'
import { renderQuotationPdf } from '@/lib/finance/pdf/render-quotation-pdf'
import type {
  QuotationPdfFxFooter,
  QuotationPdfLegalEntity,
  QuotationPdfSalesRep,
  RenderQuotationPdfInput
} from '@/lib/finance/pdf/contracts'
import { DEFAULT_LEGAL_ENTITY } from '@/lib/finance/pdf/tokens'
import { extractQuotationFxSnapshot } from '@/lib/finance/quotation-fx-snapshot'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

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

  // Optional enrichment fields populated when canonical line has a product ref
  product_code: string | null
  product_description_rich_html: string | null
  bundle_id: string | null
  bundle_label: string | null
}

interface TeamMemberRow extends Record<string, unknown> {
  full_name: string | null
  job_title: string | null
  work_email: string | null
  phone: string | null
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

const sanitizeFileName = (value: string): string => value.replace(/[^A-Za-z0-9._-]+/g, '-')

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  // Tenant scope enforcement: canonical detail lookup applies space filter.
  const detail = await getFinanceQuoteDetailFromCanonical({ tenant, quoteId: id })

  if (!detail) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const headerRows = await query<QuotationHeaderRow>(
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
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

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

  const lineRows = await query<QuotationLineRow>(
    `SELECT label, description, quantity, unit, unit_price, subtotal_after_discount,
            sort_order, created_at
       FROM greenhouse_commercial.quotation_line_items
       WHERE quotation_id = $1 AND version_number = $2
       ORDER BY sort_order ASC NULLS LAST, created_at ASC NULLS LAST`,
    [identity.quotationId, header.current_version]
  )

  const allTerms = await listQuotationTerms(identity.quotationId)

  const includedTerms = allTerms
    .filter(term => term.included)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(term => ({
      title: term.title ?? '',
      bodyResolved: term.bodyResolved,
      sortOrder: term.sortOrder
    }))

  const quotationNumber = header.quotation_number || identity.quotationId
  const versionNumber = Number(header.current_version ?? 1)
  const currency = String(header.currency || 'CLP').toUpperCase()

  // TASK-629 — Sales rep lookup (best-effort, falls back to null)
  let salesRep: QuotationPdfSalesRep | null = null

  try {
    const memberRows = await query<TeamMemberRow>(
      `SELECT tm.full_name, tm.job_title, tm.work_email, tm.phone
         FROM greenhouse.team_members tm
         INNER JOIN greenhouse.client_users cu
           ON cu.member_id = tm.member_id
         WHERE cu.user_id = $1
         LIMIT 1`,
      [tenant.userId]
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
    // best-effort — sales rep query shouldn't block PDF generation
  }

  // TASK-629 — Operating legal entity lookup (dynamic, Decision 7 v1.3)
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
    // best-effort — fall back to DEFAULT_LEGAL_ENTITY
  }

  // TASK-466 — Build FX footer from the snapshot frozen at issue time. The
  // footer is only shown when the output currency required conversion
  // (non-USD output OR composed via USD). For USD-direct or CLP quotes with
  // no snapshot the footer is omitted.
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

  const pdfInput: RenderQuotationPdfInput = {
    quotationId: identity.quotationId,
    quotationNumber,
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
      bundleId: row.bundle_id ?? null,
      bundleLabel: row.bundle_label ?? null,
      quantity: toNumberSafe(row.quantity),
      unit: row.unit || 'unit',
      unitPrice: toNumberSafe(row.unit_price),
      subtotalAfterDiscount: toNumberSafe(row.subtotal_after_discount)
    })),
    totals: {
      subtotal: toNumberSafe(header.total_price_before_discount),
      totalDiscount: toNumberSafe(header.total_discount),

      // TASK-530: total INCLUDES IVA — the quotation header `total_price` is
      // net (no IVA) per pricing engine contract. We add the snapshot amount
      // so the PDF headline matches the invoice that will follow.
      total: toNumberSafe(header.total_price) + toNumberSafe(header.tax_amount_snapshot),
      tax: header.tax_code
        ? {
            code: header.tax_code,
            label:
              header.tax_code === 'cl_vat_19'
                ? `IVA ${Number(header.tax_rate_snapshot ?? 0.19) * 100}%`
                : header.tax_code === 'cl_vat_exempt'
                  ? 'IVA Exento'
                  : 'No Afecto a IVA',
            rate: header.tax_rate_snapshot !== null && header.tax_rate_snapshot !== undefined
              ? Number(header.tax_rate_snapshot)
              : null,
            amount: toNumberSafe(header.tax_amount_snapshot),
            isExempt: Boolean(header.is_tax_exempt)
          }
        : null
    },
    terms: includedTerms,
    fxFooter,
    salesRep,
    legalEntity
  }

  const pdfBuffer = await renderQuotationPdf(pdfInput)

  await recordAudit({
    quotationId: identity.quotationId,
    versionNumber,
    action: 'pdf_generated',
    actorUserId: tenant.userId,
    actorName: tenant.clientName || tenant.userId,
    details: {
      quotationNumber,
      currency,
      lineCount: lineRows.length,
      termCount: includedTerms.length
    }
  })

  const { searchParams } = new URL(request.url)
  const download = searchParams.get('download') === '1'
  const disposition = download ? 'attachment' : 'inline'
  const safeNumber = sanitizeFileName(quotationNumber)
  const fileName = `${safeNumber}-v${versionNumber}.pdf`

  const body = new Uint8Array(pdfBuffer)

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${fileName}"`,
      'Cache-Control': 'no-store'
    }
  })
}
