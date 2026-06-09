-- Up Migration

-- Coming Soon / "We are launching soon" email capture (launch waitlist).
-- Public + internal audiences (route /coming-soon). One row per normalized
-- email (idempotent upsert). Email is normalized to lowercase in-app; UNIQUE on
-- the stored value (no citext extension dependency). `request_ip_hash` is a
-- SHA-256 of the client IP (never the raw IP — PII hygiene) used for anonymous
-- rate-limiting. `notified_at` is set by the future "we launched" send flow.

CREATE TABLE IF NOT EXISTS greenhouse_core.launch_notifications (
  notification_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT NOT NULL,
  locale             TEXT NOT NULL DEFAULT 'es-CL',
  source             TEXT NOT NULL DEFAULT 'public',
  user_id            TEXT NULL,
  request_ip_hash    TEXT NULL,
  status             TEXT NOT NULL DEFAULT 'subscribed',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at        TIMESTAMPTZ NULL,
  CONSTRAINT launch_notifications_email_unique UNIQUE (email),
  CONSTRAINT launch_notifications_email_lowercase_check CHECK (email = lower(email)),
  CONSTRAINT launch_notifications_email_shape_check CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT launch_notifications_source_check CHECK (source IN ('public', 'internal')),
  CONSTRAINT launch_notifications_status_check CHECK (status IN ('subscribed', 'notified', 'unsubscribed'))
);

-- Anonymous rate-limit lookup: count rows by ip_hash within a recent window.
CREATE INDEX IF NOT EXISTS launch_notifications_ip_window_idx
  ON greenhouse_core.launch_notifications (request_ip_hash, created_at DESC);

-- Pending-notify sweep (future "we launched" send flow).
CREATE INDEX IF NOT EXISTS launch_notifications_pending_notify_idx
  ON greenhouse_core.launch_notifications (status)
  WHERE status = 'subscribed' AND notified_at IS NULL;

COMMENT ON TABLE greenhouse_core.launch_notifications IS
  'Coming Soon launch waitlist (route /coming-soon). One row per normalized email, idempotent upsert. request_ip_hash is SHA-256 of client IP for anonymous rate-limiting; never the raw IP.';

-- Ownership + runtime grants (canonical: greenhouse_ops owns, greenhouse_runtime read/write).
ALTER TABLE greenhouse_core.launch_notifications OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.launch_notifications TO greenhouse_runtime;

-- Anti pre-up-marker bug guard: abort if the table did not actually materialize.
DO $$
DECLARE table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'launch_notifications'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'launch_notifications anti pre-up-marker check: greenhouse_core.launch_notifications was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.launch_notifications;
