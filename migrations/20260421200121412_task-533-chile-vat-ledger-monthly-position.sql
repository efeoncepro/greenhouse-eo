-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_finance.vat_ledger_entries (
  ledger_entry_id text PRIMARY KEY,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_id text NOT NULL,
  space_id text NOT NULL REFERENCES greenhouse_core.spaces(space_id),
  organization_id text NULL REFERENCES greenhouse_core.organizations(organization_id),
  client_id text NULL REFERENCES greenhouse_core.clients(client_id),
  source_kind text NOT NULL,
  source_id text NOT NULL,
  source_public_ref text NULL,
  source_date date NOT NULL,
  currency text NOT NULL,
  exchange_rate_to_clp numeric NULL,
  tax_code text NOT NULL,
  tax_snapshot_json jsonb NOT NULL,
  tax_recoverability text NULL,
  vat_bucket text NOT NULL,
  taxable_amount numeric NOT NULL DEFAULT 0,
  amount_document numeric NOT NULL DEFAULT 0,
  amount_clp numeric NOT NULL DEFAULT 0,
  space_resolution_source text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vat_ledger_entries_period_month_check CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT vat_ledger_entries_source_kind_check CHECK (source_kind IN ('income', 'expense')),
  CONSTRAINT vat_ledger_entries_vat_bucket_check CHECK (
    vat_bucket IN ('debit_fiscal', 'credito_fiscal', 'iva_no_recuperable')
  ),
  CONSTRAINT vat_ledger_entries_positive_amounts_check CHECK (
    taxable_amount >= 0 AND amount_document >= 0 AND amount_clp >= 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS vat_ledger_entries_source_bucket_uniq
  ON greenhouse_finance.vat_ledger_entries (source_kind, source_id, vat_bucket);

CREATE INDEX IF NOT EXISTS vat_ledger_entries_space_period_idx
  ON greenhouse_finance.vat_ledger_entries (space_id, period_year DESC, period_month DESC);

CREATE INDEX IF NOT EXISTS vat_ledger_entries_period_idx
  ON greenhouse_finance.vat_ledger_entries (period_year DESC, period_month DESC, vat_bucket);

CREATE TABLE IF NOT EXISTS greenhouse_finance.vat_monthly_positions (
  vat_position_id text PRIMARY KEY,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_id text NOT NULL,
  space_id text NOT NULL REFERENCES greenhouse_core.spaces(space_id),
  organization_id text NULL REFERENCES greenhouse_core.organizations(organization_id),
  client_id text NULL REFERENCES greenhouse_core.clients(client_id),
  debit_fiscal_amount_clp numeric NOT NULL DEFAULT 0,
  credit_fiscal_amount_clp numeric NOT NULL DEFAULT 0,
  non_recoverable_vat_amount_clp numeric NOT NULL DEFAULT 0,
  net_vat_position_clp numeric NOT NULL DEFAULT 0,
  debit_document_count integer NOT NULL DEFAULT 0,
  credit_document_count integer NOT NULL DEFAULT 0,
  non_recoverable_document_count integer NOT NULL DEFAULT 0,
  ledger_entry_count integer NOT NULL DEFAULT 0,
  materialized_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  materialization_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT vat_monthly_positions_period_month_check CHECK (period_month BETWEEN 1 AND 12)
);

CREATE UNIQUE INDEX IF NOT EXISTS vat_monthly_positions_space_period_uniq
  ON greenhouse_finance.vat_monthly_positions (space_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS vat_monthly_positions_period_idx
  ON greenhouse_finance.vat_monthly_positions (period_year DESC, period_month DESC);

COMMENT ON TABLE greenhouse_finance.vat_ledger_entries IS
  'Canonical Chile VAT ledger at document x fiscal-bucket grain. Output rows come from income, input rows come from expenses with recoverability already frozen.';

COMMENT ON TABLE greenhouse_finance.vat_monthly_positions IS
  'Monthly VAT position by tenant space, materialized from vat_ledger_entries for Finance serving and replay.';

COMMENT ON COLUMN greenhouse_finance.vat_ledger_entries.vat_bucket IS
  'Fiscal bucket for the entry: debit_fiscal, credito_fiscal, or iva_no_recuperable.';

COMMENT ON COLUMN greenhouse_finance.vat_ledger_entries.space_resolution_source IS
  'How tenant isolation was resolved for the source row: quotation, client_bridge, or expense.';

COMMENT ON COLUMN greenhouse_finance.vat_monthly_positions.net_vat_position_clp IS
  'Monthly VAT payable position in CLP: debit_fiscal_amount_clp - credit_fiscal_amount_clp.';

-- Down Migration

DROP TABLE IF EXISTS greenhouse_finance.vat_monthly_positions;
DROP TABLE IF EXISTS greenhouse_finance.vat_ledger_entries;
