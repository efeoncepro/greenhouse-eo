-- Up Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

-- ============================================================
-- 1. Daily treasury balance snapshots by payment instrument
-- ============================================================

CREATE TABLE IF NOT EXISTS greenhouse_finance.account_balances (
  balance_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES greenhouse_finance.accounts(account_id) ON DELETE CASCADE,
  balance_date DATE NOT NULL,
  currency TEXT NOT NULL,
  opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  period_inflows NUMERIC(14, 2) NOT NULL DEFAULT 0,
  period_outflows NUMERIC(14, 2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  closing_balance_clp NUMERIC(14, 2),
  fx_rate_used NUMERIC(14, 6),
  fx_gain_loss_clp NUMERIC(14, 2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_period_closed BOOLEAN NOT NULL DEFAULT FALSE,
  closed_by_user_id TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id, balance_date)
);

CREATE INDEX IF NOT EXISTS idx_account_balances_account_date
  ON greenhouse_finance.account_balances (account_id, balance_date DESC);

CREATE INDEX IF NOT EXISTS idx_account_balances_date
  ON greenhouse_finance.account_balances (balance_date DESC);

CREATE INDEX IF NOT EXISTS idx_account_balances_open_period
  ON greenhouse_finance.account_balances (account_id, is_period_closed, balance_date DESC);

-- ============================================================
-- 2. Grants
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.account_balances TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.account_balances TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.account_balances TO greenhouse_app;

-- ============================================================
-- 3. Comments
-- ============================================================

COMMENT ON TABLE greenhouse_finance.account_balances IS
  'Daily auditable treasury balance snapshots by payment instrument. Source of truth for /finance/bank and account-level treasury reporting.';
COMMENT ON COLUMN greenhouse_finance.account_balances.closing_balance_clp IS
  'Closing balance converted to CLP using fx_rate_used at materialization time.';
COMMENT ON COLUMN greenhouse_finance.account_balances.is_period_closed IS
  'Soft immutable period-close flag. Closed snapshots are preserved for audit and not overwritten by reactive recompute.';

-- Down Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_finance.idx_account_balances_open_period;
DROP INDEX IF EXISTS greenhouse_finance.idx_account_balances_date;
DROP INDEX IF EXISTS greenhouse_finance.idx_account_balances_account_date;

DROP TABLE IF EXISTS greenhouse_finance.account_balances;
