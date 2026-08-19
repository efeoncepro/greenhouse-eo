import 'server-only'

import { randomUUID } from 'crypto'

import type { PoolClient } from 'pg'

import { captureWithDomain } from '@/lib/observability/capture'

import { getEmailFromAddress, getResendClient, isResendConfigured } from '@/lib/resend'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

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
  EmailPriority,
  EmailType,
  SendEmailInput,
  SendEmailResult,
  TokenSensitiveEmailSafeContext
} from './types'
import {
  AGENCY_BRANDED_EMAIL_TYPES,
  AGENCY_FROM_ADDRESS,
  EMAIL_PRIORITY_MAP,
  isTokenSensitiveEmailType,
  TOKEN_SENSITIVE_EMAIL_TYPES
} from './types'

// ── Broadcast types that include List-Unsubscribe header ──
const BROADCAST_EMAIL_TYPES: EmailType[] = ['payroll_export', 'notification', 'payroll_receipt']

/**
 * Sender per email type: agency-branded surfaces (lead magnet) send as **Efeonce**; everything
 * else uses the platform sender. Centralized policy (not a per-call override) so the brand
 * boundary is one decision, not 18 callers remembering it.
 */
const resolveEmailFromAddress = (emailType: EmailType): string =>
  AGENCY_BRANDED_EMAIL_TYPES.has(emailType) ? AGENCY_FROM_ADDRESS : getEmailFromAddress()

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const resolveDeliveryPersistence = (
  emailType: EmailType,
  requested: SendEmailInput['persistence']
): NonNullable<SendEmailInput['persistence']> => {
  if (isTokenSensitiveEmailType(emailType) || requested?.mode === 'token_sensitive') {
    return {
      mode: 'token_sensitive',
      safeContext: requested?.mode === 'token_sensitive' ? requested.safeContext : {},
      ...(requested?.mode === 'token_sensitive' && requested.deliveryIntentId
        ? { deliveryIntentId: requested.deliveryIntentId }
        : {})
    }
  }

  return { mode: 'standard' }
}

const durableSubject = (emailType: EmailType, subject: string, persistence: SendEmailInput['persistence']) =>
  persistence?.mode === 'token_sensitive' ? `[${emailType} token-sensitive]` : subject

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
const OUTBOX_EVENT_ID = new RegExp(`^outbox-${UUID}$`, 'i')
const ASSESSMENT_ID = new RegExp(`^asmt-${UUID}$`, 'i')
const TALENT_CONSENT_ID = new RegExp(`^tlpc-${UUID}$`, 'i')

const durableSensitiveSource = (
  emailType: EmailType,
  sourceEventId: string | undefined,
  sourceEntity: string | undefined
): { sourceEventId?: string; sourceEntity?: string } => {
  if (emailType === 'password_reset' && sourceEntity === 'auth_tokens') return { sourceEntity }
  if (emailType === 'invitation' && sourceEntity === 'client_users') return { sourceEntity }
  if (emailType === 'verify_email' && sourceEntity === 'email_verification') return { sourceEntity }

  if (emailType === 'hiring_assessment_assigned' && sourceEntity && ASSESSMENT_ID.test(sourceEntity)) {
    const canonicalFallback = `hiring-assessment-assigned:${sourceEntity}`

    return {
      sourceEntity,
      ...(sourceEventId && (OUTBOX_EVENT_ID.test(sourceEventId) || sourceEventId === canonicalFallback)
        ? { sourceEventId }
        : {})
    }
  }

  if (emailType === 'hiring_talent_pool_verification' && sourceEntity && TALENT_CONSENT_ID.test(sourceEntity)) {
    const canonicalFallback = `talent-pool-consent-requested:${sourceEntity}`

    return {
      sourceEntity,
      ...(sourceEventId && (OUTBOX_EVENT_ID.test(sourceEventId) || sourceEventId === canonicalFallback)
        ? { sourceEventId }
        : {})
    }
  }

  return {}
}

// ── Kill switch: check if email type is enabled ──
const checkEmailTypeEnabled = async (emailType: string): Promise<{ enabled: boolean; pausedReason?: string }> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ enabled: boolean; paused_reason: string | null } & Record<string, unknown>>(
      `SELECT enabled, paused_reason FROM greenhouse_notifications.email_type_config WHERE email_type = $1`,
      [emailType]
    )

    if (!rows[0]) return { enabled: true }

    return {
      enabled: rows[0].enabled === true,
      pausedReason: rows[0].paused_reason ?? undefined
    }
  } catch {
    // Non-blocking: if kill switch check fails, allow sending
    return { enabled: true }
  }
}

const mergeAttachments = (
  templateAttachments: EmailAttachment[] | undefined,
  inputAttachments: EmailAttachment[] | undefined
) => [...(templateAttachments ?? []), ...(inputAttachments ?? [])]

const serializeJsonSafe = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const normalizeTokenSensitiveSafeContext = (
  emailType: EmailType,
  input: Extract<NonNullable<SendEmailInput['persistence']>, { mode: 'token_sensitive' }>['safeContext']
): Record<string, string | number | null> => {
  const locale = typeof input.locale === 'string' && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(input.locale)
    ? input.locale
    : undefined

  const expiresAtMs = typeof input.expiresAt === 'string' ? Date.parse(input.expiresAt) : Number.NaN

  const timeLimitMinutes = typeof input.timeLimitMinutes === 'number' && Number.isFinite(input.timeLimitMinutes)
    ? Math.max(0, Math.floor(input.timeLimitMinutes))
    : input.timeLimitMinutes === null
      ? null
      : undefined

  const tokenTtlDays = typeof input.tokenTtlDays === 'number' && Number.isFinite(input.tokenTtlDays)
    ? Math.max(0, Math.floor(input.tokenTtlDays))
    : input.tokenTtlDays === null
      ? null
      : undefined

  return {
    templateVersion: `${emailType}:current`,
    ...(locale ? { locale } : {}),
    ...(Number.isFinite(expiresAtMs) ? { expiresAt: new Date(expiresAtMs).toISOString() } : {}),
    ...(timeLimitMinutes !== undefined ? { timeLimitMinutes } : {}),
    ...(tokenTtlDays !== undefined ? { tokenTtlDays } : {})
  }
}

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
  emailType: EmailType
  recipients: EmailRecipient[]
  context: TContext
  attachments?: EmailAttachment[]
  persistence?: SendEmailInput['persistence']
}): EmailDeliveryPayload<TContext> => ({
  recipients: input.recipients.map(recipient => ({
    email: normalizeEmail(recipient.email),
    ...(input.persistence?.mode === 'token_sensitive'
      ? {}
      : { name: recipient.name, userId: recipient.userId })
  })),
  context: serializeJsonSafe(
    input.persistence?.mode === 'token_sensitive'
      ? normalizeTokenSensitiveSafeContext(input.emailType, input.persistence.safeContext)
      : input.context
  ) as TContext,
  attachments: input.attachments?.map(attachment => ({
    filename: attachment.filename,
    content: Buffer.from(attachment.content),
    contentType: attachment.contentType
  })),
  persistence: input.persistence?.mode === 'token_sensitive'
    ? { mode: 'token_sensitive', retryable: false }
    : { mode: 'standard', retryable: true }
})

type RotationOwnerEmailType = 'hiring_assessment_assigned' | 'hiring_talent_pool_verification'

const ROTATION_OWNER_EMAIL_TYPES: readonly RotationOwnerEmailType[] = Object.freeze([
  'hiring_assessment_assigned',
  'hiring_talent_pool_verification'
])

const isRotationOwnerEmailType = (emailType: EmailType): emailType is RotationOwnerEmailType =>
  ROTATION_OWNER_EMAIL_TYPES.includes(emailType as RotationOwnerEmailType)

export const claimTokenSensitiveEmailIntent = async <T>(input: {
  emailType: RotationOwnerEmailType
  domain: EmailDomain
  recipient: EmailRecipient
  sourceEventId: string
  sourceEntity: string
  safeContext: TokenSensitiveEmailSafeContext
  issueCredential: (client: PoolClient) => Promise<T | null>
}): Promise<{ claimed: boolean; deliveryId: string; value: T | null }> => {
  const source = durableSensitiveSource(input.emailType, input.sourceEventId, input.sourceEntity)

  if (source.sourceEventId !== input.sourceEventId || source.sourceEntity !== input.sourceEntity) {
    throw new Error('Invalid token-sensitive delivery correlation.')
  }

  const recipientEmail = normalizeEmail(input.recipient.email)
  const lockKey = `${input.emailType}:${input.sourceEventId}:${input.sourceEntity}`

  const payload = normalizePayload({
    emailType: input.emailType,
    recipients: [input.recipient],
    context: {},
    persistence: { mode: 'token_sensitive', safeContext: input.safeContext }
  })

  return withGreenhousePostgresTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [lockKey])

    const existing = await client.query<{ delivery_id: string }>(
      `SELECT delivery_id
       FROM greenhouse_notifications.email_deliveries
       WHERE email_type=$1 AND source_event_id=$2 AND source_entity=$3
       ORDER BY created_at ASC
       LIMIT 1`,
      [input.emailType, input.sourceEventId, input.sourceEntity]
    )

    if (existing.rows[0]) {
      return { claimed: false, deliveryId: existing.rows[0].delivery_id, value: null }
    }

    const batchId = randomUUID()

    const inserted = await client.query<{ delivery_id: string }>(
      `INSERT INTO greenhouse_notifications.email_deliveries (
         batch_id,email_type,domain,recipient_email,recipient_name,recipient_user_id,
         subject,resend_id,status,has_attachments,delivery_payload,source_event_id,
         source_entity,actor_email,error_message,priority,error_class,attempt_number,created_at,updated_at
       ) VALUES ($1,$2,$3,$4,NULL,NULL,$5,NULL,'pending',false,$6::jsonb,$7,$8,NULL,NULL,$9,NULL,1,NOW(),NOW())
       ON CONFLICT DO NOTHING
       RETURNING delivery_id`,
      [
        batchId,
        input.emailType,
        input.domain,
        recipientEmail,
        durableSubject(input.emailType, '', { mode: 'token_sensitive', safeContext: {} }),
        JSON.stringify(payload),
        input.sourceEventId,
        input.sourceEntity,
        EMAIL_PRIORITY_MAP[input.emailType] ?? 'transactional'
      ]
    )

    const deliveryId = inserted.rows[0]?.delivery_id

    if (!deliveryId) {
      const raced = await client.query<{ delivery_id: string }>(
        `SELECT delivery_id
         FROM greenhouse_notifications.email_deliveries
         WHERE email_type=$1 AND source_event_id=$2 AND source_entity=$3
         ORDER BY created_at ASC LIMIT 1`,
        [input.emailType, input.sourceEventId, input.sourceEntity]
      )

      if (!raced.rows[0]) throw new Error('Unable to claim token-sensitive delivery intent.')

      return { claimed: false, deliveryId: raced.rows[0].delivery_id, value: null }
    }

    const config = await client.query<{ enabled: boolean }>(
      `SELECT enabled FROM greenhouse_notifications.email_type_config WHERE email_type=$1 FOR SHARE`,
      [input.emailType]
    )

    if (config.rows[0]?.enabled === false) {
      await client.query(
        `UPDATE greenhouse_notifications.email_deliveries
         SET status='skipped',error_message='Email type paused before credential issuance.',updated_at=NOW()
         WHERE delivery_id=$1`,
        [deliveryId]
      )

      return { claimed: true, deliveryId, value: null }
    }

    const value = await input.issueCredential(client)

    if (value === null) {
      await client.query(
        `UPDATE greenhouse_notifications.email_deliveries
         SET status='failed',error_message='Credential could not be issued.',updated_at=NOW()
         WHERE delivery_id=$1`,
        [deliveryId]
      )
    }

    return { claimed: true, deliveryId, value }
  })
}

const reviveDeliveryPayload = <TContext extends Record<string, unknown>>(
  payload: unknown
): EmailDeliveryPayload<TContext> | null => {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = reviveJsonSafe(payload) as Record<string, unknown>

  if (
    record.persistence &&
    typeof record.persistence === 'object' &&
    ((record.persistence as Record<string, unknown>).mode === 'token_sensitive' ||
      (record.persistence as Record<string, unknown>).retryable === false)
  ) {
    return null
  }

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
  priority?: EmailPriority
  errorClass?: string | null
}) => {
  const persistence: SendEmailInput['persistence'] = input.payload.persistence?.mode === 'token_sensitive'
    ? { mode: 'token_sensitive', safeContext: {} }
    : { mode: 'standard' }

  const sensitiveSource = persistence.mode === 'token_sensitive'
    ? durableSensitiveSource(input.emailType as EmailType, input.sourceEventId, input.sourceEntity)
    : null

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
        priority,
        error_class,
        attempt_number,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16, $17, 1, NOW(), NOW()
      )
      RETURNING delivery_id
    `,
    [
      input.batchId,
      input.emailType,
      input.domain,
      normalizeEmail(input.recipient.email),
      persistence.mode === 'token_sensitive' ? null : input.recipient.name ?? null,
      persistence.mode === 'token_sensitive' ? null : input.recipient.userId ?? null,
      durableSubject(input.emailType as EmailType, input.subject, persistence),
      input.resendId,
      input.status,
      input.hasAttachments,
      JSON.stringify(input.payload),
      persistence.mode === 'token_sensitive' ? sensitiveSource?.sourceEventId ?? null : input.sourceEventId ?? null,
      sensitiveSource?.sourceEntity ?? (persistence.mode === 'token_sensitive' ? null : input.sourceEntity ?? null),
      persistence.mode === 'token_sensitive' ? null : input.actorEmail ?? null,
      input.errorMessage ?? null,
      input.priority ?? 'broadcast',
      input.errorClass ?? null
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

const finalizeClaimedIntentWithoutDispatch = async <TContext extends Record<string, unknown>>(
  input: SendEmailInput<TContext>,
  deliveryIntentId: string,
  reason: string
) => {
  const recipient = input.recipients?.length === 1 ? input.recipients[0] : null
  const source = durableSensitiveSource(input.emailType, input.sourceEventId, input.sourceEntity)

  if (!recipient || !source.sourceEventId || !source.sourceEntity) {
    throw new Error('Claimed delivery intent cannot be finalized safely.')
  }

  const rows = await runGreenhousePostgresQuery<{ delivery_id: string } & Record<string, unknown>>(
    `UPDATE greenhouse_notifications.email_deliveries
     SET status='skipped',error_message=$6,updated_at=NOW()
     WHERE delivery_id=$1 AND email_type=$2 AND recipient_email=$3
       AND source_event_id=$4 AND source_entity=$5 AND status='pending'
       AND delivery_payload->'persistence'->>'mode'='token_sensitive'
     RETURNING delivery_id`,
    [
      deliveryIntentId,
      input.emailType,
      normalizeEmail(recipient.email),
      source.sourceEventId,
      source.sourceEntity,
      reason
    ]
  )

  if (!rows[0]) throw new Error('Claimed delivery intent could not be finalized.')

  return rows[0].delivery_id
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
        AND status IN ('failed', 'rate_limited')
        AND attempt_number < 3
        AND NOT (email_type = ANY($2::text[]))
        AND COALESCE(delivery_payload->'persistence'->>'retryable', 'true') <> 'false'
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
    [deliveryId, [...TOKEN_SENSITIVE_EMAIL_TYPES]]
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
  priority?: EmailPriority
  persistence?: SendEmailInput['persistence']
}) => {
  let acceptedResendId: string | null = null
  let durableDeliveryId = input.existingDeliveryId ?? null

  const requestedIntentId = input.persistence?.mode === 'token_sensitive'
    ? input.persistence.deliveryIntentId
    : undefined

  if (isRotationOwnerEmailType(input.emailType) && !requestedIntentId) {
    throw new Error('A claimed delivery intent is required for credential-rotation email types.')
  }

  const basePayload = normalizePayload({
    emailType: input.emailType,
    recipients: [input.recipient],
    context: input.context,
    attachments: input.persistence?.mode === 'token_sensitive' ? undefined : input.attachments,
    persistence: input.persistence
  })

  try {
    if (requestedIntentId) {
      const source = durableSensitiveSource(input.emailType, input.sourceEventId, input.sourceEntity)

      const rows = await runGreenhousePostgresQuery<{ exists: boolean } & Record<string, unknown>>(
        `SELECT EXISTS (
           SELECT 1 FROM greenhouse_notifications.email_deliveries
           WHERE delivery_id=$1 AND email_type=$2 AND recipient_email=$3
             AND source_event_id=$4 AND source_entity=$5 AND status='pending'
             AND delivery_payload->'persistence'->>'mode'='token_sensitive'
         ) AS exists`,
        [
          requestedIntentId,
          input.emailType,
          normalizeEmail(input.recipient.email),
          source.sourceEventId ?? null,
          source.sourceEntity ?? null
        ]
      )

      if (rows[0]?.exists !== true) throw new Error('Token-sensitive delivery intent is not valid.')

      durableDeliveryId = requestedIntentId
    }

    if (input.persistence?.mode === 'token_sensitive' && input.attachments?.length) {
      throw new Error('Token-sensitive email cannot persist or replay attachments.')
    }

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

    // ── Rate Limit: check per-recipient hourly limit (critical/transactional bypass) ──
    if (!input.existingDeliveryId) {
      const rateCheck = await checkRecipientRateLimit(input.recipient.email, undefined, input.priority)

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
    const isBroadcast = BROADCAST_EMAIL_TYPES.includes(input.emailType)
    let unsubscribeUrl: string | undefined

    if (isBroadcast) {
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

    if (input.persistence?.mode === 'token_sensitive' && mergedAttachments.length > 0) {
      throw new Error('Token-sensitive email cannot persist or replay attachments.')
    }

    const resendAttachments = toResendAttachments(mergedAttachments)

    const payload = normalizePayload({
      emailType: input.emailType,
      recipients: [input.recipient],
      context: input.context,
      attachments: mergedAttachments,
      persistence: input.persistence
    })

    if (input.persistence?.mode === 'token_sensitive' && !durableDeliveryId) {
      durableDeliveryId = await createDeliveryRow({
        batchId: input.batchId,
        emailType: input.emailType,
        domain: input.domain,
        recipient: input.recipient,
        subject: resolvedTemplate.subject,
        resendId: null,
        status: 'pending',
        hasAttachments: false,
        payload,
        sourceEventId: input.sourceEventId,
        sourceEntity: input.sourceEntity,
        actorEmail: input.actorEmail,
        priority: input.priority
      })

      if (!durableDeliveryId) {
        throw new Error('Unable to establish token-sensitive delivery intent.')
      }
    }

    // ── RESEND_API_KEY guard: config error → failed (retryable), NOT skipped ──
    if (!isResendConfigured()) {
      const configErrorMsg = 'RESEND_API_KEY is not configured.'

      if (durableDeliveryId) {
        await updateDeliveryRow({
          deliveryId: durableDeliveryId,
          resendId: null,
          status: 'failed',
          errorMessage: configErrorMsg
        })
      } else {
        await createDeliveryRow({
          batchId: input.batchId,
          emailType: input.emailType,
          domain: input.domain,
          recipient: input.recipient,
          subject: resolvedTemplate.subject,
          resendId: null,
          status: 'failed',
          hasAttachments: Boolean(resendAttachments.length),
          payload,
          sourceEventId: input.sourceEventId,
          sourceEntity: input.sourceEntity,
          actorEmail: input.actorEmail,
          errorMessage: configErrorMsg,
          priority: input.priority,
          errorClass: 'config_error'
        })
      }

      return {
        deliveryId: durableDeliveryId || input.batchId,
        recipientEmail: input.recipient.email,
        resendId: null,
        status: 'failed' as const,
        error: configErrorMsg
      }
    }

    const resend = getResendClient()

    // ── List-Unsubscribe header (RFC 8058) for broadcast emails ──
    const unsubscribeHeaders = isBroadcast && unsubscribeUrl
      ? {
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
          }
        }
      : {}

    const result = await resend.emails.send({
      from: resolveEmailFromAddress(input.emailType),
      to: normalizeEmail(input.recipient.email),
      subject: resolvedTemplate.subject,
      react: resolvedTemplate.react,
      text: resolvedTemplate.text,
      ...(resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
      ...unsubscribeHeaders
    })

    if (result?.error || !result?.data?.id) {
      throw new Error('Email provider rejected dispatch.')
    }

    const resendId = result.data.id

    acceptedResendId = resendId

    if (durableDeliveryId) {
      await updateDeliveryRow({
        deliveryId: durableDeliveryId,
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
        actorEmail: input.actorEmail,
        priority: input.priority
      })
    }

    return {
      deliveryId: durableDeliveryId || input.batchId,
      recipientEmail: input.recipient.email,
      resendId,
      status: 'sent' as const,
      dispatchOutcome: 'accepted' as const
    }
  } catch (error) {
    const tokenSensitive = input.persistence?.mode === 'token_sensitive'

    const message = tokenSensitive
      ? 'Token-sensitive email delivery failed.'
      : error instanceof Error
        ? error.message
        : 'Failed to send email.'

    const isTemplateMissing = error instanceof Error && error.message.includes('No email template registered')
    const subject = isTemplateMissing ? '[template missing]' : '[email delivery failed]'
    const errorClass = isTemplateMissing ? 'template_error' : 'resend_api_error'

    // Capture in Sentry for observability — tagged `domain:cloud` so it
    // surfaces in the Cloud Platform module's `incident` signal (email
    // delivery is part of the cloud infrastructure footprint via the
    // `Notificaciones` subsystem).
    captureWithDomain(tokenSensitive ? new Error(message) : error, 'cloud', {
      extra: {
        emailType: input.emailType,
        recipientEmail: input.recipient.email,
        priority: input.priority,
        attempt: input.existingDeliveryId ? 'retry' : 'first',
        errorClass
      },
      tags: { surface: 'email_delivery' }
    })

    if (acceptedResendId) {
      return {
        deliveryId: durableDeliveryId || input.batchId,
        recipientEmail: input.recipient.email,
        resendId: acceptedResendId,
        status: 'failed' as const,
        dispatchOutcome: 'unknown' as const,
        error: tokenSensitive ? 'Token-sensitive email dispatch state is unknown.' : 'Email dispatch state is unknown.'
      }
    }

    if (durableDeliveryId) {
      await updateDeliveryRow({
        deliveryId: durableDeliveryId,
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
            hasAttachments: tokenSensitive ? false : Boolean(input.attachments?.length),
        payload: basePayload,
        sourceEventId: input.sourceEventId,
        sourceEntity: input.sourceEntity,
        actorEmail: input.actorEmail,
        errorMessage: message,
        priority: input.priority,
        errorClass
      }).catch(err => {
        console.warn('[email-delivery] Failed to persist failed delivery row:', err)
      })
    }

    return {
      deliveryId: durableDeliveryId || input.batchId,
      recipientEmail: input.recipient.email,
      resendId: null,
      status: 'failed' as const,
      dispatchOutcome: 'failed' as const,
      error: message
    }
  }
}

// ── Broadcast Batch Delivery ──────────────────────────────────────────────────
//
// Uses Resend Batch API for broadcast emails with >1 recipient and no attachments.
// Runs per-recipient preparation in parallel, then makes a single API call.
// Falls back to sequential delivery if any recipient has attachments.
//
// Note: Resend Batch API does not support `attachments` — see CreateBatchEmailOptions.
// ─────────────────────────────────────────────────────────────────────────────

type BroadcastPrepared =
  | {
      ok: true
      recipient: EmailRecipient
      subject: string
      react: ReturnType<typeof resolveTemplate>['react']
      text: string
      hasAttachments: boolean
      headers: Record<string, string>
      payload: EmailDeliveryPayload
    }
  | {
      ok: false
      recipient: EmailRecipient
      status: 'rate_limited' | 'skipped' | 'failed'
      error: string
      payload: EmailDeliveryPayload
    }

const prepareBroadcastRecipient = async <TContext extends Record<string, unknown>>(
  recipient: EmailRecipient,
  input: {
    batchId: string
    emailType: EmailType
    domain: EmailDomain
    context: TContext
    sourceEventId?: string
    sourceEntity?: string
    actorEmail?: string
    priority: EmailPriority
  }
): Promise<BroadcastPrepared> => {
  const basePayload = normalizePayload({
    emailType: input.emailType,
    recipients: [recipient],
    context: input.context
  })

  try {
    // Rate limit (critical/transactional bypass handled inside checkRecipientRateLimit)
    const rateCheck = await checkRecipientRateLimit(recipient.email, undefined, input.priority)

    if (!rateCheck.allowed) {
      const errorMessage = `Rate limit exceeded: ${rateCheck.currentCount} emails/hour to ${recipient.email}`

      await createDeliveryRow({
        batchId: input.batchId,
        emailType: input.emailType,
        domain: input.domain,
        recipient,
        subject: '[rate_limited]',
        resendId: null,
        status: 'rate_limited',
        hasAttachments: false,
        payload: basePayload,
        sourceEventId: input.sourceEventId,
        sourceEntity: input.sourceEntity,
        actorEmail: input.actorEmail,
        priority: input.priority
      })

      return { ok: false, recipient, status: 'rate_limited', error: errorMessage, payload: basePayload }
    }

    // Context resolution
    let resolvedContext: Record<string, unknown> = {}

    try {
      const emailContext = await resolveEmailContext(recipient.email)

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

        if (!recipient.name && emailContext.recipient.fullName) recipient.name = emailContext.recipient.fullName
        if (!recipient.userId && emailContext.recipient.userId) recipient.userId = emailContext.recipient.userId
      }
    } catch (ctxErr) {
      if (ctxErr instanceof EmailUndeliverableError) {
        const errorMessage = ctxErr.message

        await createDeliveryRow({
          batchId: input.batchId,
          emailType: input.emailType,
          domain: input.domain,
          recipient,
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

        return { ok: false, recipient, status: 'skipped', error: errorMessage, payload: basePayload }
      }

      // Non-blocking: continue with caller context if resolver fails for other reasons
    }

    // Unsubscribe URL (non-blocking)
    let unsubscribeUrl: string | undefined

    try {
      unsubscribeUrl = await generateUnsubscribeUrl(recipient.email, input.emailType)
    } catch {
      // non-blocking
    }

    // Merge contexts and resolve template
    const mergedContext = {
      ...resolvedContext,
      ...input.context,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientUserId: recipient.userId,
      unsubscribeUrl
    }

    const resolvedTemplate = resolveTemplate(input.emailType, mergedContext)
    const mergedAttachments = mergeAttachments(resolvedTemplate.attachments, undefined)

    const payload = normalizePayload({
      emailType: input.emailType,
      recipients: [recipient],
      context: input.context,
      attachments: mergedAttachments
    })

    const headers: Record<string, string> = unsubscribeUrl
      ? { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
      : {}

    return {
      ok: true,
      recipient,
      subject: resolvedTemplate.subject,
      react: resolvedTemplate.react,
      text: resolvedTemplate.text,
      hasAttachments: mergedAttachments.length > 0,
      headers,
      payload
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      extra: { emailType: input.emailType, recipientEmail: recipient.email, phase: 'batch_prepare' },
      tags: { surface: 'email_delivery' }
    })

    return {
      ok: false,
      recipient,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Preparation failed.',
      payload: basePayload
    }
  }
}

/**
 * Delivers broadcast emails to multiple recipients using Resend Batch API.
 * Preparation runs in parallel per recipient; then a single API call is made.
 * Falls back to sequential (deliverRecipient) if any recipient has attachments.
 */
const deliverBroadcastBatch = async <TContext extends Record<string, unknown>>(input: {
  batchId: string
  emailType: EmailType
  domain: EmailDomain
  recipients: EmailRecipient[]
  context: TContext
  sourceEventId?: string
  sourceEntity?: string
  actorEmail?: string
  priority: EmailPriority
}): Promise<NonNullable<SendEmailResult['recipientResults']>> => {
  // Parallel preparation
  const preparations = await Promise.all(
    input.recipients.map(recipient => prepareBroadcastRecipient(recipient, input))
  )

  const eligible = preparations.filter((p): p is Extract<BroadcastPrepared, { ok: true }> => p.ok)
  const ineligible = preparations.filter((p): p is Extract<BroadcastPrepared, { ok: false }> => !p.ok)

  const results: NonNullable<SendEmailResult['recipientResults']> = ineligible.map(item => ({
    recipientEmail: item.recipient.email,
    resendId: null,
    status: item.status,
    error: item.error
  }))

  if (eligible.length === 0) return results

  // If any recipient requires attachments, Batch API can't be used — fall back to sequential
  const needsAttachments = eligible.some(item => item.hasAttachments)

  if (needsAttachments) {
    for (const item of eligible) {
      const result = await deliverRecipient({
        batchId: input.batchId,
        emailType: input.emailType,
        domain: input.domain,
        recipient: item.recipient,
        context: input.context,
        sourceEventId: input.sourceEventId,
        sourceEntity: input.sourceEntity,
        actorEmail: input.actorEmail,
        priority: input.priority
      })

      results.push({
        deliveryId: result.deliveryId,
        recipientEmail: item.recipient.email,
        resendId: result.resendId,
        status: result.status,
        ...(result.dispatchOutcome ? { dispatchOutcome: result.dispatchOutcome } : {}),
        ...(result.error ? { error: result.error } : {})
      })
    }

    return results
  }

  // Resend Batch API — single call for all eligible recipients
  const resendClient = getResendClient()

  try {
    const batchPayload = eligible.map(item => ({
      from: getEmailFromAddress(),
      to: normalizeEmail(item.recipient.email),
      subject: item.subject,
      react: item.react,
      text: item.text,
      headers: Object.keys(item.headers).length > 0 ? item.headers : undefined
    }))

    const batchResult = await resendClient.batch.send(batchPayload)
    const accepted = batchResult.data?.data

    if (batchResult.error || !accepted || accepted.length !== eligible.length || accepted.some(item => !item.id)) {
      throw new Error('Email provider rejected batch dispatch.')
    }

    // Record one delivery row per recipient
    const persistedResults = await Promise.all(eligible.map(async (item, i) => {
      const resendId = accepted[i].id

      try {
        const deliveryId = await createDeliveryRow({
          batchId: input.batchId,
          emailType: input.emailType,
          domain: input.domain,
          recipient: item.recipient,
          subject: item.subject,
          resendId,
          status: 'sent',
          hasAttachments: false,
          payload: item.payload,
          sourceEventId: input.sourceEventId,
          sourceEntity: input.sourceEntity,
          actorEmail: input.actorEmail,
          priority: input.priority
        })

        return {
          ...(deliveryId ? { deliveryId } : {}),
          recipientEmail: item.recipient.email,
          resendId,
          status: 'sent' as const,
          dispatchOutcome: 'accepted' as const
        }
      } catch {
        return {
          recipientEmail: item.recipient.email,
          resendId,
          status: 'failed' as const,
          dispatchOutcome: 'unknown' as const,
          error: 'Email dispatch state is unknown.'
        }
      }
    }))

    results.push(...persistedResults)
  } catch (batchError) {
    // Batch API failed — record all eligible as failed (retryable)
    captureWithDomain(batchError, 'cloud', {
      extra: { emailType: input.emailType, recipientCount: eligible.length, phase: 'batch_send' },
      tags: { surface: 'email_delivery' }
    })

    const errorMessage = batchError instanceof Error ? batchError.message : 'Batch send failed.'

    const failedResults = await Promise.all(eligible.map(async item => {
      try {
        const deliveryId = await createDeliveryRow({
          batchId: input.batchId,
          emailType: input.emailType,
          domain: input.domain,
          recipient: item.recipient,
          subject: item.subject,
          resendId: null,
          status: 'failed',
          hasAttachments: false,
          payload: item.payload,
          sourceEventId: input.sourceEventId,
          sourceEntity: input.sourceEntity,
          actorEmail: input.actorEmail,
          errorMessage,
          priority: input.priority,
          errorClass: 'resend_api_error'
        })

        return {
          ...(deliveryId ? { deliveryId } : {}),
          recipientEmail: item.recipient.email,
          resendId: null,
          status: 'failed' as const,
          dispatchOutcome: 'failed' as const,
          error: errorMessage
        }
      } catch {
        return {
          recipientEmail: item.recipient.email,
          resendId: null,
          status: 'failed' as const,
          dispatchOutcome: 'failed' as const,
          error: errorMessage
        }
      }
    }))

    results.push(...failedResults)
  }

  return results
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

/**
 * TASK-1719/TASK-1745 — ¿ya se despachó ALGÚN correo de este `emailType` ligado a esta entidad?
 *
 * Variante sin destinatario de `wasEmailAlreadySent`: responde por entidad, sin recibir ni
 * devolver la dirección, para que un dominio pueda saber "esto ya se comunicó hacia afuera"
 * sin resolver PII del candidato. NO sirve como dedupe de envío (ese sigue siendo
 * `wasEmailAlreadySent`, que discrimina por destinatario); sirve para decidir si una
 * cancelación exige comunicación correctiva humana. No afirma entrega al servidor receptor.
 */
export const wasEmailDispatchedForEntity = async (
  sourceEntity: string,
  emailType: string
): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ exists: boolean } & Record<string, unknown>>(
    `SELECT EXISTS (
       SELECT 1
       FROM greenhouse_notifications.email_deliveries
       WHERE source_entity = $1
         AND email_type = $2
         AND status IN ('sent', 'delivered')
     ) AS exists`,
    [sourceEntity, emailType]
  )

  return rows[0]?.exists === true
}

export const sendEmail = async <TContext extends Record<string, unknown>>(
  input: SendEmailInput<TContext>
): Promise<SendEmailResult> => {
  const batchId = randomUUID()
  const persistence = resolveDeliveryPersistence(input.emailType, input.persistence)

  // Kill switch: check if this email type is paused
  const killSwitch = await checkEmailTypeEnabled(input.emailType)

  if (!killSwitch.enabled) {
    if (persistence.mode === 'token_sensitive' && persistence.deliveryIntentId) {
      const deliveryId = await finalizeClaimedIntentWithoutDispatch(
        input,
        persistence.deliveryIntentId,
        'Email type paused before provider dispatch.'
      )

      return {
        deliveryId,
        resendId: null,
        status: 'skipped',
        dispatchOutcome: 'failed',
        error: `Email type paused: ${killSwitch.pausedReason ?? 'no reason provided'}`
      }
    }

    return {
      deliveryId: batchId,
      resendId: null,
      status: 'skipped',
      error: `Email type paused: ${killSwitch.pausedReason ?? 'no reason provided'}`
    }
  }

  // Derive priority from map or explicit override
  const priority: EmailPriority = input.priority ?? EMAIL_PRIORITY_MAP[input.emailType] ?? 'broadcast'

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

  // ── Broadcast + multi-recipient → Batch API (parallel prep + 1 Resend call) ──
  // Sequential path is kept for: single recipients, non-broadcast priority, or input-level attachments.
  const useBatch =
    priority === 'broadcast' &&
    recipients.length > 1 &&
    !input.attachments?.length &&
    persistence.mode !== 'token_sensitive' &&
    isResendConfigured()

  let firstResendId: string | null = null
  let sawFailure = false
  let sawSkipped = false
  let sawUnknown = false
  let lastError: string | undefined
  let recipientResults: NonNullable<SendEmailResult['recipientResults']>

  if (useBatch) {
    recipientResults = await deliverBroadcastBatch({
      batchId,
      emailType: input.emailType,
      domain: input.domain,
      recipients,
      context: input.context,
      sourceEventId: input.sourceEventId,
      sourceEntity: input.sourceEntity,
      actorEmail: input.actorEmail,
      priority
    })
  } else {
    recipientResults = []

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
        actorEmail: input.actorEmail,
        priority,
        persistence
      })

      recipientResults.push({
        deliveryId: result.deliveryId,
        recipientEmail: recipient.email,
        resendId: result.resendId,
        status: result.status,
        ...(result.dispatchOutcome ? { dispatchOutcome: result.dispatchOutcome } : {}),
        ...(result.error ? { error: result.error } : {})
      })
    }
  }

  for (const result of recipientResults) {
    if (result.resendId && !firstResendId) {
      firstResendId = result.resendId
    }

    if (result.status === 'failed' || result.status === 'rate_limited') {
      sawFailure = true
      lastError = lastError || result.error
    } else if (result.status === 'skipped') {
      sawSkipped = true
      lastError = lastError || result.error
    }

    if (result.dispatchOutcome === 'unknown') sawUnknown = true
  }

  return {
    deliveryId: recipientResults.length === 1 ? recipientResults[0].deliveryId ?? batchId : batchId,
    resendId: firstResendId,
    status: sawFailure ? 'failed' : sawSkipped ? 'skipped' : 'sent',
    dispatchOutcome: sawUnknown ? 'unknown' : sawFailure || sawSkipped ? 'failed' : 'accepted',
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
      WHERE (
        (status = 'failed' AND attempt_number < 3)
        OR (status = 'rate_limited' AND updated_at < NOW() - INTERVAL '1 hour' AND attempt_number < 3)
      )
        AND created_at > NOW() - INTERVAL '24 hours'
        AND NOT (email_type = ANY($2::text[]))
        AND COALESCE(delivery_payload->'persistence'->>'retryable', 'true') <> 'false'
      ORDER BY created_at ASC
      LIMIT $1
    `,
    [limit, [...TOKEN_SENSITIVE_EMAIL_TYPES]]
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

      // Dead letter: exhaused all attempts — escalate and alert
      if (claimedRow.attempt_number >= 3) {
        await runGreenhousePostgresQuery(
          `UPDATE greenhouse_notifications.email_deliveries
           SET status = 'dead_letter', updated_at = NOW()
           WHERE delivery_id = $1`,
          [claimedRow.delivery_id]
        ).catch(err => console.warn('[email-delivery] Failed to mark dead letter:', err))

        await publishOutboxEvent({
          aggregateType: AGGREGATE_TYPES.emailDelivery,
          aggregateId: claimedRow.delivery_id,
          eventType: EVENT_TYPES.emailDeliveryDead,
          payload: {
            deliveryId: claimedRow.delivery_id,
            emailType: claimedRow.email_type,
            recipientEmail: claimedRow.recipient_email,
            attemptNumber: claimedRow.attempt_number,
            lastError: retryResult.error ?? claimedRow.error_message
          }
        }).catch(err => console.warn('[email-delivery] Failed to publish dead letter event:', err))
      }
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
