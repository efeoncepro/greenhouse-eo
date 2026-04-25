-- Up Migration

-- TASK-631 Fase 2 — Quote acceptance tracking + share view audit log

ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by_name text,
  ADD COLUMN IF NOT EXISTS accepted_by_role text,
  ADD COLUMN IF NOT EXISTS accepted_via_short_code text,
  ADD COLUMN IF NOT EXISTS accepted_ip text;

CREATE INDEX IF NOT EXISTS quotations_accepted_at_idx
  ON greenhouse_commercial.quotations (accepted_at)
  WHERE accepted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quote_share_views (
  view_id text PRIMARY KEY DEFAULT ('qsv-' || gen_random_uuid()::text),
  short_code text NOT NULL,
  quotation_id text NOT NULL,
  version_number integer NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  referer text,

  CONSTRAINT short_code_format CHECK (short_code ~ '^[a-zA-Z0-9]{7,12}$')
);

CREATE INDEX IF NOT EXISTS quote_share_views_quotation_idx
  ON greenhouse_commercial.quote_share_views (quotation_id, version_number, viewed_at DESC);

CREATE INDEX IF NOT EXISTS quote_share_views_short_code_idx
  ON greenhouse_commercial.quote_share_views (short_code, viewed_at DESC);

-- Down Migration

ALTER TABLE greenhouse_commercial.quotations
  DROP COLUMN IF EXISTS accepted_at,
  DROP COLUMN IF EXISTS accepted_by_name,
  DROP COLUMN IF EXISTS accepted_by_role,
  DROP COLUMN IF EXISTS accepted_via_short_code,
  DROP COLUMN IF EXISTS accepted_ip;

DROP TABLE IF EXISTS greenhouse_commercial.quote_share_views;
