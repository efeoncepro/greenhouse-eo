-- Up Migration

-- TASK-1275 — Estado de ejecución del Plan AEO (gobernado, EPIC-020).
-- Ancla = (organization_id × recommendation_key=gap_key), PERSISTENTE entre re-grades (la PK NO
-- incluye run_id). `source_run_id` = provenance del run que el operador miraba al setear el status
-- (nullable, no ata la persistencia). State machine not_started|in_progress|blocked|done|dismissed.
-- recommendation_key NO se valida con CHECK SQL (el recommendation pack es versionado en TS) sino
-- a nivel app contra RECOMMENDATION_GAP_KEYS.

-- 1. Current-state: una fila por (organization_id, recommendation_key).
CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_recommendation_status (
  status_id          TEXT PRIMARY KEY DEFAULT ('grst-' || gen_random_uuid()::text),
  organization_id    TEXT NOT NULL,
  recommendation_key TEXT NOT NULL,
  status             TEXT NOT NULL
    CHECK (status IN ('not_started', 'in_progress', 'blocked', 'done', 'dismissed')),
  source_run_id      TEXT,
  reason             TEXT,
  updated_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grader_recommendation_status_org_key_unique UNIQUE (organization_id, recommendation_key),
  CONSTRAINT grader_recommendation_status_org_fkey
    FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations (organization_id) ON DELETE CASCADE,
  CONSTRAINT grader_recommendation_status_run_fkey
    FOREIGN KEY (source_run_id) REFERENCES greenhouse_growth.grader_runs (run_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS grader_recommendation_status_org_idx
  ON greenhouse_growth.grader_recommendation_status (organization_id);

-- 2. History: append-only (una fila por transición real).
CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_recommendation_status_history (
  history_id         TEXT PRIMARY KEY DEFAULT ('grsh-' || gen_random_uuid()::text),
  organization_id    TEXT NOT NULL,
  recommendation_key TEXT NOT NULL,
  from_status        TEXT
    CHECK (from_status IS NULL OR from_status IN ('not_started', 'in_progress', 'blocked', 'done', 'dismissed')),
  to_status          TEXT NOT NULL
    CHECK (to_status IN ('not_started', 'in_progress', 'blocked', 'done', 'dismissed')),
  source_run_id      TEXT,
  reason             TEXT,
  changed_by         TEXT NOT NULL,
  changed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grader_recommendation_status_history_org_fkey
    FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations (organization_id) ON DELETE CASCADE,
  CONSTRAINT grader_recommendation_status_history_run_fkey
    FOREIGN KEY (source_run_id) REFERENCES greenhouse_growth.grader_runs (run_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS grader_recommendation_status_history_org_key_idx
  ON greenhouse_growth.grader_recommendation_status_history (organization_id, recommendation_key, changed_at DESC);

-- 3. touch updated_at en current-state (reusa la función compartida del schema growth).
DROP TRIGGER IF EXISTS trg_grader_recommendation_status_touch_updated_at ON greenhouse_growth.grader_recommendation_status;
CREATE TRIGGER trg_grader_recommendation_status_touch_updated_at
  BEFORE UPDATE ON greenhouse_growth.grader_recommendation_status
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

-- 4. History append-only: bloquea UPDATE/DELETE (mismo patrón que provider_observations TASK-1226).
CREATE OR REPLACE FUNCTION greenhouse_growth.block_recommendation_status_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.grader_recommendation_status_history es append-only (TASK-1275): % bloqueado.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_grader_recommendation_status_history_append_only ON greenhouse_growth.grader_recommendation_status_history;
CREATE TRIGGER trg_grader_recommendation_status_history_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.grader_recommendation_status_history
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_recommendation_status_history_mutation();

-- 5. GRANTs runtime (current-state = SELECT/INSERT/UPDATE para el UPSERT; history = sólo SELECT/INSERT,
--    el trigger append-only es defensa en profundidad sobre el grant).
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_recommendation_status TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_recommendation_status TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_recommendation_status TO greenhouse_migrator_user;
GRANT SELECT, INSERT ON greenhouse_growth.grader_recommendation_status_history TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.grader_recommendation_status_history TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_recommendation_status_history TO greenhouse_migrator_user;

-- 6. Anti pre-up-marker bug guard (ISSUE-068): aborta si las 2 tablas no quedaron creadas.
DO $$
DECLARE created_count integer;
BEGIN
  SELECT COUNT(*) INTO created_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth'
    AND table_name IN ('grader_recommendation_status', 'grader_recommendation_status_history');

  IF created_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1275 anti pre-up-marker check: grader_recommendation_status tables NOT created (count=%). Migration markers may be inverted.', created_count;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_grader_recommendation_status_history_append_only ON greenhouse_growth.grader_recommendation_status_history;
DROP TRIGGER IF EXISTS trg_grader_recommendation_status_touch_updated_at ON greenhouse_growth.grader_recommendation_status;
DROP FUNCTION IF EXISTS greenhouse_growth.block_recommendation_status_history_mutation();
DROP TABLE IF EXISTS greenhouse_growth.grader_recommendation_status_history;
DROP TABLE IF EXISTS greenhouse_growth.grader_recommendation_status;