-- Up Migration

-- TASK-631: Shareable web quote URL shortener
--
-- Creates greenhouse_commercial.quote_short_links to map short codes to the
-- canonical /public/quote/[id]/[v]/[token] URL. Sales reps generate short
-- codes (~45 char URL) instead of sharing the long canonical URL (~120 chars).
--
-- Design (RESEARCH-005 v1.5 + Skills review):
-- - 7-char base62 short code (3.5T combinations, collision-resistant)
-- - Soft revoke (revoked_at timestamp) preserves audit trail
-- - Explicit expiration (default = quotation.valid_until + 30d buffer)
-- - Track access count + last_accessed_at for sales rep analytics
-- - Tied to quotation_id + version_number — when quote is re-issued,
--   sales rep can choose to keep or revoke the old short link

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quote_short_links (
  short_code text PRIMARY KEY,
  quotation_id text NOT NULL,
  version_number integer NOT NULL,
  full_token text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,

  expires_at timestamptz,

  last_accessed_at timestamptz,
  access_count integer NOT NULL DEFAULT 0,

  revoked_at timestamptz,
  revoked_by text,
  revocation_reason text,

  CONSTRAINT short_code_format CHECK (short_code ~ '^[a-zA-Z0-9]{7,12}$'),
  CONSTRAINT version_positive CHECK (version_number >= 1),
  CONSTRAINT access_count_non_negative CHECK (access_count >= 0)
);

CREATE INDEX IF NOT EXISTS quote_short_links_quotation_active_idx
  ON greenhouse_commercial.quote_short_links (quotation_id, version_number)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS quote_short_links_expires_active_idx
  ON greenhouse_commercial.quote_short_links (expires_at)
  WHERE revoked_at IS NULL AND expires_at IS NOT NULL;

COMMENT ON TABLE greenhouse_commercial.quote_short_links IS
  'TASK-631: Short URL mapping for shareable web quote links.';

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.quote_short_links;
