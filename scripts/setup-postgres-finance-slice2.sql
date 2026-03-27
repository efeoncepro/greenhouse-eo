-- ============================================================
-- Greenhouse Finance — Slice 2: Income, Payments, Factoring,
-- Expenses, Client Profiles, Reconciliation
-- ============================================================
-- Extends greenhouse_finance schema (Slice 1: accounts, suppliers, exchange_rates)
-- Follows 360 canonical model:
--   - client_id   → greenhouse_core.clients(client_id)
--   - member_id   → greenhouse_core.members(member_id)
--   - provider_id → greenhouse_core.providers(provider_id)
--   - user IDs    → greenhouse_core.client_users(user_id)
-- ============================================================

-- ------------------------------------------------------------
-- 1. client_profiles — billing/invoicing profile per client
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_finance.client_profiles (
  client_profile_id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id),
  hubspot_company_id TEXT,
  tax_id TEXT,
  tax_id_type TEXT,
  legal_name TEXT,
  billing_address TEXT,
  billing_country TEXT,
  payment_terms_days INTEGER DEFAULT 30,
  payment_currency TEXT DEFAULT 'CLP',
  requires_po BOOLEAN NOT NULL DEFAULT FALSE,
  requires_hes BOOLEAN NOT NULL DEFAULT FALSE,
  current_po_number TEXT,
  current_hes_number TEXT,
  finance_contacts JSONB,
  special_conditions TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS finance_client_profiles_client_idx
  ON greenhouse_finance.client_profiles (client_id);

CREATE INDEX IF NOT EXISTS finance_client_profiles_hubspot_idx
  ON greenhouse_finance.client_profiles (hubspot_company_id);

-- ------------------------------------------------------------
-- 2. income — invoices emitted to clients
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_finance.income (
  income_id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id),
  client_profile_id TEXT REFERENCES greenhouse_finance.client_profiles(client_profile_id),
  hubspot_company_id TEXT,
  hubspot_deal_id TEXT,
  client_name TEXT NOT NULL,
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  description TEXT,
  currency TEXT NOT NULL CHECK (currency IN ('CLP', 'USD')),
  subtotal NUMERIC(14, 2) NOT NULL,
  tax_rate NUMERIC(6, 4),
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL,
  exchange_rate_to_clp NUMERIC(14, 6),
  total_amount_clp NUMERIC(14, 2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'written_off')),
  amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
  collection_method TEXT DEFAULT 'direct'
    CHECK (collection_method IN ('direct', 'factored', 'mixed')),
  po_number TEXT,
  hes_number TEXT,
  service_line TEXT,
  income_type TEXT DEFAULT 'service_fee',
  is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_id TEXT,
  notes TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS finance_income_client_idx
  ON greenhouse_finance.income (client_id);

CREATE INDEX IF NOT EXISTS finance_income_status_idx
  ON greenhouse_finance.income (payment_status, invoice_date DESC);

CREATE INDEX IF NOT EXISTS finance_income_date_idx
  ON greenhouse_finance.income (invoice_date DESC);

-- ------------------------------------------------------------
-- 3. income_payments — individual collection records per invoice
--    Replaces the JSON payments_received array from BigQuery.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_finance.income_payments (
  payment_id TEXT PRIMARY KEY,
  income_id TEXT NOT NULL REFERENCES greenhouse_finance.income(income_id) ON DELETE CASCADE,
  payment_date DATE,
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT,
  reference TEXT,
  payment_method TEXT,
  payment_account_id TEXT REFERENCES greenhouse_finance.accounts(account_id),
  payment_source TEXT NOT NULL DEFAULT 'client_direct'
    CHECK (payment_source IN ('client_direct', 'factoring_proceeds')),
  notes TEXT,
  recorded_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_row_id TEXT,
  reconciled_at TIMESTAMPTZ,
  reconciled_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS finance_income_payments_income_idx
  ON greenhouse_finance.income_payments (income_id);

CREATE INDEX IF NOT EXISTS finance_income_payments_unreconciled_idx
  ON greenhouse_finance.income_payments (is_reconciled, payment_date DESC)
  WHERE is_reconciled = FALSE;

-- ------------------------------------------------------------
-- 4. factoring_operations — invoice factoring/assignment
--    Tracks when an invoice is sold to a factoring provider
--    for early collection at a discount.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_finance.factoring_operations (
  operation_id TEXT PRIMARY KEY,
  income_id TEXT NOT NULL REFERENCES greenhouse_finance.income(income_id) ON DELETE CASCADE,
  factoring_provider_id TEXT NOT NULL REFERENCES greenhouse_core.providers(provider_id),
  nominal_amount NUMERIC(14, 2) NOT NULL,
  advance_amount NUMERIC(14, 2) NOT NULL,
  fee_amount NUMERIC(14, 2) NOT NULL,
  fee_rate NUMERIC(6, 4) NOT NULL,
  operation_date DATE NOT NULL,
  settlement_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'settled', 'defaulted')),
  linked_expense_id TEXT,
  linked_payment_id TEXT,
  notes TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS finance_factoring_income_idx
  ON greenhouse_finance.factoring_operations (income_id);

CREATE INDEX IF NOT EXISTS finance_factoring_provider_idx
  ON greenhouse_finance.factoring_operations (factoring_provider_id);

CREATE INDEX IF NOT EXISTS finance_factoring_status_idx
  ON greenhouse_finance.factoring_operations (status, operation_date DESC);

-- ------------------------------------------------------------
-- 5. expenses — operational expenditures
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_finance.expenses (
  expense_id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id),
  expense_type TEXT NOT NULL,
  description TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('CLP', 'USD')),
  subtotal NUMERIC(14, 2) NOT NULL,
  tax_rate NUMERIC(6, 4),
  tax_amount NUMERIC(14, 2),
  total_amount NUMERIC(14, 2) NOT NULL,
  exchange_rate_to_clp NUMERIC(14, 6),
  total_amount_clp NUMERIC(14, 2) NOT NULL,
  payment_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'written_off')),
  payment_method TEXT,
  payment_account_id TEXT REFERENCES greenhouse_finance.accounts(account_id),
  payment_reference TEXT,
  document_number TEXT,
  document_date DATE,
  due_date DATE,
  supplier_id TEXT REFERENCES greenhouse_finance.suppliers(supplier_id),
  supplier_name TEXT,
  supplier_invoice_number TEXT,
  payroll_period_id TEXT,
  payroll_entry_id TEXT,
  member_id TEXT REFERENCES greenhouse_core.members(member_id),
  member_name TEXT,
  social_security_type TEXT,
  social_security_institution TEXT,
  social_security_period TEXT,
  tax_type TEXT,
  tax_period TEXT,
  tax_form_number TEXT,
  miscellaneous_category TEXT,
  service_line TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_frequency TEXT,
  is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_id TEXT,
  linked_income_id TEXT,
  direct_overhead_scope TEXT DEFAULT 'none'
    CHECK (direct_overhead_scope IN ('none', 'member_direct', 'shared')),
  direct_overhead_kind TEXT
    CHECK (direct_overhead_kind IN ('tool_license', 'tool_usage', 'equipment', 'reimbursement', 'other')),
  direct_overhead_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  notes TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS finance_expenses_client_idx
  ON greenhouse_finance.expenses (client_id);

CREATE INDEX IF NOT EXISTS finance_expenses_type_idx
  ON greenhouse_finance.expenses (expense_type, payment_date DESC);

CREATE INDEX IF NOT EXISTS finance_expenses_supplier_idx
  ON greenhouse_finance.expenses (supplier_id);

CREATE INDEX IF NOT EXISTS finance_expenses_member_idx
  ON greenhouse_finance.expenses (member_id);

CREATE INDEX IF NOT EXISTS finance_expenses_status_idx
  ON greenhouse_finance.expenses (payment_status, due_date DESC);

-- ------------------------------------------------------------
-- 6. reconciliation_periods — monthly bank reconciliation
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_finance.reconciliation_periods (
  period_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES greenhouse_finance.accounts(account_id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  opening_balance NUMERIC(14, 2) NOT NULL,
  closing_balance_bank NUMERIC(14, 2),
  closing_balance_system NUMERIC(14, 2),
  difference NUMERIC(14, 2),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'in_progress', 'reconciled', 'closed')),
  statement_imported BOOLEAN NOT NULL DEFAULT FALSE,
  statement_imported_at TIMESTAMPTZ,
  statement_row_count INTEGER,
  reconciled_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reconciliation_periods_unique UNIQUE (account_id, year, month)
);

CREATE INDEX IF NOT EXISTS finance_reconciliation_account_idx
  ON greenhouse_finance.reconciliation_periods (account_id, year DESC, month DESC);

-- ------------------------------------------------------------
-- 7. bank_statement_rows — imported bank statement lines
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_finance.bank_statement_rows (
  row_id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES greenhouse_finance.reconciliation_periods(period_id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT NOT NULL,
  reference TEXT,
  amount NUMERIC(14, 2) NOT NULL,
  balance NUMERIC(14, 2),
  match_status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (match_status IN ('unmatched', 'matched', 'excluded')),
  matched_type TEXT,
  matched_id TEXT,
  matched_payment_id TEXT,
  match_confidence NUMERIC(5, 2),
  notes TEXT,
  matched_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS finance_bank_rows_period_idx
  ON greenhouse_finance.bank_statement_rows (period_id, transaction_date);

CREATE INDEX IF NOT EXISTS finance_bank_rows_unmatched_idx
  ON greenhouse_finance.bank_statement_rows (match_status, transaction_date DESC)
  WHERE match_status = 'unmatched';

-- ============================================================
-- Serving View: income_360
-- ============================================================

CREATE OR REPLACE VIEW greenhouse_serving.income_360 AS
SELECT
  i.income_id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.currency,
  i.subtotal,
  i.tax_amount,
  i.total_amount,
  i.total_amount_clp,
  i.payment_status,
  i.amount_paid,
  i.collection_method,
  i.service_line,
  i.income_type,
  i.is_reconciled,
  c.client_id,
  c.client_name,
  c.hubspot_company_id AS client_hubspot_id,
  (SELECT COUNT(*) FROM greenhouse_finance.income_payments ip WHERE ip.income_id = i.income_id) AS payment_count,
  (SELECT COUNT(*) FROM greenhouse_finance.factoring_operations fo WHERE fo.income_id = i.income_id) AS factoring_count,
  fop.total_factoring_fee,
  fop.total_factoring_nominal,
  i.created_at,
  i.updated_at
FROM greenhouse_finance.income i
LEFT JOIN greenhouse_core.clients c ON c.client_id = i.client_id
LEFT JOIN LATERAL (
  SELECT
    SUM(fo2.fee_amount) AS total_factoring_fee,
    SUM(fo2.nominal_amount) AS total_factoring_nominal
  FROM greenhouse_finance.factoring_operations fo2
  WHERE fo2.income_id = i.income_id
) fop ON TRUE;

-- ============================================================
-- Grants for Slice 2 tables
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.client_profiles TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.income TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.income_payments TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.factoring_operations TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.expenses TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.reconciliation_periods TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.bank_statement_rows TO greenhouse_runtime;

GRANT ALL ON greenhouse_finance.client_profiles TO greenhouse_migrator;
GRANT ALL ON greenhouse_finance.income TO greenhouse_migrator;
GRANT ALL ON greenhouse_finance.income_payments TO greenhouse_migrator;
GRANT ALL ON greenhouse_finance.factoring_operations TO greenhouse_migrator;
GRANT ALL ON greenhouse_finance.expenses TO greenhouse_migrator;
GRANT ALL ON greenhouse_finance.reconciliation_periods TO greenhouse_migrator;
GRANT ALL ON greenhouse_finance.bank_statement_rows TO greenhouse_migrator;

GRANT SELECT ON greenhouse_serving.income_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.income_360 TO greenhouse_migrator;
