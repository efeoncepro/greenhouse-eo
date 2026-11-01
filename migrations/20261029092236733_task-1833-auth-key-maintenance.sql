-- Up Migration
SET search_path = greenhouse_auth, greenhouse_core, public;

-- TASK-1833: durable intent before a non-idempotent Cloud KMS create RPC.
-- The historical signing_keys registry remains the authority for issuance.
CREATE TABLE greenhouse_auth.signing_key_rotation_operations (
  operation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL,
  predecessor_kid TEXT NOT NULL REFERENCES greenhouse_auth.signing_keys(kid),
  operation_kind TEXT NOT NULL DEFAULT 'rotation' CHECK (operation_kind IN ('rotation', 'baseline')),
  phase TEXT NOT NULL CHECK (phase IN (
    'planned', 'creating', 'create_uncertain', 'version_created',
    'preverified', 'activated', 'verified', 'blocked'
  )),
  kms_version TEXT UNIQUE,
  candidate_kid TEXT,
  lease_owner UUID,
  lease_until TIMESTAMPTZ,
  fencing_version BIGINT NOT NULL DEFAULT 0 CHECK (fencing_version >= 0),
  verified_at TIMESTAMPTZ,
  overlap_not_before TIMESTAMPTZ,
  error_code TEXT,
  evidence_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT signing_key_rotation_kms_version_shape CHECK (
    kms_version IS NULL OR (
      starts_with(kms_version, key_name || '/cryptoKeyVersions/')
      AND substring(kms_version FROM length(key_name || '/cryptoKeyVersions/') + 1) ~ '^[0-9]+$'
    )
  ),
  CONSTRAINT signing_key_rotation_phase_data CHECK (
    (phase NOT IN ('version_created', 'preverified', 'activated', 'verified') OR kms_version IS NOT NULL)
    AND (phase NOT IN ('preverified', 'activated', 'verified') OR candidate_kid IS NOT NULL)
    AND (lease_owner IS NULL) = (lease_until IS NULL)
  ),
  CONSTRAINT signing_key_rotation_verified_shape CHECK (
    (phase <> 'verified' AND verified_at IS NULL) OR
    (phase = 'verified' AND verified_at IS NOT NULL AND kms_version IS NOT NULL AND candidate_kid IS NOT NULL)
  ),
  CONSTRAINT signing_key_rotation_baseline_evidence CHECK (
    operation_kind <> 'baseline' OR (phase = 'verified' AND length(evidence_ref) BETWEEN 8 AND 250)
  ),
  CONSTRAINT signing_key_rotation_predecessor_unique UNIQUE (key_name, predecessor_kid)
);

CREATE UNIQUE INDEX signing_key_rotation_open_key_idx
  ON greenhouse_auth.signing_key_rotation_operations(key_name)
  WHERE phase <> 'verified';

CREATE TABLE greenhouse_auth.signing_key_rotation_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES greenhouse_auth.signing_key_rotation_operations(operation_id),
  phase TEXT NOT NULL,
  actor TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  git_sha TEXT,
  result TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX signing_key_rotation_events_operation_idx
  ON greenhouse_auth.signing_key_rotation_events(operation_id, occurred_at DESC);

CREATE TRIGGER trg_signing_key_rotation_touch_updated_at
  BEFORE UPDATE ON greenhouse_auth.signing_key_rotation_operations
  FOR EACH ROW EXECUTE FUNCTION greenhouse_auth.touch_updated_at();
CREATE TRIGGER trg_signing_key_rotation_events_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_auth.signing_key_rotation_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_auth.block_event_mutation();

-- Dedicated group role. Provisioning the LOGIN and its password is an ops step,
-- not a migration secret. Neither auth-server nor portal inherits this role.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greenhouse_auth_key_maintenance') THEN
    CREATE ROLE greenhouse_auth_key_maintenance NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA greenhouse_auth TO greenhouse_auth_key_maintenance;
GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.signing_key_rotation_operations TO greenhouse_auth_key_maintenance;
GRANT SELECT, INSERT ON greenhouse_auth.signing_key_rotation_events TO greenhouse_auth_key_maintenance;
GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.signing_keys TO greenhouse_auth_key_maintenance;
GRANT SELECT, INSERT ON greenhouse_auth.signing_key_events TO greenhouse_auth_key_maintenance;

ALTER TABLE greenhouse_auth.signing_key_rotation_operations OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.signing_key_rotation_events OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.signing_key_rotation_operations TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.signing_key_rotation_events TO greenhouse_migrator_user;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'greenhouse_auth'
      AND table_name IN ('signing_key_rotation_operations', 'signing_key_rotation_events')) <> 2
    OR (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'greenhouse_auth'
      AND indexname IN ('signing_key_rotation_open_key_idx', 'signing_key_rotation_events_operation_idx')) <> 2
    OR (SELECT COUNT(DISTINCT trigger_name) FROM information_schema.triggers WHERE trigger_schema = 'greenhouse_auth'
      AND trigger_name IN ('trg_signing_key_rotation_touch_updated_at', 'trg_signing_key_rotation_events_append_only')) <> 2
  THEN
    RAISE EXCEPTION 'TASK-1833 anti pre-up-marker: rotation objects missing';
  END IF;
END $$;

-- Down Migration
DROP TABLE IF EXISTS greenhouse_auth.signing_key_rotation_events;
DROP TABLE IF EXISTS greenhouse_auth.signing_key_rotation_operations;
REVOKE USAGE ON SCHEMA greenhouse_auth FROM greenhouse_auth_key_maintenance;
DROP ROLE IF EXISTS greenhouse_auth_key_maintenance;
