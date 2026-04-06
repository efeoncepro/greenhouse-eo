-- Up Migration
-- TASK-269: Email Delivery Enterprise Hardening
-- Adds locale + undeliverable columns, extends delivery status, formalizes notification schema

-- ═══ 1. Add locale + email_undeliverable to client_users ═══

ALTER TABLE greenhouse_core.client_users
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'es';

ALTER TABLE greenhouse_core.client_users
  ADD COLUMN IF NOT EXISTS email_undeliverable BOOLEAN NOT NULL DEFAULT FALSE;

-- ═══ 2. Extend email_deliveries status CHECK to include rate_limited + delivered ═══
-- Drop and recreate the CHECK constraint (PostgreSQL has no ALTER CONSTRAINT)

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_status_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD CONSTRAINT email_deliveries_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'rate_limited', 'delivered'));

-- ═══ 3. Index for rate-limit lookups (recipient + recent deliveries) ═══

CREATE INDEX IF NOT EXISTS idx_email_deliveries_recipient_recent
  ON greenhouse_notifications.email_deliveries (recipient_email, created_at DESC)
  WHERE status IN ('sent', 'delivered');

-- ═══ 4. Grant new columns to runtime ═══

GRANT SELECT, INSERT, UPDATE ON greenhouse_core.client_users TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_notifications.email_deliveries TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_notifications.email_subscriptions TO greenhouse_runtime;

-- Down Migration

ALTER TABLE greenhouse_core.client_users
  DROP COLUMN IF EXISTS locale;

ALTER TABLE greenhouse_core.client_users
  DROP COLUMN IF EXISTS email_undeliverable;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_status_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD CONSTRAINT email_deliveries_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'skipped'));

DROP INDEX IF EXISTS greenhouse_notifications.idx_email_deliveries_recipient_recent;
