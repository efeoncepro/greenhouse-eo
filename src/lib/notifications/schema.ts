import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

let ensurePromise: Promise<void> | null = null

const DDL_STATEMENTS = [
  `CREATE SCHEMA IF NOT EXISTS greenhouse_notifications`,

  `CREATE TABLE IF NOT EXISTS greenhouse_notifications.notifications (
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
  )`,

  `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
   ON greenhouse_notifications.notifications (user_id, created_at DESC)
   WHERE read_at IS NULL AND archived_at IS NULL`,

  `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_count
   ON greenhouse_notifications.notifications (user_id)
   WHERE read_at IS NULL AND archived_at IS NULL`,

  `CREATE INDEX IF NOT EXISTS idx_notifications_user_category
   ON greenhouse_notifications.notifications (user_id, category, created_at DESC)`,

  `CREATE TABLE IF NOT EXISTS greenhouse_notifications.notification_preferences (
    preference_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           TEXT NOT NULL,
    category          TEXT NOT NULL,
    in_app_enabled    BOOLEAN NOT NULL DEFAULT true,
    email_enabled     BOOLEAN NOT NULL DEFAULT true,
    muted_until       TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_notif_pref_user_category UNIQUE (user_id, category)
  )`,

  `CREATE TABLE IF NOT EXISTS greenhouse_notifications.notification_log (
    log_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id   UUID,
    user_id           TEXT NOT NULL,
    category          TEXT NOT NULL,
    channel           TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
    status            TEXT NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
    skip_reason       TEXT,
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  )`
]

export const ensureNotificationSchema = async (): Promise<void> => {
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    for (const sql of DDL_STATEMENTS) {
      await runGreenhousePostgresQuery(sql)
    }
  })().catch(err => {
    ensurePromise = null
    throw err
  })

  return ensurePromise
}
