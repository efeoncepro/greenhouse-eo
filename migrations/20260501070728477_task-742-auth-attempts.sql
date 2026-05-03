-- TASK-742 Capa 3 — Auth attempt observability table.
--
-- Append-only ledger of every login outcome (success/failure/rejected/degraded).
-- Drives the Identity reliability dashboard, the auth-health smoke lane
-- consumer, and Sentry incidents under domain='identity'.
--
-- Retention: 90 days. Rows are NOT deleted by this migration; a separate
-- pg_cron / Cloud Scheduler job will sweep on a future task. The retention
-- target is informational here.

-- Up Migration

CREATE SCHEMA IF NOT EXISTS greenhouse_serving;

CREATE TABLE IF NOT EXISTS greenhouse_serving.auth_attempts (
  attempt_id              UUID         PRIMARY KEY,
  attempted_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  provider                TEXT         NOT NULL,
  stage                   TEXT         NOT NULL,
  outcome                 TEXT         NOT NULL,
  reason_code             TEXT         NOT NULL,
  reason_redacted         TEXT,
  user_id_resolved        TEXT,
  email_redacted          TEXT,
  microsoft_oid_redacted  TEXT,
  microsoft_tenant_id     TEXT,
  ip_hashed               TEXT,
  user_agent_hash         TEXT,
  request_id              TEXT,

  CONSTRAINT auth_attempts_provider_check
    CHECK (provider IN ('credentials', 'azure-ad', 'google', 'magic-link')),

  CONSTRAINT auth_attempts_stage_check
    CHECK (stage IN (
      'authorize',
      'signin_callback',
      'jwt_callback',
      'session_callback',
      'token_exchange',
      'lookup',
      'magic_link_consume'
    )),

  CONSTRAINT auth_attempts_outcome_check
    CHECK (outcome IN ('success', 'failure', 'rejected', 'degraded'))
);

CREATE INDEX IF NOT EXISTS auth_attempts_attempted_at_idx
  ON greenhouse_serving.auth_attempts (attempted_at DESC);

CREATE INDEX IF NOT EXISTS auth_attempts_user_id_idx
  ON greenhouse_serving.auth_attempts (user_id_resolved, attempted_at DESC)
  WHERE user_id_resolved IS NOT NULL;

CREATE INDEX IF NOT EXISTS auth_attempts_provider_outcome_idx
  ON greenhouse_serving.auth_attempts (provider, outcome, attempted_at DESC);

CREATE INDEX IF NOT EXISTS auth_attempts_failures_recent_idx
  ON greenhouse_serving.auth_attempts (attempted_at DESC)
  WHERE outcome IN ('failure', 'rejected', 'degraded');

COMMENT ON TABLE greenhouse_serving.auth_attempts IS
  'TASK-742 Capa 3 - Append-only auth attempt ledger. PII columns are redacted (sha256 of IP/UA, prefix+suffix of OID, email local-part truncated to 2 chars).';

COMMENT ON COLUMN greenhouse_serving.auth_attempts.reason_code IS
  'Stable enum: success, invalid_password, tenant_not_found, account_disabled, account_inactive, account_status_invalid, oid_mismatch, email_alias_mismatch, callback_exception, pg_lookup_failed, bigquery_fallback_failed, magic_link_expired, magic_link_used, magic_link_invalid, unknown';

COMMENT ON COLUMN greenhouse_serving.auth_attempts.email_redacted IS
  'First 2 characters of local part + domain. Example: ja***@efeoncepro.com';

COMMENT ON COLUMN greenhouse_serving.auth_attempts.microsoft_oid_redacted IS
  'First 4 + ellipsis + last 4 characters of the Azure AD object ID. Never the raw OID.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_serving.auth_attempts_failures_recent_idx;
DROP INDEX IF EXISTS greenhouse_serving.auth_attempts_provider_outcome_idx;
DROP INDEX IF EXISTS greenhouse_serving.auth_attempts_user_id_idx;
DROP INDEX IF EXISTS greenhouse_serving.auth_attempts_attempted_at_idx;
DROP TABLE IF EXISTS greenhouse_serving.auth_attempts;
