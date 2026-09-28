-- TASK-1863 additive rollout. Applied 2026-09-28; compatibility adjustment follows in the next migration.
-- Up Migration
SET search_path = greenhouse_growth, greenhouse_core, public;

-- TASK-1863. Additive market/snapshot model; existing evidence is not rewritten.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM greenhouse_growth.grader_profiles WHERE status='active' AND organization_id IS NOT NULL GROUP BY organization_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'TASK-1863: duplicate active organization profiles; resolve explicitly before migration';
  END IF;
END $$;
CREATE UNIQUE INDEX grader_profiles_one_active_org ON greenhouse_growth.grader_profiles(organization_id) WHERE status='active' AND organization_id IS NOT NULL;
ALTER TABLE greenhouse_growth.grader_profiles ADD COLUMN brand_aliases JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(brand_aliases)='array');
-- The primary profile remains a compatibility mirror, including quarterly cadence.
ALTER TABLE greenhouse_growth.grader_profiles DROP CONSTRAINT IF EXISTS grader_profiles_recurring_regrade_cadence_check;
ALTER TABLE greenhouse_growth.grader_profiles ADD CONSTRAINT grader_profiles_recurring_regrade_cadence_check
  CHECK (recurring_regrade_cadence IN ('weekly','monthly','quarterly'));

CREATE TABLE greenhouse_growth.grader_profile_markets (
  market_id TEXT PRIMARY KEY DEFAULT ('gpmk-' || gen_random_uuid()::text),
  profile_id TEXT NOT NULL REFERENCES greenhouse_growth.grader_profiles(profile_id),
  market_code TEXT NOT NULL CHECK (market_code ~ '^[A-Z]{2}$'),
  locale TEXT NOT NULL CHECK (locale ~ '^(es|en|fr)-([A-Z]{2}|[0-9]{3})$' OR locale='pt-BR'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE CHECK (NOT is_primary OR status='active'),
  recurring_regrade_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_regrade_cadence TEXT NOT NULL DEFAULT 'monthly' CHECK (recurring_regrade_cadence IN ('weekly','monthly','quarterly')),
  recurring_regrade_next_at TIMESTAMPTZ,
  recurring_regrade_last_run_id TEXT,
  recurring_regrade_last_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id,market_code,locale), UNIQUE (market_id,profile_id)
);
CREATE UNIQUE INDEX grader_profile_markets_one_primary ON greenhouse_growth.grader_profile_markets(profile_id) WHERE is_primary;
CREATE INDEX grader_profile_markets_due ON greenhouse_growth.grader_profile_markets(recurring_regrade_next_at) WHERE status='active' AND recurring_regrade_enabled;
CREATE TABLE greenhouse_growth.grader_competitor_sets (
  competitor_set_id TEXT PRIMARY KEY DEFAULT ('gcset-' || gen_random_uuid()::text),
  market_id TEXT NOT NULL REFERENCES greenhouse_growth.grader_profile_markets(market_id),
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('active','superseded')),
  members_json JSONB NOT NULL CHECK (jsonb_typeof(members_json)='array' AND jsonb_array_length(members_json)<=10),
  reason TEXT NOT NULL, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (market_id,version), UNIQUE (competitor_set_id,market_id)
);
CREATE UNIQUE INDEX grader_competitor_sets_one_active ON greenhouse_growth.grader_competitor_sets(market_id) WHERE status='active';
CREATE TABLE greenhouse_growth.grader_brand_alias_history (
  history_id TEXT PRIMARY KEY DEFAULT ('gbah-' || gen_random_uuid()::text),
  profile_id TEXT NOT NULL REFERENCES greenhouse_growth.grader_profiles(profile_id),
  aliases_json JSONB NOT NULL CHECK (jsonb_typeof(aliases_json)='array'),
  reason TEXT NOT NULL, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE SEQUENCE greenhouse_growth.seq_grader_batch_public_id;
CREATE TABLE greenhouse_growth.grader_run_batches (
  batch_id TEXT PRIMARY KEY DEFAULT ('grbt-' || gen_random_uuid()::text),
  public_id TEXT NOT NULL UNIQUE DEFAULT ('EO-GRBT-' || lpad(nextval('greenhouse_growth.seq_grader_batch_public_id')::text,5,'0')),
  profile_id TEXT NOT NULL REFERENCES greenhouse_growth.grader_profiles(profile_id),
  organization_id TEXT,
  market_ids TEXT[] NOT NULL CHECK (cardinality(market_ids)>0),
  mode TEXT NOT NULL CHECK (mode IN ('light','full','internal_audit')),
  requested_by_user_id TEXT NOT NULL, request_channel TEXT NOT NULL,
  idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL,
  cost_ceiling_total_usd NUMERIC(10,4) NOT NULL CHECK (cost_ceiling_total_usd>0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id,idempotency_key), UNIQUE (batch_id,profile_id)
);
ALTER TABLE greenhouse_growth.grader_runs
  ADD COLUMN market_id TEXT,
  ADD COLUMN market_code TEXT,
  ADD COLUMN locale TEXT,
  ADD COLUMN batch_id TEXT,
  ADD COLUMN competitor_set_id TEXT,
  ADD COLUMN matching_snapshot JSONB,
  ADD CONSTRAINT grader_runs_market_profile_fk FOREIGN KEY (market_id,profile_id) REFERENCES greenhouse_growth.grader_profile_markets(market_id,profile_id),
  ADD CONSTRAINT grader_runs_competitor_market_fk FOREIGN KEY (competitor_set_id,market_id) REFERENCES greenhouse_growth.grader_competitor_sets(competitor_set_id,market_id),
  ADD CONSTRAINT grader_runs_batch_profile_fk FOREIGN KEY (batch_id,profile_id) REFERENCES greenhouse_growth.grader_run_batches(batch_id,profile_id);
CREATE INDEX grader_runs_market_history ON greenhouse_growth.grader_runs(market_id,created_at DESC);
CREATE UNIQUE INDEX grader_runs_batch_market ON greenhouse_growth.grader_runs(batch_id,market_id) WHERE batch_id IS NOT NULL;
ALTER TABLE greenhouse_growth.grader_prompt_sets
  ADD COLUMN market_id TEXT,
  ADD CONSTRAINT grader_prompt_sets_market_profile_fk FOREIGN KEY (market_id,profile_id) REFERENCES greenhouse_growth.grader_profile_markets(market_id,profile_id);
DROP INDEX greenhouse_growth.grader_prompt_sets_one_active_per_profile_idx;
CREATE UNIQUE INDEX grader_prompt_sets_one_active_per_profile_idx ON greenhouse_growth.grader_prompt_sets(profile_id) WHERE status='active' AND market_id IS NULL;
CREATE UNIQUE INDEX grader_prompt_sets_one_active_per_market ON greenhouse_growth.grader_prompt_sets(market_id) WHERE status='active' AND market_id IS NOT NULL;
ALTER TABLE greenhouse_growth.provider_observations
  ADD COLUMN geo_mode TEXT CHECK (geo_mode IN ('native','prompt_only')),
  ADD COLUMN geo_country TEXT CHECK (geo_country ~ '^[A-Z]{2}$');
CREATE FUNCTION greenhouse_growth.guard_grader_market_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Archive grader markets instead of deleting'; END IF;
  IF (NEW.profile_id,NEW.market_code,NEW.locale) IS DISTINCT FROM (OLD.profile_id,OLD.market_code,OLD.locale) THEN
    RAISE EXCEPTION 'Grader market identity is immutable';
  END IF;
  NEW.updated_at := now(); RETURN NEW;
END $$;
CREATE TRIGGER grader_market_identity BEFORE UPDATE OR DELETE ON greenhouse_growth.grader_profile_markets FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.guard_grader_market_identity();
CREATE FUNCTION greenhouse_growth.guard_grader_market_primary() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF EXISTS (SELECT 1 FROM greenhouse_growth.grader_profile_markets WHERE profile_id=NEW.profile_id AND status='active')
     AND (SELECT count(*) FROM greenhouse_growth.grader_profile_markets WHERE profile_id=NEW.profile_id AND is_primary) <> 1 THEN
    RAISE EXCEPTION 'Active grader markets require exactly one primary';
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER grader_market_primary AFTER INSERT OR UPDATE ON greenhouse_growth.grader_profile_markets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.guard_grader_market_primary();
CREATE FUNCTION greenhouse_growth.guard_grader_competitor_set() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='UPDATE' AND OLD.status='active' AND NEW.status='superseded' AND (to_jsonb(NEW)-'status')=(to_jsonb(OLD)-'status') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Grader competitor sets are immutable';
END $$;
CREATE TRIGGER grader_competitor_immutable BEFORE UPDATE OR DELETE ON greenhouse_growth.grader_competitor_sets FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.guard_grader_competitor_set();
CREATE FUNCTION greenhouse_growth.guard_grader_alias_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  RAISE EXCEPTION 'Grader alias history is append-only';
END $$;
CREATE TRIGGER grader_alias_history_immutable BEFORE UPDATE OR DELETE ON greenhouse_growth.grader_brand_alias_history FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.guard_grader_alias_history();
CREATE FUNCTION greenhouse_growth.guard_grader_run_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF OLD.matching_snapshot IS NOT NULL AND (NEW.matching_snapshot,NEW.market_id,NEW.market_code,NEW.locale,NEW.competitor_set_id,NEW.batch_id)
    IS DISTINCT FROM (OLD.matching_snapshot,OLD.market_id,OLD.market_code,OLD.locale,OLD.competitor_set_id,OLD.batch_id) THEN
    RAISE EXCEPTION 'Grader run measurement context is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER grader_run_snapshot_immutable BEFORE UPDATE ON greenhouse_growth.grader_runs FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.guard_grader_run_snapshot();
-- Compatibility writers (including legacy recurring jobs) keep the primary schedule synchronized.
CREATE FUNCTION greenhouse_growth.mirror_grader_primary_schedule() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  UPDATE greenhouse_growth.grader_profile_markets SET recurring_regrade_enabled=NEW.recurring_regrade_enabled,
    recurring_regrade_cadence=NEW.recurring_regrade_cadence,recurring_regrade_next_at=NEW.recurring_regrade_next_at,
    recurring_regrade_last_run_id=NEW.recurring_regrade_last_run_id,recurring_regrade_last_at=NEW.recurring_regrade_last_at
    WHERE profile_id=NEW.profile_id AND is_primary;
  RETURN NEW;
END $$;
CREATE TRIGGER grader_primary_schedule_mirror AFTER UPDATE OF recurring_regrade_enabled,recurring_regrade_cadence,
  recurring_regrade_next_at,recurring_regrade_last_run_id,recurring_regrade_last_at ON greenhouse_growth.grader_profiles
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.mirror_grader_primary_schedule();
GRANT SELECT,INSERT,UPDATE ON greenhouse_growth.grader_profile_markets,greenhouse_growth.grader_competitor_sets TO greenhouse_runtime;
GRANT SELECT,INSERT ON greenhouse_growth.grader_brand_alias_history,greenhouse_growth.grader_run_batches TO greenhouse_runtime;
GRANT USAGE,SELECT ON SEQUENCE greenhouse_growth.seq_grader_batch_public_id TO greenhouse_runtime;
DO $$ DECLARE object_name TEXT; BEGIN
  FOREACH object_name IN ARRAY ARRAY['grader_profile_markets','grader_competitor_sets','grader_brand_alias_history','grader_run_batches','seq_grader_batch_public_id','grader_profiles_one_active_org','grader_runs_market_history','grader_runs_batch_market','grader_prompt_sets_one_active_per_market','grader_profile_markets_one_primary','grader_profile_markets_due','grader_competitor_sets_one_active'] LOOP
    IF to_regclass('greenhouse_growth.'||object_name) IS NULL THEN RAISE EXCEPTION 'TASK-1863 missing object %',object_name; END IF;
  END LOOP;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='greenhouse_growth' AND
    ((table_name='grader_runs' AND column_name IN ('market_id','market_code','locale','batch_id','competitor_set_id','matching_snapshot')) OR
     (table_name='grader_profiles' AND column_name='brand_aliases') OR (table_name='grader_prompt_sets' AND column_name='market_id') OR
     (table_name='provider_observations' AND column_name IN ('geo_mode','geo_country'))))<>10 THEN RAISE EXCEPTION 'TASK-1863 missing columns'; END IF;
  FOREACH object_name IN ARRAY ARRAY['guard_grader_market_identity','guard_grader_market_primary','guard_grader_competitor_set','guard_grader_alias_history','guard_grader_run_snapshot','mirror_grader_primary_schedule'] LOOP
    IF to_regprocedure('greenhouse_growth.'||object_name||'()') IS NULL THEN RAISE EXCEPTION 'TASK-1863 missing function %',object_name; END IF;
  END LOOP;
  FOREACH object_name IN ARRAY ARRAY['grader_market_identity','grader_market_primary','grader_competitor_immutable','grader_alias_history_immutable','grader_run_snapshot_immutable','grader_primary_schedule_mirror'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='greenhouse_growth' AND t.tgname=object_name AND NOT t.tgisinternal) THEN RAISE EXCEPTION 'TASK-1863 missing trigger %',object_name; END IF;
  END LOOP;
END $$;

INSERT INTO greenhouse_core.capabilities_registry
(capability_key,module,allowed_actions,allowed_scopes,description,introduced_at,deprecated_at)
VALUES ('growth.ai_visibility.market.manage','growth',ARRAY['execute'],ARRAY['tenant'],'Configure AEO markets, competitor versions and brand aliases',now(),NULL)
ON CONFLICT (capability_key) DO UPDATE SET deprecated_at=NULL;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM greenhouse_core.capabilities_registry WHERE capability_key='growth.ai_visibility.market.manage' AND deprecated_at IS NULL) THEN
 RAISE EXCEPTION 'TASK-1863 capability missing'; END IF;
END $$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry SET deprecated_at=now() WHERE capability_key='growth.ai_visibility.market.manage';

DROP TRIGGER grader_primary_schedule_mirror ON greenhouse_growth.grader_profiles;
DROP FUNCTION greenhouse_growth.mirror_grader_primary_schedule();
DROP TRIGGER grader_run_snapshot_immutable ON greenhouse_growth.grader_runs;
DROP FUNCTION greenhouse_growth.guard_grader_run_snapshot();
ALTER TABLE greenhouse_growth.provider_observations DROP COLUMN geo_mode,DROP COLUMN geo_country;
DROP INDEX greenhouse_growth.grader_prompt_sets_one_active_per_market;
DROP INDEX greenhouse_growth.grader_prompt_sets_one_active_per_profile_idx;
ALTER TABLE greenhouse_growth.grader_prompt_sets DROP COLUMN market_id;
CREATE UNIQUE INDEX grader_prompt_sets_one_active_per_profile_idx ON greenhouse_growth.grader_prompt_sets(profile_id) WHERE status='active';
ALTER TABLE greenhouse_growth.grader_runs DROP COLUMN market_id,DROP COLUMN market_code,DROP COLUMN locale,DROP COLUMN batch_id,DROP COLUMN competitor_set_id,DROP COLUMN matching_snapshot;
DROP TABLE greenhouse_growth.grader_run_batches;
DROP SEQUENCE greenhouse_growth.seq_grader_batch_public_id;
DROP TABLE greenhouse_growth.grader_brand_alias_history;
DROP TABLE greenhouse_growth.grader_competitor_sets;
DROP TABLE greenhouse_growth.grader_profile_markets;
DROP FUNCTION greenhouse_growth.guard_grader_market_identity();
DROP FUNCTION greenhouse_growth.guard_grader_market_primary();
DROP FUNCTION greenhouse_growth.guard_grader_competitor_set();
DROP FUNCTION greenhouse_growth.guard_grader_alias_history();
ALTER TABLE greenhouse_growth.grader_profiles DROP COLUMN brand_aliases;
DROP INDEX IF EXISTS greenhouse_growth.grader_profiles_one_active_org;
ALTER TABLE greenhouse_growth.grader_profiles DROP CONSTRAINT grader_profiles_recurring_regrade_cadence_check;
ALTER TABLE greenhouse_growth.grader_profiles ADD CONSTRAINT grader_profiles_recurring_regrade_cadence_check
  CHECK (recurring_regrade_cadence IN ('weekly','monthly'));
