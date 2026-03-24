-- Webhook Infrastructure MVP — PostgreSQL foundation
-- Tables live in greenhouse_sync schema (already exists)

-- 1. Webhook endpoints — registered inbound webhook targets
CREATE TABLE IF NOT EXISTS greenhouse_sync.webhook_endpoints (
  webhook_endpoint_id TEXT PRIMARY KEY,
  endpoint_key TEXT NOT NULL UNIQUE,
  provider_code TEXT NOT NULL,
  handler_code TEXT NOT NULL,
  auth_mode TEXT NOT NULL DEFAULT 'shared_secret'
    CHECK (auth_mode IN ('shared_secret', 'hmac_sha256', 'bearer', 'provider_native', 'none')),
  secret_ref TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Webhook inbox events — inbound webhook receipts
CREATE TABLE IF NOT EXISTS greenhouse_sync.webhook_inbox_events (
  webhook_inbox_event_id TEXT PRIMARY KEY,
  webhook_endpoint_id TEXT NOT NULL REFERENCES greenhouse_sync.webhook_endpoints(webhook_endpoint_id),
  provider_code TEXT NOT NULL,
  source_event_id TEXT,
  idempotency_key TEXT NOT NULL,
  headers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_body_text TEXT,
  signature_verified BOOLEAN,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'processed', 'failed', 'dead_letter')),
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ,
  CONSTRAINT webhook_inbox_events_idempotency UNIQUE (webhook_endpoint_id, idempotency_key)
);

-- 3. Webhook subscriptions — outbound webhook subscribers
CREATE TABLE IF NOT EXISTS greenhouse_sync.webhook_subscriptions (
  webhook_subscription_id TEXT PRIMARY KEY,
  subscriber_code TEXT NOT NULL,
  target_url TEXT NOT NULL,
  auth_mode TEXT NOT NULL DEFAULT 'hmac_sha256'
    CHECK (auth_mode IN ('hmac_sha256', 'bearer', 'none')),
  secret_ref TEXT,
  event_filters_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Webhook deliveries — outbound delivery tracking (one per event+subscription)
CREATE TABLE IF NOT EXISTS greenhouse_sync.webhook_deliveries (
  webhook_delivery_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  webhook_subscription_id TEXT NOT NULL REFERENCES greenhouse_sync.webhook_subscriptions(webhook_subscription_id),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivering', 'succeeded', 'retry_scheduled', 'dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_http_status INTEGER,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  CONSTRAINT webhook_deliveries_dedupe UNIQUE (event_id, webhook_subscription_id)
);

-- 5. Webhook delivery attempts — individual HTTP request logs
CREATE TABLE IF NOT EXISTS greenhouse_sync.webhook_delivery_attempts (
  webhook_delivery_attempt_id TEXT PRIMARY KEY,
  webhook_delivery_id TEXT NOT NULL REFERENCES greenhouse_sync.webhook_deliveries(webhook_delivery_id),
  attempt_number INTEGER NOT NULL,
  request_headers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_body_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_status INTEGER,
  response_body TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMPTZ,
  error_message TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS webhook_inbox_events_endpoint_idx
  ON greenhouse_sync.webhook_inbox_events (webhook_endpoint_id, received_at DESC);
CREATE INDEX IF NOT EXISTS webhook_inbox_events_status_idx
  ON greenhouse_sync.webhook_inbox_events (status, received_at DESC);
CREATE INDEX IF NOT EXISTS webhook_deliveries_pending_idx
  ON greenhouse_sync.webhook_deliveries (status, next_retry_at)
  WHERE status IN ('pending', 'retry_scheduled');
CREATE INDEX IF NOT EXISTS webhook_deliveries_event_idx
  ON greenhouse_sync.webhook_deliveries (event_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_subscription_idx
  ON greenhouse_sync.webhook_deliveries (webhook_subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_delivery_attempts_delivery_idx
  ON greenhouse_sync.webhook_delivery_attempts (webhook_delivery_id, attempt_number);

-- Grants (runtime user)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_sync TO greenhouse_runtime;

-- Seed: Teams attendance inbound endpoint
INSERT INTO greenhouse_sync.webhook_endpoints (
  webhook_endpoint_id, endpoint_key, provider_code, handler_code, auth_mode, secret_ref, active
) VALUES (
  'wh-ep-teams-attendance', 'teams-attendance', 'microsoft_teams', 'hr.attendance.teams',
  'shared_secret', 'HR_CORE_TEAMS_WEBHOOK_SECRET', TRUE
) ON CONFLICT (endpoint_key) DO NOTHING;

-- Seed: Test finance subscription (inactive by default)
INSERT INTO greenhouse_sync.webhook_subscriptions (
  webhook_subscription_id, subscriber_code, target_url, auth_mode, secret_ref,
  event_filters_json, active
) VALUES (
  'wh-sub-finance-test', 'finance-test-subscriber', 'https://example.com/test-webhook',
  'hmac_sha256', 'WEBHOOK_TEST_SUBSCRIBER_SECRET',
  '[{"event_type": "finance.*"}]'::jsonb, FALSE
) ON CONFLICT (webhook_subscription_id) DO NOTHING;
