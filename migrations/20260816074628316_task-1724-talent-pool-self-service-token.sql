-- Up Migration

ALTER TABLE greenhouse_hiring.talent_pool_consent_event
  DROP CONSTRAINT IF EXISTS talent_pool_consent_event_action_check;
ALTER TABLE greenhouse_hiring.talent_pool_consent_event
  ADD CONSTRAINT talent_pool_consent_event_action_check CHECK (action IN (
    'requested','granted','paused','resumed','withdrawn','expired','corrected'
  ));

ALTER TABLE greenhouse_hiring.talent_pool_consent_event
  ADD COLUMN receipt_public_id TEXT NOT NULL DEFAULT ('EO-TLPR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)));
ALTER TABLE greenhouse_hiring.talent_pool_consent_event
  ADD CONSTRAINT talent_pool_consent_receipt_public_id_key UNIQUE(receipt_public_id);

CREATE TABLE greenhouse_hiring.talent_pool_self_service_token (
  token_id TEXT PRIMARY KEY DEFAULT ('tlpt-' || gen_random_uuid()::text),
  membership_id TEXT NOT NULL REFERENCES greenhouse_hiring.talent_pool_membership(membership_id) ON DELETE RESTRICT,
  access_token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'future_opportunities' CHECK (purpose='future_opportunities'),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  issued_by TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > issued_at)
);
CREATE INDEX talent_pool_self_service_membership_idx
  ON greenhouse_hiring.talent_pool_self_service_token(membership_id, expires_at DESC);

CREATE TABLE greenhouse_hiring.talent_pool_public_rate_bucket (
  ip_hash TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('read','write')),
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1 CHECK (hit_count > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ip_hash, action)
);

INSERT INTO greenhouse_notifications.email_type_config(email_type,enabled)
VALUES ('hiring_talent_pool_verification',TRUE) ON CONFLICT(email_type) DO NOTHING;

ALTER TABLE greenhouse_hiring.talent_pool_self_service_token OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.talent_pool_public_rate_bucket OWNER TO greenhouse_ops;
GRANT SELECT,INSERT,UPDATE ON greenhouse_hiring.talent_pool_self_service_token TO greenhouse_runtime,greenhouse_app,greenhouse_migrator_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON greenhouse_hiring.talent_pool_public_rate_bucket TO greenhouse_runtime,greenhouse_app,greenhouse_migrator_user;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='greenhouse_hiring'
    AND table_name='talent_pool_consent_event' AND column_name='receipt_public_id') THEN
    RAISE EXCEPTION 'TASK-1724 anti pre-up-marker: receipt_public_id missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='greenhouse_hiring'
    AND table_name='talent_pool_self_service_token') THEN
    RAISE EXCEPTION 'TASK-1724 anti pre-up-marker: token table missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='greenhouse_hiring'
    AND table_name='talent_pool_public_rate_bucket') THEN
    RAISE EXCEPTION 'TASK-1724 anti pre-up-marker: rate bucket missing';
  END IF;
END $$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_hiring.talent_pool_self_service_token;
DROP TABLE IF EXISTS greenhouse_hiring.talent_pool_public_rate_bucket;
DELETE FROM greenhouse_notifications.email_type_config WHERE email_type='hiring_talent_pool_verification';
ALTER TABLE greenhouse_hiring.talent_pool_consent_event DROP CONSTRAINT IF EXISTS talent_pool_consent_receipt_public_id_key;
ALTER TABLE greenhouse_hiring.talent_pool_consent_event DROP COLUMN IF EXISTS receipt_public_id;
ALTER TABLE greenhouse_hiring.talent_pool_consent_event DROP CONSTRAINT IF EXISTS talent_pool_consent_event_action_check;
ALTER TABLE greenhouse_hiring.talent_pool_consent_event ADD CONSTRAINT talent_pool_consent_event_action_check
  CHECK (action IN ('granted','paused','resumed','withdrawn','expired','corrected'));
