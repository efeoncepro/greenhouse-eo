-- Up Migration

-- TASK-631 Fase 4 — Email PDF attachment + multi-recipient + idempotency + reliability hardening

CREATE TABLE IF NOT EXISTS greenhouse_notifications.idempotency_keys (
  idempotency_key text PRIMARY KEY,
  endpoint text NOT NULL,
  actor_user_id text,
  response_body jsonb NOT NULL,
  response_status integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT idempotency_key_format CHECK (length(idempotency_key) BETWEEN 8 AND 128)
);

CREATE INDEX IF NOT EXISTS idempotency_keys_expires_idx
  ON greenhouse_notifications.idempotency_keys (expires_at);

CREATE INDEX IF NOT EXISTS idempotency_keys_endpoint_actor_idx
  ON greenhouse_notifications.idempotency_keys (endpoint, actor_user_id);

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD COLUMN IF NOT EXISTS organization_id text,
  ADD COLUMN IF NOT EXISTS recipient_contact_id text,
  ADD COLUMN IF NOT EXISTS recipient_kind text,
  ADD COLUMN IF NOT EXISTS attachment_size_bytes integer,
  ADD COLUMN IF NOT EXISTS parent_delivery_id text,
  ADD COLUMN IF NOT EXISTS resend_reason text;

CREATE INDEX IF NOT EXISTS email_deliveries_org_idx
  ON greenhouse_notifications.email_deliveries (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quote_pdf_assets (
  quotation_id text NOT NULL,
  version_number integer NOT NULL,
  asset_id text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes integer NOT NULL,
  template_version text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text,
  PRIMARY KEY (quotation_id, version_number),
  CONSTRAINT quote_pdf_assets_size_positive CHECK (file_size_bytes > 0)
);

CREATE INDEX IF NOT EXISTS quote_pdf_assets_asset_id_idx
  ON greenhouse_commercial.quote_pdf_assets (asset_id);

CREATE INDEX IF NOT EXISTS quote_pdf_assets_template_version_idx
  ON greenhouse_commercial.quote_pdf_assets (template_version, generated_at);

ALTER TABLE greenhouse_notifications.email_engagement
  ADD COLUMN IF NOT EXISTS resend_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS email_engagement_resend_event_id_uniq
  ON greenhouse_notifications.email_engagement (resend_event_id)
  WHERE resend_event_id IS NOT NULL;

-- Down Migration

ALTER TABLE greenhouse_notifications.email_engagement
  DROP COLUMN IF EXISTS resend_event_id;

DROP TABLE IF EXISTS greenhouse_commercial.quote_pdf_assets;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS recipient_contact_id,
  DROP COLUMN IF EXISTS recipient_kind,
  DROP COLUMN IF EXISTS attachment_size_bytes,
  DROP COLUMN IF EXISTS parent_delivery_id,
  DROP COLUMN IF EXISTS resend_reason;

DROP TABLE IF EXISTS greenhouse_notifications.idempotency_keys;
