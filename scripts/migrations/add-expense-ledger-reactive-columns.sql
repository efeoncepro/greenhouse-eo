-- Migration: add tenant scope + reactive origin/payment rail columns to greenhouse_finance.expenses
-- Part of TASK-182 / TASK-183

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS space_id TEXT REFERENCES greenhouse_core.spaces(space_id);

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS source_type TEXT;

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS payment_provider TEXT;

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS payment_rail TEXT;

CREATE INDEX IF NOT EXISTS finance_expenses_space_idx
  ON greenhouse_finance.expenses (space_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS finance_expenses_source_type_idx
  ON greenhouse_finance.expenses (source_type, payment_date DESC);

CREATE INDEX IF NOT EXISTS finance_expenses_payroll_period_idx
  ON greenhouse_finance.expenses (payroll_period_id, expense_type, source_type);

COMMENT ON COLUMN greenhouse_finance.expenses.space_id
  IS 'Canonical tenant scope for the expense; resolves to greenhouse_core.spaces.';

COMMENT ON COLUMN greenhouse_finance.expenses.source_type
  IS 'manual | payroll_generated | bank_statement_detected | reconciliation_suggested | gateway_sync | system_adjustment';

COMMENT ON COLUMN greenhouse_finance.expenses.payment_provider
  IS 'Named payment provider or operator when payment_method is insufficient (bank, stripe, webpay, previred, etc.).';

COMMENT ON COLUMN greenhouse_finance.expenses.payment_rail
  IS 'Operational rail for the payment (bank_transfer, card, gateway, payroll_file, previred, etc.).';
