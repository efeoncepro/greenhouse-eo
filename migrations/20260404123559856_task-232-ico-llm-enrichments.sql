-- Up Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_serving.ico_ai_signal_enrichments (
  enrichment_id         TEXT PRIMARY KEY,
  run_id                TEXT NOT NULL,
  signal_id             TEXT NOT NULL,
  space_id              TEXT NOT NULL,
  member_id             TEXT,
  project_id            TEXT,
  signal_type           TEXT NOT NULL,
  metric_name           TEXT NOT NULL,
  period_year           INT NOT NULL,
  period_month          INT NOT NULL,
  severity              TEXT,
  quality_score         NUMERIC(6, 2),
  explanation_summary   TEXT,
  root_cause_narrative  TEXT,
  recommended_action    TEXT,
  explanation_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_id              TEXT NOT NULL,
  prompt_version        TEXT NOT NULL,
  prompt_hash           TEXT,
  confidence            NUMERIC(6, 4),
  tokens_in             INT,
  tokens_out            INT,
  latency_ms            INT,
  status                TEXT NOT NULL,
  error_message         TEXT,
  processed_at          TIMESTAMPTZ NOT NULL,
  source                TEXT NOT NULL DEFAULT 'ico_engine.ai_signal_enrichments',
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ico_ai_signal_enrichments_space_period
  ON greenhouse_serving.ico_ai_signal_enrichments (space_id, period_year DESC, period_month DESC);

CREATE INDEX IF NOT EXISTS idx_ico_ai_signal_enrichments_signal
  ON greenhouse_serving.ico_ai_signal_enrichments (signal_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ico_ai_signal_enrichments_status
  ON greenhouse_serving.ico_ai_signal_enrichments (status, processed_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_serving.ico_ai_enrichment_runs (
  run_id               TEXT PRIMARY KEY,
  trigger_event_id     TEXT,
  space_id             TEXT,
  period_year          INT NOT NULL,
  period_month         INT NOT NULL,
  trigger_type         TEXT NOT NULL,
  status               TEXT NOT NULL,
  signals_seen         INT NOT NULL DEFAULT 0,
  signals_enriched     INT NOT NULL DEFAULT 0,
  signals_failed       INT NOT NULL DEFAULT 0,
  model_id             TEXT NOT NULL,
  prompt_version       TEXT NOT NULL,
  prompt_hash          TEXT,
  tokens_in            INT,
  tokens_out           INT,
  latency_ms           INT,
  error_message        TEXT,
  started_at           TIMESTAMPTZ NOT NULL,
  completed_at         TIMESTAMPTZ,
  source               TEXT NOT NULL DEFAULT 'ico_engine.ai_enrichment_runs',
  synced_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ico_ai_enrichment_runs_period
  ON greenhouse_serving.ico_ai_enrichment_runs (period_year DESC, period_month DESC, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_ico_ai_enrichment_runs_status
  ON greenhouse_serving.ico_ai_enrichment_runs (status, started_at DESC);

GRANT SELECT ON greenhouse_serving.ico_ai_signal_enrichments TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.ico_ai_enrichment_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_ai_signal_enrichments TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_ai_enrichment_runs TO greenhouse_migrator;

-- Down Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

DROP TABLE IF EXISTS greenhouse_serving.ico_ai_enrichment_runs;
DROP TABLE IF EXISTS greenhouse_serving.ico_ai_signal_enrichments;
