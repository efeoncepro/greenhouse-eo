import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { sendEmail } from '@/lib/email/delivery'
import { errorResponse } from '@/lib/email/error-envelope'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { getOrCreateQuotePdfBuffer } from '@/lib/finance/quote-share/quote-pdf-asset'
import { resolveQuoteShortLink } from '@/lib/finance/quote-share/short-link'
import { buildShortQuoteUrl } from '@/lib/finance/quote-share/url-builder'
import { IdempotencyKeyError, withIdempotency } from '@/lib/idempotency/idempotency-key'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface PriorDeliveryRow extends Record<string, unknown> {
  delivery_id: string
  recipient_email: string
  recipient_name: string | null
  recipient_contact_id: string | null
  organization_id: string | null
  has_attachments: boolean
}

interface QuoteHeaderRow extends Record<string, unknown> {
  quotation_number: string
  current_version: number
  currency: string
  client_name_cache: string | null
  total_price: string | number | null
  tax_amount_snapshot: string | number | null
  valid_until: string | Date | null
  organization_id: string | null
  organization_name: string | null
}

interface SalesRepRow extends Record<string, unknown> {
  full_name: string | null
  job_title: string | null
  work_email: string | null
}

interface ResendBody {
  parentDeliveryId: string
  recipientEmailOverride?: string
  reason?: string
  includePdf?: boolean
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

  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso.slice(0, 10)
}

/**
 * POST /api/finance/quotes/[id]/share/[shortCode]/resend-email
 *
 * Stripe-style separate endpoint for re-sending. Use case: "the client says
 * they didn't receive the email" — sales rep re-sends, optionally to a new
 * email if the client changed addresses.
 *
 * The new delivery is linked to the original via `parent_delivery_id` for
 * audit chain. `resend_reason` records the why (selectable from common
 * reasons: not_received, changed_email, follow_up, etc.).
 *
 * Body:
 *   parentDeliveryId: string (required) — the original email_deliveries row
 *   recipientEmailOverride?: string — if client changed email
 *   reason?: string — audit log reason
 *   includePdf?: boolean (default: same as parent)
 *   customMessage?: string — optional new message
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; shortCode: string }> }
) {
  const { tenant, errorResponse: authError } = await requireFinanceTenantContext()

  if (!tenant) {
    return authError || errorResponse({ code: 'unauthorized', message: 'Unauthorized' })
  }

  const { id, shortCode } = await params

  let result

  try {
    result = await withIdempotency(
      {
        request,
        endpoint: `/quotes/${id}/share/${shortCode}/resend-email`,
        actorUserId: tenant.userId
      },
      async () => handleResend({ quotationId: id, shortCode, request, actorUserId: tenant.userId })
    )
  } catch (err) {
    if (err instanceof IdempotencyKeyError) {
      return errorResponse({
        code: err.code === 'missing' ? 'idempotency_missing' : 'idempotency_malformed',
        message: err.message
      })
    }

    throw err
  }

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.replayed ? { 'X-Idempotent-Replay': 'true' } : undefined
  })
}

interface HandleInput {
  quotationId: string
  shortCode: string
  request: Request
  actorUserId: string
}

interface HandleResendBody {
  sent?: boolean
  deliveryId?: string
  parentDeliveryId?: string
  pdfStatus?: string
  reason?: string
  error?: { code: string; message: string; details?: Record<string, unknown> }
}

const handleResend = async ({
  quotationId,
  shortCode,
  request,
  actorUserId
}: HandleInput): Promise<{ body: HandleResendBody; status: number }> => {
  const body = (await request.json().catch(() => ({}))) as ResendBody

  if (!body.parentDeliveryId) {
    return {
      body: { error: { code: 'validation_failed', message: 'parentDeliveryId is required' } },
      status: 400
    }
  }

  const identity = await resolveQuotationIdentity(quotationId)

  if (!identity) {
    return { body: { error: { code: 'not_found', message: 'Quotation not found' } }, status: 404 }
  }

  // Validate parent delivery exists and belongs to this quote
  const parentRows = await query<PriorDeliveryRow>(
    `SELECT delivery_id, recipient_email, recipient_name, recipient_contact_id,
            organization_id, has_attachments
       FROM greenhouse_notifications.email_deliveries
       WHERE delivery_id = $1
         AND email_type = 'quote_share'
         AND source_entity = $2`,
    [body.parentDeliveryId, identity.quotationId]
  )

  const parent = parentRows[0]

  if (!parent) {
    return {
      body: {
        error: {
          code: 'not_found',
          message: 'Parent delivery not found or does not belong to this quote'
        }
      },
      status: 404
    }
  }

  const linkResult = await resolveQuoteShortLink(shortCode)

  if (!linkResult || linkResult.link.quotationId !== identity.quotationId) {
    return { body: { error: { code: 'not_found', message: 'Short link not found' } }, status: 404 }
  }

  if (linkResult.status !== 'active') {
    return {
      body: {
        error: {
          code: linkResult.status === 'revoked' ? 'short_link_revoked' : 'short_link_expired',
          message: `Short link is ${linkResult.status}`
        }
      },
      status: 410
    }
  }

  // Load quote header
  const headerRows = await query<QuoteHeaderRow>(
    `SELECT q.quotation_number, q.current_version, q.currency, q.client_name_cache,
            q.total_price, q.tax_amount_snapshot, q.valid_until, q.organization_id,
            o.organization_name
       FROM greenhouse_commercial.quotations q
       LEFT JOIN greenhouse_core.organizations o
         ON o.organization_id = q.organization_id
       WHERE q.quotation_id = $1`,
    [identity.quotationId]
  )

  const header = headerRows[0]

  if (!header) {
    return { body: { error: { code: 'not_found', message: 'Quotation not found' } }, status: 404 }
  }

  const versionNumber = Number(header.current_version)
  const currency = String(header.currency || 'CLP').toUpperCase()
  const total = Number(header.total_price ?? 0) + Number(header.tax_amount_snapshot ?? 0)
  const clientName = header.client_name_cache || header.organization_name || 'Cliente'

  // Sales rep info
  let senderName = 'Equipo Efeonce'
  let senderRole: string | null = null
  let senderEmail: string | null = null

  try {
    const memberRows = await query<SalesRepRow>(
      `SELECT tm.full_name, tm.job_title, tm.work_email
         FROM greenhouse.team_members tm
         INNER JOIN greenhouse.client_users cu ON cu.member_id = tm.member_id
         WHERE cu.user_id = $1 LIMIT 1`,
      [actorUserId]
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

  // PDF: if parent had attachment OR caller explicitly asks, attach again
  const includePdf = body.includePdf ?? parent.has_attachments
  let attachments: Array<{ filename: string; content: Buffer; contentType: string }> | undefined
  let pdfStatus: string = includePdf ? 'attached_from_cache' : 'omitted'
  let attachmentSize: number | null = null

  if (includePdf) {
    try {
      const pdfResult = await getOrCreateQuotePdfBuffer({
        quotationId: identity.quotationId,
        versionNumber,
        generatedBy: actorUserId
      })

      attachments = [
        {
          filename: pdfResult.fileName,
          content: pdfResult.buffer,
          contentType: 'application/pdf'
        }
      ]
      pdfStatus = pdfResult.wasGenerated ? 'attached_freshly_generated' : 'attached_from_cache'
      attachmentSize = pdfResult.fileSizeBytes
    } catch {
      attachments = undefined
      pdfStatus = 'failed_graceful'
    }
  }

  const recipientEmail = body.recipientEmailOverride?.trim() || parent.recipient_email
  const recipientName = parent.recipient_name

  const subject = `Recordatorio: Propuesta ${header.quotation_number} v${versionNumber} para ${clientName}`

  const sendResult = await sendEmail({
    emailType: 'quote_share',
    domain: 'finance',
    recipients: [{ email: recipientEmail, name: recipientName ?? undefined }],
    actorEmail: senderEmail ?? undefined,
    sourceEntity: identity.quotationId,
    attachments,
    context: {
      shareUrl: buildShortQuoteUrl(shortCode),
      quotationNumber: header.quotation_number,
      versionNumber,
      clientName,
      recipientName: recipientName ?? undefined,
      totalLabel: formatCurrency(total, currency),
      validUntilLabel: formatDateLabel(header.valid_until),
      senderName,
      senderRole,
      senderEmail,
      customMessage: body.customMessage ?? null,
      hasPdfAttached: pdfStatus.startsWith('attached'),
      pdfFileName: attachments?.[0]?.filename ?? null,
      pdfSizeBytes: attachmentSize,
      subject
    }
  })

  // Persist resend lineage on the new delivery
  if (sendResult.deliveryId) {
    try {
      await query(
        `UPDATE greenhouse_notifications.email_deliveries
           SET parent_delivery_id = $2,
               resend_reason = $3,
               organization_id = $4,
               recipient_contact_id = $5,
               recipient_kind = $6,
               attachment_size_bytes = $7
           WHERE delivery_id = $1`,
        [
          sendResult.deliveryId,
          body.parentDeliveryId,
          body.reason ?? 'unspecified',
          parent.organization_id,
          parent.recipient_contact_id,
          parent.recipient_contact_id ? 'org_contact' : 'ad_hoc',
          attachmentSize
        ]
      )
    } catch {
      // best-effort audit
    }
  }

  return {
    body: {
      sent: true,
      deliveryId: sendResult.deliveryId,
      parentDeliveryId: body.parentDeliveryId,
      pdfStatus,
      reason: body.reason ?? 'unspecified'
    },
    status: 200
  }
}
