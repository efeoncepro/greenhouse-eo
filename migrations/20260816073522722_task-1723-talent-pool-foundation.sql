-- Up Migration

-- TASK-1723 — Talent Pool person-first foundation.
-- Additive-only. No PII/raw CV/open response/free-form candidate notes are stored here.

CREATE SEQUENCE IF NOT EXISTS greenhouse_hiring.talent_pool_public_seq;

CREATE TABLE greenhouse_hiring.talent_pool_membership (
  membership_id TEXT PRIMARY KEY DEFAULT ('tlpm-' || gen_random_uuid()::text),
  public_id TEXT NOT NULL UNIQUE
    DEFAULT ('EO-TLP-' || lpad(nextval('greenhouse_hiring.talent_pool_public_seq')::text, 5, '0')),
  candidate_facet_id TEXT NOT NULL UNIQUE
    REFERENCES greenhouse_hiring.candidate_facet(candidate_facet_id) ON DELETE RESTRICT,
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN (
    'active_process', 'pool_eligible', 'needs_reconsent', 'paused', 'withdrawn', 'expired'
  )),
  aggregate_version INTEGER NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  future_consent_expires_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  backfill_classification TEXT CHECK (backfill_classification IN (
    'active_process', 'needs_reconsent', 'native_opt_in'
  )),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hiring.talent_pool_consent_event (
  consent_event_id TEXT PRIMARY KEY DEFAULT ('tlpc-' || gen_random_uuid()::text),
  membership_id TEXT NOT NULL REFERENCES greenhouse_hiring.talent_pool_membership(membership_id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL CHECK (purpose IN ('active_application', 'future_opportunities')),
  action TEXT NOT NULL CHECK (action IN ('granted', 'paused', 'resumed', 'withdrawn', 'expired', 'corrected')),
  policy_version TEXT,
  source TEXT NOT NULL CHECK (source IN ('public_application', 'candidate_self_service', 'internal_operator', 'historical_backfill', 'system_expiry')),
  evidence_ref TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('candidate', 'operator', 'system', 'backfill')),
  actor_user_id TEXT,
  idempotency_key TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  correlation_id TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (membership_id, purpose, idempotency_key)
);

CREATE TABLE greenhouse_hiring.talent_pool_activity (
  activity_id TEXT PRIMARY KEY DEFAULT ('tlpa-' || gen_random_uuid()::text),
  membership_id TEXT NOT NULL REFERENCES greenhouse_hiring.talent_pool_membership(membership_id) ON DELETE RESTRICT,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'membership_created', 'availability_updated', 'profile_read', 'invitation_proposed',
    'invitation_executed', 'invitation_reused', 'invitation_denied', 'projection_reconciled'
  )),
  actor_user_id TEXT,
  idempotency_key TEXT,
  correlation_id TEXT,
  source_ref TEXT,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX talent_pool_activity_idempotency_idx
  ON greenhouse_hiring.talent_pool_activity(membership_id, activity_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE greenhouse_hiring.talent_pool_evidence_projection (
  evidence_id TEXT PRIMARY KEY DEFAULT ('tlpe-' || gen_random_uuid()::text),
  membership_id TEXT NOT NULL REFERENCES greenhouse_hiring.talent_pool_membership(membership_id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('application', 'opening', 'assessment_competency')),
  source_id TEXT NOT NULL,
  source_version TEXT NOT NULL DEFAULT 'v1',
  application_id TEXT REFERENCES greenhouse_hiring.hiring_application(application_id) ON DELETE CASCADE,
  capability_key TEXT NOT NULL DEFAULT '__general__',
  seniority TEXT,
  language_code TEXT,
  country_code TEXT,
  availability TEXT,
  evidence_state TEXT NOT NULL DEFAULT 'observed' CHECK (evidence_state IN ('declared', 'observed', 'evaluated')),
  result_band TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  fresh_until TIMESTAMPTZ,
  projection_version INTEGER NOT NULL DEFAULT 1 CHECK (projection_version > 0),
  projected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (membership_id, source_type, source_id, source_version, capability_key)
);

CREATE TABLE greenhouse_hiring.talent_pool_invitation (
  invitation_id TEXT PRIMARY KEY DEFAULT ('tlpi-' || gen_random_uuid()::text),
  membership_id TEXT NOT NULL REFERENCES greenhouse_hiring.talent_pool_membership(membership_id) ON DELETE RESTRICT,
  opening_id TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_opening(opening_id) ON DELETE RESTRICT,
  application_id TEXT REFERENCES greenhouse_hiring.hiring_application(application_id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL DEFAULT 'future_opportunities' CHECK (purpose = 'future_opportunities'),
  state TEXT NOT NULL CHECK (state IN ('proposed', 'executed', 'reused', 'denied')),
  proposal_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  confirmed_by TEXT,
  reason_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  UNIQUE (membership_id, opening_id),
  UNIQUE (idempotency_key)
);

CREATE INDEX talent_pool_membership_lifecycle_idx ON greenhouse_hiring.talent_pool_membership(lifecycle_status, updated_at DESC);
CREATE INDEX talent_pool_consent_membership_idx ON greenhouse_hiring.talent_pool_consent_event(membership_id, purpose, occurred_at DESC);
CREATE INDEX talent_pool_evidence_filters_idx ON greenhouse_hiring.talent_pool_evidence_projection(capability_key, seniority, country_code, observed_at DESC);

DROP TRIGGER IF EXISTS trg_talent_pool_membership_touch ON greenhouse_hiring.talent_pool_membership;
CREATE TRIGGER trg_talent_pool_membership_touch BEFORE UPDATE ON greenhouse_hiring.talent_pool_membership
FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();

CREATE OR REPLACE FUNCTION greenhouse_hiring.prevent_talent_pool_history_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER trg_talent_pool_consent_append_only
BEFORE UPDATE OR DELETE ON greenhouse_hiring.talent_pool_consent_event
FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_talent_pool_history_mutation();
CREATE TRIGGER trg_talent_pool_activity_append_only
BEFORE UPDATE OR DELETE ON greenhouse_hiring.talent_pool_activity
FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_talent_pool_history_mutation();

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.talent_pool.read', 'hiring', ARRAY['read'], ARRAY['tenant'], 'Read the internal purpose-gated Talent Pool allowlisted projection.', NOW(), NULL),
  ('hiring.talent_pool.manage', 'hiring', ARRAY['update'], ARRAY['tenant'], 'Manage Talent Pool lifecycle and availability without granting future contact implicitly.', NOW(), NULL),
  ('hiring.talent_pool.invite', 'hiring', ARRAY['execute'], ARRAY['tenant'], 'Confirm an idempotent Talent Pool invitation into canonical HiringApplication.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

ALTER TABLE greenhouse_hiring.talent_pool_membership OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.talent_pool_consent_event OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.talent_pool_activity OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.talent_pool_evidence_projection OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.talent_pool_invitation OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_hiring.talent_pool_public_seq OWNER TO greenhouse_ops;

GRANT USAGE ON SEQUENCE greenhouse_hiring.talent_pool_public_seq TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE ON greenhouse_hiring.talent_pool_membership TO greenhouse_runtime, greenhouse_app, greenhouse_migrator_user;
GRANT SELECT, INSERT ON greenhouse_hiring.talent_pool_consent_event TO greenhouse_runtime, greenhouse_app, greenhouse_migrator_user;
GRANT SELECT, INSERT ON greenhouse_hiring.talent_pool_activity TO greenhouse_runtime, greenhouse_app, greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.talent_pool_evidence_projection TO greenhouse_runtime, greenhouse_app, greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE ON greenhouse_hiring.talent_pool_invitation TO greenhouse_runtime, greenhouse_app, greenhouse_migrator_user;

DO $$
DECLARE object_count INTEGER; capability_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO object_count FROM information_schema.tables
  WHERE table_schema = 'greenhouse_hiring' AND table_name IN (
    'talent_pool_membership', 'talent_pool_consent_event', 'talent_pool_activity',
    'talent_pool_evidence_projection', 'talent_pool_invitation'
  );
  SELECT COUNT(*) INTO capability_count FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('hiring.talent_pool.read', 'hiring.talent_pool.manage', 'hiring.talent_pool.invite')
    AND deprecated_at IS NULL;
  IF object_count <> 5 OR capability_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1723 anti pre-up-marker failed: objects=%, capabilities=%', object_count, capability_count;
  END IF;
END $$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW()
WHERE capability_key IN ('hiring.talent_pool.read', 'hiring.talent_pool.manage', 'hiring.talent_pool.invite')
  AND deprecated_at IS NULL;
DROP TABLE IF EXISTS greenhouse_hiring.talent_pool_invitation;
DROP TABLE IF EXISTS greenhouse_hiring.talent_pool_evidence_projection;
DROP TABLE IF EXISTS greenhouse_hiring.talent_pool_activity;
DROP TABLE IF EXISTS greenhouse_hiring.talent_pool_consent_event;
DROP TABLE IF EXISTS greenhouse_hiring.talent_pool_membership;
DROP FUNCTION IF EXISTS greenhouse_hiring.prevent_talent_pool_history_mutation();
DROP SEQUENCE IF EXISTS greenhouse_hiring.talent_pool_public_seq;
