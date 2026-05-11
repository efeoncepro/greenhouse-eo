import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type {
  WebhookEndpoint,
  WebhookInboxEvent,
  WebhookSubscription,
  WebhookDelivery,
  WebhookDeliveryAttempt
} from './types'

// Postgres row type with index signature for runGreenhousePostgresQuery compatibility
type PgRow = Record<string, unknown>

// ── Schema provisioning ──

let ensureWebhookSchemaPromise: Promise<void> | null = null

export const ensureWebhookSchema = async () => {
  if (ensureWebhookSchemaPromise) return ensureWebhookSchemaPromise

  ensureWebhookSchemaPromise = (async () => {
    // Check if the core table exists
    const rows = await runGreenhousePostgresQuery<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM pg_tables WHERE schemaname = 'greenhouse_sync' AND tablename = 'webhook_endpoints'
      ) AS exists
    `)

    if (!rows[0]?.exists) {
      throw new Error('Webhook tables not provisioned. Run: npx tsx scripts/setup-postgres-webhooks.ts')
    }
  })().catch(error => {
    ensureWebhookSchemaPromise = null
    throw error
  })

  return ensureWebhookSchemaPromise
}

// ── Endpoints ──

export const getEndpointByKey = async (endpointKey: string): Promise<WebhookEndpoint | null> => {
  const rows = await runGreenhousePostgresQuery<PgRow>(
    `SELECT * FROM greenhouse_sync.webhook_endpoints WHERE endpoint_key = $1 AND active = TRUE`,
    [endpointKey]
  )

  return (rows[0] as unknown as WebhookEndpoint) || null
}

// ── Inbox Events ──

export const insertInboxEvent = async (event: {
  endpointId: string
  providerCode: string
  sourceEventId: string | null
  idempotencyKey: string
  headersJson: Record<string, unknown>
  payloadJson: Record<string, unknown>
  rawBodyText: string | null
  signatureVerified: boolean | null
}): Promise<{ id: string; isDuplicate: boolean }> => {
  const id = `wh-inbox-${randomUUID()}`

  const result = await runGreenhousePostgresQuery<{
    webhook_inbox_event_id: string
    is_duplicate: boolean
  }>(
    `WITH inserted AS (
       INSERT INTO greenhouse_sync.webhook_inbox_events (
         webhook_inbox_event_id, webhook_endpoint_id, provider_code,
         source_event_id, idempotency_key,
         headers_json, payload_json, raw_body_text,
         signature_verified, status
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, 'received')
       ON CONFLICT (webhook_endpoint_id, idempotency_key) DO NOTHING
       RETURNING webhook_inbox_event_id, false AS is_duplicate
     )
     SELECT webhook_inbox_event_id, is_duplicate FROM inserted
     UNION ALL
     SELECT webhook_inbox_event_id, true AS is_duplicate
       FROM greenhouse_sync.webhook_inbox_events
      WHERE webhook_endpoint_id = $2
        AND idempotency_key = $5
        AND NOT EXISTS (SELECT 1 FROM inserted)
     LIMIT 1`,
    [
      id, event.endpointId, event.providerCode,
      event.sourceEventId, event.idempotencyKey,
      JSON.stringify(event.headersJson), JSON.stringify(event.payloadJson),
      event.rawBodyText, event.signatureVerified
    ]
  )

  return {
    id: result[0]?.webhook_inbox_event_id || id,
    isDuplicate: result[0]?.is_duplicate ?? true
  }
}

export const updateInboxEventStatus = async (
  id: string,
  status: WebhookInboxEvent['status'],
  errorMessage?: string
) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.webhook_inbox_events
     SET status = $1, error_message = $2, processed_at = CASE WHEN $1 IN ('processed', 'failed') THEN NOW() ELSE processed_at END
     WHERE webhook_inbox_event_id = $3`,
    [status, errorMessage || null, id]
  )
}

// ── Subscriptions ──

export const getActiveSubscriptions = async (): Promise<WebhookSubscription[]> => {
  const rows = await runGreenhousePostgresQuery<PgRow>(
    `SELECT * FROM greenhouse_sync.webhook_subscriptions WHERE active = TRUE AND paused_at IS NULL`
  )

  return rows as unknown as WebhookSubscription[]
}

// ── Deliveries ──

export const upsertDelivery = async (
  eventId: string,
  subscriptionId: string,
  eventType: string
): Promise<{ id: string; isNew: boolean }> => {
  const id = `wh-del-${randomUUID()}`

  const result = await runGreenhousePostgresQuery<{ webhook_delivery_id: string }>(
    `INSERT INTO greenhouse_sync.webhook_deliveries (
       webhook_delivery_id, event_id, webhook_subscription_id, event_type, status
     ) VALUES ($1, $2, $3, $4, 'pending')
     ON CONFLICT (event_id, webhook_subscription_id) DO NOTHING
     RETURNING webhook_delivery_id`,
    [id, eventId, subscriptionId, eventType]
  )

  return { id: result[0]?.webhook_delivery_id || id, isNew: result.length > 0 }
}

export const updateDeliveryStatus = async (
  id: string,
  status: WebhookDelivery['status'],
  extra?: { httpStatus?: number; errorMessage?: string; nextRetryAt?: Date; attemptCount?: number }
) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.webhook_deliveries
     SET status = $1, last_http_status = $2, last_error_message = $3,
         next_retry_at = $4, attempt_count = COALESCE($5, attempt_count),
         completed_at = CASE WHEN $1 IN ('succeeded', 'dead_letter') THEN NOW() ELSE completed_at END
     WHERE webhook_delivery_id = $6`,
    [
      status,
      extra?.httpStatus ?? null,
      extra?.errorMessage ?? null,
      extra?.nextRetryAt?.toISOString() ?? null,
      extra?.attemptCount ?? null,
      id
    ]
  )
}

export const getPendingDeliveries = async (limit: number): Promise<WebhookDelivery[]> => {
  const rows = await runGreenhousePostgresQuery<PgRow>(
    `SELECT * FROM greenhouse_sync.webhook_deliveries
     WHERE status IN ('pending', 'retry_scheduled')
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  )

  return rows as unknown as WebhookDelivery[]
}

// ── Delivery Attempts ──

export const insertDeliveryAttempt = async (attempt: {
  deliveryId: string
  attemptNumber: number
  requestHeaders: Record<string, unknown>
  requestBody: Record<string, unknown>
  responseStatus: number | null
  responseBody: string | null
  errorMessage: string | null
  startedAt: Date
  finishedAt: Date | null
}): Promise<string> => {
  const id = `wh-att-${randomUUID()}`

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.webhook_delivery_attempts (
       webhook_delivery_attempt_id, webhook_delivery_id, attempt_number,
       request_headers_json, request_body_json,
       response_status, response_body, error_message,
       started_at, finished_at
     ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10)`,
    [
      id, attempt.deliveryId, attempt.attemptNumber,
      JSON.stringify(attempt.requestHeaders), JSON.stringify(attempt.requestBody),
      attempt.responseStatus, attempt.responseBody, attempt.errorMessage,
      attempt.startedAt.toISOString(), attempt.finishedAt?.toISOString() || null
    ]
  )

  return id
}

// ── Observability queries ──

export const getRecentInboxEvents = async (limit: number, status?: string): Promise<WebhookInboxEvent[]> => {
  const rows = status
    ? await runGreenhousePostgresQuery<PgRow>(
        `SELECT * FROM greenhouse_sync.webhook_inbox_events WHERE status = $1 ORDER BY received_at DESC LIMIT $2`,
        [status, limit]
      )
    : await runGreenhousePostgresQuery<PgRow>(
        `SELECT * FROM greenhouse_sync.webhook_inbox_events ORDER BY received_at DESC LIMIT $1`,
        [limit]
      )

  return rows as unknown as WebhookInboxEvent[]
}

export const getRecentDeliveries = async (limit: number, status?: string): Promise<WebhookDelivery[]> => {
  const rows = status
    ? await runGreenhousePostgresQuery<PgRow>(
        `SELECT * FROM greenhouse_sync.webhook_deliveries WHERE status = $1 ORDER BY created_at DESC LIMIT $2`,
        [status, limit]
      )
    : await runGreenhousePostgresQuery<PgRow>(
        `SELECT * FROM greenhouse_sync.webhook_deliveries ORDER BY created_at DESC LIMIT $1`,
        [limit]
      )

  return rows as unknown as WebhookDelivery[]
}

export const getDeliveryAttempts = async (deliveryId: string): Promise<WebhookDeliveryAttempt[]> => {
  const rows = await runGreenhousePostgresQuery<PgRow>(
    `SELECT * FROM greenhouse_sync.webhook_delivery_attempts WHERE webhook_delivery_id = $1 ORDER BY attempt_number ASC`,
    [deliveryId]
  )

  return rows as unknown as WebhookDeliveryAttempt[]
}
