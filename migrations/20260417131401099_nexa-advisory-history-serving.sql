-- Up Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_serving.ico_ai_signal_enrichment_history (
  history_id            TEXT PRIMARY KEY,
  enrichment_id         TEXT NOT NULL,
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
  source                TEXT NOT NULL DEFAULT 'ico_engine.ai_signal_enrichment_history',
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ico_ai_signal_enrichment_history_enrichment
  ON greenhouse_serving.ico_ai_signal_enrichment_history (enrichment_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ico_ai_signal_enrichment_history_space
  ON greenhouse_serving.ico_ai_signal_enrichment_history (space_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ico_ai_signal_enrichment_history_member
  ON greenhouse_serving.ico_ai_signal_enrichment_history (member_id, processed_at DESC)
  WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ico_ai_signal_enrichment_history_status
  ON greenhouse_serving.ico_ai_signal_enrichment_history (status, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ico_ai_signal_enrichment_history_period
  ON greenhouse_serving.ico_ai_signal_enrichment_history (
    period_year DESC,
    period_month DESC,
    processed_at DESC
  );

INSERT INTO greenhouse_serving.ico_ai_signal_enrichment_history (
  history_id,
  enrichment_id,
  run_id,
  signal_id,
  space_id,
  member_id,
  project_id,
  signal_type,
  metric_name,
  period_year,
  period_month,
  severity,
  quality_score,
  explanation_summary,
  root_cause_narrative,
  recommended_action,
  explanation_json,
  model_id,
  prompt_version,
  prompt_hash,
  confidence,
  tokens_in,
  tokens_out,
  latency_ms,
  status,
  error_message,
  processed_at,
  source,
  synced_at
)
SELECT
  ('EO-AIH-' || UPPER(SUBSTRING(MD5(COALESCE(run_id, '') || '|' || enrichment_id) FROM 1 FOR 8))) AS history_id,
  enrichment_id,
  run_id,
  signal_id,
  space_id,
  member_id,
  project_id,
  signal_type,
  metric_name,
  period_year,
  period_month,
  severity,
  quality_score,
  explanation_summary,
  root_cause_narrative,
  recommended_action,
  explanation_json,
  model_id,
  prompt_version,
  prompt_hash,
  confidence,
  tokens_in,
  tokens_out,
  latency_ms,
  status,
  error_message,
  processed_at,
  'ico_engine.ai_signal_enrichment_history',
  COALESCE(synced_at, NOW())
FROM greenhouse_serving.ico_ai_signal_enrichments
ON CONFLICT (history_id) DO NOTHING;

GRANT SELECT ON greenhouse_serving.ico_ai_signal_enrichment_history TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_ai_signal_enrichment_history TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_ai_signal_enrichment_history TO greenhouse_app;

-- Down Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

REVOKE ALL ON greenhouse_serving.ico_ai_signal_enrichment_history FROM greenhouse_app;
REVOKE ALL ON greenhouse_serving.ico_ai_signal_enrichment_history FROM greenhouse_migrator;
REVOKE ALL ON greenhouse_serving.ico_ai_signal_enrichment_history FROM greenhouse_runtime;

DROP TABLE IF EXISTS greenhouse_serving.ico_ai_signal_enrichment_history;
