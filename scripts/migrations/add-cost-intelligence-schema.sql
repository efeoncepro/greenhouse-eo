-- Cost Intelligence foundation migration
-- Mirrors the baseline applied by scripts/setup-postgres-cost-intelligence.sql

CREATE SCHEMA IF NOT EXISTS greenhouse_cost_intelligence;

CREATE TABLE IF NOT EXISTS greenhouse_cost_intelligence.period_closure_config (
  config_id TEXT PRIMARY KEY,
  require_payroll_exported BOOLEAN NOT NULL DEFAULT TRUE,
  require_income_recorded BOOLEAN NOT NULL DEFAULT TRUE,
  require_expenses_recorded BOOLEAN NOT NULL DEFAULT TRUE,
  require_bank_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  require_fx_locked BOOLEAN NOT NULL DEFAULT TRUE,
  margin_alert_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS greenhouse_cost_intelligence.period_closures (
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  closure_status TEXT NOT NULL DEFAULT 'open'
    CHECK (closure_status IN ('open', 'ready', 'closed', 'reopened')),
  payroll_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payroll_status IN ('pending', 'calculated', 'approved', 'exported')),
  income_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (income_status IN ('pending', 'partial', 'complete')),
  expense_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (expense_status IN ('pending', 'partial', 'complete')),
  reconciliation_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (reconciliation_status IN ('pending', 'partial', 'complete', 'not_required')),
  fx_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (fx_status IN ('pending', 'locked')),
  readiness_pct INTEGER NOT NULL DEFAULT 0 CHECK (readiness_pct BETWEEN 0 AND 100),
  closed_at TIMESTAMPTZ,
  closed_by TEXT REFERENCES greenhouse_core.client_users(user_id),
  reopened_at TIMESTAMPTZ,
  reopened_by TEXT REFERENCES greenhouse_core.client_users(user_id),
  reopened_reason TEXT,
  snapshot_revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (period_year, period_month)
);

CREATE TABLE IF NOT EXISTS greenhouse_serving.period_closure_status (
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  closure_status TEXT NOT NULL
    CHECK (closure_status IN ('open', 'ready', 'closed', 'reopened')),
  payroll_closed BOOLEAN NOT NULL DEFAULT FALSE,
  income_closed BOOLEAN NOT NULL DEFAULT FALSE,
  expenses_closed BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_closed BOOLEAN NOT NULL DEFAULT FALSE,
  fx_locked BOOLEAN NOT NULL DEFAULT FALSE,
  readiness_pct INTEGER NOT NULL DEFAULT 0 CHECK (readiness_pct BETWEEN 0 AND 100),
  snapshot_revision INTEGER NOT NULL DEFAULT 1,
  materialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (period_year, period_month)
);

CREATE TABLE IF NOT EXISTS greenhouse_serving.operational_pl_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('client', 'space', 'organization')),
  scope_id TEXT NOT NULL,
  scope_name TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_closed BOOLEAN NOT NULL DEFAULT FALSE,
  snapshot_revision INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'CLP',
  revenue_clp NUMERIC(18, 2) NOT NULL DEFAULT 0,
  labor_cost_clp NUMERIC(18, 2) NOT NULL DEFAULT 0,
  direct_expense_clp NUMERIC(18, 2) NOT NULL DEFAULT 0,
  overhead_clp NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_cost_clp NUMERIC(18, 2) NOT NULL DEFAULT 0,
  gross_margin_clp NUMERIC(18, 2) NOT NULL DEFAULT 0,
  gross_margin_pct NUMERIC(5, 2),
  headcount_fte NUMERIC(6, 2),
  revenue_per_fte_clp NUMERIC(18, 2),
  cost_per_fte_clp NUMERIC(18, 2),
  computation_reason TEXT,
  materialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (scope_type, scope_id, period_year, period_month, snapshot_revision)
);

GRANT USAGE ON SCHEMA greenhouse_cost_intelligence TO greenhouse_runtime;
GRANT USAGE, CREATE ON SCHEMA greenhouse_cost_intelligence TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE ON greenhouse_cost_intelligence.period_closure_config TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_cost_intelligence.period_closures TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_serving.period_closure_status TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.operational_pl_snapshots TO greenhouse_runtime;

GRANT ALL PRIVILEGES ON TABLE greenhouse_cost_intelligence.period_closure_config TO greenhouse_migrator;
GRANT ALL PRIVILEGES ON TABLE greenhouse_cost_intelligence.period_closures TO greenhouse_migrator;
GRANT ALL PRIVILEGES ON TABLE greenhouse_serving.period_closure_status TO greenhouse_migrator;
GRANT ALL PRIVILEGES ON TABLE greenhouse_serving.operational_pl_snapshots TO greenhouse_migrator;

INSERT INTO greenhouse_cost_intelligence.period_closure_config (
  config_id,
  updated_by
)
VALUES (
  'default',
  'system'
)
ON CONFLICT (config_id) DO NOTHING;
