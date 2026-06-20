-- Up Migration

SET search_path = public;

-- Forward-fix: commercial_cost_attribution is a governed serving truth layer.
-- Runtime must never create or alter this table; migrations own DDL.

CREATE TABLE IF NOT EXISTS greenhouse_serving.commercial_cost_attribution (
  member_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  organization_id TEXT,
  client_name TEXT NOT NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  base_labor_cost_target NUMERIC(14,2) NOT NULL DEFAULT 0,
  internal_operational_cost_target NUMERIC(14,2) NOT NULL DEFAULT 0,
  direct_overhead_target NUMERIC(14,2) NOT NULL DEFAULT 0,
  shared_overhead_target NUMERIC(14,2) NOT NULL DEFAULT 0,
  fte_contribution NUMERIC(10,3) NOT NULL DEFAULT 0,
  allocation_ratio NUMERIC(10,6) NOT NULL DEFAULT 0,
  commercial_labor_cost_target NUMERIC(14,2) NOT NULL DEFAULT 0,
  commercial_direct_overhead_target NUMERIC(14,2) NOT NULL DEFAULT 0,
  commercial_shared_overhead_target NUMERIC(14,2) NOT NULL DEFAULT 0,
  commercial_loaded_cost_target NUMERIC(14,2) NOT NULL DEFAULT 0,
  source_of_truth TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  materialization_reason TEXT,
  materialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attribution_intent TEXT NOT NULL DEFAULT 'operational'
);

ALTER TABLE greenhouse_serving.commercial_cost_attribution
  ADD COLUMN IF NOT EXISTS organization_id TEXT,
  ADD COLUMN IF NOT EXISTS attribution_intent TEXT NOT NULL DEFAULT 'operational';

UPDATE greenhouse_serving.commercial_cost_attribution
SET attribution_intent = 'operational'
WHERE attribution_intent IS NULL;

ALTER TABLE greenhouse_serving.commercial_cost_attribution
  ALTER COLUMN attribution_intent SET DEFAULT 'operational',
  ALTER COLUMN attribution_intent SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'commercial_cost_attribution_pkey'
      AND conrelid = 'greenhouse_serving.commercial_cost_attribution'::regclass
  ) THEN
    ALTER TABLE greenhouse_serving.commercial_cost_attribution
      ADD CONSTRAINT commercial_cost_attribution_pkey
      PRIMARY KEY (member_id, client_id, period_year, period_month);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'commercial_cost_attribution_attribution_intent_check'
      AND conrelid = 'greenhouse_serving.commercial_cost_attribution'::regclass
  ) THEN
    ALTER TABLE greenhouse_serving.commercial_cost_attribution
      ADD CONSTRAINT commercial_cost_attribution_attribution_intent_check
      CHECK (attribution_intent IN ('operational','pilot','trial','poc','discovery','overhead'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_commercial_cost_attr_org_period
  ON greenhouse_serving.commercial_cost_attribution (organization_id, period_year, period_month);

ALTER TABLE greenhouse_serving.commercial_cost_attribution OWNER TO greenhouse_ops;

GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_app, greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.commercial_cost_attribution TO greenhouse_app, greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_serving.commercial_cost_attribution TO greenhouse_migrator;

COMMENT ON TABLE greenhouse_serving.commercial_cost_attribution IS
  'Governed serving truth layer for commercial cost attribution by member, client and period. DDL is migration-owned; runtime materializers may only read/write rows.';

-- Down Migration

SET search_path = public;

-- No destructive rollback. This forward-fix may create or harden a table that
-- already carries production serving data. Reverting code is sufficient to
-- restore prior runtime behavior; dropping this table would risk data loss.
