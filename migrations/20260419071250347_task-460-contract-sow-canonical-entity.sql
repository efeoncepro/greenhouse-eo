-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_commercial.contracts (
  contract_id text PRIMARY KEY DEFAULT ('ctr-' || gen_random_uuid()::text),
  contract_number text NOT NULL UNIQUE,
  client_id text REFERENCES greenhouse_core.clients(client_id) ON DELETE RESTRICT,
  organization_id text REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  msa_id text,
  commercial_model text NOT NULL
    CHECK (commercial_model IN ('retainer', 'project', 'one_off')),
  staffing_model text NOT NULL
    CHECK (staffing_model IN ('named_resources', 'outcome_based', 'hybrid')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'terminated', 'completed', 'renewed')),
  start_date date NOT NULL,
  end_date date,
  auto_renewal boolean NOT NULL DEFAULT FALSE,
  renewal_frequency_months integer,
  mrr_clp numeric(18,2),
  arr_clp numeric(18,2),
  tcv_clp numeric(18,2),
  acv_clp numeric(18,2),
  originator_quote_id text REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'CLP',
  exchange_rate_to_clp numeric(12,6),
  signed_at timestamptz,
  terminated_at timestamptz,
  terminated_reason text,
  renewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT contract_dates_valid CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.contract_quotes (
  contract_id text NOT NULL
    REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE CASCADE,
  quotation_id text NOT NULL
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE RESTRICT,
  relationship_type text NOT NULL
    CHECK (relationship_type IN ('originator', 'renewal', 'modification', 'cancellation')),
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contract_id, quotation_id),
  CONSTRAINT contract_quote_effective_dates_valid CHECK (
    effective_to IS NULL OR effective_to >= effective_from
  )
);

CREATE TABLE IF NOT EXISTS greenhouse_serving.contract_profitability_snapshots (
  contract_id text NOT NULL
    REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE CASCADE,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  client_id text,
  organization_id text,
  space_id text,
  quoted_total_clp numeric(18,2),
  quoted_margin_pct numeric(12,4),
  pricing_model text,
  commercial_model text,
  staffing_model text,
  authorized_total_clp numeric(18,2),
  invoiced_total_clp numeric(18,2),
  realized_revenue_clp numeric(18,2),
  attributed_cost_clp numeric(18,2),
  effective_margin_pct numeric(12,4),
  margin_drift_pct numeric(12,4),
  drift_severity text NOT NULL DEFAULT 'aligned'
    CHECK (drift_severity IN ('aligned', 'warning', 'critical')),
  drift_drivers jsonb NOT NULL DEFAULT '{}'::jsonb,
  materialized_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contract_id, period_year, period_month)
);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.contract_renewal_reminders (
  contract_id text PRIMARY KEY
    REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE CASCADE,
  last_reminder_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  next_check_at timestamptz,
  last_event_type text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE greenhouse_finance.purchase_orders
  ADD COLUMN IF NOT EXISTS contract_id text
    REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.service_entry_sheets
  ADD COLUMN IF NOT EXISTS contract_id text
    REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS contract_id text
    REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_client_id
  ON greenhouse_commercial.contracts(client_id);

CREATE INDEX IF NOT EXISTS idx_contracts_space_id
  ON greenhouse_commercial.contracts(space_id);

CREATE INDEX IF NOT EXISTS idx_contracts_originator_quote_id
  ON greenhouse_commercial.contracts(originator_quote_id);

CREATE INDEX IF NOT EXISTS idx_contracts_status_active
  ON greenhouse_commercial.contracts(status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_contracts_end_date_open
  ON greenhouse_commercial.contracts(end_date)
  WHERE end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_quotes_quotation_id
  ON greenhouse_commercial.contract_quotes(quotation_id);

CREATE INDEX IF NOT EXISTS idx_contract_profitability_space_period
  ON greenhouse_serving.contract_profitability_snapshots(space_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_contract_renewal_reminders_next_check
  ON greenhouse_commercial.contract_renewal_reminders(next_check_at);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_contract_id
  ON greenhouse_finance.purchase_orders(contract_id);

CREATE INDEX IF NOT EXISTS idx_service_entry_sheets_contract_id
  ON greenhouse_finance.service_entry_sheets(contract_id);

CREATE INDEX IF NOT EXISTS idx_income_contract_id
  ON greenhouse_finance.income(contract_id);

WITH quote_candidates AS (
  SELECT
    q.quotation_id,
    q.quotation_number,
    q.client_id,
    q.organization_id,
    q.space_id,
    q.commercial_model,
    q.staffing_model,
    q.status,
    q.quote_date,
    q.sent_at,
    q.approved_at,
    q.converted_at,
    q.expiry_date,
    q.valid_until,
    q.contract_duration_months,
    q.mrr,
    q.arr,
    q.tcv,
    q.acv,
    q.total_amount_clp,
    q.total_price,
    q.currency,
    q.exchange_rate_to_clp,
    CASE
      WHEN q.quotation_number LIKE 'EO-QUO-%'
        THEN regexp_replace(q.quotation_number, '^EO-QUO-', 'EO-CTR-')
      ELSE 'EO-CTR-' || upper(substr(md5(q.quotation_id), 1, 8))
    END AS contract_number,
    CASE
      WHEN q.status IN ('approved', 'converted') THEN 'active'
      WHEN q.status = 'sent' THEN 'draft'
      ELSE 'draft'
    END AS contract_status,
    COALESCE(
      q.approved_at::date,
      q.converted_at::date,
      q.sent_at::date,
      q.quote_date::date,
      CURRENT_DATE
    ) AS start_date,
    CASE
      WHEN q.commercial_model = 'retainer' THEN NULL
      ELSE COALESCE(q.expiry_date::date, q.valid_until::date)
    END AS end_date,
    (q.commercial_model = 'retainer') AS auto_renewal,
    CASE
      WHEN q.commercial_model = 'retainer' THEN COALESCE(NULLIF(q.contract_duration_months, 0), 12)
      ELSE NULL
    END AS renewal_frequency_months,
    COALESCE(
      q.mrr,
      CASE
        WHEN q.commercial_model = 'retainer'
          AND q.contract_duration_months IS NOT NULL
          AND q.contract_duration_months > 0
          AND COALESCE(q.total_amount_clp, q.total_price) IS NOT NULL
          THEN round((COALESCE(q.total_amount_clp, q.total_price) / q.contract_duration_months)::numeric, 2)
        ELSE NULL
      END
    ) AS mrr_clp,
    COALESCE(
      q.arr,
      CASE
        WHEN q.mrr IS NOT NULL THEN round((q.mrr * 12)::numeric, 2)
        WHEN q.commercial_model = 'retainer'
          AND q.contract_duration_months IS NOT NULL
          AND q.contract_duration_months > 0
          AND COALESCE(q.total_amount_clp, q.total_price) IS NOT NULL
          THEN round(((COALESCE(q.total_amount_clp, q.total_price) / q.contract_duration_months) * 12)::numeric, 2)
        ELSE NULL
      END
    ) AS arr_clp,
    COALESCE(q.tcv, q.total_amount_clp, q.total_price) AS tcv_clp,
    COALESCE(
      q.acv,
      CASE
        WHEN q.contract_duration_months IS NOT NULL
          AND q.contract_duration_months > 12
          AND COALESCE(q.total_amount_clp, q.total_price) IS NOT NULL
          THEN round(((COALESCE(q.total_amount_clp, q.total_price) / q.contract_duration_months) * 12)::numeric, 2)
        ELSE COALESCE(q.total_amount_clp, q.total_price)
      END
    ) AS acv_clp
  FROM greenhouse_commercial.quotations q
  WHERE q.status IN ('approved', 'converted', 'sent')
),
inserted_contracts AS (
  INSERT INTO greenhouse_commercial.contracts (
    contract_number,
    client_id,
    organization_id,
    space_id,
    msa_id,
    commercial_model,
    staffing_model,
    status,
    start_date,
    end_date,
    auto_renewal,
    renewal_frequency_months,
    mrr_clp,
    arr_clp,
    tcv_clp,
    acv_clp,
    originator_quote_id,
    currency,
    exchange_rate_to_clp,
    signed_at
  )
  SELECT
    qc.contract_number,
    qc.client_id,
    qc.organization_id,
    qc.space_id,
    NULL,
    qc.commercial_model,
    qc.staffing_model,
    qc.contract_status,
    qc.start_date,
    CASE
      WHEN qc.end_date IS NOT NULL AND qc.end_date < qc.start_date THEN qc.start_date
      ELSE qc.end_date
    END,
    qc.auto_renewal,
    qc.renewal_frequency_months,
    qc.mrr_clp,
    qc.arr_clp,
    qc.tcv_clp,
    qc.acv_clp,
    qc.quotation_id,
    COALESCE(qc.currency, 'CLP'),
    qc.exchange_rate_to_clp,
    COALESCE(qc.approved_at, qc.converted_at, qc.sent_at)
  FROM quote_candidates qc
  WHERE NOT EXISTS (
    SELECT 1
    FROM greenhouse_commercial.contracts existing
    WHERE existing.originator_quote_id = qc.quotation_id
  )
  RETURNING contract_id, originator_quote_id, start_date
)
INSERT INTO greenhouse_commercial.contract_quotes (
  contract_id,
  quotation_id,
  relationship_type,
  effective_from
)
SELECT
  c.contract_id,
  c.originator_quote_id,
  'originator',
  c.start_date
FROM greenhouse_commercial.contracts c
WHERE c.originator_quote_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM greenhouse_commercial.contract_quotes cq
    WHERE cq.contract_id = c.contract_id
      AND cq.quotation_id = c.originator_quote_id
  );

UPDATE greenhouse_finance.purchase_orders po
SET contract_id = c.contract_id
FROM greenhouse_commercial.contracts c
WHERE po.quotation_id = c.originator_quote_id
  AND (po.contract_id IS NULL OR po.contract_id = c.contract_id);

UPDATE greenhouse_finance.service_entry_sheets hes
SET contract_id = c.contract_id
FROM greenhouse_commercial.contracts c
WHERE hes.quotation_id = c.originator_quote_id
  AND (hes.contract_id IS NULL OR hes.contract_id = c.contract_id);

UPDATE greenhouse_finance.income inc
SET contract_id = c.contract_id
FROM greenhouse_commercial.contracts c
WHERE inc.quotation_id = c.originator_quote_id
  AND (inc.contract_id IS NULL OR inc.contract_id = c.contract_id);

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_income_contract_id;
DROP INDEX IF EXISTS greenhouse_finance.idx_service_entry_sheets_contract_id;
DROP INDEX IF EXISTS greenhouse_finance.idx_purchase_orders_contract_id;
DROP INDEX IF EXISTS greenhouse_commercial.idx_contract_renewal_reminders_next_check;
DROP INDEX IF EXISTS greenhouse_serving.idx_contract_profitability_space_period;
DROP INDEX IF EXISTS greenhouse_commercial.idx_contract_quotes_quotation_id;
DROP INDEX IF EXISTS greenhouse_commercial.idx_contracts_end_date_open;
DROP INDEX IF EXISTS greenhouse_commercial.idx_contracts_status_active;
DROP INDEX IF EXISTS greenhouse_commercial.idx_contracts_originator_quote_id;
DROP INDEX IF EXISTS greenhouse_commercial.idx_contracts_space_id;
DROP INDEX IF EXISTS greenhouse_commercial.idx_contracts_client_id;

ALTER TABLE greenhouse_finance.income
  DROP COLUMN IF EXISTS contract_id;

ALTER TABLE greenhouse_finance.service_entry_sheets
  DROP COLUMN IF EXISTS contract_id;

ALTER TABLE greenhouse_finance.purchase_orders
  DROP COLUMN IF EXISTS contract_id;

DROP TABLE IF EXISTS greenhouse_commercial.contract_renewal_reminders;
DROP TABLE IF EXISTS greenhouse_serving.contract_profitability_snapshots;
DROP TABLE IF EXISTS greenhouse_commercial.contract_quotes;
DROP TABLE IF EXISTS greenhouse_commercial.contracts;
