import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { sendEmail } from '@/lib/email/delivery'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { resolveQuoteShortLink } from '@/lib/finance/quote-share/short-link'
import { buildShortQuoteUrl } from '@/lib/finance/quote-share/url-builder'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface QuoteHeaderRow extends Record<string, unknown> {
  quotation_number: string
  current_version: number
  currency: string
  client_name_cache: string | null
  total_price: string | number | null
  tax_amount_snapshot: string | number | null
  valid_until: string | Date | null
}

interface SalesRepRow extends Record<string, unknown> {
  full_name: string | null
  job_title: string | null
  work_email: string | null
}

interface SendEmailRequestBody {
  recipientEmail: string
  recipientName?: string
  customMessage?: string
}

const formatCurrency = (value: number, currency: string): string => {
  if (currency === 'CLP') return `$${Math.round(value).toLocaleString('es-CL')}`
  if (currency === 'USD') return `US$${value.toFixed(2)}`

  return `${currency} ${value.toFixed(2)}`
}

const formatDateLabel = (value: string | Date | null): string | null => {
  if (!value) return null
  const iso = value instanceof Date ? value.toISOString() : value
  const parts = iso.slice(0, 10).split('-')

  if (parts.length !== 3) return iso.slice(0, 10)

  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

/**
 * POST /api/finance/quotes/[id]/share/[shortCode]/send-email
 *
 * Sends a branded react-email with the share link to the recipient.
 * Sales rep specifies recipient email + optional custom message; the
 * system pre-loads the rest from the quote + session.
 *
 * Body: { recipientEmail, recipientName?, customMessage? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; shortCode: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, shortCode } = await params
  const body = (await request.json().catch(() => ({}))) as SendEmailRequestBody

  if (!body.recipientEmail?.includes('@')) {
    return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 })
  }

  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const linkResult = await resolveQuoteShortLink(shortCode)

  if (!linkResult || linkResult.link.quotationId !== identity.quotationId) {
    return NextResponse.json({ error: 'Short link not found or mismatch' }, { status: 404 })
  }

  if (linkResult.status !== 'active') {
    return NextResponse.json(
      { error: `Short link is ${linkResult.status}` },
      { status: 410 }
    )
  }

  const headerRows = await query<QuoteHeaderRow>(
    `SELECT quotation_number, current_version, currency, client_name_cache,
            total_price, tax_amount_snapshot, valid_until
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1`,
    [identity.quotationId]
  )

  const header = headerRows[0]

  if (!header) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  // Sales rep info from session
  let senderName = 'Equipo Efeonce'
  let senderRole: string | null = null
  let senderEmail: string | null = null

  try {
    const memberRows = await query<SalesRepRow>(
      `SELECT tm.full_name, tm.job_title, tm.work_email
         FROM greenhouse.team_members tm
         INNER JOIN greenhouse.client_users cu ON cu.member_id = tm.member_id
         WHERE cu.user_id = $1
         LIMIT 1`,
      [tenant.userId]
    )

    const member = memberRows[0]

    if (member?.full_name) {
      senderName = member.full_name
      senderRole = member.job_title ?? 'Account Lead'
      senderEmail = member.work_email ?? null
    }
  } catch {
    // best-effort
  }

  const totalNet = Number(header.total_price ?? 0)
  const taxAmount = Number(header.tax_amount_snapshot ?? 0)
  const total = totalNet + taxAmount
  const currency = String(header.currency || 'CLP').toUpperCase()

  const result = await sendEmail({
    emailType: 'quote_share',
    domain: 'finance',
    recipients: [
      {
        email: body.recipientEmail,
        name: body.recipientName ?? header.client_name_cache ?? undefined
      }
    ],
    actorEmail: senderEmail ?? undefined,
    sourceEntity: identity.quotationId,
    context: {
      shareUrl: buildShortQuoteUrl(shortCode),
      quotationNumber: header.quotation_number,
      versionNumber: Number(header.current_version),
      clientName: header.client_name_cache ?? body.recipientName ?? 'Cliente',
      totalLabel: formatCurrency(total, currency),
      validUntilLabel: formatDateLabel(header.valid_until),
      senderName,
      senderRole,
      senderEmail,
      customMessage: body.customMessage ?? null
    }
  })

  if (result.status === 'failed' || result.status === 'skipped') {
    return NextResponse.json(
      { error: result.error || `Email delivery ${result.status}` },
      { status: 502 }
    )
  }

  return NextResponse.json({
    sent: true,
    deliveryId: result.deliveryId,
    resendId: result.resendId,
    status: result.status
  })
}
