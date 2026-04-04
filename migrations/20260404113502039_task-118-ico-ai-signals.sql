-- Up Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_serving.ico_ai_signals (
  signal_id           TEXT PRIMARY KEY,
  signal_type         TEXT NOT NULL,
  space_id            TEXT NOT NULL,
  member_id           TEXT,
  project_id          TEXT,
  metric_name         TEXT NOT NULL,
  period_year         INT NOT NULL,
  period_month        INT NOT NULL,
  severity            TEXT,
  current_value       NUMERIC(10, 4),
  expected_value      NUMERIC(10, 4),
  z_score             NUMERIC(10, 4),
  predicted_value     NUMERIC(10, 4),
  confidence          NUMERIC(6, 4),
  prediction_horizon  TEXT,
  contribution_pct    NUMERIC(6, 4),
  dimension           TEXT,
  dimension_id        TEXT,
  action_type         TEXT,
  action_summary      TEXT,
  action_target_id    TEXT,
  model_version       TEXT NOT NULL,
  generated_at        TIMESTAMPTZ NOT NULL,
  ai_eligible         BOOLEAN NOT NULL DEFAULT TRUE,
  source              TEXT NOT NULL DEFAULT 'ico_engine.ai_signals',
  payload_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ico_ai_signals_space_period
  ON greenhouse_serving.ico_ai_signals (space_id, period_year DESC, period_month DESC);

CREATE INDEX IF NOT EXISTS idx_ico_ai_signals_member_period
  ON greenhouse_serving.ico_ai_signals (member_id, period_year DESC, period_month DESC)
  WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ico_ai_signals_type_generated
  ON greenhouse_serving.ico_ai_signals (signal_type, generated_at DESC);

GRANT SELECT ON greenhouse_serving.ico_ai_signals TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_ai_signals TO greenhouse_migrator;

-- Down Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

DROP TABLE IF EXISTS greenhouse_serving.ico_ai_signals;
