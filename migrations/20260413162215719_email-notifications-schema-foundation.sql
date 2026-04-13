-- Up Migration
-- TASK-382: Email System Enterprise Hardening — Schema Foundation
-- Closes ISSUE-023: formaliza CREATE TABLE canónico para email_deliveries + email_subscriptions.
--
-- TIMESTAMP NOTE: archivo creado 20260413 (posterior a 20260406121946534 que hace ALTER TABLE).
-- En DB existente (prod/staging) las tablas ya existen — los IF NOT EXISTS son no-ops seguros.
-- En DB fresca, el ownership migration 20260402 falla antes de que ésta corra (deuda documentada).
-- Ver ISSUE-023 para contexto completo.

-- ═══ 1. Schema ═══

CREATE SCHEMA IF NOT EXISTS greenhouse_notifications;

-- ═══ 2. email_deliveries ═══

CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_deliveries (
  delivery_id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            UUID          NOT NULL,
  email_type          TEXT          NOT NULL,
  domain              TEXT          NOT NULL,
  recipient_email     TEXT          NOT NULL,
  recipient_name      TEXT,
  recipient_user_id   TEXT,
  subject             TEXT          NOT NULL,
  resend_id           TEXT,
  status              TEXT          NOT NULL DEFAULT 'pending',
  has_attachments     BOOLEAN       NOT NULL DEFAULT FALSE,
  delivery_payload    JSONB         NOT NULL DEFAULT '{}',
  source_event_id     TEXT,
  source_entity       TEXT,
  actor_email         TEXT,
  error_message       TEXT,
  attempt_number      INTEGER       NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT email_deliveries_status_check CHECK (
    status IN ('pending', 'sent', 'failed', 'skipped', 'rate_limited', 'delivered')
  )
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_recipient_recent
  ON greenhouse_notifications.email_deliveries (recipient_email, created_at DESC)
  WHERE status IN ('sent', 'delivered');

CREATE INDEX IF NOT EXISTS idx_email_deliveries_status_retry
  ON greenhouse_notifications.email_deliveries (status, attempt_number, created_at)
  WHERE status IN ('failed', 'rate_limited');

-- ═══ 3. email_subscriptions ═══

CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_subscriptions (
  subscription_id     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type          TEXT          NOT NULL,
  recipient_email     TEXT          NOT NULL,
  recipient_name      TEXT,
  recipient_user_id   TEXT,
  active              BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT email_subscriptions_type_recipient_uniq UNIQUE (email_type, recipient_email)
);

-- ═══ 4. Grants ═══

GRANT USAGE ON SCHEMA greenhouse_notifications TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_notifications.email_deliveries TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_notifications.email_subscriptions TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_notifications.email_subscriptions;
DROP TABLE IF EXISTS greenhouse_notifications.email_deliveries;
DROP SCHEMA IF EXISTS greenhouse_notifications;