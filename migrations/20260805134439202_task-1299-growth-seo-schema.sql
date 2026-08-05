-- Up Migration

-- TASK-1299 — Growth SEO: Schema + Time-Series Foundation (EPIC-022).
-- Additive-only: 4 tablas de configuración + 4 de serie temporal append-only en
-- greenhouse_growth. Schema inerte (ningún consumer hasta TASK-1302+).
-- Boundary duro: cero FK a grader_*, payroll o finance; ancla = greenhouse_core.organizations.
-- Decisión temporal: snapshots = event rows append-only keyed por capture_date (mediciones);
-- config membership = append-only con effective_from/effective_to (términos: UPDATE de
-- effective_to permitido para cerrar el término, DELETE bloqueado).

-- ── Slice 1 — Config tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_targets (
  seo_target_id   TEXT PRIMARY KEY DEFAULT ('seot-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  root_domain     TEXT NOT NULL,
  location_code   TEXT NOT NULL,
  language_code   TEXT NOT NULL,
  market          TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_targets_org_domain_market_unique
    UNIQUE (organization_id, root_domain, location_code, language_code)
);

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_keyword_sets (
  keyword_set_id TEXT PRIMARY KEY DEFAULT ('seoks-' || gen_random_uuid()::text),
  seo_target_id  TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,
  name           TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_keyword_sets_target_name_unique UNIQUE (seo_target_id, name)
);

-- Membership append-only: NUNCA DELETE de una keyword; el término se cierra con
-- UPDATE de effective_to (por eso el trigger bloquea solo DELETE).
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_keyword_set_members (
  keyword_set_member_id TEXT PRIMARY KEY DEFAULT ('seokm-' || gen_random_uuid()::text),
  keyword_set_id        TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_keyword_sets (keyword_set_id) ON DELETE RESTRICT,
  keyword               TEXT NOT NULL,
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  effective_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_keyword_set_members_window_check
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Una sola membership VIGENTE por (set, keyword); histórico ilimitado.
CREATE UNIQUE INDEX IF NOT EXISTS seo_keyword_set_members_active_unique
  ON greenhouse_growth.seo_keyword_set_members (keyword_set_id, keyword)
  WHERE effective_to IS NULL;

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_competitors (
  seo_competitor_id TEXT PRIMARY KEY DEFAULT ('seoc-' || gen_random_uuid()::text),
  seo_target_id     TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,
  competitor_domain TEXT NOT NULL,
  effective_from    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_competitors_window_check
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS seo_competitors_active_unique
  ON greenhouse_growth.seo_competitors (seo_target_id, competitor_domain)
  WHERE effective_to IS NULL;

-- ── Slice 2 — Time-series snapshot tables (append-only) ────────────────────

-- 1 fila por (target, keyword, engine, device, capture_date). Medición inmutable.
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_rank_snapshots (
  rank_snapshot_id  TEXT PRIMARY KEY DEFAULT ('seors-' || gen_random_uuid()::text),
  seo_target_id     TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,
  keyword           TEXT NOT NULL,
  engine            TEXT NOT NULL,
  device            TEXT NOT NULL CHECK (device IN ('desktop', 'mobile', 'tablet')),
  capture_date      DATE NOT NULL,
  position          INTEGER CHECK (position > 0),
  url               TEXT,
  serp_features     JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_traffic NUMERIC(14, 4),
  provider_cost     NUMERIC(12, 4) NOT NULL DEFAULT 0,
  source_run_id     TEXT,
  captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_rank_snapshots_capture_unique
    UNIQUE (seo_target_id, keyword, engine, device, capture_date)
);

CREATE INDEX IF NOT EXISTS seo_rank_snapshots_target_keyword_date_idx
  ON greenhouse_growth.seo_rank_snapshots (seo_target_id, keyword, capture_date DESC);
CREATE INDEX IF NOT EXISTS seo_rank_snapshots_target_date_idx
  ON greenhouse_growth.seo_rank_snapshots (seo_target_id, capture_date DESC);

-- State machine mutable (running → succeeded|degraded|failed): SIN anti-mutation trigger.
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_site_audit_runs (
  audit_run_id     TEXT PRIMARY KEY DEFAULT ('seoar-' || gen_random_uuid()::text),
  seo_target_id    TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,
  capture_date     DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'degraded', 'failed')),
  crawled_pages    INTEGER,
  health_score     NUMERIC(5, 2) CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  provider_task_id TEXT,
  provider_cost    NUMERIC(12, 4) NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ,
  finished_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Poll idempotente del task async del provider (OnPage) por provider_task_id.
CREATE UNIQUE INDEX IF NOT EXISTS seo_site_audit_runs_provider_task_unique
  ON greenhouse_growth.seo_site_audit_runs (provider_task_id)
  WHERE provider_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS seo_site_audit_runs_target_date_idx
  ON greenhouse_growth.seo_site_audit_runs (seo_target_id, capture_date DESC);
CREATE INDEX IF NOT EXISTS seo_site_audit_runs_status_idx
  ON greenhouse_growth.seo_site_audit_runs (status);

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_site_audit_findings (
  audit_finding_id TEXT PRIMARY KEY DEFAULT ('seoaf-' || gen_random_uuid()::text),
  audit_run_id     TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_site_audit_runs (audit_run_id) ON DELETE RESTRICT,
  url              TEXT NOT NULL,
  issue_type       TEXT NOT NULL,
  severity         TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'notice')),
  detail           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seo_site_audit_findings_run_idx
  ON greenhouse_growth.seo_site_audit_findings (audit_run_id);
CREATE INDEX IF NOT EXISTS seo_site_audit_findings_run_severity_idx
  ON greenhouse_growth.seo_site_audit_findings (audit_run_id, severity);

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_backlink_snapshots (
  backlink_snapshot_id TEXT PRIMARY KEY DEFAULT ('seobs-' || gen_random_uuid()::text),
  seo_target_id        TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,
  capture_date         DATE NOT NULL,
  referring_domains    INTEGER,
  backlinks_total      BIGINT,
  domain_rank          NUMERIC(6, 2),
  toxic_share          NUMERIC(5, 4) CHECK (toxic_share IS NULL OR (toxic_share >= 0 AND toxic_share <= 1)),
  new_lost_delta       JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_cost        NUMERIC(12, 4) NOT NULL DEFAULT 0,
  captured_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_backlink_snapshots_capture_unique UNIQUE (seo_target_id, capture_date)
);

CREATE INDEX IF NOT EXISTS seo_backlink_snapshots_target_date_idx
  ON greenhouse_growth.seo_backlink_snapshots (seo_target_id, capture_date DESC);

-- ── Triggers ───────────────────────────────────────────────────────────────

-- Espejo genérico de block_observation_mutation (TASK-1226): mensaje por tabla vía
-- TG_TABLE_NAME en vez de un literal, para servir a las 5 tablas protegidas.
CREATE OR REPLACE FUNCTION greenhouse_growth.block_seo_row_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.% es append-only (TASK-1299): % bloqueado.', TG_TABLE_NAME, TG_OP;
END;
$$;

-- touch updated_at en la config mutable (reusa la función de TASK-1226).
DROP TRIGGER IF EXISTS trg_seo_targets_touch_updated_at ON greenhouse_growth.seo_targets;
CREATE TRIGGER trg_seo_targets_touch_updated_at
  BEFORE UPDATE ON greenhouse_growth.seo_targets
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

-- Mediciones: UPDATE y DELETE bloqueados.
DROP TRIGGER IF EXISTS trg_seo_rank_snapshots_append_only ON greenhouse_growth.seo_rank_snapshots;
CREATE TRIGGER trg_seo_rank_snapshots_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_rank_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_site_audit_findings_append_only ON greenhouse_growth.seo_site_audit_findings;
CREATE TRIGGER trg_seo_site_audit_findings_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_site_audit_findings
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_backlink_snapshots_append_only ON greenhouse_growth.seo_backlink_snapshots;
CREATE TRIGGER trg_seo_backlink_snapshots_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_backlink_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- Términos: solo DELETE bloqueado (effective_to se cierra por UPDATE).
DROP TRIGGER IF EXISTS trg_seo_keyword_set_members_no_delete ON greenhouse_growth.seo_keyword_set_members;
CREATE TRIGGER trg_seo_keyword_set_members_no_delete
  BEFORE DELETE ON greenhouse_growth.seo_keyword_set_members
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_competitors_no_delete ON greenhouse_growth.seo_competitors;
CREATE TRIGGER trg_seo_competitors_no_delete
  BEFORE DELETE ON greenhouse_growth.seo_competitors
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- ── Anti pre-up-marker guard (ISSUE-068) ───────────────────────────────────

DO $$
DECLARE
  table_count INTEGER;
  trigger_count INTEGER;
  unique_count INTEGER;
  bad_date_types INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth'
    AND table_name IN (
      'seo_targets', 'seo_keyword_sets', 'seo_keyword_set_members', 'seo_competitors',
      'seo_rank_snapshots', 'seo_site_audit_runs', 'seo_site_audit_findings', 'seo_backlink_snapshots'
    );
  IF table_count <> 8 THEN
    RAISE EXCEPTION 'TASK-1299 anti pre-up-marker: expected 8 seo tables, got %. Markers may be inverted.', table_count;
  END IF;

  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'greenhouse_growth'
    AND NOT t.tgisinternal
    AND t.tgname IN (
      'trg_seo_rank_snapshots_append_only',
      'trg_seo_site_audit_findings_append_only',
      'trg_seo_backlink_snapshots_append_only',
      'trg_seo_keyword_set_members_no_delete',
      'trg_seo_competitors_no_delete',
      'trg_seo_targets_touch_updated_at'
    );
  IF trigger_count <> 6 THEN
    RAISE EXCEPTION 'TASK-1299 anti pre-up-marker: expected 6 seo triggers, got %.', trigger_count;
  END IF;

  SELECT COUNT(*) INTO unique_count
  FROM pg_constraint
  WHERE conname IN ('seo_rank_snapshots_capture_unique', 'seo_backlink_snapshots_capture_unique', 'seo_targets_org_domain_market_unique')
    AND contype = 'u';
  IF unique_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1299 anti pre-up-marker: expected 3 idempotency UNIQUE constraints, got %.', unique_count;
  END IF;

  -- Bug class DATE vs TIMESTAMP (SQL date-math): capture_date DEBE ser DATE.
  SELECT COUNT(*) INTO bad_date_types
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name IN ('seo_rank_snapshots', 'seo_site_audit_runs', 'seo_backlink_snapshots')
    AND column_name = 'capture_date'
    AND data_type <> 'date';
  IF bad_date_types <> 0 THEN
    RAISE EXCEPTION 'TASK-1299 anti pre-up-marker: capture_date must be DATE in all snapshot tables (% wrong).', bad_date_types;
  END IF;
END
$$;

-- ── Ownership + GRANTs ─────────────────────────────────────────────────────

ALTER TABLE greenhouse_growth.seo_targets OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_keyword_sets OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_keyword_set_members OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_competitors OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_rank_snapshots OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_site_audit_runs OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_site_audit_findings OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_backlink_snapshots OWNER TO greenhouse_ops;

-- Config mutable: DML completo.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_targets TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_targets TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_targets TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_keyword_sets TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_keyword_sets TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_keyword_sets TO greenhouse_migrator_user;

-- Términos append-only: sin DELETE para runtime (el trigger además lo bloquea — defensa en profundidad).
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_keyword_set_members TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_keyword_set_members TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_keyword_set_members TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_competitors TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_competitors TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_competitors TO greenhouse_migrator_user;

-- Mediciones append-only: solo SELECT + INSERT para runtime.
GRANT SELECT, INSERT ON greenhouse_growth.seo_rank_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_rank_snapshots TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_rank_snapshots TO greenhouse_migrator_user;
GRANT SELECT, INSERT ON greenhouse_growth.seo_site_audit_findings TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_site_audit_findings TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_site_audit_findings TO greenhouse_migrator_user;
GRANT SELECT, INSERT ON greenhouse_growth.seo_backlink_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_backlink_snapshots TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_backlink_snapshots TO greenhouse_migrator_user;

-- State machine: UPDATE permitido (running → succeeded|degraded|failed), sin DELETE.
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_site_audit_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_site_audit_runs TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_site_audit_runs TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_growth.block_seo_row_mutation() TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_site_audit_findings;
DROP TABLE IF EXISTS greenhouse_growth.seo_site_audit_runs;
DROP TABLE IF EXISTS greenhouse_growth.seo_rank_snapshots;
DROP TABLE IF EXISTS greenhouse_growth.seo_backlink_snapshots;
DROP TABLE IF EXISTS greenhouse_growth.seo_keyword_set_members;
DROP TABLE IF EXISTS greenhouse_growth.seo_competitors;
DROP TABLE IF EXISTS greenhouse_growth.seo_keyword_sets;
DROP TABLE IF EXISTS greenhouse_growth.seo_targets;
DROP FUNCTION IF EXISTS greenhouse_growth.block_seo_row_mutation();
