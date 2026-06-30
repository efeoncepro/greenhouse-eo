-- Up Migration

-- TASK-1266 Slice 1 — Site Readiness Probe Layer.
-- Persistencia de los probes técnicos read-only del sitio analizado (robots.txt bots IA,
-- JSON-LD, llms.txt, sitemap, CWV, .well-known/mcp, WebMCP tools, DOM semántico). Es una
-- SEGUNDA fuente de evidencia del run-engine (hermana de provider_observations pero de
-- naturaleza distinta: probes del sitio, no prompts a answer engines).
--
-- DERIVACIÓN RECOMPUTABLE (NO append-only): como normalized_findings / grader_scores, un
-- probe result es función del sitio en el momento del run; re-ejecución idempotente por
-- (run_id, probe_kind) vía UPSERT (no inserta duplicados). El score 0..100 o NULL (honest
-- degradation: señal no medible → NULL + reason, excluida del promedio; nunca 0 cuando no se probó).

SET search_path TO public, greenhouse_growth;

CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_probe_results (
  probe_id      TEXT PRIMARY KEY DEFAULT ('gprb-' || gen_random_uuid()::text),
  run_id        TEXT NOT NULL REFERENCES greenhouse_growth.grader_runs (run_id) ON DELETE RESTRICT,
  probe_kind    TEXT NOT NULL,
  axis          TEXT NOT NULL CHECK (axis IN ('structural', 'agentic')),
  status        TEXT NOT NULL CHECK (status IN ('succeeded', 'skipped', 'failed')),
  -- 0..100 o NULL (honest degradation: señal no medible → NULL + reason, excluida del promedio).
  score         NUMERIC(5, 1) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  reason        TEXT NOT NULL,
  -- Evidencia cruda public-safe (status code, snippet acotado, conteos). NUNCA PII.
  evidence      JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms    INTEGER NOT NULL DEFAULT 0,
  error_code    TEXT,
  probe_layer_version TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Idempotencia: re-ejecutar el mismo probe sobre el mismo run reemplaza (no duplica).
  UNIQUE (run_id, probe_kind)
);

CREATE INDEX IF NOT EXISTS grader_probe_results_run_idx
  ON greenhouse_growth.grader_probe_results (run_id);
CREATE INDEX IF NOT EXISTS grader_probe_results_axis_status_idx
  ON greenhouse_growth.grader_probe_results (axis, status);

-- Anti pre-up-marker guard (ISSUE-068): aborta si la tabla no quedó realmente creada.
DO $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth'
      AND table_name = 'grader_probe_results'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1266 anti pre-up-marker check: greenhouse_growth.grader_probe_results was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- Ownership canónica + GRANTs (runtime DML; recomputable → SELECT/INSERT/UPDATE).
ALTER TABLE greenhouse_growth.grader_probe_results OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_probe_results TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_probe_results TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_probe_results TO greenhouse_migrator_user;

-- Down Migration

SET search_path TO public, greenhouse_growth;

DROP TABLE IF EXISTS greenhouse_growth.grader_probe_results CASCADE;
