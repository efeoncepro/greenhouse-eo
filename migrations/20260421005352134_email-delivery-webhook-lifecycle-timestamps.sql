-- Up Migration

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ;

COMMENT ON COLUMN greenhouse_notifications.email_deliveries.delivered_at IS
  'Timestamp confirmed by Resend webhook email.delivered.';

COMMENT ON COLUMN greenhouse_notifications.email_deliveries.bounced_at IS
  'Timestamp confirmed by Resend webhook email.bounced.';

COMMENT ON COLUMN greenhouse_notifications.email_deliveries.complained_at IS
  'Timestamp confirmed by Resend webhook email.complained.';

CREATE INDEX IF NOT EXISTS idx_email_deliveries_delivered_at
  ON greenhouse_notifications.email_deliveries (delivered_at DESC)
  WHERE delivered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_deliveries_bounced_at
  ON greenhouse_notifications.email_deliveries (bounced_at DESC)
  WHERE bounced_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_deliveries_complained_at
  ON greenhouse_notifications.email_deliveries (complained_at DESC)
  WHERE complained_at IS NOT NULL;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_notifications.idx_email_deliveries_complained_at;
DROP INDEX IF EXISTS greenhouse_notifications.idx_email_deliveries_bounced_at;
DROP INDEX IF EXISTS greenhouse_notifications.idx_email_deliveries_delivered_at;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP COLUMN IF EXISTS complained_at;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP COLUMN IF EXISTS bounced_at;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP COLUMN IF EXISTS delivered_at;
