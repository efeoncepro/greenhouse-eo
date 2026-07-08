-- Up Migration

-- TASK-353 Slice 1 — Hiring / ATS Domain Foundation: 4 aggregates canónicos en greenhouse_hiring.
-- Additive-only. Schema nuevo. Person-first: candidate_facet + hiring_application anclan a
-- greenhouse_core.identity_profiles(profile_id); NO se crea root paralelo `candidates`.
-- Aggregates mutables (no ledgers) → solo trigger touch_updated_at, sin append-only guards.
-- El opening público es una proyección allowlist derivada del opening interno (mismas filas,
-- columnas `public_*` separadas de las internas). Esta task NO crea member/assignment/placement.
-- Arch: GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md.

CREATE SCHEMA IF NOT EXISTS greenhouse_hiring;

-- Sequences para public ids legibles (EO-TDM/OPN/CND/APP-####).
CREATE SEQUENCE IF NOT EXISTS greenhouse_hiring.talent_demand_public_seq;
CREATE SEQUENCE IF NOT EXISTS greenhouse_hiring.hiring_opening_public_seq;
CREATE SEQUENCE IF NOT EXISTS greenhouse_hiring.candidate_facet_public_seq;
CREATE SEQUENCE IF NOT EXISTS greenhouse_hiring.hiring_application_public_seq;

-- 1. talent_demand — objeto raíz de demanda de talento (interno/cliente × on_demand/on_going).
--    Puede nacer sin cliente canonizado (prospect/deal refs) — arch §5.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.talent_demand (
  demand_id             TEXT PRIMARY KEY DEFAULT ('tdmn-' || gen_random_uuid()::text),
  public_id             TEXT NOT NULL UNIQUE
                          DEFAULT ('EO-TDM-' || lpad(nextval('greenhouse_hiring.talent_demand_public_seq')::text, 4, '0')),
  stakeholder_type      TEXT NOT NULL CHECK (stakeholder_type IN ('internal', 'client')),
  engagement_type       TEXT NOT NULL CHECK (engagement_type IN ('on_demand', 'on_going')),
  fulfillment_mode      TEXT NOT NULL CHECK (fulfillment_mode IN (
                          'internal_reassignment', 'internal_hire', 'staff_augmentation',
                          'contractor', 'partner')),
  demand_origin         TEXT NOT NULL CHECK (demand_origin IN (
                          'client_request', 'prospect_request', 'replacement', 'expansion',
                          'capacity_gap', 'manual_internal')),
  -- Contexto comercial/operativo (nullable: la búsqueda no se bloquea por falta de cliente canónico).
  organization_id       TEXT REFERENCES greenhouse_core.organizations (organization_id) ON DELETE SET NULL,
  client_id             TEXT,
  space_id              TEXT REFERENCES greenhouse_core.spaces (space_id) ON DELETE SET NULL,
  business_unit         TEXT,
  service_id            TEXT,
  -- Refs pre-canonización (prospecto/deal/cuenta externa) — arch §5.
  prospect_ref          TEXT,
  deal_ref              TEXT,
  external_account_ref  TEXT,
  requested_company_name TEXT,
  -- Intención de cobertura.
  requested_role        TEXT NOT NULL,
  requested_seats       INTEGER NOT NULL DEFAULT 1 CHECK (requested_seats >= 1),
  requested_skills      TEXT[] NOT NULL DEFAULT '{}',
  target_start_date     DATE,
  priority              TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  duration              TEXT,
  timezone              TEXT,
  language              TEXT,
  budget_band           TEXT,
  rate_band             TEXT,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                          'draft', 'qualified', 'open', 'sourcing', 'partially_fulfilled',
                          'fulfilled', 'stalled', 'cancelled', 'archived')),
  owner_user_id         TEXT,
  notes                 TEXT,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. hiring_opening — opening concreto derivado de una demanda. Truth interna + proyección
--    pública allowlist en la misma fila (columnas public_*). Una demanda abre 0..N openings.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_opening (
  opening_id            TEXT PRIMARY KEY DEFAULT ('opng-' || gen_random_uuid()::text),
  public_id             TEXT NOT NULL UNIQUE
                          DEFAULT ('EO-OPN-' || lpad(nextval('greenhouse_hiring.hiring_opening_public_seq')::text, 4, '0')),
  demand_id             TEXT NOT NULL REFERENCES greenhouse_hiring.talent_demand (demand_id) ON DELETE RESTRICT,
  -- Truth interna (nunca se publica).
  internal_title        TEXT NOT NULL,
  seniority             TEXT,
  requested_seats       INTEGER NOT NULL DEFAULT 1 CHECK (requested_seats >= 1),
  owner_user_id         TEXT,
  space_id              TEXT REFERENCES greenhouse_core.spaces (space_id) ON DELETE SET NULL,
  organization_id       TEXT REFERENCES greenhouse_core.organizations (organization_id) ON DELETE SET NULL,
  budget_band           TEXT,
  rate_band             TEXT,
  risk_notes            TEXT,
  internal_notes        TEXT,
  -- Gobernanza de visibilidad/publicación.
  visibility            TEXT NOT NULL DEFAULT 'internal_only' CHECK (visibility IN (
                          'internal_only', 'private_sourcing', 'public_listed')),
  publication_status    TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN (
                          'draft', 'ready_for_review', 'published', 'paused', 'closed')),
  -- Payload público derivado (allowlist-only: NUNCA owner/budget/rate/risk/notes internos).
  public_title          TEXT,
  public_summary        TEXT,
  public_description    TEXT,
  public_requirements   TEXT,
  public_nice_to_have   TEXT,
  public_location_mode  TEXT,
  public_employment_mode TEXT,
  public_seniority      TEXT,
  public_process_notes  TEXT,
  apply_url             TEXT,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                          'draft', 'active', 'paused', 'filled', 'cancelled', 'closed')),
  published_at          TIMESTAMPTZ,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. candidate_facet — faceta de reclutamiento anclada a Person (identity_profile). Person-first:
--    NO es un root paralelo de candidato; una Person tiene a lo más una candidate_facet.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.candidate_facet (
  candidate_facet_id    TEXT PRIMARY KEY DEFAULT ('cndf-' || gen_random_uuid()::text),
  public_id             TEXT NOT NULL UNIQUE
                          DEFAULT ('EO-CND-' || lpad(nextval('greenhouse_hiring.candidate_facet_public_seq')::text, 4, '0')),
  identity_profile_id   TEXT NOT NULL UNIQUE
                          REFERENCES greenhouse_core.identity_profiles (profile_id) ON DELETE RESTRICT,
  member_id             TEXT,
  source                TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
                          'public_careers', 'manual', 'referral', 'bench_internal',
                          'partner', 'hubspot', 'import')),
  readiness             TEXT NOT NULL DEFAULT 'unknown' CHECK (readiness IN (
                          'unknown', 'not_ready', 'passive', 'active', 'ready')),
  availability          TEXT,
  seniority             TEXT,
  expected_rate         NUMERIC(14, 2),
  expected_rate_currency TEXT,
  rate_band             TEXT,
  -- Consent/retención (poblado por el apply público en TASK-354; nullable aquí).
  consent_status        TEXT NOT NULL DEFAULT 'not_captured' CHECK (consent_status IN (
                          'not_captured', 'granted', 'withdrawn')),
  consent_policy_version TEXT,
  consent_captured_at   TIMESTAMPTZ,
  retention_policy      TEXT,
  source_attribution    TEXT,
  verification_signals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  notes                 TEXT,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. hiring_application — relación Person→Opening; unidad transaccional del pipeline.
--    Embebe snapshot de decisión + campos de handoff para downstream (TASK-356) sin crear
--    member/assignment/placement. Compensation/rate son propuesta/snapshot, no payroll truth.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_application (
  application_id        TEXT PRIMARY KEY DEFAULT ('happ-' || gen_random_uuid()::text),
  public_id             TEXT NOT NULL UNIQUE
                          DEFAULT ('EO-APP-' || lpad(nextval('greenhouse_hiring.hiring_application_public_seq')::text, 4, '0')),
  opening_id            TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_opening (opening_id) ON DELETE RESTRICT,
  identity_profile_id   TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles (profile_id) ON DELETE RESTRICT,
  candidate_facet_id    TEXT NOT NULL REFERENCES greenhouse_hiring.candidate_facet (candidate_facet_id) ON DELETE RESTRICT,
  owner_user_id         TEXT,
  stage                 TEXT NOT NULL DEFAULT 'sourced' CHECK (stage IN (
                          'sourced', 'screening', 'qualified', 'shortlisted', 'client_review',
                          'interview', 'decision_pending', 'selected', 'backup', 'rejected',
                          'withdrawn', 'handoff_ready', 'closed')),
  score                 NUMERIC(6, 2),
  match_score           NUMERIC(6, 2),
  blocking_issues       TEXT[] NOT NULL DEFAULT '{}',
  next_step_at          TIMESTAMPTZ,
  source                TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
                          'public_careers', 'manual', 'referral', 'bench_internal',
                          'partner', 'hubspot', 'import')),
  notes                 TEXT,
  explainability_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Dedupe determinístico (openingId + normalizedEmail + window) para apply idempotente (TASK-354).
  dedupe_fingerprint    TEXT,
  -- Snapshot de decisión (embebido: HiringDecision tabla propia llega en TASK-355/356).
  decision              TEXT CHECK (decision IN (
                          'selected', 'backup_selected', 'rejected', 'withdrawn', 'on_hold')),
  decision_at           TIMESTAMPTZ,
  decision_by           TEXT,
  -- Snapshot de handoff downstream (consumido por TASK-356; sin efectos operativos aquí).
  selected_destination  TEXT CHECK (selected_destination IN (
                          'internal_reassignment', 'internal_hire', 'staff_augmentation',
                          'contractor', 'partner')),
  tentative_start_date  DATE,
  expected_legal_entity TEXT,
  expected_context      TEXT,
  prerequisites_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Una postulación por persona por opening (dedupe estructural).
  UNIQUE (opening_id, identity_profile_id)
);

-- Índices por FK / filtro / orden.
CREATE INDEX IF NOT EXISTS talent_demand_status_idx ON greenhouse_hiring.talent_demand (status);
CREATE INDEX IF NOT EXISTS talent_demand_org_idx ON greenhouse_hiring.talent_demand (organization_id);
CREATE INDEX IF NOT EXISTS talent_demand_space_idx ON greenhouse_hiring.talent_demand (space_id);
CREATE INDEX IF NOT EXISTS talent_demand_owner_idx ON greenhouse_hiring.talent_demand (owner_user_id);
CREATE INDEX IF NOT EXISTS talent_demand_created_idx ON greenhouse_hiring.talent_demand (created_at DESC);

CREATE INDEX IF NOT EXISTS hiring_opening_demand_idx ON greenhouse_hiring.hiring_opening (demand_id);
CREATE INDEX IF NOT EXISTS hiring_opening_pubstatus_idx ON greenhouse_hiring.hiring_opening (publication_status);
CREATE INDEX IF NOT EXISTS hiring_opening_visibility_idx ON greenhouse_hiring.hiring_opening (visibility);
CREATE INDEX IF NOT EXISTS hiring_opening_status_idx ON greenhouse_hiring.hiring_opening (status);

CREATE INDEX IF NOT EXISTS candidate_facet_source_idx ON greenhouse_hiring.candidate_facet (source);
CREATE INDEX IF NOT EXISTS candidate_facet_status_idx ON greenhouse_hiring.candidate_facet (status);

CREATE INDEX IF NOT EXISTS hiring_application_opening_idx ON greenhouse_hiring.hiring_application (opening_id);
CREATE INDEX IF NOT EXISTS hiring_application_profile_idx ON greenhouse_hiring.hiring_application (identity_profile_id);
CREATE INDEX IF NOT EXISTS hiring_application_facet_idx ON greenhouse_hiring.hiring_application (candidate_facet_id);
CREATE INDEX IF NOT EXISTS hiring_application_stage_idx ON greenhouse_hiring.hiring_application (stage);
CREATE INDEX IF NOT EXISTS hiring_application_source_idx ON greenhouse_hiring.hiring_application (source);
CREATE INDEX IF NOT EXISTS hiring_application_dedupe_idx ON greenhouse_hiring.hiring_application (dedupe_fingerprint);

-- touch updated_at compartido del schema.
CREATE OR REPLACE FUNCTION greenhouse_hiring.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_talent_demand_touch ON greenhouse_hiring.talent_demand;
CREATE TRIGGER trg_talent_demand_touch
  BEFORE UPDATE ON greenhouse_hiring.talent_demand
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();

DROP TRIGGER IF EXISTS trg_hiring_opening_touch ON greenhouse_hiring.hiring_opening;
CREATE TRIGGER trg_hiring_opening_touch
  BEFORE UPDATE ON greenhouse_hiring.hiring_opening
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();

DROP TRIGGER IF EXISTS trg_candidate_facet_touch ON greenhouse_hiring.candidate_facet;
CREATE TRIGGER trg_candidate_facet_touch
  BEFORE UPDATE ON greenhouse_hiring.candidate_facet
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();

DROP TRIGGER IF EXISTS trg_hiring_application_touch ON greenhouse_hiring.hiring_application;
CREATE TRIGGER trg_hiring_application_touch
  BEFORE UPDATE ON greenhouse_hiring.hiring_application
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si los 4 aggregates no quedaron creados.
DO $$
DECLARE table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_hiring'
    AND table_name IN ('talent_demand', 'hiring_opening', 'candidate_facet', 'hiring_application');

  IF table_count <> 4 THEN
    RAISE EXCEPTION 'TASK-353 anti pre-up-marker: expected 4 hiring tables, got %. Markers may be inverted.', table_count;
  END IF;
END
$$;

-- Ownership + GRANTs (espeja TASK-1229). Los 4 aggregates son mutables → DML completo a runtime.
ALTER TABLE greenhouse_hiring.talent_demand OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_opening OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.candidate_facet OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_application OWNER TO greenhouse_ops;

GRANT USAGE ON SCHEMA greenhouse_hiring TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_hiring TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_hiring TO greenhouse_migrator_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA greenhouse_hiring TO greenhouse_runtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA greenhouse_hiring TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.talent_demand TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.talent_demand TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.talent_demand TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_opening TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_opening TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_opening TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.candidate_facet TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.candidate_facet TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.candidate_facet TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_application TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_application TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_application TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_hiring.touch_updated_at() TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_hiring.hiring_application CASCADE;
DROP TABLE IF EXISTS greenhouse_hiring.candidate_facet CASCADE;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_opening CASCADE;
DROP TABLE IF EXISTS greenhouse_hiring.talent_demand CASCADE;
DROP FUNCTION IF EXISTS greenhouse_hiring.touch_updated_at() CASCADE;
DROP SEQUENCE IF EXISTS greenhouse_hiring.talent_demand_public_seq CASCADE;
DROP SEQUENCE IF EXISTS greenhouse_hiring.hiring_opening_public_seq CASCADE;
DROP SEQUENCE IF EXISTS greenhouse_hiring.candidate_facet_public_seq CASCADE;
DROP SEQUENCE IF EXISTS greenhouse_hiring.hiring_application_public_seq CASCADE;
