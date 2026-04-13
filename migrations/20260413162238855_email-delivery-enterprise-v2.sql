-- Up Migration
-- TASK-382: Email System Enterprise Hardening — Enterprise Columns + New Tables
-- Adds: error_class, priority, data_redacted_at to email_deliveries
-- Extends status CHECK to include 'dead_letter'
-- Creates: email_engagement (engagement tracking), email_type_config (kill switch)

-- ═══ 1. email_deliveries — nuevas columnas ═══

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD COLUMN IF NOT EXISTS error_class TEXT;

COMMENT ON COLUMN greenhouse_notifications.email_deliveries.error_class IS
  'config_error | rate_limited | template_error | resend_api_error | undeliverable';

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'broadcast';

COMMENT ON COLUMN greenhouse_notifications.email_deliveries.priority IS
  'critical | transactional | broadcast — critical/transactional bypass rate limits';

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD COLUMN IF NOT EXISTS data_redacted_at TIMESTAMPTZ;

COMMENT ON COLUMN greenhouse_notifications.email_deliveries.data_redacted_at IS
  'Set when delivery_payload and PII fields are anonymized for GDPR/data retention';

-- ═══ 2. Extender status CHECK para incluir dead_letter ═══

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_status_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD CONSTRAINT email_deliveries_status_check CHECK (
    status IN ('pending', 'sent', 'failed', 'skipped', 'rate_limited', 'delivered', 'dead_letter')
  );

-- Actualizar el índice de retry para incluir dead_letter
DROP INDEX IF EXISTS greenhouse_notifications.idx_email_deliveries_status_retry;

CREATE INDEX IF NOT EXISTS idx_email_deliveries_status_retry
  ON greenhouse_notifications.email_deliveries (status, attempt_number, created_at)
  WHERE status IN ('failed', 'rate_limited', 'dead_letter');

-- ═══ 3. email_engagement (opened, clicked tracking) ═══

CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_engagement (
  engagement_id   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id       TEXT          NOT NULL,
  delivery_id     UUID          REFERENCES greenhouse_notifications.email_deliveries(delivery_id) ON DELETE SET NULL,
  event_type      TEXT          NOT NULL,
  link_url        TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT email_engagement_event_type_check CHECK (
    event_type IN ('opened', 'clicked')
  )
);

CREATE INDEX IF NOT EXISTS idx_email_engagement_resend_id
  ON greenhouse_notifications.email_engagement (resend_id);

CREATE INDEX IF NOT EXISTS idx_email_engagement_delivery_id
  ON greenhouse_notifications.email_engagement (delivery_id)
  WHERE delivery_id IS NOT NULL;

-- ═══ 4. email_type_config (kill switch por tipo) ═══

CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_type_config (
  email_type      TEXT          PRIMARY KEY,
  enabled         BOOLEAN       NOT NULL DEFAULT TRUE,
  paused_reason   TEXT,
  paused_by       TEXT,
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_notifications.email_type_config IS
  'Kill switch por tipo de email. Filas ausentes → enabled=true por defecto.';

-- ═══ 5. Grants ═══

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_notifications.email_engagement TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_notifications.email_type_config TO greenhouse_runtime;

-- Down Migration

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP COLUMN IF EXISTS error_class;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP COLUMN IF EXISTS priority;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP COLUMN IF EXISTS data_redacted_at;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_status_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD CONSTRAINT email_deliveries_status_check CHECK (
    status IN ('pending', 'sent', 'failed', 'skipped', 'rate_limited', 'delivered')
  );

DROP TABLE IF EXISTS greenhouse_notifications.email_engagement;
DROP TABLE IF EXISTS greenhouse_notifications.email_type_config;