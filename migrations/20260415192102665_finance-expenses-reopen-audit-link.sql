-- Up Migration
--
-- TASK-411 — Payroll Reliquidación Finance Delta Consumer.
-- Adds a nullable link from finance expenses to the payroll period reopen
-- audit row that triggered the delta. Populated by the reactive consumer
-- when a payroll_entry.reliquidated event produces a new delta expense; NULL
-- for every pre-TASK-411 row and for non-reliquidación finance expenses.

SET search_path = greenhouse_finance, public;

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS reopen_audit_id TEXT;

ALTER TABLE greenhouse_finance.expenses
  DROP CONSTRAINT IF EXISTS expenses_reopen_audit_fkey;

ALTER TABLE greenhouse_finance.expenses
  ADD CONSTRAINT expenses_reopen_audit_fkey
  FOREIGN KEY (reopen_audit_id)
  REFERENCES greenhouse_payroll.payroll_period_reopen_audit(audit_id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS expenses_reopen_audit_idx
  ON greenhouse_finance.expenses (reopen_audit_id)
  WHERE reopen_audit_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.expenses.reopen_audit_id IS
  'FK to greenhouse_payroll.payroll_period_reopen_audit for expense rows that represent a reliquidación delta (TASK-411). NULL for every other expense.';

-- Down Migration

SET search_path = greenhouse_finance, public;

DROP INDEX IF EXISTS greenhouse_finance.expenses_reopen_audit_idx;

ALTER TABLE greenhouse_finance.expenses
  DROP CONSTRAINT IF EXISTS expenses_reopen_audit_fkey;

ALTER TABLE greenhouse_finance.expenses
  DROP COLUMN IF EXISTS reopen_audit_id;
