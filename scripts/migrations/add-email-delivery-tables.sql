-- ══════════════════════════════════════════════════════
-- Centralized Email Delivery Layer
-- Schema: greenhouse_notifications
-- Ref: TASK-095-centralized-email-delivery-layer.md
-- ══════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS greenhouse_notifications;

CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_deliveries (
  delivery_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id           UUID NOT NULL,
  email_type         TEXT NOT NULL,
  domain             TEXT NOT NULL,
  recipient_email    TEXT NOT NULL,
  recipient_name     TEXT,
  recipient_user_id  TEXT,
  subject            TEXT NOT NULL,
  resend_id          TEXT,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  has_attachments    BOOLEAN NOT NULL DEFAULT FALSE,
  source_event_id    TEXT,
  source_entity      TEXT,
  actor_email        TEXT,
  error_message      TEXT,
  attempt_number     INTEGER NOT NULL DEFAULT 1,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_status
  ON greenhouse_notifications.email_deliveries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_type
  ON greenhouse_notifications.email_deliveries (email_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_recipient
  ON greenhouse_notifications.email_deliveries (recipient_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_batch
  ON greenhouse_notifications.email_deliveries (batch_id);

CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_subscriptions (
  subscription_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type         TEXT NOT NULL,
  recipient_email    TEXT NOT NULL,
  recipient_name     TEXT,
  recipient_user_id  TEXT,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_email_subscription UNIQUE (email_type, recipient_email)
);

CREATE INDEX IF NOT EXISTS idx_email_subscriptions_type_active
  ON greenhouse_notifications.email_subscriptions (email_type, active, created_at DESC);

INSERT INTO greenhouse_notifications.email_subscriptions
  (email_type, recipient_email, recipient_name, recipient_user_id, active, created_at, updated_at)
VALUES
  ('payroll_export', 'finance@efeoncepro.com', 'Finanzas | Efeonce', NULL, TRUE, NOW(), NOW()),
  ('payroll_export', 'hhumberly@efeoncepro.com', 'Humberly Henriquez', NULL, TRUE, NOW(), NOW()),
  ('payroll_export', 'jreyes@efeoncepro.com', 'Julio Reyes', NULL, TRUE, NOW(), NOW())
ON CONFLICT (email_type, recipient_email) DO UPDATE SET
  recipient_name = EXCLUDED.recipient_name,
  recipient_user_id = EXCLUDED.recipient_user_id,
  active = TRUE,
  updated_at = NOW();
