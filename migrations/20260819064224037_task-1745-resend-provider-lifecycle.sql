-- Up Migration

-- TASK-1745 — provider lifecycle is distinct from the outbound dispatch state.
-- `email_deliveries.status = sent` remains "accepted by Resend" so this
-- additive migration cannot interfere with the retry/sender state machine.

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_status_source TEXT,
  ADD COLUMN IF NOT EXISTS provider_observed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_event_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_event_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_delayed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suppressed_at TIMESTAMPTZ;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_provider_status_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD CONSTRAINT email_deliveries_provider_status_check CHECK (
    provider_status IS NULL OR provider_status IN (
      'sent',
      'delivered',
      'delivery_delayed',
      'failed',
      'bounced',
      'complained',
      'suppressed'
    )
  );

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_provider_status_source_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD CONSTRAINT email_deliveries_provider_status_source_check CHECK (
    provider_status_source IS NULL OR provider_status_source IN ('webhook', 'reconciliation')
  );

COMMENT ON COLUMN greenhouse_notifications.email_deliveries.provider_status IS
  'Latest observed Resend lifecycle fact; signed webhook evidence supersedes provisional reconciliation observations.';

COMMENT ON COLUMN greenhouse_notifications.email_deliveries.provider_event_created_at IS
  'Provider timestamp used to prevent an older, out-of-order event from replacing a newer lifecycle fact.';

CREATE INDEX IF NOT EXISTS idx_email_deliveries_provider_status
  ON greenhouse_notifications.email_deliveries (provider_status, provider_event_created_at DESC)
  WHERE provider_status IS NOT NULL;

CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_provider_events (
  provider_event_id TEXT PRIMARY KEY,
  resend_id TEXT,
  delivery_id UUID REFERENCES greenhouse_notifications.email_deliveries(delivery_id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL DEFAULT 'webhook',
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  provider_created_at TIMESTAMPTZ,
  bounce_type TEXT,
  click_origin TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  reason_code TEXT,
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  first_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempted_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  dead_lettered_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,

  CONSTRAINT email_provider_events_processing_status_check CHECK (
    processing_status IN ('pending', 'processed', 'ignored', 'dead_letter')
  ),
  CONSTRAINT email_provider_events_source_check CHECK (
    event_source IN ('webhook', 'reconciliation')
  ),
  CONSTRAINT email_provider_events_evidence_check CHECK (
    (event_source = 'webhook' AND signature_verified = TRUE AND provider_created_at IS NOT NULL)
    OR
    (event_source = 'reconciliation' AND signature_verified = FALSE AND provider_created_at IS NULL)
  )
);

COMMENT ON TABLE greenhouse_notifications.email_provider_events IS
  'Normalized, token-free Resend evidence inbox. Signed webhooks use svix-id; reconciliation observations use a namespaced internal key.';

CREATE INDEX IF NOT EXISTS idx_email_provider_events_pending
  ON greenhouse_notifications.email_provider_events (next_attempt_at, first_received_at)
  WHERE processing_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_provider_events_resend_id
  ON greenhouse_notifications.email_provider_events (resend_id, provider_created_at DESC)
  WHERE resend_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON greenhouse_notifications.email_provider_events TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_notifications.email_provider_events;

DROP INDEX IF EXISTS greenhouse_notifications.idx_email_deliveries_provider_status;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_provider_status_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP COLUMN IF EXISTS suppressed_at,
  DROP COLUMN IF EXISTS failed_at,
  DROP COLUMN IF EXISTS delivery_delayed_at,
  DROP COLUMN IF EXISTS provider_event_created_at,
  DROP COLUMN IF EXISTS provider_event_id,
  DROP COLUMN IF EXISTS provider_observed_at,
  DROP COLUMN IF EXISTS provider_status_source,
  DROP COLUMN IF EXISTS provider_status;
