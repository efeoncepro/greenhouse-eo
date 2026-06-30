-- Up Migration
--
-- TASK-1239 — Growth AI Visibility · Public report snapshot (EPIC-020 A).
--
-- Snapshot INMUTABLE tokenizado del reporte público: congela el `PublicGraderReport`
-- (TASK-1235) con sus versiones + un token NO enumerable, para que un link público
-- NO cambie si el score recomputa. El reporte interno sigue siendo derivación on-read.
-- Append-only (trigger bloquea UPDATE/DELETE); re-publicar el mismo estado = idempotente
-- (UNIQUE por run+versiones), re-publicar un estado nuevo = fila nueva (token nuevo).

SET search_path TO public, greenhouse_growth;

CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_reports (
  report_id                   TEXT PRIMARY KEY DEFAULT ('grpt-' || gen_random_uuid()::text),
  run_id                      TEXT NOT NULL REFERENCES greenhouse_growth.grader_runs(run_id),
  score_version               TEXT NOT NULL,
  report_version              TEXT NOT NULL,
  recommendation_pack_version TEXT NOT NULL,
  audience                    TEXT NOT NULL DEFAULT 'public',
  -- Token NO enumerable (2× gen_random_uuid = 256 bits): los public_id son secuenciales
  -- (EO-GRUN-#####) y NO sirven como secreto público.
  report_token                TEXT NOT NULL UNIQUE
    DEFAULT ('grt-' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  public_report_json          JSONB NOT NULL,
  as_of                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  TEXT
);

-- Idempotencia del publish: el mismo run+versiones devuelve el snapshot existente.
CREATE UNIQUE INDEX IF NOT EXISTS grader_reports_state_unique
  ON greenhouse_growth.grader_reports (run_id, score_version, report_version, recommendation_pack_version);

CREATE INDEX IF NOT EXISTS grader_reports_run_idx
  ON greenhouse_growth.grader_reports (run_id);

-- Append-only: bloquea UPDATE/DELETE del snapshot congelado (defensa en profundidad,
-- aunque el GRANT solo dé SELECT/INSERT al runtime).
CREATE OR REPLACE FUNCTION greenhouse_growth.block_report_mutation()
  RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.grader_reports es append-only (TASK-1239): % bloqueado.', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS grader_reports_block_mutation ON greenhouse_growth.grader_reports;
CREATE TRIGGER grader_reports_block_mutation
  BEFORE UPDATE OR DELETE ON greenhouse_growth.grader_reports
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_report_mutation();

-- Anti pre-up-marker: aborta si la tabla no quedó realmente creada.
DO $$
DECLARE report_table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_reports'
  ) INTO report_table_exists;

  IF NOT report_table_exists THEN
    RAISE EXCEPTION 'TASK-1239 anti pre-up-marker: greenhouse_growth.grader_reports NO fue creada. Markers invertidos.';
  END IF;
END
$$;

-- Ownership + GRANTs (append-only: SELECT + INSERT al runtime/app; NO UPDATE/DELETE).
ALTER TABLE greenhouse_growth.grader_reports OWNER TO greenhouse_ops;

GRANT SELECT, INSERT ON greenhouse_growth.grader_reports TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.grader_reports TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_reports TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_growth.block_report_mutation() TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.grader_reports;
DROP FUNCTION IF EXISTS greenhouse_growth.block_report_mutation();
