import 'server-only'

import { randomUUID } from 'crypto'

import { getEmailFromAddress, getResendClient, isResendConfigured } from '@/lib/resend'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { ensureEmailSchema } from './schema'
import { getSubscribers } from './subscriptions'
import { resolveTemplate } from './templates'
import type {
  EmailAttachment,
  EmailRecipient,
  EmailTemplateRenderResult,
  SendEmailInput,
  SendEmailResult
} from './types'

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const mergeAttachments = (templateAttachments: EmailAttachment[] | undefined, inputAttachments: EmailAttachment[] | undefined) => [
  ...(templateAttachments ?? []),
  ...(inputAttachments ?? [])
]

const toResendAttachments = (attachments: EmailAttachment[] | undefined) =>
  (attachments ?? []).map(attachment => ({
    filename: attachment.filename,
    content: attachment.content.toString('base64'),
    contentType: attachment.contentType
  }))

const createDeliveryRow = async (input: {
  batchId: string
  emailType: string
  domain: string
  recipient: EmailRecipient
  subject: string
  resendId: string | null
  status: SendEmailResult['status']
  hasAttachments: boolean
  sourceEventId?: string
  sourceEntity?: string
  actorEmail?: string
  errorMessage?: string | null
}) => {
  try {
    await ensureEmailSchema()
  } catch (error) {
    console.warn('[email-delivery] Schema bootstrap failed:', error)
  }

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
        source_event_id,
        source_entity,
        actor_email,
        error_message,
        attempt_number,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1, NOW(), NOW()
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
      input.sourceEventId ?? null,
      input.sourceEntity ?? null,
      input.actorEmail ?? null,
      input.errorMessage ?? null
    ]
  )

  return rows[0]?.delivery_id ?? null
}

export const sendEmail = async <TContext extends Record<string, unknown>>(input: SendEmailInput<TContext>): Promise<SendEmailResult> => {
  const batchId = randomUUID()
  let recipients: EmailRecipient[]

  try {
    recipients = input.recipients && input.recipients.length > 0
      ? input.recipients
      : await getSubscribers(input.emailType)
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

  if (!isResendConfigured()) {
    for (const recipient of recipients) {
      let resolvedTemplate: EmailTemplateRenderResult

      try {
        resolvedTemplate = resolveTemplate(input.emailType, {
          ...input.context,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          recipientUserId: recipient.userId
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to resolve email template.'

        await createDeliveryRow({
          batchId,
          emailType: input.emailType,
          domain: input.domain,
          recipient,
          subject: '[template missing]',
          resendId: null,
          status: 'failed',
          hasAttachments: Boolean(input.attachments?.length),
          sourceEventId: input.sourceEventId,
          sourceEntity: input.sourceEntity,
          actorEmail: input.actorEmail,
          errorMessage: message
        }).catch(err => {
          console.warn('[email-delivery] Failed to persist template error row:', err)
        })

        return {
          deliveryId: batchId,
          resendId: null,
          status: 'failed',
          error: message
        }
      }

      await createDeliveryRow({
        batchId,
        emailType: input.emailType,
        domain: input.domain,
        recipient,
        subject: resolvedTemplate.subject,
        resendId: null,
        status: 'skipped',
        hasAttachments: Boolean(mergeAttachments(resolvedTemplate.attachments, input.attachments).length),
        sourceEventId: input.sourceEventId,
        sourceEntity: input.sourceEntity,
        actorEmail: input.actorEmail,
        errorMessage: 'RESEND_API_KEY is not configured.'
      }).catch(err => {
        console.warn('[email-delivery] Failed to persist skipped delivery row:', err)
      })
    }

    return {
      deliveryId: batchId,
      resendId: null,
      status: 'skipped',
      error: 'RESEND_API_KEY is not configured.'
    }
  }

  const resend = getResendClient()

  let firstResendId: string | null = null
  let sawFailure = false
  let lastError: string | undefined

  for (const recipient of recipients) {
    let resolvedTemplate: EmailTemplateRenderResult

    try {
      resolvedTemplate = resolveTemplate(input.emailType, {
        ...input.context,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        recipientUserId: recipient.userId
      })

      const mergedAttachments = mergeAttachments(resolvedTemplate.attachments, input.attachments)
      const resendAttachments = toResendAttachments(mergedAttachments)

      const result = await resend.emails.send({
        from: getEmailFromAddress(),
        to: normalizeEmail(recipient.email),
        subject: resolvedTemplate.subject,
        react: resolvedTemplate.react,
        text: resolvedTemplate.text,
        ...(resendAttachments.length > 0 ? { attachments: resendAttachments } : {})
      })

      const resendId = result?.data?.id ?? null

      if (!firstResendId && resendId) {
        firstResendId = resendId
      }

      await createDeliveryRow({
        batchId,
        emailType: input.emailType,
        domain: input.domain,
        recipient,
        subject: resolvedTemplate.subject,
        resendId,
        status: 'sent',
        hasAttachments: resendAttachments.length > 0,
        sourceEventId: input.sourceEventId,
        sourceEntity: input.sourceEntity,
        actorEmail: input.actorEmail
      }).catch(err => {
        console.warn('[email-delivery] Failed to persist sent delivery row:', err)
      })
    } catch (error) {
      sawFailure = true
      const message = error instanceof Error ? error.message : 'Failed to send email.'

      lastError = lastError || message

      const subject = error instanceof Error && error.message.includes('No email template registered')
        ? '[template missing]'
        : '[email delivery failed]'

      await createDeliveryRow({
        batchId,
        emailType: input.emailType,
        domain: input.domain,
        recipient,
        subject,
        resendId: null,
        status: 'failed',
        hasAttachments: Boolean(input.attachments?.length),
        sourceEventId: input.sourceEventId,
        sourceEntity: input.sourceEntity,
        actorEmail: input.actorEmail,
        errorMessage: message
      }).catch(err => {
        console.warn('[email-delivery] Failed to persist failed delivery row:', err)
      })
    }
  }

  return {
    deliveryId: batchId,
    resendId: firstResendId,
    status: sawFailure ? 'failed' : 'sent',
    ...(lastError ? { error: lastError } : {})
  }
}
