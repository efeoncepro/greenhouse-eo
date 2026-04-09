-- Up Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

ALTER TABLE greenhouse_finance.accounts
  DROP CONSTRAINT IF EXISTS accounts_instrument_category_check;

ALTER TABLE greenhouse_finance.accounts
  ADD CONSTRAINT accounts_instrument_category_check
  CHECK (instrument_category IN (
    'bank_account',
    'credit_card',
    'fintech',
    'payment_platform',
    'cash',
    'payroll_processor',
    'shareholder_account'
  ));

CREATE TABLE IF NOT EXISTS greenhouse_finance.shareholder_accounts (
  account_id TEXT PRIMARY KEY
    REFERENCES greenhouse_finance.accounts(account_id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL
    REFERENCES greenhouse_core.identity_profiles(profile_id),
  member_id TEXT
    REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  space_id TEXT
    REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  ownership_percentage NUMERIC(5, 2),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'frozen', 'closed')),
  notes TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shareholder_accounts_profile
  ON greenhouse_finance.shareholder_accounts (profile_id);

CREATE INDEX IF NOT EXISTS idx_shareholder_accounts_member
  ON greenhouse_finance.shareholder_accounts (member_id)
  WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shareholder_accounts_space
  ON greenhouse_finance.shareholder_accounts (space_id)
  WHERE space_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS greenhouse_finance.shareholder_account_movements (
  movement_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL
    REFERENCES greenhouse_finance.shareholder_accounts(account_id) ON DELETE CASCADE,
  direction TEXT NOT NULL
    CHECK (direction IN ('credit', 'debit')),
  movement_type TEXT NOT NULL
    CHECK (movement_type IN (
      'expense_paid_by_shareholder',
      'personal_withdrawal',
      'reimbursement',
      'return_to_company',
      'salary_advance',
      'capital_contribution',
      'other'
    )),
  amount NUMERIC(14, 2) NOT NULL
    CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'CLP'
    CHECK (currency IN ('CLP', 'USD')),
  exchange_rate NUMERIC(14, 6),
  amount_clp NUMERIC(14, 2) NOT NULL,
  linked_expense_id TEXT
    REFERENCES greenhouse_finance.expenses(expense_id) ON DELETE SET NULL,
  linked_income_id TEXT
    REFERENCES greenhouse_finance.income(income_id) ON DELETE SET NULL,
  linked_payment_type TEXT
    CHECK (linked_payment_type IS NULL OR linked_payment_type IN ('income_payment', 'expense_payment')),
  linked_payment_id TEXT,
  settlement_group_id TEXT
    REFERENCES greenhouse_finance.settlement_groups(settlement_group_id) ON DELETE SET NULL,
  counterparty_account_id TEXT
    REFERENCES greenhouse_finance.accounts(account_id) ON DELETE SET NULL,
  description TEXT,
  evidence_url TEXT,
  movement_date DATE NOT NULL,
  running_balance_clp NUMERIC(14, 2),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  space_id TEXT
    REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  recorded_by_user_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shareholder_account_movements_account_date
  ON greenhouse_finance.shareholder_account_movements (account_id, movement_date DESC, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_shareholder_account_movements_type
  ON greenhouse_finance.shareholder_account_movements (movement_type);

CREATE INDEX IF NOT EXISTS idx_shareholder_account_movements_expense
  ON greenhouse_finance.shareholder_account_movements (linked_expense_id)
  WHERE linked_expense_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shareholder_account_movements_income
  ON greenhouse_finance.shareholder_account_movements (linked_income_id)
  WHERE linked_income_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shareholder_account_movements_payment
  ON greenhouse_finance.shareholder_account_movements (linked_payment_type, linked_payment_id)
  WHERE linked_payment_type IS NOT NULL AND linked_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shareholder_account_movements_settlement
  ON greenhouse_finance.shareholder_account_movements (settlement_group_id)
  WHERE settlement_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shareholder_account_movements_space
  ON greenhouse_finance.shareholder_account_movements (space_id, movement_date DESC)
  WHERE space_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.shareholder_accounts TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.shareholder_accounts TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.shareholder_accounts TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.shareholder_account_movements TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.shareholder_account_movements TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.shareholder_account_movements TO greenhouse_app;

COMMENT ON TABLE greenhouse_finance.shareholder_accounts IS
  'Shareholder current account extension anchored 1:1 to greenhouse_finance.accounts.';

COMMENT ON TABLE greenhouse_finance.shareholder_account_movements IS
  'Append-only ledger of shareholder current account movements with optional document, payment, and settlement links.';

COMMENT ON COLUMN greenhouse_finance.accounts.instrument_category IS
  'Payment instrument type: bank_account, credit_card, fintech, payment_platform, cash, payroll_processor, shareholder_account';

-- Down Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_account_movements_space;
DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_account_movements_settlement;
DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_account_movements_payment;
DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_account_movements_income;
DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_account_movements_expense;
DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_account_movements_type;
DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_account_movements_account_date;

DROP TABLE IF EXISTS greenhouse_finance.shareholder_account_movements;

DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_accounts_space;
DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_accounts_member;
DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_accounts_profile;

DROP TABLE IF EXISTS greenhouse_finance.shareholder_accounts;

ALTER TABLE greenhouse_finance.accounts
  DROP CONSTRAINT IF EXISTS accounts_instrument_category_check;

ALTER TABLE greenhouse_finance.accounts
  ADD CONSTRAINT accounts_instrument_category_check
  CHECK (instrument_category IN (
    'bank_account',
    'credit_card',
    'fintech',
    'payment_platform',
    'cash',
    'payroll_processor'
  ));
