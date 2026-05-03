-- Up Migration
CREATE SCHEMA IF NOT EXISTS greenhouse_ai;

CREATE TABLE IF NOT EXISTS greenhouse_ai.cloud_cost_ai_observations (
  observation_id TEXT PRIMARY KEY,
  sweep_run_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('ok', 'warning', 'error', 'skipped')),
  executive_summary TEXT NOT NULL,
  top_cost_drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
  probable_causes JSONB NOT NULL DEFAULT '[]'::jsonb,
  attack_priority JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_telemetry TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low', 'unknown')),
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  output_tokens INTEGER,
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cloud_cost_ai_observations_observed_at_idx
  ON greenhouse_ai.cloud_cost_ai_observations (observed_at DESC);

CREATE INDEX IF NOT EXISTS cloud_cost_ai_observations_fingerprint_idx
  ON greenhouse_ai.cloud_cost_ai_observations (fingerprint, observed_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_ai.cloud_cost_alert_dispatches (
  fingerprint TEXT PRIMARY KEY,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'error')),
  summary TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  driver_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cloud_cost_alert_dispatches_dispatched_at_idx
  ON greenhouse_ai.cloud_cost_alert_dispatches (dispatched_at DESC);

GRANT USAGE ON SCHEMA greenhouse_ai TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_ai TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_ai TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_ai.cloud_cost_ai_observations TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_ai.cloud_cost_alert_dispatches TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_ai.cloud_cost_ai_observations TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_ai.cloud_cost_alert_dispatches TO greenhouse_migrator;
GRANT SELECT ON greenhouse_ai.cloud_cost_ai_observations TO greenhouse_app;
GRANT SELECT ON greenhouse_ai.cloud_cost_alert_dispatches TO greenhouse_app;

-- Down Migration
DROP TABLE IF EXISTS greenhouse_ai.cloud_cost_alert_dispatches;
DROP TABLE IF EXISTS greenhouse_ai.cloud_cost_ai_observations;
