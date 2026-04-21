import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { recordAudit } from '@/lib/commercial/governance/audit-log'
import { listQuotationTerms } from '@/lib/commercial/governance/terms-store'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { getFinanceQuoteDetailFromCanonical } from '@/lib/finance/quotation-canonical-store'
import { renderQuotationPdf } from '@/lib/finance/pdf/render-quotation-pdf'
import type {
  QuotationPdfFxFooter,
  RenderQuotationPdfInput
} from '@/lib/finance/pdf/contracts'
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
            exchange_rates
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
      quantity: toNumberSafe(row.quantity),
      unit: row.unit || 'unit',
      unitPrice: toNumberSafe(row.unit_price),
      subtotalAfterDiscount: toNumberSafe(row.subtotal_after_discount)
    })),
    totals: {
      subtotal: toNumberSafe(header.total_price_before_discount),
      totalDiscount: toNumberSafe(header.total_discount),
      total: toNumberSafe(header.total_price)
    },
    terms: includedTerms,
    fxFooter
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
