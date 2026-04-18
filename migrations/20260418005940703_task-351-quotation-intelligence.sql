-- Up Migration
-- TASK-351 — Quotation Intelligence Automation: Pipeline, Renewals, Profitability

-- ─── 1. quotation_pipeline_snapshots (one row per quote) ───
CREATE TABLE IF NOT EXISTS greenhouse_serving.quotation_pipeline_snapshots (
  quotation_id text PRIMARY KEY
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE CASCADE,
  client_id text,
  organization_id text,
  space_id text,

  status text NOT NULL,
  pipeline_stage text NOT NULL,
  probability_pct numeric(5,2) NOT NULL DEFAULT 0,

  total_amount_clp numeric(18,2),
  quoted_margin_pct numeric(7,4),
  business_line_code text,
  pricing_model text,
  currency text,

  quote_date date,
  sent_at timestamptz,
  approved_at timestamptz,
  expiry_date date,
  converted_at timestamptz,
  rejected_at timestamptz,
  expired_at timestamptz,

  days_in_stage integer,
  days_until_expiry integer,
  is_renewal_due boolean NOT NULL DEFAULT FALSE,
  is_expired boolean NOT NULL DEFAULT FALSE,

  authorized_amount_clp numeric(18,2),
  invoiced_amount_clp numeric(18,2),

  snapshot_source_event text,
  materialized_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_client
  ON greenhouse_serving.quotation_pipeline_snapshots (client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_org
  ON greenhouse_serving.quotation_pipeline_snapshots (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_space
  ON greenhouse_serving.quotation_pipeline_snapshots (space_id)
  WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_stage
  ON greenhouse_serving.quotation_pipeline_snapshots (pipeline_stage);

CREATE INDEX IF NOT EXISTS idx_pipeline_renewal_due
  ON greenhouse_serving.quotation_pipeline_snapshots (expiry_date)
  WHERE is_renewal_due = TRUE;

CREATE INDEX IF NOT EXISTS idx_pipeline_expired
  ON greenhouse_serving.quotation_pipeline_snapshots (expired_at)
  WHERE is_expired = TRUE;

COMMENT ON TABLE greenhouse_serving.quotation_pipeline_snapshots IS
  'TASK-351: serving projection of quotation pipeline. One row per quote with stage/probability/aging. Refreshed reactively on quotation lifecycle events.';

-- ─── 2. quotation_profitability_snapshots (one row per quote-period) ───
CREATE TABLE IF NOT EXISTS greenhouse_serving.quotation_profitability_snapshots (
  quotation_id text NOT NULL
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE CASCADE,
  period_year integer NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),

  client_id text,
  organization_id text,
  space_id text,

  quoted_total_clp numeric(18,2),
  quoted_margin_pct numeric(7,4),

  authorized_total_clp numeric(18,2),
  invoiced_total_clp numeric(18,2),

  realized_revenue_clp numeric(18,2),
  attributed_cost_clp numeric(18,2),

  effective_margin_pct numeric(7,4),
  margin_drift_pct numeric(7,4),
  drift_severity text NOT NULL DEFAULT 'aligned',
  drift_drivers jsonb NOT NULL DEFAULT '{}'::jsonb,

  materialized_at timestamptz NOT NULL DEFAULT NOW(),

  PRIMARY KEY (quotation_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_prof_client_period
  ON greenhouse_serving.quotation_profitability_snapshots (client_id, period_year, period_month)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prof_org_period
  ON greenhouse_serving.quotation_profitability_snapshots (organization_id, period_year, period_month)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prof_severity
  ON greenhouse_serving.quotation_profitability_snapshots (drift_severity)
  WHERE drift_severity IN ('warning', 'critical');

COMMENT ON TABLE greenhouse_serving.quotation_profitability_snapshots IS
  'TASK-351: serving projection of quote profitability by period. Compares quoted margin vs realized revenue and attributed cost (from commercial_cost_attribution). Drift severity drives alerts.';

-- ─── 3. quotation_renewal_reminders (dedup + cadence control) ───
CREATE TABLE IF NOT EXISTS greenhouse_commercial.quotation_renewal_reminders (
  quotation_id text PRIMARY KEY
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE CASCADE,
  last_reminder_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  next_check_at timestamptz,
  last_event_type text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renewal_next_check
  ON greenhouse_commercial.quotation_renewal_reminders (next_check_at)
  WHERE next_check_at IS NOT NULL;

COMMENT ON TABLE greenhouse_commercial.quotation_renewal_reminders IS
  'TASK-351: tracks renewal reminders per quote to avoid duplicate alerts. Updated by the lifecycle-sweep cron.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_commercial.idx_renewal_next_check;
DROP TABLE IF EXISTS greenhouse_commercial.quotation_renewal_reminders;

DROP INDEX IF EXISTS greenhouse_serving.idx_prof_severity;
DROP INDEX IF EXISTS greenhouse_serving.idx_prof_org_period;
DROP INDEX IF EXISTS greenhouse_serving.idx_prof_client_period;
DROP TABLE IF EXISTS greenhouse_serving.quotation_profitability_snapshots;

DROP INDEX IF EXISTS greenhouse_serving.idx_pipeline_expired;
DROP INDEX IF EXISTS greenhouse_serving.idx_pipeline_renewal_due;
DROP INDEX IF EXISTS greenhouse_serving.idx_pipeline_stage;
DROP INDEX IF EXISTS greenhouse_serving.idx_pipeline_space;
DROP INDEX IF EXISTS greenhouse_serving.idx_pipeline_org;
DROP INDEX IF EXISTS greenhouse_serving.idx_pipeline_client;
DROP TABLE IF EXISTS greenhouse_serving.quotation_pipeline_snapshots;
