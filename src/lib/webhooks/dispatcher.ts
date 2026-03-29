import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { WebhookSubscription } from './types'
import { buildWebhookEnvelope } from './envelope'
import { matchesSubscription, deliverWebhook } from './outbound'
import { ensureWebhookSchema, getActiveSubscriptions, upsertDelivery, getPendingDeliveries } from './store'

// ── Types ──

export interface DispatchResult {
  eventsMatched: number
  deliveriesAttempted: number
  succeeded: number
  failed: number
  deadLettered: number
  durationMs: number
}

type OutboxEventRow = {
  event_id: string
  aggregate_type: string
  aggregate_id: string
  event_type: string
  payload_json: unknown
  occurred_at: string | Date
}

// ── Main dispatcher ──

export const dispatchPendingWebhooks = async (options?: {
  batchSize?: number
}): Promise<DispatchResult> => {
  const startMs = Date.now()
  const batchSize = options?.batchSize ?? 30

  await ensureWebhookSchema()

  // 1. Get active subscriptions
  const subscriptions = await getActiveSubscriptions()

  if (subscriptions.length === 0) {
    return { eventsMatched: 0, deliveriesAttempted: 0, succeeded: 0, failed: 0, deadLettered: 0, durationMs: Date.now() - startMs }
  }

  // 2. Read recent published outbox events (last 24h) and create deliveries for matching subscriptions
  const events = await runGreenhousePostgresQuery<OutboxEventRow>(
    `SELECT event_id, aggregate_type, aggregate_id, event_type, payload_json, occurred_at
     FROM greenhouse_sync.outbox_events
     WHERE status = 'published'
       AND occurred_at > NOW() - INTERVAL '24 hours'
     ORDER BY published_at DESC NULLS LAST, occurred_at DESC
     LIMIT $1`,
    [batchSize]
  )

  let eventsMatched = 0

  for (const event of events) {
    for (const sub of subscriptions) {
      if (matchesSubscription(event.event_type, event.aggregate_type, sub)) {
        const { isNew } = await upsertDelivery(event.event_id, sub.webhook_subscription_id, event.event_type)

        if (isNew) eventsMatched++
      }
    }
  }

  // 3. Process pending deliveries
  const pendingDeliveries = await getPendingDeliveries(batchSize)

  let succeeded = 0
  let failed = 0
  let deadLettered = 0

  // Build subscription lookup
  const subMap = new Map<string, WebhookSubscription>()

  for (const s of subscriptions) {
    subMap.set(s.webhook_subscription_id, s)
  }

  for (const delivery of pendingDeliveries) {
    // Time budget check — leave 5s margin for the Vercel function timeout
    if (Date.now() - startMs > 50_000) break

    const subscription = subMap.get(delivery.webhook_subscription_id)

    if (!subscription) continue

    // Look up source event
    const eventRows = await runGreenhousePostgresQuery<OutboxEventRow>(
      `SELECT event_id, aggregate_type, aggregate_id, event_type, payload_json, occurred_at
       FROM greenhouse_sync.outbox_events
       WHERE event_id = $1`,
      [delivery.event_id]
    )

    const sourceEvent = eventRows[0]

    if (!sourceEvent) continue

    const envelope = buildWebhookEnvelope(sourceEvent)

    try {
      await deliverWebhook(delivery, subscription, envelope)

      // Check post-delivery status
      const afterRows = await runGreenhousePostgresQuery<{ status: string }>(
        `SELECT status FROM greenhouse_sync.webhook_deliveries WHERE webhook_delivery_id = $1`,
        [delivery.webhook_delivery_id]
      )

      const afterStatus = afterRows[0]?.status

      if (afterStatus === 'succeeded') succeeded++
      else if (afterStatus === 'dead_letter') deadLettered++
      else failed++
    } catch {
      failed++
    }
  }

  return {
    eventsMatched,
    deliveriesAttempted: pendingDeliveries.length,
    succeeded,
    failed,
    deadLettered,
    durationMs: Date.now() - startMs
  }
}
