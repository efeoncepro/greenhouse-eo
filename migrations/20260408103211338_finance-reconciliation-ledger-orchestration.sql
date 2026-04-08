-- Up Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

-- ============================================================
-- 1. Instrument-aware reconciliation period snapshots
-- ============================================================

ALTER TABLE greenhouse_finance.reconciliation_periods
  ADD COLUMN IF NOT EXISTS instrument_category_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS provider_slug_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS provider_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS period_currency_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE greenhouse_finance.reconciliation_periods rp
SET
  instrument_category_snapshot = COALESCE(rp.instrument_category_snapshot, a.instrument_category),
  provider_slug_snapshot = COALESCE(rp.provider_slug_snapshot, a.provider_slug),
  provider_name_snapshot = COALESCE(rp.provider_name_snapshot, NULLIF(a.bank_name, '')),
  period_currency_snapshot = COALESCE(rp.period_currency_snapshot, a.currency)
FROM greenhouse_finance.accounts a
WHERE a.account_id = rp.account_id;

-- ============================================================
-- 2. Idempotent statement import metadata
-- ============================================================

ALTER TABLE greenhouse_finance.bank_statement_rows
  ADD COLUMN IF NOT EXISTS source_import_batch_id TEXT,
  ADD COLUMN IF NOT EXISTS source_import_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS source_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS matched_settlement_leg_id TEXT;

ALTER TABLE greenhouse_finance.bank_statement_rows
  DROP CONSTRAINT IF EXISTS bank_statement_rows_match_status_check;

ALTER TABLE greenhouse_finance.bank_statement_rows
  ADD CONSTRAINT bank_statement_rows_match_status_check
  CHECK (
    match_status IN (
      'unmatched',
      'suggested',
      'matched',
      'manual_matched',
      'auto_matched',
      'excluded'
    )
  );

UPDATE greenhouse_finance.bank_statement_rows
SET source_import_fingerprint = md5(
  concat_ws(
    '||',
    period_id,
    COALESCE(transaction_date::text, ''),
    COALESCE(value_date::text, ''),
    COALESCE(description, ''),
    COALESCE(reference, ''),
    COALESCE(amount::text, ''),
    COALESCE(balance::text, '')
  )
)
WHERE source_import_fingerprint IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_statement_rows_period_fingerprint
  ON greenhouse_finance.bank_statement_rows (period_id, source_import_fingerprint)
  WHERE source_import_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_statement_rows_period_match_status
  ON greenhouse_finance.bank_statement_rows (period_id, match_status);

-- ============================================================
-- 3. Settlement orchestration foundation
-- ============================================================

CREATE TABLE IF NOT EXISTS greenhouse_finance.settlement_groups (
  settlement_group_id TEXT PRIMARY KEY,
  group_direction TEXT NOT NULL
    CHECK (group_direction IN ('incoming', 'outgoing', 'internal')),
  settlement_mode TEXT NOT NULL DEFAULT 'direct'
    CHECK (settlement_mode IN ('direct', 'internal_transfer', 'funding', 'fx_conversion', 'mixed')),
  source_payment_type TEXT
    CHECK (source_payment_type IS NULL OR source_payment_type IN ('income_payment', 'expense_payment')),
  source_payment_id TEXT,
  primary_instrument_id TEXT REFERENCES greenhouse_finance.accounts(account_id),
  provider_reference TEXT,
  provider_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (provider_status IN ('pending', 'in_progress', 'settled', 'reconciled', 'cancelled')),
  notes TEXT,
  created_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settlement_groups_source_payment
  ON greenhouse_finance.settlement_groups (source_payment_type, source_payment_id)
  WHERE source_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_settlement_groups_primary_instrument_id
  ON greenhouse_finance.settlement_groups (primary_instrument_id)
  WHERE primary_instrument_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS greenhouse_finance.settlement_legs (
  settlement_leg_id TEXT PRIMARY KEY,
  settlement_group_id TEXT NOT NULL REFERENCES greenhouse_finance.settlement_groups(settlement_group_id) ON DELETE CASCADE,
  linked_payment_type TEXT
    CHECK (linked_payment_type IS NULL OR linked_payment_type IN ('income_payment', 'expense_payment')),
  linked_payment_id TEXT,
  leg_type TEXT NOT NULL
    CHECK (leg_type IN ('receipt', 'payout', 'internal_transfer', 'funding', 'fx_conversion', 'fee')),
  direction TEXT NOT NULL
    CHECK (direction IN ('incoming', 'outgoing')),
  instrument_id TEXT REFERENCES greenhouse_finance.accounts(account_id),
  counterparty_instrument_id TEXT REFERENCES greenhouse_finance.accounts(account_id),
  currency TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  amount_clp NUMERIC(14, 2),
  fx_rate NUMERIC(14, 6),
  provider_reference TEXT,
  provider_status TEXT NOT NULL DEFAULT 'pending',
  transaction_date DATE,
  is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_row_id TEXT REFERENCES greenhouse_finance.bank_statement_rows(row_id) ON DELETE SET NULL,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settlement_legs_group
  ON greenhouse_finance.settlement_legs (settlement_group_id);

CREATE INDEX IF NOT EXISTS idx_settlement_legs_linked_payment
  ON greenhouse_finance.settlement_legs (linked_payment_type, linked_payment_id)
  WHERE linked_payment_type IS NOT NULL AND linked_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_settlement_legs_instrument_date
  ON greenhouse_finance.settlement_legs (instrument_id, transaction_date DESC);

ALTER TABLE greenhouse_finance.bank_statement_rows
  ADD CONSTRAINT bank_statement_rows_matched_settlement_leg_fkey
  FOREIGN KEY (matched_settlement_leg_id)
  REFERENCES greenhouse_finance.settlement_legs(settlement_leg_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.income_payments
  ADD COLUMN IF NOT EXISTS settlement_group_id TEXT REFERENCES greenhouse_finance.settlement_groups(settlement_group_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.expense_payments
  ADD COLUMN IF NOT EXISTS settlement_group_id TEXT REFERENCES greenhouse_finance.settlement_groups(settlement_group_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.income_payments
  ADD CONSTRAINT income_payments_reconciliation_row_id_fkey
  FOREIGN KEY (reconciliation_row_id)
  REFERENCES greenhouse_finance.bank_statement_rows(row_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.expense_payments
  ADD CONSTRAINT expense_payments_reconciliation_row_id_fkey
  FOREIGN KEY (reconciliation_row_id)
  REFERENCES greenhouse_finance.bank_statement_rows(row_id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_income_payments_settlement_group_id
  ON greenhouse_finance.income_payments (settlement_group_id)
  WHERE settlement_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expense_payments_settlement_group_id
  ON greenhouse_finance.expense_payments (settlement_group_id)
  WHERE settlement_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expense_payments_unreconciled
  ON greenhouse_finance.expense_payments (is_reconciled, payment_date DESC)
  WHERE is_reconciled = FALSE;

-- ============================================================
-- 4. Grants
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.settlement_groups TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.settlement_groups TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.settlement_groups TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.settlement_legs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.settlement_legs TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.settlement_legs TO greenhouse_app;

-- ============================================================
-- 5. Comments
-- ============================================================

COMMENT ON COLUMN greenhouse_finance.reconciliation_periods.instrument_category_snapshot IS
  'Snapshot del tipo de instrumento al crear el período de conciliación.';
COMMENT ON COLUMN greenhouse_finance.reconciliation_periods.provider_slug_snapshot IS
  'Snapshot del provider canónico del instrumento al crear el período de conciliación.';
COMMENT ON COLUMN greenhouse_finance.bank_statement_rows.source_import_fingerprint IS
  'Fingerprint determinístico del extracto para imports idempotentes y retries seguros.';
COMMENT ON TABLE greenhouse_finance.settlement_groups IS
  'Agrupa la ejecución operativa de una liquidación. Permite unir pagos directos y cadenas multi-leg como Santander -> Global66 -> payout.';
COMMENT ON TABLE greenhouse_finance.settlement_legs IS
  'Unidad conciliable operacional. Cada leg representa receipt/payout/internal_transfer/funding/fx_conversion/fee.';

-- Down Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_finance.idx_expense_payments_settlement_group_id;
DROP INDEX IF EXISTS greenhouse_finance.idx_income_payments_settlement_group_id;
DROP INDEX IF EXISTS greenhouse_finance.idx_expense_payments_unreconciled;

ALTER TABLE greenhouse_finance.expense_payments
  DROP CONSTRAINT IF EXISTS expense_payments_reconciliation_row_id_fkey;

ALTER TABLE greenhouse_finance.income_payments
  DROP CONSTRAINT IF EXISTS income_payments_reconciliation_row_id_fkey;

ALTER TABLE greenhouse_finance.expense_payments
  DROP COLUMN IF EXISTS settlement_group_id;

ALTER TABLE greenhouse_finance.income_payments
  DROP COLUMN IF EXISTS settlement_group_id;

DROP TABLE IF EXISTS greenhouse_finance.settlement_legs;
DROP TABLE IF EXISTS greenhouse_finance.settlement_groups;

DROP INDEX IF EXISTS greenhouse_finance.idx_bank_statement_rows_period_match_status;
DROP INDEX IF EXISTS greenhouse_finance.uq_bank_statement_rows_period_fingerprint;
DROP TABLE IF EXISTS greenhouse_finance.reconciliation_statement_imports;

ALTER TABLE greenhouse_finance.bank_statement_rows
  DROP CONSTRAINT IF EXISTS bank_statement_rows_matched_settlement_leg_fkey;

ALTER TABLE greenhouse_finance.bank_statement_rows
  DROP COLUMN IF EXISTS source_import_batch_id,
  DROP COLUMN IF EXISTS source_import_fingerprint,
  DROP COLUMN IF EXISTS source_imported_at,
  DROP COLUMN IF EXISTS source_payload_json,
  DROP COLUMN IF EXISTS matched_settlement_leg_id;

ALTER TABLE greenhouse_finance.bank_statement_rows
  DROP CONSTRAINT IF EXISTS bank_statement_rows_match_status_check;

ALTER TABLE greenhouse_finance.bank_statement_rows
  ADD CONSTRAINT bank_statement_rows_match_status_check
  CHECK (match_status IN ('unmatched', 'matched', 'excluded'));

ALTER TABLE greenhouse_finance.reconciliation_periods
  DROP COLUMN IF EXISTS instrument_category_snapshot,
  DROP COLUMN IF EXISTS provider_slug_snapshot,
  DROP COLUMN IF EXISTS provider_name_snapshot,
  DROP COLUMN IF EXISTS period_currency_snapshot,
  DROP COLUMN IF EXISTS metadata_json;
