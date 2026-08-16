-- Up Migration

-- TASK-1726: append-only, content-free access evidence for delegated Talent Pool reads.
-- Search text, filters, result bodies, names, contact data and evidence never enter this log.
CREATE TABLE greenhouse_hiring.talent_pool_access_audit (
  access_audit_id TEXT PRIMARY KEY DEFAULT ('tlpaa-' || gen_random_uuid()::text),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'denied')),
  route_kind TEXT NOT NULL CHECK (route_kind IN ('search', 'profile')),
  reason_code TEXT NOT NULL CHECK (reason_code IN (
    'authorized', 'runtime_capability_denied', 'delegated_scope_denied', 'delegated_context_invalid'
  )),
  purpose TEXT CHECK (purpose = 'talent_pool_candidate_review'),
  agent_host TEXT CHECK (agent_host ~ '^[a-z0-9][a-z0-9._-]{1,63}$'),
  actor_user_id TEXT NOT NULL,
  oauth_client_id TEXT NOT NULL,
  oauth_access_token_id TEXT,
  correlation_id TEXT,
  talent_profile_public_id TEXT,
  CONSTRAINT talent_pool_access_audit_profile_shape CHECK (
    (route_kind = 'profile' AND talent_profile_public_id IS NOT NULL)
    OR (route_kind = 'search' AND talent_profile_public_id IS NULL)
  )
);

CREATE INDEX talent_pool_access_audit_occurred_idx
  ON greenhouse_hiring.talent_pool_access_audit(occurred_at DESC, outcome, reason_code);
CREATE INDEX talent_pool_access_audit_actor_idx
  ON greenhouse_hiring.talent_pool_access_audit(actor_user_id, occurred_at DESC);

CREATE TRIGGER trg_talent_pool_access_audit_append_only
BEFORE UPDATE OR DELETE ON greenhouse_hiring.talent_pool_access_audit
FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_talent_pool_history_mutation();

ALTER TABLE greenhouse_hiring.talent_pool_access_audit OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_hiring.talent_pool_access_audit
  TO greenhouse_runtime, greenhouse_app, greenhouse_migrator_user;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'greenhouse_hiring' AND table_name = 'talent_pool_access_audit'
  ) THEN
    RAISE EXCEPTION 'TASK-1726 delegated Talent Pool access audit is unavailable.';
  END IF;
END $$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_hiring.talent_pool_access_audit;
