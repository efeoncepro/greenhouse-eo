-- Up Migration
--
-- TASK-632: Reliability Synthetic Monitoring runs
--
-- Persiste el resultado por (sweep, ruta) cuando el cron `reliability-synthetic`
-- ejecuta GET autenticado contra cada `route.path` declarada en
-- RELIABILITY_REGISTRY (TASK-600). Cada sweep agrupa N rows (una por ruta) y
-- referencia el `source_sync_runs.sync_run_id` para tracking compatible con
-- las herramientas existentes de admin/ops-health.

CREATE TABLE IF NOT EXISTS greenhouse_sync.reliability_synthetic_runs (
  probe_id          TEXT PRIMARY KEY,
  sweep_run_id      TEXT NOT NULL REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE CASCADE,
  module_key        TEXT NOT NULL,
  route_path        TEXT NOT NULL,
  http_status       INTEGER NOT NULL,
  ok                BOOLEAN NOT NULL,
  latency_ms        INTEGER NOT NULL,
  error_message     TEXT,
  triggered_by      TEXT NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL,
  finished_at       TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reliability_synthetic_runs_module_check CHECK (
    module_key IN ('finance', 'integrations.notion', 'cloud', 'delivery')
  ),
  CONSTRAINT reliability_synthetic_runs_triggered_check CHECK (
    triggered_by IN ('cron', 'manual')
  )
);

CREATE INDEX IF NOT EXISTS idx_reliability_synthetic_runs_module_finished
  ON greenhouse_sync.reliability_synthetic_runs (module_key, finished_at DESC);

CREATE INDEX IF NOT EXISTS idx_reliability_synthetic_runs_route_finished
  ON greenhouse_sync.reliability_synthetic_runs (module_key, route_path, finished_at DESC);

CREATE INDEX IF NOT EXISTS idx_reliability_synthetic_runs_sweep
  ON greenhouse_sync.reliability_synthetic_runs (sweep_run_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.reliability_synthetic_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.reliability_synthetic_runs TO greenhouse_migrator;

COMMENT ON TABLE greenhouse_sync.reliability_synthetic_runs IS
  'TASK-632: Synthetic monitor results per (sweep, route). Each sweep groups N probes via sweep_run_id FK to source_sync_runs.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_sync.idx_reliability_synthetic_runs_sweep;
DROP INDEX IF EXISTS greenhouse_sync.idx_reliability_synthetic_runs_route_finished;
DROP INDEX IF EXISTS greenhouse_sync.idx_reliability_synthetic_runs_module_finished;
DROP TABLE IF EXISTS greenhouse_sync.reliability_synthetic_runs;