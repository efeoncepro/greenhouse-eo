-- Up Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_serving.agency_performance_reports (
  report_scope                    TEXT NOT NULL DEFAULT 'agency',
  period_year                     INT NOT NULL,
  period_month                    INT NOT NULL,
  on_time_count                   INT,
  late_drop_count                 INT,
  on_time_pct                     NUMERIC(5,2),
  overdue_count                   INT,
  carry_over_count                INT,
  total_tasks                     INT,
  completed_tasks                 INT,
  active_tasks                    INT,
  efeonce_tasks_count             INT,
  sky_tasks_count                 INT,
  task_mix_json                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_performer_member_id         TEXT,
  top_performer_member_name       TEXT,
  top_performer_otd_pct           NUMERIC(5,2),
  top_performer_throughput_count  INT,
  top_performer_rpa_avg           NUMERIC(6,2),
  top_performer_ftr_pct           NUMERIC(5,2),
  top_performer_min_throughput    INT,
  trend_stable_band_pp            NUMERIC(5,2),
  multi_assignee_policy           TEXT,
  source                          TEXT NOT NULL DEFAULT 'ico_engine.performance_report_monthly',
  materialized_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (report_scope, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_agency_performance_reports_period
  ON greenhouse_serving.agency_performance_reports (period_year DESC, period_month DESC);

GRANT SELECT ON greenhouse_serving.agency_performance_reports TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.agency_performance_reports TO greenhouse_migrator;

-- Down Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

DROP TABLE IF EXISTS greenhouse_serving.agency_performance_reports;
