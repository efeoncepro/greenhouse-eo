import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

const LIFECYCLE_STATUS_BY_EVENT = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.failed': 'failed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.suppressed': 'suppressed'
} as const

const ENGAGEMENT_EVENTS = new Set(['email.opened', 'email.clicked'])

type LifecycleEventType = keyof typeof LIFECYCLE_STATUS_BY_EVENT

type NormalizedResendEvent = {
  type: string
  providerCreatedAt: Date
  resendId: string | null
  bounceType: string | null
  clickOrigin: string | null
}

type ProviderEventRow = {
  processing_status: 'pending' | 'processed' | 'ignored' | 'dead_letter'
  reason_code: string | null
}

type DeliveryRow = {
  delivery_id: string
  recipient_email: string
  email_type: string
}

type PendingProviderEventRow = {
  provider_event_id: string
  resend_id: string
  event_type: string
  provider_created_at: Date
  bounce_type: string | null
  click_origin: string | null
}

export type ProcessResendWebhookResult =
  | { outcome: 'processed'; eventType: string; deliveryId: string }
  | { outcome: 'deduplicated'; eventType: string }
  | { outcome: 'ignored'; eventType: string; reason: string }
  | { outcome: 'retry'; eventType: string; reason: 'delivery_not_yet_visible' }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeOptionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const parseProviderDate = (value: unknown) => {
  if (typeof value !== 'string') return null

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const safeClickOrigin = (value: unknown) => {
  if (typeof value !== 'string') return null

  try {
    const parsed = new URL(value)

    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.origin : null
  } catch {
    return null
  }
}

export const normalizeResendWebhookEvent = (payload: unknown): NormalizedResendEvent => {
  if (!isRecord(payload) || typeof payload.type !== 'string' || !isRecord(payload.data)) {
    throw new Error('invalid_resend_webhook_payload')
  }

  const providerCreatedAt = parseProviderDate(payload.created_at)

  if (!providerCreatedAt) {
    throw new Error('invalid_resend_webhook_created_at')
  }

  const bounce = isRecord(payload.data.bounce) ? payload.data.bounce : null
  const click = isRecord(payload.data.click) ? payload.data.click : null

  return {
    type: payload.type,
    providerCreatedAt,
    resendId: normalizeOptionalString(payload.data.email_id),
    bounceType: normalizeOptionalString(bounce?.type),
    clickOrigin: safeClickOrigin(click?.link)
  }
}

const isLifecycleEvent = (eventType: string): eventType is LifecycleEventType =>
  eventType in LIFECYCLE_STATUS_BY_EVENT

const providerStatusRank = (status: (typeof LIFECYCLE_STATUS_BY_EVENT)[LifecycleEventType]) => {
  switch (status) {
    case 'sent':
      return 1
    case 'delivery_delayed':
      return 2
    case 'delivered':
      return 3
    case 'failed':
    case 'suppressed':
    case 'bounced':
      return 4
    case 'complained':
      return 5
  }
}

const lifecycleTimestampColumn = (eventType: LifecycleEventType) => {
  switch (eventType) {
    case 'email.delivered':
      return 'delivered_at'
    case 'email.delivery_delayed':
      return 'delivery_delayed_at'
    case 'email.failed':
      return 'failed_at'
    case 'email.bounced':
      return 'bounced_at'
    case 'email.complained':
      return 'complained_at'
    case 'email.suppressed':
      return 'suppressed_at'
    case 'email.sent':
      return null
  }
}

const markProviderEvent = async (
  client: PoolClient,
  providerEventId: string,
  status: 'processed' | 'ignored',
  reasonCode: string | null
) => {
  await client.query(
    `UPDATE greenhouse_notifications.email_provider_events
     SET processing_status = $2,
         reason_code = $3,
         processing_attempts = processing_attempts + 1,
         last_attempted_at = NOW(),
         next_attempt_at = NULL,
         processed_at = NOW()
     WHERE provider_event_id = $1`,
    [providerEventId, status, reasonCode]
  )
}

const publishDeliveryEvent = async (
  client: PoolClient,
  input: {
    eventType: string
    providerEventId: string
    resendId: string
    deliveryId: string
    bounceType?: string | null
  }
) => {
  if (input.eventType === 'email.bounced') {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.emailDelivery,
        aggregateId: input.deliveryId,
        eventType: EVENT_TYPES.emailDeliveryBounced,
        payload: {
          deliveryId: input.deliveryId,
          resendId: input.resendId,
          providerEventId: input.providerEventId,
          bounceType: input.bounceType
        }
      },
      client
    )
  }

  if (input.eventType === 'email.complained') {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.emailDelivery,
        aggregateId: input.deliveryId,
        eventType: EVENT_TYPES.emailDeliveryComplained,
        payload: {
          deliveryId: input.deliveryId,
          resendId: input.resendId,
          providerEventId: input.providerEventId
        }
      },
      client
    )
  }
}

const processNormalizedEvent = async (
  client: PoolClient,
  providerEventId: string,
  event: NormalizedResendEvent
): Promise<ProcessResendWebhookResult> => {
  await client.query(
    `INSERT INTO greenhouse_notifications.email_provider_events (
       provider_event_id, resend_id, event_type, event_source,
       signature_verified, provider_created_at, bounce_type, click_origin
     ) VALUES ($1, $2, $3, 'webhook', TRUE, $4, $5, $6)
     ON CONFLICT (provider_event_id) DO NOTHING`,
    [
      providerEventId,
      event.resendId,
      event.type,
      event.providerCreatedAt,
      event.bounceType,
      event.clickOrigin
    ]
  )

  const eventRows = await client.query<ProviderEventRow>(
    `SELECT processing_status, reason_code
     FROM greenhouse_notifications.email_provider_events
     WHERE provider_event_id = $1
     FOR UPDATE`,
    [providerEventId]
  )

  const inboxEvent = eventRows.rows[0]

  if (!inboxEvent) throw new Error('resend_provider_event_not_persisted')

  if (inboxEvent.processing_status === 'processed') {
    return { outcome: 'deduplicated', eventType: event.type }
  }

  if (inboxEvent.processing_status === 'ignored') {
    return {
      outcome: 'ignored',
      eventType: event.type,
      reason: inboxEvent.reason_code ?? 'previously_ignored'
    }
  }

  if (inboxEvent.processing_status === 'dead_letter') {
    return {
      outcome: 'ignored',
      eventType: event.type,
      reason: inboxEvent.reason_code ?? 'provider_event_dead_lettered'
    }
  }

  if (!isLifecycleEvent(event.type) && !ENGAGEMENT_EVENTS.has(event.type)) {
    await markProviderEvent(client, providerEventId, 'ignored', 'unsupported_event_type')

    return { outcome: 'ignored', eventType: event.type, reason: 'unsupported_event_type' }
  }

  if (!event.resendId) {
    await markProviderEvent(client, providerEventId, 'ignored', 'missing_email_id')

    return { outcome: 'ignored', eventType: event.type, reason: 'missing_email_id' }
  }

  const deliveryRows = await client.query<DeliveryRow>(
    `SELECT delivery_id, recipient_email, email_type
     FROM greenhouse_notifications.email_deliveries
     WHERE resend_id = $1
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [event.resendId]
  )

  const delivery = deliveryRows.rows[0]

  if (!delivery) {
    const pendingUpdate = await client.query<{ processing_status: string }>(
      `UPDATE greenhouse_notifications.email_provider_events
       SET reason_code = 'delivery_not_yet_visible',
           processing_attempts = processing_attempts + 1,
           last_attempted_at = NOW(),
           processing_status = CASE
             WHEN processing_attempts + 1 >= 20 THEN 'dead_letter'
             ELSE 'pending'
           END,
           next_attempt_at = CASE
             WHEN processing_attempts + 1 >= 20 THEN NULL
             ELSE NOW() + INTERVAL '5 minutes'
           END,
           dead_lettered_at = CASE
             WHEN processing_attempts + 1 >= 20 THEN NOW()
             ELSE dead_lettered_at
           END
       WHERE provider_event_id = $1
       RETURNING processing_status`,
      [providerEventId]
    )

    if (pendingUpdate.rows[0]?.processing_status === 'dead_letter') {
      return {
        outcome: 'ignored',
        eventType: event.type,
        reason: 'delivery_not_visible_after_attempt_budget'
      }
    }

    return { outcome: 'retry', eventType: event.type, reason: 'delivery_not_yet_visible' }
  }

  await client.query(
    `UPDATE greenhouse_notifications.email_provider_events
     SET delivery_id = $2
     WHERE provider_event_id = $1`,
    [providerEventId, delivery.delivery_id]
  )

  if (isLifecycleEvent(event.type)) {
    const providerStatus = LIFECYCLE_STATUS_BY_EVENT[event.type]
    const timestampColumn = lifecycleTimestampColumn(event.type)
    const statusRank = providerStatusRank(providerStatus)

    await client.query(
      `UPDATE greenhouse_notifications.email_deliveries
       SET provider_status = $2,
           provider_status_source = 'webhook',
           provider_observed_at = NOW(),
           provider_event_id = $3,
           provider_event_created_at = $4,
           updated_at = NOW()
       WHERE delivery_id = $1
         AND (
           (
             provider_status_source = 'reconciliation'
             AND (
               provider_observed_at IS NULL
               OR $4 >= provider_observed_at
               OR CASE provider_status
                    WHEN 'sent' THEN 1
                    WHEN 'delivery_delayed' THEN 2
                    WHEN 'delivered' THEN 3
                    WHEN 'failed' THEN 4
                    WHEN 'suppressed' THEN 4
                    WHEN 'bounced' THEN 4
                    WHEN 'complained' THEN 5
                    ELSE 0
                  END < $5
             )
           )
           OR (
             provider_status_source IS DISTINCT FROM 'reconciliation'
             AND provider_event_created_at IS NULL
           )
           OR provider_event_created_at < $4
           OR (
             provider_event_created_at = $4
             AND (
               CASE provider_status
                 WHEN 'sent' THEN 1
                 WHEN 'delivery_delayed' THEN 2
                 WHEN 'delivered' THEN 3
                 WHEN 'failed' THEN 4
                 WHEN 'suppressed' THEN 4
                 WHEN 'bounced' THEN 4
                 WHEN 'complained' THEN 5
                 ELSE 0
               END < $5
               OR (
                 CASE provider_status
                   WHEN 'sent' THEN 1
                   WHEN 'delivery_delayed' THEN 2
                   WHEN 'delivered' THEN 3
                   WHEN 'failed' THEN 4
                   WHEN 'suppressed' THEN 4
                   WHEN 'bounced' THEN 4
                   WHEN 'complained' THEN 5
                   ELSE 0
                 END = $5
                 AND COALESCE(provider_event_id, '') < $3
               )
             )
           )
         )`,
      [delivery.delivery_id, providerStatus, providerEventId, event.providerCreatedAt, statusRank]
    )

    if (timestampColumn) {
      await client.query(
        `UPDATE greenhouse_notifications.email_deliveries
         SET ${timestampColumn} = CASE
               WHEN ${timestampColumn} IS NULL THEN $2
               ELSE LEAST(${timestampColumn}, $2)
             END,
             updated_at = NOW()
         WHERE delivery_id = $1`,
        [delivery.delivery_id, event.providerCreatedAt]
      )
    }

    if (event.type === 'email.bounced') {
      const permanentBounce = /hard|permanent/i.test(event.bounceType ?? '')

      if (permanentBounce) {
        await client.query(
          `UPDATE greenhouse_core.client_users
           SET email_undeliverable = TRUE, updated_at = NOW()
           WHERE LOWER(email) = LOWER($1)`,
          [delivery.recipient_email]
        )

        await publishOutboxEvent(
          {
            aggregateType: AGGREGATE_TYPES.emailDelivery,
            aggregateId: delivery.delivery_id,
            eventType: EVENT_TYPES.emailDeliveryUndeliverableMarked,
            payload: {
              deliveryId: delivery.delivery_id,
              resendId: event.resendId,
              providerEventId
            }
          },
          client
        )
      }
    }

    if (event.type === 'email.complained') {
      await client.query(
        `UPDATE greenhouse_notifications.email_subscriptions
         SET active = FALSE, updated_at = NOW()
         WHERE email_type = $1 AND LOWER(recipient_email) = LOWER($2)`,
        [delivery.email_type, delivery.recipient_email]
      )
    }

    await publishDeliveryEvent(client, {
      eventType: event.type,
      providerEventId,
      resendId: event.resendId,
      deliveryId: delivery.delivery_id,
      bounceType: event.bounceType
    })
  } else {
    await client.query(
      `INSERT INTO greenhouse_notifications.email_engagement (
         resend_event_id, resend_id, delivery_id, event_type, link_url
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (resend_event_id) WHERE resend_event_id IS NOT NULL DO NOTHING`,
      [
        providerEventId,
        event.resendId,
        delivery.delivery_id,
        event.type === 'email.opened' ? 'opened' : 'clicked',
        event.type === 'email.clicked' ? event.clickOrigin : null
      ]
    )
  }

  await markProviderEvent(client, providerEventId, 'processed', null)

  return { outcome: 'processed', eventType: event.type, deliveryId: delivery.delivery_id }
}

export const processResendWebhookEvent = async (input: {
  providerEventId: string
  payload: unknown
}) => {
  const providerEventId = input.providerEventId.trim()

  if (!providerEventId) throw new Error('missing_resend_provider_event_id')

  const event = normalizeResendWebhookEvent(input.payload)

  return withGreenhousePostgresTransaction(client => processNormalizedEvent(client, providerEventId, event))
}

/**
 * Redrive signed events that were durably accepted before their delivery row
 * became visible. This never calls Resend and never sends email.
 */
export const redrivePendingResendWebhookEvents = async (input?: { limit?: number }) => {
  const limit = Math.max(1, Math.min(input?.limit ?? 50, 200))

  const rows = await runGreenhousePostgresQuery<PendingProviderEventRow & Record<string, unknown>>(
    `SELECT provider_event_id, resend_id, event_type, provider_created_at,
            bounce_type, click_origin
     FROM greenhouse_notifications.email_provider_events
     WHERE event_source = 'webhook'
       AND signature_verified = TRUE
       AND processing_status = 'pending'
       AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
       AND resend_id IS NOT NULL
       AND provider_created_at IS NOT NULL
     ORDER BY first_received_at ASC
     LIMIT $1`,
    [limit]
  )

  const results: ProcessResendWebhookResult[] = []

  for (const row of rows) {
    const result = await withGreenhousePostgresTransaction(client =>
      processNormalizedEvent(client, row.provider_event_id, {
        type: row.event_type,
        providerCreatedAt: new Date(row.provider_created_at),
        resendId: row.resend_id,
        bounceType: row.bounce_type,
        clickOrigin: row.click_origin
      })
    )

    results.push(result)
  }

  return {
    scanned: results.length,
    processed: results.filter(result => result.outcome === 'processed').length,
    stillPending: results.filter(result => result.outcome === 'retry').length,
    deduplicated: results.filter(result => result.outcome === 'deduplicated').length,
    ignored: results.filter(result => result.outcome === 'ignored').length
  }
}
