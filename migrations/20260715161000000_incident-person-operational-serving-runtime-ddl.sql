-- Incident hardening: person operational serving must be provisioned by migration,
-- never by a runtime reader. Runtime roles get table-level access only.

CREATE TABLE IF NOT EXISTS greenhouse_serving.person_operational_metrics (
  member_id TEXT NOT NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  tasks_completed INT NOT NULL DEFAULT 0,
  tasks_active INT NOT NULL DEFAULT 0,
  tasks_total INT NOT NULL DEFAULT 0,
  rpa_avg NUMERIC(6,2),
  otd_pct NUMERIC(5,2),
  ftr_pct NUMERIC(5,2),
  cycle_time_avg_days NUMERIC(6,2),
  throughput_count INT,
  stuck_asset_count INT DEFAULT 0,
  project_breakdown JSONB DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'ico_member_metrics',
  materialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (member_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_person_ops_metrics_member
  ON greenhouse_serving.person_operational_metrics (member_id);

GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_serving.person_operational_metrics
  TO greenhouse_app, greenhouse_runtime, greenhouse_ops;

GRANT SELECT
  ON greenhouse_serving.ico_member_metrics
  TO greenhouse_app, greenhouse_runtime, greenhouse_ops;
