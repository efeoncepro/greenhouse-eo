import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { getResendClientAsync } from '@/lib/resend'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

const RECONCILABLE_LAST_EVENTS = new Set([
  'sent',
  'delivered',
  'delivery_delayed',
  'failed',
  'bounced',
  'complained',
  'suppressed'
])

type DeliveryCandidateRow = {
  delivery_id: string
  resend_id: string
  status: string
  provider_status: string | null
  created_at: string
}

export type ResendReconciliationItem = {
  deliveryId: string
  resendId: string
  dispatchStatus: string
  currentProviderStatus: string | null
  observedProviderStatus: string | null
  action: 'would_apply' | 'applied' | 'preserved_existing' | 'unchanged' | 'unsupported' | 'provider_error'
}

export type ResendReconciliationReport = {
  mode: 'dry-run' | 'apply'
  scanned: number
  wouldApply: number
  applied: number
  unchanged: number
  preservedExisting: number
  unsupported: number
  providerErrors: number
  nextCursor: string | null
  items: ResendReconciliationItem[]
}

const normalizeLastEvent = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null

const parseCursor = (cursor: string | undefined) => {
  const separator = cursor?.lastIndexOf('|') ?? -1

  if (!cursor || separator < 1) return { createdAt: null, deliveryId: null }

  const createdAt = cursor.slice(0, separator)
  const deliveryId = cursor.slice(separator + 1)

  return Number.isNaN(new Date(createdAt).getTime()) || !deliveryId
    ? { createdAt: null, deliveryId: null }
    : { createdAt, deliveryId }
}

const listCandidates = async (limit: number, lookbackDays: number, cursor?: string) => {
  const parsedCursor = parseCursor(cursor)

  return runGreenhousePostgresQuery<DeliveryCandidateRow & Record<string, unknown>>(
    `SELECT delivery_id::text, resend_id, status, provider_status, created_at::text
     FROM greenhouse_notifications.email_deliveries
     WHERE resend_id IS NOT NULL
       AND created_at >= NOW() - ($2::text || ' days')::interval
       AND status IN ('sent', 'delivered')
       AND provider_status IS NULL
       AND ($3::timestamptz IS NULL OR (created_at, delivery_id) < ($3::timestamptz, $4::uuid))
     ORDER BY created_at DESC, delivery_id DESC
     LIMIT $1`,
    [limit, lookbackDays, parsedCursor.createdAt, parsedCursor.deliveryId]
  )
}

const recordReconciliationObservation = async (input: {
  deliveryId: string
  resendId: string
  lastEvent: string
}) =>
  withGreenhousePostgresTransaction(async client => {
    await client.query(
      `INSERT INTO greenhouse_notifications.email_provider_events (
         provider_event_id, resend_id, delivery_id, event_type, event_source,
         signature_verified, provider_created_at, processing_status,
         processing_attempts, last_attempted_at, processed_at, reason_code
       ) VALUES (
         $1, $2, $3, $4, 'reconciliation', FALSE, NULL, 'ignored',
         1, NOW(), NOW(), 'non_lifecycle_last_event'
       )
       ON CONFLICT (provider_event_id) DO NOTHING`,
      [
        `reconcile:${input.resendId}:${input.lastEvent}`,
        input.resendId,
        input.deliveryId,
        `email.${input.lastEvent}`
      ]
    )
  })

const applyReconciledLifecycleFact = async (input: {
  deliveryId: string
  resendId: string
  lastEvent: string
}) =>
  withGreenhousePostgresTransaction(async client => {
    const observationId = `reconcile:${input.resendId}:${input.lastEvent}`
    const supportedStatus = input.lastEvent

    const deliveryRows = await client.query<{ recipient_email: string; email_type: string }>(
      `SELECT recipient_email, email_type
       FROM greenhouse_notifications.email_deliveries
       WHERE delivery_id = $1 AND resend_id = $2
       FOR UPDATE`,
      [input.deliveryId, input.resendId]
    )

    const delivery = deliveryRows.rows[0]

    if (!delivery) return 'preserved_existing'

    await client.query(
      `INSERT INTO greenhouse_notifications.email_provider_events (
         provider_event_id, resend_id, delivery_id, event_type, event_source,
         signature_verified, provider_created_at, processing_status,
         processing_attempts, last_attempted_at, processed_at, reason_code
       ) VALUES (
         $1, $2, $3, $4, 'reconciliation', FALSE, NULL, 'processed',
         1, NOW(), NOW(), $5
       )
       ON CONFLICT (provider_event_id) DO NOTHING`,
      [
        observationId,
        input.resendId,
        input.deliveryId,
        `email.${input.lastEvent}`,
        null
      ]
    )

    const result = await client.query<{ delivery_id: string }>(
      `UPDATE greenhouse_notifications.email_deliveries
       SET provider_status = $3,
           provider_status_source = 'reconciliation',
           provider_observed_at = NOW(),
           provider_event_id = $4,
           updated_at = NOW()
       WHERE delivery_id = $1
         AND resend_id = $2
         AND provider_status IS NULL
         AND provider_event_created_at IS NULL
         AND provider_observed_at IS NULL
       RETURNING delivery_id::text`,
      [input.deliveryId, input.resendId, supportedStatus, observationId]
    )

    if (result.rows.length === 0) return 'preserved_existing'

    if (input.lastEvent === 'complained') {
      await client.query(
        `UPDATE greenhouse_notifications.email_subscriptions
         SET active = FALSE, updated_at = NOW()
         WHERE email_type = $1 AND LOWER(recipient_email) = LOWER($2)`,
        [delivery.email_type, delivery.recipient_email]
      )

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.emailDelivery,
          aggregateId: input.deliveryId,
          eventType: EVENT_TYPES.emailDeliveryComplained,
          payload: {
            deliveryId: input.deliveryId,
            resendId: input.resendId,
            reconciliationObservationId: observationId
          }
        },
        client
      )
    }

    if (input.lastEvent === 'bounced') {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.emailDelivery,
          aggregateId: input.deliveryId,
          eventType: EVENT_TYPES.emailDeliveryBounced,
          payload: {
            deliveryId: input.deliveryId,
            resendId: input.resendId,
            reconciliationObservationId: observationId,
            bounceType: null
          }
        },
        client
      )
    }

    return 'applied'
  })

export const reconcileResendDeliveries = async (input?: {
  apply?: boolean
  limit?: number
  lookbackDays?: number
  cursor?: string
}): Promise<ResendReconciliationReport> => {
  const apply = input?.apply === true
  const limit = Math.max(1, Math.min(input?.limit ?? 50, 200))
  const lookbackDays = Math.max(1, Math.min(input?.lookbackDays ?? 30, 90))
  const candidates = await listCandidates(limit, lookbackDays, input?.cursor)
  const resend = await getResendClientAsync()
  const items: ResendReconciliationItem[] = []

  for (const candidate of candidates) {
    const base = {
      deliveryId: candidate.delivery_id,
      resendId: candidate.resend_id,
      dispatchStatus: candidate.status,
      currentProviderStatus: candidate.provider_status
    }

    try {
      const response = await resend.emails.get(candidate.resend_id)
      const lastEvent = normalizeLastEvent(response.data?.last_event)

      if (response.error || !lastEvent) {
        items.push({ ...base, observedProviderStatus: null, action: 'provider_error' })
        continue
      }

      if (!RECONCILABLE_LAST_EVENTS.has(lastEvent)) {
        if (apply) {
          await recordReconciliationObservation({
            deliveryId: candidate.delivery_id,
            resendId: candidate.resend_id,
            lastEvent
          })
        }

        items.push({ ...base, observedProviderStatus: lastEvent, action: 'unsupported' })
        continue
      }

      if (candidate.provider_status === lastEvent) {
        items.push({ ...base, observedProviderStatus: lastEvent, action: 'unchanged' })
        continue
      }

      if (!apply) {
        items.push({ ...base, observedProviderStatus: lastEvent, action: 'would_apply' })
        continue
      }

      const action = await applyReconciledLifecycleFact({
        deliveryId: candidate.delivery_id,
        resendId: candidate.resend_id,
        lastEvent
      })

      items.push({ ...base, observedProviderStatus: lastEvent, action })
    } catch {
      items.push({ ...base, observedProviderStatus: null, action: 'provider_error' })
    }
  }

  return {
    mode: apply ? 'apply' : 'dry-run',
    scanned: items.length,
    wouldApply: items.filter(item => item.action === 'would_apply').length,
    applied: items.filter(item => item.action === 'applied').length,
    unchanged: items.filter(item => item.action === 'unchanged').length,
    preservedExisting: items.filter(item => item.action === 'preserved_existing').length,
    unsupported: items.filter(item => item.action === 'unsupported').length,
    providerErrors: items.filter(item => item.action === 'provider_error').length,
    nextCursor:
      candidates.length === limit
        ? `${candidates.at(-1)?.created_at}|${candidates.at(-1)?.delivery_id}`
        : null,
    items
  }
}
