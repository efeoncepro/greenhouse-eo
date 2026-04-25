-- Up Migration
--
-- TASK-638: Reliability AI Observer (Gemini watcher loop).
--
-- Persiste observaciones AI emitidas por el cron `/reliability-ai-watch` que
-- corre en `services/ops-worker/` cada 60 min. La IA enriquece el Reliability
-- Control Plane (TASK-600) con resumen ejecutivo + observaciones por módulo;
-- las reglas determinísticas (rules-first) siguen siendo source of truth.
--
-- Dedup: el runner calcula un fingerprint (sha256 truncado) sobre el snapshot
-- relevante (totals + módulos × severity) y solo persiste si cambió respecto
-- de la última observación del módulo. Evita spam cuando el portal está
-- estable.

CREATE TABLE IF NOT EXISTS greenhouse_ai.reliability_ai_observations (
  observation_id        TEXT PRIMARY KEY,
  sweep_run_id          TEXT NOT NULL,
  module_key            TEXT NOT NULL,
  scope                 TEXT NOT NULL,
  severity              TEXT NOT NULL,
  fingerprint           TEXT NOT NULL,
  summary               TEXT NOT NULL,
  recommended_action    TEXT,
  model                 TEXT NOT NULL,
  prompt_tokens         INTEGER,
  output_tokens         INTEGER,
  observed_at           TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reliability_ai_observations_scope_check CHECK (
    scope IN ('overview', 'module')
  ),
  CONSTRAINT reliability_ai_observations_severity_check CHECK (
    severity IN ('ok', 'warning', 'error', 'unknown', 'not_configured', 'awaiting_data')
  )
);

ALTER TABLE greenhouse_ai.reliability_ai_observations OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_ai.reliability_ai_observations TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_ai.reliability_ai_observations TO greenhouse_migrator;

CREATE INDEX IF NOT EXISTS idx_reliability_ai_obs_module_observed
  ON greenhouse_ai.reliability_ai_observations (module_key, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_reliability_ai_obs_sweep
  ON greenhouse_ai.reliability_ai_observations (sweep_run_id);

CREATE INDEX IF NOT EXISTS idx_reliability_ai_obs_fingerprint
  ON greenhouse_ai.reliability_ai_observations (module_key, fingerprint);

COMMENT ON TABLE greenhouse_ai.reliability_ai_observations IS
  'TASK-638: AI Observer enriquece el Reliability Control Plane. Cada row = 1 observación AI por módulo (scope=module) o resumen ejecutivo (scope=overview). Dedup por fingerprint del snapshot relevante.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_ai.idx_reliability_ai_obs_fingerprint;
DROP INDEX IF EXISTS greenhouse_ai.idx_reliability_ai_obs_sweep;
DROP INDEX IF EXISTS greenhouse_ai.idx_reliability_ai_obs_module_observed;
DROP TABLE IF EXISTS greenhouse_ai.reliability_ai_observations;