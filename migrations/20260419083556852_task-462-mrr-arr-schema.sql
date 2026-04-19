-- Up Migration

CREATE TABLE greenhouse_serving.contract_mrr_arr_snapshots (
  period_year integer NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  contract_id text NOT NULL REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE CASCADE,

  client_id text,
  organization_id text,
  space_id text,

  business_line_code text,
  commercial_model text NOT NULL,
  staffing_model text NOT NULL,

  mrr_clp numeric(18,2) NOT NULL DEFAULT 0,
  arr_clp numeric(18,2) GENERATED ALWAYS AS (mrr_clp * 12) STORED,

  previous_mrr_clp numeric(18,2),
  mrr_delta_clp numeric(18,2) GENERATED ALWAYS AS (mrr_clp - COALESCE(previous_mrr_clp, 0)) STORED,
  movement_type text NOT NULL DEFAULT 'unchanged'
    CHECK (movement_type IN ('new', 'expansion', 'contraction', 'churn', 'reactivation', 'unchanged')),

  materialized_at timestamptz NOT NULL DEFAULT NOW(),

  PRIMARY KEY (period_year, period_month, contract_id)
);

CREATE INDEX idx_mrr_arr_period_tenant ON greenhouse_serving.contract_mrr_arr_snapshots (period_year, period_month, space_id);
CREATE INDEX idx_mrr_arr_period_client ON greenhouse_serving.contract_mrr_arr_snapshots (period_year, period_month, client_id);
CREATE INDEX idx_mrr_arr_movement ON greenhouse_serving.contract_mrr_arr_snapshots (period_year, period_month, movement_type) WHERE movement_type != 'unchanged';

ALTER TABLE greenhouse_serving.contract_mrr_arr_snapshots OWNER TO greenhouse_ops;
GRANT SELECT ON greenhouse_serving.contract_mrr_arr_snapshots TO greenhouse_runtime;
GRANT INSERT, UPDATE, DELETE ON greenhouse_serving.contract_mrr_arr_snapshots TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_serving.contract_mrr_arr_snapshots;
