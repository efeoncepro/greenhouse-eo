-- ════════════════════════════════════════════════════════════════════════════
-- Operations Infrastructure — PostgreSQL DDL
-- ════════════════════════════════════════════════════════════════════════════
--
-- Creates tables required by the Operations monitoring dashboard and the
-- reactive projection system. Safe to run multiple times (all idempotent).
--
-- Tables:
--   1. greenhouse_sync.projection_refresh_queue — tracks projection refresh requests
--   2. greenhouse_sync.outbox_reactive_log — idempotency / retry log for reactive projections
--   3. greenhouse_notifications.notifications — user notification storage
--   4. greenhouse_notifications.notification_preferences — per-user channel prefs
-- ════════════════════════════════════════════════════════════════════════════

-- ── Schemas ──
CREATE SCHEMA IF NOT EXISTS greenhouse_sync;
CREATE SCHEMA IF NOT EXISTS greenhouse_notifications;

-- ── 1. Projection Refresh Queue ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_sync.projection_refresh_queue (
  refresh_id TEXT PRIMARY KEY,
  projection_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INT NOT NULL DEFAULT 0,
  triggered_by_event_id TEXT,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prq_status ON greenhouse_sync.projection_refresh_queue(status);
CREATE INDEX IF NOT EXISTS idx_prq_projection ON greenhouse_sync.projection_refresh_queue(projection_name);
CREATE INDEX IF NOT EXISTS idx_prq_entity ON greenhouse_sync.projection_refresh_queue(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS greenhouse_sync.outbox_reactive_log (
  event_id TEXT PRIMARY KEY,
  reacted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handler TEXT,
  result TEXT,
  retries INT NOT NULL DEFAULT 0,
  last_error TEXT
);

-- ── 2. Notifications ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_notifications.notifications (
  notification_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system_event'
    CHECK (category IN (
      'assignment_change', 'project_update', 'sprint_close', 'review_request',
      'finance_alert', 'payroll_ready', 'identity_event', 'system_event',
      'campaign_update', 'service_change'
    )),
  channel TEXT NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('in_app', 'email', 'both')),
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  icon TEXT,
  status TEXT NOT NULL DEFAULT 'unread'
    CHECK (status IN ('unread', 'read', 'archived', 'failed')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_user_status ON greenhouse_notifications.notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notif_category ON greenhouse_notifications.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notif_created ON greenhouse_notifications.notifications(created_at DESC);

-- ── 3. Notification Preferences ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_notifications.notification_preferences (
  preference_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, category)
);

-- ── 4. Outbox events — ensure schema and status column exist ─────────────
-- The outbox_events table is created by setup-postgres-canonical-360.sql
-- but we need to ensure it has the 'status' column for Operations dashboard.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_sync' AND table_name = 'outbox_events'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_sync' AND table_name = 'outbox_events' AND column_name = 'status'
  ) THEN
    ALTER TABLE greenhouse_sync.outbox_events ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- ── Grants ──
GRANT USAGE ON SCHEMA greenhouse_sync TO greenhouse_ops;
GRANT USAGE ON SCHEMA greenhouse_notifications TO greenhouse_ops;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA greenhouse_sync TO greenhouse_ops;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA greenhouse_notifications TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_sync TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_notifications TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_sync GRANT ALL PRIVILEGES ON TABLES TO greenhouse_ops;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_notifications GRANT ALL PRIVILEGES ON TABLES TO greenhouse_ops;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_sync GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_notifications GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
