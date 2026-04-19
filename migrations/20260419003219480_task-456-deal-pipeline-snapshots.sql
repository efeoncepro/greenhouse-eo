-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_serving.deal_pipeline_snapshots (
  deal_id text PRIMARY KEY
    REFERENCES greenhouse_commercial.deals(deal_id) ON DELETE CASCADE,
  hubspot_deal_id text NOT NULL,
  client_id text,
  organization_id text,
  space_id text,

  deal_name text NOT NULL,
  dealstage text NOT NULL,
  dealstage_label text,
  pipeline_name text,
  deal_type text,

  amount numeric(18,2),
  amount_clp numeric(18,2),
  currency text,
  probability_pct numeric(5,2),
  close_date date,
  days_until_close integer,
  is_open boolean NOT NULL DEFAULT TRUE,
  is_won boolean NOT NULL DEFAULT FALSE,

  deal_owner_email text,

  latest_quote_id text
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE SET NULL,
  latest_quote_status text,
  quote_count integer NOT NULL DEFAULT 0,
  approved_quote_count integer NOT NULL DEFAULT 0,
  total_quotes_amount_clp numeric(18,2),

  snapshot_source_event text,
  materialized_at timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT deal_pipeline_snapshots_amount_non_negative CHECK (
    amount IS NULL OR amount >= 0
  ),
  CONSTRAINT deal_pipeline_snapshots_amount_clp_non_negative CHECK (
    amount_clp IS NULL OR amount_clp >= 0
  ),
  CONSTRAINT deal_pipeline_snapshots_probability_bounds CHECK (
    probability_pct IS NULL OR (probability_pct >= 0 AND probability_pct <= 100)
  ),
  CONSTRAINT deal_pipeline_snapshots_quote_count_non_negative CHECK (
    quote_count >= 0
  ),
  CONSTRAINT deal_pipeline_snapshots_approved_quote_count_non_negative CHECK (
    approved_quote_count >= 0
  ),
  CONSTRAINT deal_pipeline_snapshots_approved_quote_count_bounds CHECK (
    approved_quote_count <= quote_count
  ),
  CONSTRAINT deal_pipeline_snapshots_total_quotes_non_negative CHECK (
    total_quotes_amount_clp IS NULL OR total_quotes_amount_clp >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_deal_pipeline_client
  ON greenhouse_serving.deal_pipeline_snapshots (client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deal_pipeline_org
  ON greenhouse_serving.deal_pipeline_snapshots (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deal_pipeline_space
  ON greenhouse_serving.deal_pipeline_snapshots (space_id)
  WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deal_pipeline_stage
  ON greenhouse_serving.deal_pipeline_snapshots (dealstage);

CREATE INDEX IF NOT EXISTS idx_deal_pipeline_open
  ON greenhouse_serving.deal_pipeline_snapshots (space_id, close_date, dealstage)
  WHERE is_open = TRUE;

CREATE INDEX IF NOT EXISTS idx_deal_pipeline_hubspot_deal
  ON greenhouse_serving.deal_pipeline_snapshots (hubspot_deal_id);

COMMENT ON TABLE greenhouse_serving.deal_pipeline_snapshots IS
  'TASK-456: deal-grain commercial forecast projection. One row per non-deleted canonical deal with quote rollups and reactive refresh.';

ALTER TABLE greenhouse_serving.deal_pipeline_snapshots OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_serving.deal_pipeline_snapshots
  TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_serving.deal_pipeline_snapshots
  TO greenhouse_migrator;

GRANT SELECT
  ON greenhouse_serving.deal_pipeline_snapshots
  TO greenhouse_app;

-- Down Migration

REVOKE ALL PRIVILEGES
  ON greenhouse_serving.deal_pipeline_snapshots
  FROM greenhouse_runtime, greenhouse_migrator, greenhouse_app;

DROP INDEX IF EXISTS greenhouse_serving.idx_deal_pipeline_hubspot_deal;
DROP INDEX IF EXISTS greenhouse_serving.idx_deal_pipeline_open;
DROP INDEX IF EXISTS greenhouse_serving.idx_deal_pipeline_stage;
DROP INDEX IF EXISTS greenhouse_serving.idx_deal_pipeline_space;
DROP INDEX IF EXISTS greenhouse_serving.idx_deal_pipeline_org;
DROP INDEX IF EXISTS greenhouse_serving.idx_deal_pipeline_client;

DROP TABLE IF EXISTS greenhouse_serving.deal_pipeline_snapshots;
