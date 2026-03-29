-- Migration: Create projected_payroll_snapshots serving table
-- Part of TASK-063 — Projected Payroll Runtime

CREATE TABLE IF NOT EXISTS greenhouse_serving.projected_payroll_snapshots (
  member_id TEXT NOT NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  projection_mode TEXT NOT NULL CHECK (projection_mode IN ('actual_to_date', 'projected_month_end')),
  as_of_date DATE NOT NULL,
  currency TEXT NOT NULL,
  base_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  remote_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  fixed_bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  bonus_otd_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  bonus_rpa_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  kpi_otd_percent NUMERIC(5,2),
  kpi_rpa_avg NUMERIC(5,2),
  working_days_cut INT,
  working_days_total INT,
  days_absent INT DEFAULT 0,
  days_on_leave INT DEFAULT 0,
  uf_value NUMERIC(10,2),
  snapshot_status TEXT NOT NULL DEFAULT 'projected',
  materialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, period_year, period_month, projection_mode)
);

CREATE INDEX IF NOT EXISTS idx_projected_payroll_period
  ON greenhouse_serving.projected_payroll_snapshots (period_year, period_month);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.projected_payroll_snapshots TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.projected_payroll_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.projected_payroll_snapshots TO greenhouse_migrator;
