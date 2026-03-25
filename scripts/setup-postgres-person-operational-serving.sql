-- ══════════════════════════════════════════════════════
-- Person Operational Serving — Canonical read model
-- Ref: TASK-042-person-operational-serving-cutover.md
-- Replaces heuristic name/email matching against notion_ops.tareas
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS greenhouse_serving.person_operational_metrics (
  member_id           TEXT NOT NULL,
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

  -- Project breakdown (JSON array of {projectName, taskCount})
  project_breakdown   JSONB DEFAULT '[]',

  -- Metadata
  source              TEXT NOT NULL DEFAULT 'ico_member_metrics',
  materialized_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (member_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_person_ops_metrics_member
  ON greenhouse_serving.person_operational_metrics (member_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.person_operational_metrics TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.person_operational_metrics TO greenhouse_ops;
