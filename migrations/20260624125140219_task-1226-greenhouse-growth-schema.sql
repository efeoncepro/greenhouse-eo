-- Up Migration

-- TASK-1226 Slice 4 — Schema greenhouse_growth + tablas del AI Visibility Grader.
-- Additive-only. Evidence ledger append-only; el score/report se derivan después
-- (TASK-1227), versionados. Default sin uso productivo (flags OFF).

CREATE SCHEMA IF NOT EXISTS greenhouse_growth;

CREATE SEQUENCE IF NOT EXISTS greenhouse_growth.seq_grader_profile_public_id;
CREATE SEQUENCE IF NOT EXISTS greenhouse_growth.seq_grader_run_public_id;

-- Perfil de marca a evaluar (sujeto del grado). V1 internal/pre-tenant.
CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_profiles (
  profile_id           TEXT PRIMARY KEY DEFAULT ('gprf-' || gen_random_uuid()::text),
  public_id            TEXT NOT NULL UNIQUE
    DEFAULT ('EO-GAVP-' || lpad(nextval('greenhouse_growth.seq_grader_profile_public_id')::text, 4, '0')),
  brand_name           TEXT NOT NULL,
  website_url          TEXT,
  market               TEXT NOT NULL,
  locale               TEXT NOT NULL,
  category             TEXT,
  competitors_declared TEXT[] NOT NULL DEFAULT '{}',
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prompt pack versionado (inmutable: cambios crean versión nueva).
CREATE TABLE IF NOT EXISTS greenhouse_growth.prompt_packs (
  prompt_pack_id TEXT PRIMARY KEY DEFAULT ('gpp-' || gen_random_uuid()::text),
  version        TEXT NOT NULL UNIQUE,
  locale         TEXT NOT NULL,
  market         TEXT NOT NULL,
  prompts        JSONB NOT NULL DEFAULT '[]'::jsonb,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Run del grader (un perfil × modo × prompt pack).
CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_runs (
  run_id                  TEXT PRIMARY KEY DEFAULT ('grun-' || gen_random_uuid()::text),
  public_id               TEXT NOT NULL UNIQUE
    DEFAULT ('EO-GRUN-' || lpad(nextval('greenhouse_growth.seq_grader_run_public_id')::text, 5, '0')),
  profile_id              TEXT NOT NULL REFERENCES greenhouse_growth.grader_profiles (profile_id) ON DELETE RESTRICT,
  run_kind                TEXT NOT NULL CHECK (run_kind IN ('smoke', 'eval', 'internal_audit', 'public_diagnostic')),
  mode                    TEXT NOT NULL CHECK (mode IN ('light', 'full', 'internal_audit')),
  status                  TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'succeeded', 'partial', 'failed', 'skipped')),
  provider_policy_version TEXT NOT NULL,
  prompt_pack_version     TEXT NOT NULL,
  requested_providers     TEXT[] NOT NULL DEFAULT '{}',
  idempotency_key         TEXT UNIQUE,
  estimated_cost_usd      NUMERIC(12, 4) NOT NULL DEFAULT 0,
  cost_ceiling_usd        NUMERIC(12, 4),
  started_at              TIMESTAMPTZ,
  finished_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidence ledger append-only: una fila por llamada a provider × prompt.
CREATE TABLE IF NOT EXISTS greenhouse_growth.provider_observations (
  observation_id          TEXT PRIMARY KEY,
  run_id                  TEXT NOT NULL REFERENCES greenhouse_growth.grader_runs (run_id) ON DELETE RESTRICT,
  prompt_id               TEXT NOT NULL,
  provider                TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'perplexity', 'gemini')),
  model                   TEXT NOT NULL,
  status                  TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'rate_limited', 'skipped')),
  answer_text_hash        TEXT,
  answer_excerpt          TEXT,
  citations               JSONB NOT NULL DEFAULT '[]'::jsonb,
  usage                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms              INTEGER NOT NULL DEFAULT 0,
  provider_request_hash   TEXT NOT NULL,
  raw_evidence_pointer    TEXT,
  error_code              TEXT,
  provider_policy_version TEXT NOT NULL,
  prompt_pack_version     TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grader_runs_profile_idx ON greenhouse_growth.grader_runs (profile_id);
CREATE INDEX IF NOT EXISTS grader_runs_status_idx ON greenhouse_growth.grader_runs (status);
CREATE INDEX IF NOT EXISTS grader_runs_created_idx ON greenhouse_growth.grader_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS provider_observations_run_idx ON greenhouse_growth.provider_observations (run_id);
CREATE INDEX IF NOT EXISTS provider_observations_provider_idx ON greenhouse_growth.provider_observations (provider);
CREATE INDEX IF NOT EXISTS provider_observations_status_idx ON greenhouse_growth.provider_observations (status);
CREATE INDEX IF NOT EXISTS provider_observations_created_idx ON greenhouse_growth.provider_observations (created_at DESC);

-- touch updated_at en profiles.
CREATE OR REPLACE FUNCTION greenhouse_growth.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grader_profiles_touch_updated_at ON greenhouse_growth.grader_profiles;
CREATE TRIGGER trg_grader_profiles_touch_updated_at
  BEFORE UPDATE ON greenhouse_growth.grader_profiles
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

-- Evidence ledger append-only: bloquea UPDATE/DELETE en provider_observations.
CREATE OR REPLACE FUNCTION greenhouse_growth.block_observation_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.provider_observations es append-only (TASK-1226): % bloqueado.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_provider_observations_append_only ON greenhouse_growth.provider_observations;
CREATE TRIGGER trg_provider_observations_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.provider_observations
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_observation_mutation();

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si los objetos no quedaron creados.
DO $$
DECLARE table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth'
    AND table_name IN ('grader_profiles', 'prompt_packs', 'grader_runs', 'provider_observations');

  IF table_count <> 4 THEN
    RAISE EXCEPTION 'TASK-1226 anti pre-up-marker: expected 4 greenhouse_growth tables, got %. Markers may be inverted.', table_count;
  END IF;
END
$$;

-- Ownership + GRANTs.
ALTER SCHEMA greenhouse_growth OWNER TO greenhouse_ops;

GRANT USAGE ON SCHEMA greenhouse_growth TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_growth TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_growth TO greenhouse_migrator_user;

ALTER TABLE greenhouse_growth.grader_profiles OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.prompt_packs OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.grader_runs OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.provider_observations OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_growth.seq_grader_profile_public_id OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_growth.seq_grader_run_public_id OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_profiles TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_profiles TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_profiles TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.prompt_packs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.prompt_packs TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.prompt_packs TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_runs TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_runs TO greenhouse_migrator_user;
-- provider_observations: INSERT/SELECT (append-only; el trigger bloquea UPDATE/DELETE
-- aunque el GRANT exista — defensa en profundidad).
GRANT SELECT, INSERT ON greenhouse_growth.provider_observations TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.provider_observations TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.provider_observations TO greenhouse_migrator_user;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_growth.seq_grader_profile_public_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_growth.seq_grader_profile_public_id TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_growth.seq_grader_profile_public_id TO greenhouse_migrator_user;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_growth.seq_grader_run_public_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_growth.seq_grader_run_public_id TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_growth.seq_grader_run_public_id TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_growth.touch_updated_at() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_growth.block_observation_mutation() TO greenhouse_runtime;

-- Down Migration

DROP SCHEMA IF EXISTS greenhouse_growth CASCADE;
