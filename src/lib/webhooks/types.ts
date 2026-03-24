// ── Row types (match Postgres columns) ──

export interface WebhookEndpoint {
  webhook_endpoint_id: string
  endpoint_key: string
  provider_code: string
  handler_code: string
  auth_mode: 'shared_secret' | 'hmac_sha256' | 'bearer' | 'provider_native' | 'none'
  secret_ref: string | null
  active: boolean
}

export interface WebhookInboxEvent {
  webhook_inbox_event_id: string
  webhook_endpoint_id: string
  provider_code: string
  source_event_id: string | null
  idempotency_key: string
  headers_json: Record<string, unknown>
  payload_json: Record<string, unknown>
  raw_body_text: string | null
  signature_verified: boolean | null
  status: 'received' | 'processing' | 'processed' | 'failed' | 'dead_letter'
  error_message: string | null
  received_at: string
  processed_at: string | null
}

export interface WebhookSubscription {
  webhook_subscription_id: string
  subscriber_code: string
  target_url: string
  auth_mode: 'hmac_sha256' | 'bearer' | 'none'
  secret_ref: string | null
  event_filters_json: EventFilter[]
  active: boolean
  paused_at: string | null
}

export interface WebhookDelivery {
  webhook_delivery_id: string
  event_id: string
  webhook_subscription_id: string
  event_type: string
  status: 'pending' | 'delivering' | 'succeeded' | 'retry_scheduled' | 'dead_letter'
  attempt_count: number
  next_retry_at: string | null
  last_http_status: number | null
  last_error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface WebhookDeliveryAttempt {
  webhook_delivery_attempt_id: string
  webhook_delivery_id: string
  attempt_number: number
  request_headers_json: Record<string, unknown>
  request_body_json: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  started_at: string
  finished_at: string | null
  error_message: string | null
}

// ── Canonical outbound envelope ──

export interface WebhookEnvelope {
  eventId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  occurredAt: string
  version: number
  source: string
  data: Record<string, unknown>
}

// ── Event filter for subscriptions ──

export interface EventFilter {
  event_type?: string
  aggregate_type?: string
}

// ── Inbound handler function signature ──

export type InboundHandlerFn = (
  inboxEvent: WebhookInboxEvent,
  rawBody: string,
  parsedPayload: unknown
) => Promise<void>
