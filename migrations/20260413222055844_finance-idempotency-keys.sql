-- Up Migration

SET search_path = greenhouse_finance, public;

-- ============================================================
-- 1. Idempotency keys — prevent double-entry on retried POST requests
-- ============================================================

CREATE TABLE IF NOT EXISTS greenhouse_finance.idempotency_keys (
  idempotency_key   TEXT NOT NULL,
  tenant_id         TEXT NOT NULL,
  endpoint          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'processing',
  response_status   INT,
  response_body     JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
  PRIMARY KEY (idempotency_key, tenant_id)
);

-- Index for TTL cleanup (cron)
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
  ON greenhouse_finance.idempotency_keys (expires_at);

-- ============================================================
-- 2. Grants
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.idempotency_keys
  TO greenhouse_runtime, greenhouse_migrator, greenhouse_app;

-- ============================================================
-- 3. Comments
-- ============================================================

COMMENT ON TABLE greenhouse_finance.idempotency_keys IS
  'Idempotency key store for Finance POST endpoints. Prevents double-entry on retried requests.
   Keys expire after 24h. status: processing | completed | failed.';

-- Down Migration

SET search_path = greenhouse_finance, public;

DROP INDEX IF EXISTS greenhouse_finance.idx_idempotency_keys_expires_at;
DROP TABLE IF EXISTS greenhouse_finance.idempotency_keys;
