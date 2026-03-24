-- ══════════════════════════════════════════════════════
-- ICO Member Metrics — Postgres projection from BigQuery
-- Ref: TASK-011-ico-person-360-integration.md
-- Run: psql $DATABASE_URL -f scripts/setup-postgres-ico-member-metrics.sql
-- ══════════════════════════════════════════════════════

-- Table: greenhouse_serving.ico_member_metrics
-- Projected from BigQuery ico_engine.metrics_by_member via cron sync.
-- Source of truth: BigQuery. Postgres is a read-optimized cache.

CREATE TABLE IF NOT EXISTS greenhouse_serving.ico_member_metrics (
  member_id           TEXT NOT NULL,
  period_year         INT NOT NULL,
  period_month        INT NOT NULL,
  rpa_avg             NUMERIC(6,2),
  rpa_median          NUMERIC(6,2),
  otd_pct             NUMERIC(5,2),
  ftr_pct             NUMERIC(5,2),
  cycle_time_avg_days NUMERIC(6,2),
  throughput_count    INT,
  pipeline_velocity   NUMERIC(8,2),
  stuck_asset_count   INT,
  stuck_asset_pct     NUMERIC(5,2),
  total_tasks         INT,
  completed_tasks     INT,
  active_tasks        INT,
  materialized_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (member_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_ico_member_metrics_period
  ON greenhouse_serving.ico_member_metrics (period_year, period_month);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_member_metrics TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_member_metrics TO greenhouse_ops;
