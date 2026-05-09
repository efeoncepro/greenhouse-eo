import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { sendEmail } from '@/lib/email/delivery'
import { errorResponse } from '@/lib/email/error-envelope'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { getOrCreateQuotePdfBuffer } from '@/lib/finance/quote-share/quote-pdf-asset'
import { resolveQuoteShortLink } from '@/lib/finance/quote-share/short-link'
import { buildShortQuoteUrl } from '@/lib/finance/quote-share/url-builder'
import { IdempotencyKeyError, withIdempotency } from '@/lib/idempotency/idempotency-key'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface QuoteHeaderRow extends Record<string, unknown> {
  quotation_number: string
  current_version: number
  currency: string
  client_name_cache: string | null
  total_price: string | number | null
  tax_amount_snapshot: string | number | null
  valid_until: string | Date | null
  organization_id: string | null
  hubspot_company_id: string | null
  organization_name: string | null
}

interface SalesRepRow extends Record<string, unknown> {
  full_name: string | null
  job_title: string | null
  work_email: string | null
}

interface ContactValidationRow extends Record<string, unknown> {
  contact_record_id: string
  email: string | null
  display_name: string
  job_title: string | null
}

interface RecipientInput {
  email?: string
  contactId?: string
  name?: string
}

interface SendEmailRequestBody {
  recipients?: RecipientInput[]
  adHocRecipients?: Array<{ email: string; name?: string }>
  customMessage?: string
  includePdf?: boolean
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
 * TASK-631 Fase 4 — Multi-recipient send with PDF attachment + idempotency.
 *
 * Body:
 *   recipients: [{ contactId, email?, name? }] — must belong to quote's org
 *   adHocRecipients: [{ email, name? }] — optional, requires ≥1 recipients
 *   customMessage: string optional
 *   includePdf: boolean (default true)
 *
 * Header: Idempotency-Key required (UUID).
 *
 * Returns: { deliveries: [{ deliveryId, recipientEmail, status }], pdfStatus }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; shortCode: string }> }
) {
  const { tenant, errorResponse: authError } = await requireCommercialTenantContext()

  if (!tenant) {
    return authError || errorResponse({ code: 'unauthorized', message: 'Unauthorized' })
  }

  const { id, shortCode } = await params

  let result

  try {
    result = await withIdempotency(
      { request, endpoint: `/quotes/${id}/share/${shortCode}/send-email`, actorUserId: tenant.userId },
      async () => handleSendEmail({ quotationId: id, shortCode, request, actorUserId: tenant.userId })
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

interface HandleResponseBody {
  sent?: number
  deliveries?: Array<{
    recipientEmail: string
    deliveryId: string
    resendId: string | null
    status: string
    error?: string
  }>
  pdfStatus?: string
  attachmentSizeBytes?: number | null
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

const handleSendEmail = async ({
  quotationId,
  shortCode,
  request,
  actorUserId
}: HandleInput): Promise<{ body: HandleResponseBody; status: number }> => {
  const body = (await request.json().catch(() => ({}))) as SendEmailRequestBody

  const recipients = body.recipients ?? []
  const adHocRecipients = body.adHocRecipients ?? []

  if (recipients.length === 0 && adHocRecipients.length === 0) {
    return {
      body: { error: { code: 'no_recipients', message: 'At least 1 recipient required' } },
      status: 400
    }
  }

  // AdHoc-only is not allowed (anti-abuse): ≥1 contact must be from the org
  if (recipients.length === 0 && adHocRecipients.length > 0) {
    return {
      body: {
        error: {
          code: 'no_recipients',
          message: 'At least 1 organization contact required when sending to ad-hoc recipients'
        }
      },
      status: 400
    }
  }

  const identity = await resolveQuotationIdentity(quotationId)

  if (!identity) {
    return { body: { error: { code: 'not_found', message: 'Quotation not found' } }, status: 404 }
  }

  const linkResult = await resolveQuoteShortLink(shortCode)

  if (!linkResult || linkResult.link.quotationId !== identity.quotationId) {
    return { body: { error: { code: 'not_found', message: 'Short link not found or mismatch' } }, status: 404 }
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

  // Load quote header + organization
  const headerRows = await query<QuoteHeaderRow>(
    `SELECT q.quotation_number, q.current_version, q.currency, q.client_name_cache,
            q.total_price, q.tax_amount_snapshot, q.valid_until, q.organization_id,
            o.hubspot_company_id, o.organization_name
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
  const orgId = header.organization_id
  const clientName = header.client_name_cache || header.organization_name || 'Cliente'

  // Validate that all contactIds belong to this org (security check)
  const contactIds = recipients.map(r => r.contactId).filter((x): x is string => Boolean(x))

  let validatedContacts: Map<string, ContactValidationRow> = new Map()

  if (contactIds.length > 0) {
    if (!header.hubspot_company_id) {
      return {
        body: {
          error: {
            code: 'recipient_not_in_org',
            message: 'Quote organization has no HubSpot company linked; cannot validate contacts'
          }
        },
        status: 403
      }
    }

    const contactRows = await query<ContactValidationRow>(
      `SELECT contact_record_id, email, display_name, job_title
         FROM greenhouse_crm.contacts
         WHERE contact_record_id = ANY($1::text[])
           AND is_deleted = false
           AND active = true
           AND email IS NOT NULL
           AND (
             hubspot_primary_company_id = $2
             OR $2 = ANY(hubspot_associated_company_ids)
           )`,
      [contactIds, header.hubspot_company_id]
    )

    validatedContacts = new Map(contactRows.map(r => [r.contact_record_id, r]))

    const missing = contactIds.filter(cid => !validatedContacts.has(cid))

    if (missing.length > 0) {
      return {
        body: {
          error: {
            code: 'recipient_not_in_org',
            message: `Contact(s) not associated with this quote's organization: ${missing.join(', ')}`,
            details: { contactIds: missing }
          }
        },
        status: 403
      }
    }
  }

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

  // Generate or load PDF
  const includePdf = body.includePdf !== false
  let attachments: Array<{ filename: string; content: Buffer; contentType: string }> | undefined
  let pdfStatus: 'attached_from_cache' | 'attached_freshly_generated' | 'failed_graceful' | 'omitted' =
    includePdf ? 'attached_from_cache' : 'omitted'
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
    } catch (error) {
      console.warn(
        '[quote-share-send-email] PDF generation failed; sending email without attachment',
        error instanceof Error ? error.message : error
      )
      attachments = undefined
      pdfStatus = 'failed_graceful'
    }
  }

  // Build full recipient list
  type FlatRecipient = { email: string; name: string | null; contactId: string | null; kind: 'org_contact' | 'ad_hoc' }
  const allRecipients: FlatRecipient[] = []

  for (const r of recipients) {
    const contact = r.contactId ? validatedContacts.get(r.contactId) : null
    const email = r.email || contact?.email

    if (!email) continue
    allRecipients.push({
      email,
      name: r.name || contact?.display_name || null,
      contactId: r.contactId || null,
      kind: 'org_contact'
    })
  }

  for (const r of adHocRecipients) {
    if (!r.email?.includes('@')) continue
    allRecipients.push({ email: r.email, name: r.name || null, contactId: null, kind: 'ad_hoc' })
  }

  // Send 1 email per recipient (each gets personalized greeting)
  const subject = `Propuesta ${header.quotation_number} v${versionNumber} para ${clientName}`
  const totalLabel = formatCurrency(total, currency)
  const validUntilLabel = formatDateLabel(header.valid_until)

  const deliveries: Array<{
    recipientEmail: string
    deliveryId: string
    resendId: string | null
    status: string
    error?: string
  }> = []

  for (const recipient of allRecipients) {
    const sendResult = await sendEmail({
      emailType: 'quote_share',
      domain: 'finance',
      recipients: [{ email: recipient.email, name: recipient.name ?? undefined }],
      actorEmail: senderEmail ?? undefined,
      sourceEntity: identity.quotationId,
      attachments,
      context: {
        shareUrl: buildShortQuoteUrl(shortCode),
        quotationNumber: header.quotation_number,
        versionNumber,
        clientName,
        recipientName: recipient.name,
        totalLabel,
        validUntilLabel,
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

    // Persist org/recipient_kind audit fields (best-effort)
    if (sendResult.deliveryId && (orgId || recipient.contactId)) {
      try {
        await query(
          `UPDATE greenhouse_notifications.email_deliveries
             SET organization_id = $2,
                 recipient_contact_id = $3,
                 recipient_kind = $4,
                 attachment_size_bytes = $5
             WHERE delivery_id = $1`,
          [sendResult.deliveryId, orgId, recipient.contactId, recipient.kind, attachmentSize]
        )
      } catch {
        // best-effort audit
      }
    }

    deliveries.push({
      recipientEmail: recipient.email,
      deliveryId: sendResult.deliveryId,
      resendId: sendResult.resendId,
      status: sendResult.status,
      error: sendResult.error
    })
  }

  return {
    body: {
      sent: deliveries.length,
      deliveries,
      pdfStatus,
      attachmentSizeBytes: attachmentSize
    },
    status: 200
  }
}
