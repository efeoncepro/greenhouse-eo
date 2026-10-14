-- Up Migration
SET search_path = greenhouse_growth, greenhouse_core, public;
CREATE TABLE greenhouse_growth.measurement_policy (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind TEXT NOT NULL CHECK(source_kind IN ('form_submission','meeting_booking')),
  source_key TEXT NOT NULL,
  surface_id TEXT NOT NULL REFERENCES greenhouse_growth.form_host_surface(surface_id),
  published_revision_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_kind,source_key,surface_id)
);
CREATE TABLE greenhouse_growth.measurement_policy_revision (
  revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES greenhouse_growth.measurement_policy(policy_id),
  revision INTEGER NOT NULL CHECK(revision>0),
  state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','review','published','superseded','disabled')),
  config_json JSONB NOT NULL CHECK(jsonb_typeof(config_json)='object'),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  UNIQUE(policy_id,revision), UNIQUE(policy_id,revision_id)
);
ALTER TABLE greenhouse_growth.measurement_policy ADD CONSTRAINT measurement_policy_published_revision_fk
  FOREIGN KEY(policy_id,published_revision_id) REFERENCES greenhouse_growth.measurement_policy_revision(policy_id,revision_id);
CREATE UNIQUE INDEX measurement_policy_one_published_idx ON greenhouse_growth.measurement_policy_revision(policy_id) WHERE state='published';
CREATE TABLE greenhouse_growth.measurement_policy_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES greenhouse_growth.measurement_policy(policy_id),
  revision_id UUID REFERENCES greenhouse_growth.measurement_policy_revision(revision_id),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('draft','review','publish','disable')),
  idempotency_key UUID NOT NULL,
  request_fingerprint TEXT NOT NULL CHECK(request_fingerprint ~ '^[a-f0-9]{64}$'),
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(actor_id,idempotency_key)
);
CREATE FUNCTION greenhouse_growth.measurement_policy_revision_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.revision_id,NEW.policy_id,NEW.revision,NEW.config_json,NEW.created_by,NEW.created_at)
    IS DISTINCT FROM (OLD.revision_id,OLD.policy_id,OLD.revision,OLD.config_json,OLD.created_by,OLD.created_at) THEN
  RAISE EXCEPTION 'measurement_policy_revision_immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER measurement_policy_revision_immutable BEFORE UPDATE ON greenhouse_growth.measurement_policy_revision
 FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.measurement_policy_revision_immutable();
ALTER TABLE greenhouse_growth.measurement_conversion ADD COLUMN policy_revision_id UUID REFERENCES greenhouse_growth.measurement_policy_revision(revision_id);
CREATE INDEX measurement_conversion_policy_idx ON greenhouse_growth.measurement_conversion(policy_revision_id);
GRANT SELECT,INSERT,UPDATE ON greenhouse_growth.measurement_policy, greenhouse_growth.measurement_policy_revision TO greenhouse_app;
GRANT SELECT,INSERT ON greenhouse_growth.measurement_policy_audit TO greenhouse_app;
-- Runtime cannot rewrite revision content or audit history. No conversion backfill.

-- Anti pre-up-marker: every owned table, pointer, index and immutable-content trigger must exist.
DO $$ BEGIN
 IF to_regclass('greenhouse_growth.measurement_policy') IS NULL
 OR to_regclass('greenhouse_growth.measurement_policy_revision') IS NULL
 OR to_regclass('greenhouse_growth.measurement_policy_audit') IS NULL
 OR to_regclass('greenhouse_growth.measurement_policy_one_published_idx') IS NULL
 OR to_regclass('greenhouse_growth.measurement_conversion_policy_idx') IS NULL
 OR to_regprocedure('greenhouse_growth.measurement_policy_revision_immutable()') IS NULL
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='greenhouse_growth' AND table_name='measurement_conversion' AND column_name='policy_revision_id')
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='measurement_policy_revision_immutable' AND tgrelid='greenhouse_growth.measurement_policy_revision'::regclass)
 OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='measurement_policy_published_revision_fk' AND conrelid='greenhouse_growth.measurement_policy'::regclass)
 THEN RAISE EXCEPTION 'TASK-2036 incomplete policy migration'; END IF;
END $$;

-- Down Migration
DO $$ BEGIN RAISE EXCEPTION 'Forward-only: disable capture/policies and restore compatible runtime; preserve audit and receipts'; END $$;
