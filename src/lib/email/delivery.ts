import 'server-only'

import { randomUUID } from 'crypto'

import { getEmailFromAddress, getResendClient, isResendConfigured } from '@/lib/resend'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { resolveEmailContext, EmailUndeliverableError } from './context-resolver'
import { checkRecipientRateLimit } from './rate-limit'
import { getSubscribers } from './subscriptions'
import { resolveTemplate } from './templates'
import { generateUnsubscribeUrl } from './unsubscribe'
import type {
  EmailDomain,
  EmailAttachment,
  EmailDeliveryPayload,
  EmailRecipient,
  EmailType,
  SendEmailInput,
  SendEmailResult
} from './types'

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const mergeAttachments = (
  templateAttachments: EmailAttachment[] | undefined,
  inputAttachments: EmailAttachment[] | undefined
) => [...(templateAttachments ?? []), ...(inputAttachments ?? [])]

const serializeJsonSafe = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const reviveJsonSafe = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(item => reviveJsonSafe(item))
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>

    if (record.type === 'Buffer' && Array.isArray(record.data)) {
      return Buffer.from(record.data as number[])
    }

    return Object.fromEntries(Object.entries(record).map(([key, entry]) => [key, reviveJsonSafe(entry)]))
  }

  return value
}

const toResendAttachments = (attachments: EmailAttachment[] | undefined) =>
  (attachments ?? []).map(attachment => ({
    filename: attachment.filename,
    content: attachment.content,
    contentType: attachment.contentType
  }))

const normalizePayload = <TContext extends Record<string, unknown>>(input: {
  recipients: EmailRecipient[]
  context: TContext
  attachments?: EmailAttachment[]
}): EmailDeliveryPayload<TContext> => ({
  recipients: input.recipients.map(recipient => ({
    email: normalizeEmail(recipient.email),
    name: recipient.name,
    userId: recipient.userId
  })),
  context: serializeJsonSafe(input.context),
  attachments: input.attachments?.map(attachment => ({
    filename: attachment.filename,
    content: Buffer.from(attachment.content),
    contentType: attachment.contentType
  }))
})

const reviveDeliveryPayload = <TContext extends Record<string, unknown>>(
  payload: unknown
): EmailDeliveryPayload<TContext> | null => {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = reviveJsonSafe(payload) as Record<string, unknown>

  const recipients = Array.isArray(record.recipients)
    ? record.recipients
        .map(item => {
          if (!item || typeof item !== 'object') return null

          const recipient = item as Record<string, unknown>

          if (typeof recipient.email !== 'string') return null

          return {
            email: recipient.email,
            ...(typeof recipient.name === 'string' ? { name: recipient.name } : {}),
            ...(typeof recipient.userId === 'string' ? { userId: recipient.userId } : {})
          } as EmailRecipient
        })
        .filter((recipient): recipient is EmailRecipient => recipient !== null)
    : []

  if (recipients.length === 0) {
    return null
  }

  const context = record.context && typeof record.context === 'object' ? (record.context as TContext) : ({} as TContext)

  const attachments = Array.isArray(record.attachments)
    ? record.attachments
        .map(item => {
          if (!item || typeof item !== 'object') return null

          const attachment = item as Record<string, unknown>

          if (
            typeof attachment.filename !== 'string' ||
            typeof attachment.contentType !== 'string' ||
            !(attachment.content instanceof Buffer)
          ) {
            return null
          }

          return {
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.contentType
          }
        })
        .filter((attachment): attachment is EmailAttachment => Boolean(attachment))
    : undefined

  return {
    recipients,
    context,
    attachments
  }
}

const createDeliveryRow = async (input: {
  batchId: string
  emailType: string
  domain: string
  recipient: EmailRecipient
  subject: string
  resendId: string | null
  status: SendEmailResult['status']
  hasAttachments: boolean
  payload: EmailDeliveryPayload
  sourceEventId?: string
  sourceEntity?: string
  actorEmail?: string
  errorMessage?: string | null
}) => {
  const rows = await runGreenhousePostgresQuery<{ delivery_id: string } & Record<string, unknown>>(
    `
      INSERT INTO greenhouse_notifications.email_deliveries (
        batch_id,
        email_type,
        domain,
        recipient_email,
        recipient_name,
        recipient_user_id,
        subject,
        resend_id,
        status,
        has_attachments,
        delivery_payload,
        source_event_id,
        source_entity,
        actor_email,
        error_message,
        attempt_number,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, 1, NOW(), NOW()
      )
      RETURNING delivery_id
    `,
    [
      input.batchId,
      input.emailType,
      input.domain,
      normalizeEmail(input.recipient.email),
      input.recipient.name ?? null,
      input.recipient.userId ?? null,
      input.subject,
      input.resendId,
      input.status,
      input.hasAttachments,
      JSON.stringify(input.payload),
      input.sourceEventId ?? null,
      input.sourceEntity ?? null,
      input.actorEmail ?? null,
      input.errorMessage ?? null
    ]
  )

  return rows[0]?.delivery_id ?? null
}

const updateDeliveryRow = async (input: {
  deliveryId: string
  resendId: string | null
  status: SendEmailResult['status']
  errorMessage?: string | null
}) => {
  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_notifications.email_deliveries
      SET resend_id = $2,
          status = $3,
          error_message = $4,
          updated_at = NOW()
      WHERE delivery_id = $1
    `,
    [input.deliveryId, input.resendId, input.status, input.errorMessage ?? null]
  )
}

interface FailedDeliveryRow {
  delivery_id: string
  batch_id: string
  email_type: string
  domain: string
  recipient_email: string
  recipient_name: string | null
  recipient_user_id: string | null
  subject: string
  resend_id: string | null
  status: SendEmailResult['status']
  has_attachments: boolean
  delivery_payload: unknown
  source_event_id: string | null
  source_entity: string | null
  actor_email: string | null
  error_message: string | null
  attempt_number: number
}

const claimFailedDelivery = async (deliveryId: string) => {
  const rows = await runGreenhousePostgresQuery<FailedDeliveryRow & Record<string, unknown>>(
    `
      UPDATE greenhouse_notifications.email_deliveries
      SET status = 'pending',
          attempt_number = attempt_number + 1,
          error_message = NULL,
          updated_at = NOW()
      WHERE delivery_id = $1
        AND status = 'failed'
        AND attempt_number < 3
      RETURNING
        delivery_id,
        batch_id,
        email_type,
        domain,
        recipient_email,
        recipient_name,
        recipient_user_id,
        subject,
        resend_id,
        status,
        has_attachments,
        delivery_payload,
        source_event_id,
        source_entity,
        actor_email,
        error_message,
        attempt_number
    `,
    [deliveryId]
  )

  return rows[0] ?? null
}

const deliverRecipient = async <TContext extends Record<string, unknown>>(input: {
  batchId: string
  emailType: EmailType
  domain: EmailDomain
  recipient: EmailRecipient
  context: TContext
  attachments?: EmailAttachment[]
  sourceEventId?: string
  sourceEntity?: string
  actorEmail?: string
  existingDeliveryId?: string | null
}) => {
  const basePayload = normalizePayload({
    recipients: [input.recipient],
    context: input.context,
    attachments: input.attachments
  })

  try {
    // ── Context Resolver: auto-hydrate recipient + client data ──
    let resolvedContext: Record<string, unknown> = {}

    try {
      const emailContext = await resolveEmailContext(input.recipient.email)

      if (emailContext) {
        resolvedContext = {
          userName: emailContext.recipient.fullName,
          recipientFirstName: emailContext.recipient.firstName,
          clientName: emailContext.client.name,
          clientId: emailContext.client.id,
          locale: emailContext.recipient.locale,
          tenantType: emailContext.client.tenantType,
          platformUrl: emailContext.platform.url,
          supportEmail: emailContext.platform.supportEmail
        }

        // Enrich recipient with resolved data if missing
        if (!input.recipient.name && emailContext.recipient.fullName) {
          input.recipient.name = emailContext.recipient.fullName
        }

        if (!input.recipient.userId && emailContext.recipient.userId) {
          input.recipient.userId = emailContext.recipient.userId
        }
      }
    } catch (error) {
      if (error instanceof EmailUndeliverableError) {
        const errorMessage = error.message

        if (input.existingDeliveryId) {
          await updateDeliveryRow({
            deliveryId: input.existingDeliveryId,
            resendId: null,
            status: 'skipped',
            errorMessage
          })
        } else {
          await createDeliveryRow({
            batchId: input.batchId,
            emailType: input.emailType,
            domain: input.domain,
            recipient: input.recipient,
            subject: '[undeliverable]',
            resendId: null,
            status: 'skipped',
            hasAttachments: false,
            payload: basePayload,
            sourceEventId: input.sourceEventId,
            sourceEntity: input.sourceEntity,
            actorEmail: input.actorEmail,
            errorMessage
          })
        }

        return {
          deliveryId: input.existingDeliveryId || input.batchId,
          recipientEmail: input.recipient.email,
          resendId: null,
          status: 'skipped' as const,
          error: errorMessage
        }
      }

      // Non-blocking: if resolver fails for other reasons, continue with caller context
      console.warn(
        '[email-delivery] Context resolver failed, continuing with caller context:',
        error instanceof Error ? error.message : error
      )
    }

    // ── Rate Limit: check per-recipient hourly limit ──
    if (!input.existingDeliveryId) {
      const rateCheck = await checkRecipientRateLimit(input.recipient.email)

      if (!rateCheck.allowed) {
        const errorMessage = `Rate limit exceeded: ${rateCheck.currentCount} emails/hour to ${input.recipient.email}`

        console.warn(`[email-delivery] ${errorMessage}`)

        await createDeliveryRow({
          batchId: input.batchId,
          emailType: input.emailType,
          domain: input.domain,
          recipient: input.recipient,
          subject: '[rate_limited]',
          resendId: null,
          status: 'rate_limited',
          hasAttachments: false,
          payload: basePayload,
          sourceEventId: input.sourceEventId,
          sourceEntity: input.sourceEntity,
          actorEmail: input.actorEmail,
          errorMessage
        })

        return {
          deliveryId: input.batchId,
          recipientEmail: input.recipient.email,
          resendId: null,
          status: 'failed' as const,
          error: errorMessage
        }
      }
    }

    // ── Unsubscribe URL: only for broadcast email types ──
    const BROADCAST_EMAIL_TYPES: EmailType[] = ['payroll_export', 'notification']
    let unsubscribeUrl: string | undefined

    if (BROADCAST_EMAIL_TYPES.includes(input.emailType)) {
      try {
        unsubscribeUrl = await generateUnsubscribeUrl(input.recipient.email, input.emailType)
      } catch {
        // Non-blocking: if token generation fails, send without unsubscribe link
      }
    }

    // Merge contexts: caller values take precedence over auto-resolved
    const mergedContext = {
      ...resolvedContext,
      ...input.context,
      recipientEmail: input.recipient.email,
      recipientName: input.recipient.name,
      recipientUserId: input.recipient.userId,
      unsubscribeUrl
    }

    const resolvedTemplate = resolveTemplate(input.emailType, mergedContext)

    const mergedAttachments = mergeAttachments(resolvedTemplate.attachments, input.attachments)
    const resendAttachments = toResendAttachments(mergedAttachments)

    const payload = normalizePayload({
      recipients: [input.recipient],
      context: input.context,
      attachments: mergedAttachments
    })

    if (!isResendConfigured()) {
      if (input.existingDeliveryId) {
        await updateDeliveryRow({
          deliveryId: input.existingDeliveryId,
          resendId: null,
          status: 'skipped',
          errorMessage: 'RESEND_API_KEY is not configured.'
        })
      } else {
        await createDeliveryRow({
          batchId: input.batchId,
          emailType: input.emailType,
          domain: input.domain,
          recipient: input.recipient,
          subject: resolvedTemplate.subject,
          resendId: null,
          status: 'skipped',
          hasAttachments: Boolean(resendAttachments.length),
          payload,
          sourceEventId: input.sourceEventId,
          sourceEntity: input.sourceEntity,
          actorEmail: input.actorEmail,
          errorMessage: 'RESEND_API_KEY is not configured.'
        })
      }

      return {
        deliveryId: input.existingDeliveryId || input.batchId,
        recipientEmail: input.recipient.email,
        resendId: null,
        status: 'skipped' as const,
        error: 'RESEND_API_KEY is not configured.'
      }
    }

    const resend = getResendClient()

    const result = await resend.emails.send({
      from: getEmailFromAddress(),
      to: normalizeEmail(input.recipient.email),
      subject: resolvedTemplate.subject,
      react: resolvedTemplate.react,
      text: resolvedTemplate.text,
      ...(resendAttachments.length > 0 ? { attachments: resendAttachments } : {})
    })

    const resendId = result?.data?.id ?? null

    if (input.existingDeliveryId) {
      await updateDeliveryRow({
        deliveryId: input.existingDeliveryId,
        resendId,
        status: 'sent'
      })
    } else {
      await createDeliveryRow({
        batchId: input.batchId,
        emailType: input.emailType,
        domain: input.domain,
        recipient: input.recipient,
        subject: resolvedTemplate.subject,
        resendId,
        status: 'sent',
        hasAttachments: resendAttachments.length > 0,
        payload,
        sourceEventId: input.sourceEventId,
        sourceEntity: input.sourceEntity,
        actorEmail: input.actorEmail
      })
    }

    return {
      deliveryId: input.existingDeliveryId || input.batchId,
      recipientEmail: input.recipient.email,
      resendId,
      status: 'sent' as const
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email.'

    const subject =
      error instanceof Error && error.message.includes('No email template registered')
        ? '[template missing]'
        : '[email delivery failed]'

    if (input.existingDeliveryId) {
      await updateDeliveryRow({
        deliveryId: input.existingDeliveryId,
        resendId: null,
        status: 'failed',
        errorMessage: message
      }).catch(err => {
        console.warn('[email-delivery] Failed to update retried delivery row:', err)
      })
    } else {
      await createDeliveryRow({
        batchId: input.batchId,
        emailType: input.emailType,
        domain: input.domain,
        recipient: input.recipient,
        subject,
        resendId: null,
        status: 'failed',
        hasAttachments: Boolean(input.attachments?.length),
        payload: basePayload,
        sourceEventId: input.sourceEventId,
        sourceEntity: input.sourceEntity,
        actorEmail: input.actorEmail,
        errorMessage: message
      }).catch(err => {
        console.warn('[email-delivery] Failed to persist failed delivery row:', err)
      })
    }

    return {
      deliveryId: input.existingDeliveryId || input.batchId,
      recipientEmail: input.recipient.email,
      resendId: null,
      status: 'failed' as const,
      error: message
    }
  }
}

/**
 * Check whether an email with the given sourceEventId + sourceEntity was already
 * sent successfully. Used as a defensive dedup layer to prevent re-sending
 * transactional emails if the reactive event is reprocessed (ISSUE-035).
 */
export const wasEmailAlreadySent = async (
  sourceEventId: string,
  sourceEntity: string,
  recipientEmail: string
): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ exists: boolean } & Record<string, unknown>>(
    `SELECT EXISTS (
       SELECT 1
       FROM greenhouse_notifications.email_deliveries
       WHERE source_event_id = $1
         AND source_entity = $2
         AND recipient_email = $3
         AND status = 'sent'
     ) AS exists`,
    [sourceEventId, sourceEntity, normalizeEmail(recipientEmail)]
  )

  return rows[0]?.exists === true
}

export const sendEmail = async <TContext extends Record<string, unknown>>(
  input: SendEmailInput<TContext>
): Promise<SendEmailResult> => {
  const batchId = randomUUID()
  let recipients: EmailRecipient[]

  try {
    recipients =
      input.recipients && input.recipients.length > 0 ? input.recipients : await getSubscribers(input.emailType)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to resolve email recipients.'

    return {
      deliveryId: batchId,
      resendId: null,
      status: 'skipped',
      error: message
    }
  }

  if (recipients.length === 0) {
    return {
      deliveryId: batchId,
      resendId: null,
      status: 'skipped',
      error: 'No email recipients were resolved.'
    }
  }

  let firstResendId: string | null = null
  let sawFailure = false
  let sawSkipped = false
  let lastError: string | undefined
  const recipientResults: NonNullable<SendEmailResult['recipientResults']> = []

  for (const recipient of recipients) {
    const result = await deliverRecipient({
      batchId,
      emailType: input.emailType,
      domain: input.domain,
      recipient,
      context: input.context,
      attachments: input.attachments,
      sourceEventId: input.sourceEventId,
      sourceEntity: input.sourceEntity,
      actorEmail: input.actorEmail
    })

    if (result.resendId && !firstResendId) {
      firstResendId = result.resendId
    }

    recipientResults.push({
      recipientEmail: recipient.email,
      resendId: result.resendId,
      status: result.status,
      ...(result.error ? { error: result.error } : {})
    })

    if (result.status === 'failed') {
      sawFailure = true
      lastError = lastError || result.error
    } else if (result.status === 'skipped') {
      sawSkipped = true
      lastError = lastError || result.error
    }
  }

  return {
    deliveryId: batchId,
    resendId: firstResendId,
    status: sawFailure ? 'failed' : sawSkipped ? 'skipped' : 'sent',
    recipientResults,
    ...(lastError ? { error: lastError } : {})
  }
}

export const processFailedEmailDeliveries = async (limit = 25) => {
  if (!isResendConfigured()) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      claimed: 0
    }
  }

  const rows = await runGreenhousePostgresQuery<FailedDeliveryRow & Record<string, unknown>>(
    `
      SELECT
        delivery_id,
        batch_id,
        email_type,
        domain,
        recipient_email,
        recipient_name,
        recipient_user_id,
        subject,
        resend_id,
        status,
        has_attachments,
        delivery_payload,
        source_event_id,
        source_entity,
        actor_email,
        error_message,
        attempt_number
      FROM greenhouse_notifications.email_deliveries
      WHERE status = 'failed'
        AND attempt_number < 3
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at ASC
      LIMIT $1
    `,
    [limit]
  )

  let attempted = 0
  let sent = 0
  let failed = 0
  let skipped = 0
  let claimed = 0

  for (const row of rows) {
    const claimedRow = await claimFailedDelivery(row.delivery_id)

    if (!claimedRow) {
      continue
    }

    claimed++
    attempted++

    const payload = reviveDeliveryPayload(claimedRow.delivery_payload)

    if (!payload) {
      skipped++
      await updateDeliveryRow({
        deliveryId: claimedRow.delivery_id,
        resendId: null,
        status: 'skipped',
        errorMessage: 'Unable to revive delivery payload for retry.'
      })
      continue
    }

    const recipient = payload.recipients.find(
      item => normalizeEmail(item.email) === normalizeEmail(claimedRow.recipient_email)
    ) ?? {
      email: claimedRow.recipient_email,
      name: claimedRow.recipient_name ?? undefined,
      userId: claimedRow.recipient_user_id ?? undefined
    }

    const retryResult = await deliverRecipient({
      batchId: claimedRow.batch_id,
      emailType: claimedRow.email_type as EmailType,
      domain: claimedRow.domain as EmailDomain,
      recipient,
      context: payload.context,
      attachments: payload.attachments,
      sourceEventId: claimedRow.source_event_id ?? undefined,
      sourceEntity: claimedRow.source_entity ?? undefined,
      actorEmail: claimedRow.actor_email ?? undefined,
      existingDeliveryId: claimedRow.delivery_id
    })

    if (retryResult.status === 'sent') {
      sent++
    } else if (retryResult.status === 'skipped') {
      skipped++
    } else {
      failed++
    }
  }

  return {
    attempted,
    sent,
    failed,
    skipped,
    claimed
  }
}

export const retryFailedDelivery = async (
  deliveryId: string
): Promise<{
  status: 'sent' | 'failed' | 'skipped'
  resendId: string | null
  error?: string
}> => {
  if (!isResendConfigured()) {
    return { status: 'skipped', resendId: null, error: 'RESEND_API_KEY is not configured.' }
  }

  const claimed = await claimFailedDelivery(deliveryId)

  if (!claimed) {
    return { status: 'skipped', resendId: null, error: 'Delivery not eligible for retry.' }
  }

  const payload = reviveDeliveryPayload(claimed.delivery_payload)

  if (!payload) {
    await updateDeliveryRow({
      deliveryId: claimed.delivery_id,
      resendId: null,
      status: 'skipped',
      errorMessage: 'Unable to revive delivery payload for retry.'
    })

    return { status: 'skipped', resendId: null, error: 'Unable to revive delivery payload.' }
  }

  const recipient = payload.recipients.find(
    item => normalizeEmail(item.email) === normalizeEmail(claimed.recipient_email)
  ) ?? {
    email: claimed.recipient_email,
    name: claimed.recipient_name ?? undefined,
    userId: claimed.recipient_user_id ?? undefined
  }

  const result = await deliverRecipient({
    batchId: claimed.batch_id,
    emailType: claimed.email_type as EmailType,
    domain: claimed.domain as EmailDomain,
    recipient,
    context: payload.context,
    attachments: payload.attachments,
    sourceEventId: claimed.source_event_id ?? undefined,
    sourceEntity: claimed.source_entity ?? undefined,
    actorEmail: claimed.actor_email ?? undefined,
    existingDeliveryId: claimed.delivery_id
  })

  return {
    status: result.status,
    resendId: result.resendId,
    ...(result.error ? { error: result.error } : {})
  }
}
