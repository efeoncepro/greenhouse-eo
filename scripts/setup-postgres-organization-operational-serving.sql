-- ══════════════════════════════════════════════════════
-- Organization Operational Serving — Canonical read model
-- Ref: TASK-014-projects-account-360-bridge.md
-- Run: psql $DATABASE_URL -f scripts/setup-postgres-organization-operational-serving.sql
-- ══════════════════════════════════════════════════════

-- 1. Table: greenhouse_serving.ico_organization_metrics
-- Projected from BigQuery ico_engine.metrics_by_organization via reactive sync.
-- Source of truth: BigQuery. Postgres is a read-optimized cache.

CREATE TABLE IF NOT EXISTS greenhouse_serving.ico_organization_metrics (
  organization_id     TEXT NOT NULL,
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

  PRIMARY KEY (organization_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_ico_organization_metrics_period
  ON greenhouse_serving.ico_organization_metrics (period_year, period_month);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_organization_metrics TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_organization_metrics TO greenhouse_ops;


-- 2. Table: greenhouse_serving.organization_operational_metrics
-- Materialized view reacting to Account 360 / Space events to present the aggregated serving

CREATE TABLE IF NOT EXISTS greenhouse_serving.organization_operational_metrics (
  organization_id     TEXT NOT NULL,
  period_year         INT NOT NULL,
  period_month        INT NOT NULL,

  -- Task counts
  tasks_completed     INT NOT NULL DEFAULT 0,
  tasks_active        INT NOT NULL DEFAULT 0,
  tasks_total         INT NOT NULL DEFAULT 0,

  -- Quality metrics
  rpa_avg             NUMERIC(6,2),
  otd_pct             NUMERIC(5,2),
  ftr_pct             NUMERIC(5,2),

  -- Delivery metrics
  cycle_time_avg_days NUMERIC(6,2),
  throughput_count    INT,
  stuck_asset_count   INT DEFAULT 0,

  -- Metadata
  source              TEXT NOT NULL DEFAULT 'ico_organization_metrics',
  materialized_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (organization_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_org_ops_metrics_org
  ON greenhouse_serving.organization_operational_metrics (organization_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.organization_operational_metrics TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.organization_operational_metrics TO greenhouse_ops;
