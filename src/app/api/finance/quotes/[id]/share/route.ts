import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import {
  computePdfContentHash,
  computeVerificationToken
} from '@/lib/finance/pdf/qr-verification'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import {
  createOrReuseQuoteShortLink,
  getActiveShortLinksForQuote
} from '@/lib/finance/quote-share/short-link'
import { buildShortQuoteUrl } from '@/lib/finance/quote-share/url-builder'
import { getShareViewAggregate } from '@/lib/finance/quote-share/view-tracker'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface QuoteHeaderRow extends Record<string, unknown> {
  current_version: number
  currency: string
  total_price: string | number | null
  tax_amount_snapshot: string | number | null
  valid_until: string | Date | null
}

interface LineCountRow extends Record<string, unknown> {
  count: string | number | null
}

const computeDefaultExpiry = (validUntil: string | Date | null): Date | null => {
  if (!validUntil) return null

  const base = validUntil instanceof Date ? validUntil : new Date(validUntil)
  const expiry = new Date(base)

  expiry.setDate(expiry.getDate() + 30)

  return expiry
}

/**
 * GET /api/finance/quotes/[id]/share
 *
 * Lists active short links for a quote (sales rep dashboard).
 */
export async function GET(
  _request: Request,
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

  const headerRows = await query<QuoteHeaderRow>(
    `SELECT current_version FROM greenhouse_commercial.quotations WHERE quotation_id = $1`,
    [identity.quotationId]
  )

  const versionNumber = Number(headerRows[0]?.current_version ?? 1)

  const [links, aggregate] = await Promise.all([
    getActiveShortLinksForQuote(identity.quotationId, versionNumber),
    getShareViewAggregate(identity.quotationId, versionNumber)
  ])

  return NextResponse.json({
    links: links.map(link => ({
      shortCode: link.shortCode,
      shortUrl: buildShortQuoteUrl(link.shortCode),
      createdAt: link.createdAt,
      createdBy: link.createdBy,
      expiresAt: link.expiresAt,
      lastAccessedAt: link.lastAccessedAt,
      accessCount: link.accessCount
    })),
    aggregate: {
      totalViews: aggregate.viewCount,
      uniqueIps: aggregate.uniqueIps,
      lastView: aggregate.lastView
    }
  })
}

/**
 * POST /api/finance/quotes/[id]/share
 *
 * Creates (or reuses) a short link for the quote. Body params:
 * - reuseIfActive: boolean (default true)
 *
 * Returns { shortUrl, shortCode, expiresAt } on success.
 */
export async function POST(
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

  const body = (await request.json().catch(() => ({}))) as { reuseIfActive?: boolean }
  const reuseIfActive = body.reuseIfActive !== false

  const headerRows = await query<QuoteHeaderRow>(
    `SELECT current_version, currency, total_price, tax_amount_snapshot, valid_until
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1`,
    [identity.quotationId]
  )

  const header = headerRows[0]

  if (!header) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const versionNumber = Number(header.current_version ?? 1)
  const currency = String(header.currency || 'CLP').toUpperCase()
  const total = Number(header.total_price ?? 0) + Number(header.tax_amount_snapshot ?? 0)

  const lineCountRows = await query<LineCountRow>(
    `SELECT COUNT(*)::int AS count
       FROM greenhouse_commercial.quotation_line_items
       WHERE quotation_id = $1 AND version_number = $2`,
    [identity.quotationId, versionNumber]
  )

  const lineCount = Number(lineCountRows[0]?.count ?? 0)

  const pdfHash = computePdfContentHash({
    quotationId: identity.quotationId,
    versionNumber,
    total,
    currency,
    lineCount
  })

  const fullToken = computeVerificationToken({
    quotationId: identity.quotationId,
    versionNumber,
    pdfHash
  })

  if (!fullToken) {
    return NextResponse.json(
      { error: 'Server is missing GREENHOUSE_QUOTE_VERIFICATION_SECRET; cannot generate share link' },
      { status: 503 }
    )
  }

  const expiresAt = computeDefaultExpiry(header.valid_until)

  const link = await createOrReuseQuoteShortLink({
    quotationId: identity.quotationId,
    versionNumber,
    fullToken,
    createdBy: tenant.userId,
    expiresAt,
    reuseIfActive
  })

  return NextResponse.json(
    {
      shortCode: link.shortCode,
      shortUrl: buildShortQuoteUrl(link.shortCode),
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      reused: reuseIfActive && link.accessCount > 0
    },
    { status: 201 }
  )
}
