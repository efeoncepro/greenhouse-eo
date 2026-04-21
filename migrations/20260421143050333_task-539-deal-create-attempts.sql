-- Up Migration
-- TASK-539: table for inline deal creation idempotency + audit + rate limit.
--
-- Every call to `createDealFromQuoteContext` writes a row BEFORE hitting the
-- Cloud Run service. Subsequent calls with the same idempotency key short-
-- circuit to the existing result. The same table is the substrate the
-- command uses to enforce the 20/min per user + 100/hour per tenant rate
-- limits without a separate counter store.

SET search_path = greenhouse_commercial, public;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.deal_create_attempts (
  attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text,
  organization_id text NOT NULL
    REFERENCES greenhouse_core.organizations(organization_id) ON DELETE CASCADE,
  hubspot_company_id text,
  actor_user_id text NOT NULL,
  tenant_scope text NOT NULL,
  deal_name text NOT NULL,
  amount numeric(18, 2),
  amount_clp numeric(18, 2),
  currency text,
  pipeline_id text,
  stage_id text,
  owner_hubspot_user_id text,
  business_line_code text,
  status text NOT NULL DEFAULT 'pending',
  hubspot_deal_id text,
  deal_id text,
  approval_id text,
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz,
  CONSTRAINT deal_create_attempts_status_valid
    CHECK (status IN (
      'pending',
      'completed',
      'pending_approval',
      'rate_limited',
      'failed',
      'endpoint_not_deployed'
    )),
  CONSTRAINT deal_create_attempts_completed_consistent
    CHECK (
      (status IN ('completed', 'pending_approval', 'failed', 'endpoint_not_deployed') AND completed_at IS NOT NULL)
      OR (status IN ('pending', 'rate_limited') AND completed_at IS NULL)
      OR (status = 'rate_limited' AND completed_at IS NOT NULL)
    ),
  CONSTRAINT deal_create_attempts_deal_linkage
    CHECK (
      hubspot_deal_id IS NULL OR status = 'completed'
    )
);

-- Idempotency lookup: the command refuses to double-create when the caller
-- includes the same key. UNIQUE partial (skip rows without key).
CREATE UNIQUE INDEX IF NOT EXISTS uq_deal_create_attempts_idempotency_key
  ON greenhouse_commercial.deal_create_attempts (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Fingerprint dedupe: even without a key, we refuse two identical attempts
-- (same actor, same company, same deal name) within 5 minutes.
CREATE INDEX IF NOT EXISTS idx_deal_create_attempts_fingerprint
  ON greenhouse_commercial.deal_create_attempts
    (actor_user_id, hubspot_company_id, deal_name, created_at DESC);

-- Rate limit hot paths — per-user (60s window) + per-tenant (1h window).
CREATE INDEX IF NOT EXISTS idx_deal_create_attempts_actor_window
  ON greenhouse_commercial.deal_create_attempts (actor_user_id, created_at DESC)
  WHERE status IN ('completed', 'pending_approval', 'pending');

CREATE INDEX IF NOT EXISTS idx_deal_create_attempts_tenant_window
  ON greenhouse_commercial.deal_create_attempts (tenant_scope, created_at DESC)
  WHERE status IN ('completed', 'pending_approval', 'pending');

-- Operator lookup by hubspot_deal_id (post-success audit).
CREATE INDEX IF NOT EXISTS idx_deal_create_attempts_hubspot_deal
  ON greenhouse_commercial.deal_create_attempts (hubspot_deal_id)
  WHERE hubspot_deal_id IS NOT NULL;

COMMENT ON TABLE greenhouse_commercial.deal_create_attempts IS
  'TASK-539: append-only audit + idempotency + rate-limit substrate for inline deal creation from the Quote Builder. Every call to createDealFromQuoteContext writes here. Status transitions only via UPDATE on the same attempt_id.';

COMMENT ON COLUMN greenhouse_commercial.deal_create_attempts.idempotency_key IS
  'Caller-supplied key; UNIQUE partial index dedupes retries within the default window.';

COMMENT ON COLUMN greenhouse_commercial.deal_create_attempts.status IS
  'pending (in-flight) · completed (deal created + persisted) · pending_approval (>threshold, awaiting approval) · rate_limited (refused) · failed (Cloud Run error) · endpoint_not_deployed (graceful fallback while /deals ships)';

COMMENT ON COLUMN greenhouse_commercial.deal_create_attempts.tenant_scope IS
  'Canonical tenant bucket for rate limiting — tenantType + clientId joined. Kept as text to avoid cross-schema FK.';

GRANT SELECT, INSERT, UPDATE
  ON greenhouse_commercial.deal_create_attempts
  TO greenhouse_runtime;

-- Down Migration

SET search_path = greenhouse_commercial, public;

DROP INDEX IF EXISTS greenhouse_commercial.idx_deal_create_attempts_hubspot_deal;
DROP INDEX IF EXISTS greenhouse_commercial.idx_deal_create_attempts_tenant_window;
DROP INDEX IF EXISTS greenhouse_commercial.idx_deal_create_attempts_actor_window;
DROP INDEX IF EXISTS greenhouse_commercial.idx_deal_create_attempts_fingerprint;
DROP INDEX IF EXISTS greenhouse_commercial.uq_deal_create_attempts_idempotency_key;

DROP TABLE IF EXISTS greenhouse_commercial.deal_create_attempts;
