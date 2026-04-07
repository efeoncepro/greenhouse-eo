-- ══════════════════════════════════════════════════════
-- Notification System — greenhouse_notifications schema
-- Ref: TASK-023-notification-system.md
-- Run: psql $DATABASE_URL -f scripts/setup-postgres-notifications.sql
-- ══════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS greenhouse_notifications;

-- Grants
GRANT USAGE ON SCHEMA greenhouse_notifications TO greenhouse_runtime;
GRANT USAGE, CREATE ON SCHEMA greenhouse_notifications TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_notifications TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_notifications TO greenhouse_runtime;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA greenhouse_notifications TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_notifications TO greenhouse_ops;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA greenhouse_notifications TO greenhouse_runtime;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA greenhouse_notifications TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_notifications GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_notifications GRANT ALL PRIVILEGES ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_notifications GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_ops;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_notifications GRANT USAGE, SELECT ON SEQUENCES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_notifications GRANT ALL PRIVILEGES ON SEQUENCES TO greenhouse_migrator;

-- ── 1. Notifications table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_notifications.notifications (
  notification_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,
  space_id          TEXT,
  category          TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT,
  action_url        TEXT,
  icon              TEXT,
  metadata          JSONB DEFAULT '{}',
  read_at           TIMESTAMPTZ,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unread notifications for bell dropdown (user, sorted by date)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON greenhouse_notifications.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL AND archived_at IS NULL;

-- Badge count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_count
  ON greenhouse_notifications.notifications (user_id)
  WHERE read_at IS NULL AND archived_at IS NULL;

-- Filter by category
CREATE INDEX IF NOT EXISTS idx_notifications_user_category
  ON greenhouse_notifications.notifications (user_id, category, created_at DESC);

-- Cleanup job (purge archived > 90d)
CREATE INDEX IF NOT EXISTS idx_notifications_archived
  ON greenhouse_notifications.notifications (archived_at)
  WHERE archived_at IS NOT NULL;

-- ── 2. Notification preferences ──────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_notifications.notification_preferences (
  preference_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,
  category          TEXT NOT NULL,
  in_app_enabled    BOOLEAN NOT NULL DEFAULT true,
  email_enabled     BOOLEAN NOT NULL DEFAULT true,
  muted_until       TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_notif_pref_user_category UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_preferences_user
  ON greenhouse_notifications.notification_preferences (user_id);

-- ── 3. Notification dispatch log (append-only) ──────────────────

CREATE TABLE IF NOT EXISTS greenhouse_notifications.notification_log (
  log_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id   UUID,
  user_id           TEXT NOT NULL,
  category          TEXT NOT NULL,
  channel           TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
  status            TEXT NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
  skip_reason       TEXT,
  metadata          JSONB DEFAULT '{}',
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user
  ON greenhouse_notifications.notification_log (user_id, created_at DESC);
