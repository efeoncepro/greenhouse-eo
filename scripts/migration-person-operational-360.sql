-- ════════════════════════════════════════════════════════════════════════════
-- Person Operational 360 — Unified Intelligence Table
-- ════════════════════════════════════════════════════════════════════════════
--
-- Single materialized table replacing fragmented person metrics:
--   - 9 ICO delivery metrics (from ico_member_metrics)
--   - 6 derived person metrics (utilization, variance, cost, quality, dedication)
--   - Capacity context (from assignments)
--   - Cost context (from compensation)
--   - 12-month snapshot retention
--
-- Safe to run multiple times (all operations idempotent).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Main table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_serving.person_operational_360 (
  -- PK: one row per member per month
  member_id           TEXT NOT NULL,
  period_year         INT NOT NULL,
  period_month        INT NOT NULL,

  -- ═══ ICO Delivery Metrics (9) ═══
  rpa_avg             NUMERIC(6,2),
  rpa_median          NUMERIC(6,2),
  otd_pct             NUMERIC(5,2),
  ftr_pct             NUMERIC(5,2),
  cycle_time_avg_days NUMERIC(6,2),
  cycle_time_p50_days NUMERIC(6,2),
  cycle_time_variance NUMERIC(6,2),
  throughput_count     INT,
  pipeline_velocity    NUMERIC(5,3),
  stuck_asset_count    INT DEFAULT 0,
  stuck_asset_pct      NUMERIC(5,2),
  total_tasks          INT DEFAULT 0,
  completed_tasks      INT DEFAULT 0,
  active_tasks         INT DEFAULT 0,

  -- ═══ Derived Person Metrics (6) ═══
  utilization_pct          NUMERIC(5,2),
  allocation_variance      NUMERIC(5,3),
  cost_per_asset           NUMERIC(14,2),
  cost_per_hour            NUMERIC(14,2),
  quality_index            NUMERIC(5,2),
  dedication_index         NUMERIC(5,2),

  -- ═══ Capacity Context ═══
  role_category            TEXT,
  total_fte_allocation     NUMERIC(5,3),
  contracted_hours_month   INT,
  assigned_hours_month     INT,
  used_hours_month         INT,
  available_hours_month    INT,
  expected_throughput      NUMERIC(6,1),
  capacity_health          TEXT,
  overcommitted            BOOLEAN DEFAULT FALSE,
  active_assignment_count  INT DEFAULT 0,

  -- ═══ Cost Context ═══
  compensation_currency    TEXT,
  monthly_base_salary      NUMERIC(14,2),
  monthly_total_comp       NUMERIC(14,2),
  compensation_version_id  TEXT,

  -- ═══ Metadata ═══
  source                   TEXT NOT NULL DEFAULT 'person_intelligence',
  engine_version           TEXT,
  materialized_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (member_id, period_year, period_month)
);

-- Batch reads by period (agency dashboard)
CREATE INDEX IF NOT EXISTS idx_po360_period
  ON greenhouse_serving.person_operational_360 (period_year, period_month);

-- Trend queries (single person, last 12 months)
CREATE INDEX IF NOT EXISTS idx_po360_member_period
  ON greenhouse_serving.person_operational_360 (member_id, period_year DESC, period_month DESC);

-- Health filtering (find overloaded members)
CREATE INDEX IF NOT EXISTS idx_po360_health
  ON greenhouse_serving.person_operational_360 (capacity_health)
  WHERE capacity_health IN ('high', 'overloaded');

-- ── 2. Metric Threshold Overrides (enterprise) ──────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_serving.metric_threshold_overrides (
  override_id      TEXT PRIMARY KEY DEFAULT 'mto-' || gen_random_uuid()::text,
  organization_id  TEXT NOT NULL,
  metric_code      TEXT NOT NULL,
  optimal_min      NUMERIC,
  optimal_max      NUMERIC,
  attention_min    NUMERIC,
  attention_max    NUMERIC,
  critical_min     NUMERIC,
  critical_max     NUMERIC,
  changed_by       TEXT,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, metric_code)
);

-- ── 3. Grants ────────────────────────────────────────────────────────────

GRANT ALL PRIVILEGES ON greenhouse_serving.person_operational_360 TO greenhouse_ops;
GRANT ALL PRIVILEGES ON greenhouse_serving.metric_threshold_overrides TO greenhouse_ops;
