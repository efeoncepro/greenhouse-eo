-- Up Migration
--
-- TASK-977 Slice 3 — Widen expense_payments.payment_source to include 'contractor_system'.
--
-- Additive: the contractor settlement records its expense_payment with a distinct source so
-- contractor payouts are queryable/distinguishable from payroll ('payroll_system') and never
-- conflated with it. CHECK widening only — no data change.

ALTER TABLE greenhouse_finance.expense_payments
  DROP CONSTRAINT IF EXISTS expense_payments_payment_source_check;

ALTER TABLE greenhouse_finance.expense_payments
  ADD CONSTRAINT expense_payments_payment_source_check
  CHECK (payment_source IN ('manual', 'payroll_system', 'nubox_sync', 'bank_statement', 'contractor_system'));

-- Anti pre-up-marker guard: abort if the new value is not accepted by the constraint.
DO $$
DECLARE allows_contractor boolean;
BEGIN
  SELECT pg_get_constraintdef(oid) LIKE '%contractor_system%'
    INTO allows_contractor
  FROM pg_constraint
  WHERE conname = 'expense_payments_payment_source_check'
    AND conrelid = 'greenhouse_finance.expense_payments'::regclass;

  IF NOT COALESCE(allows_contractor, FALSE) THEN
    RAISE EXCEPTION 'TASK-977 anti pre-up-marker: payment_source CHECK did not widen to contractor_system';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_finance.expense_payments
  DROP CONSTRAINT IF EXISTS expense_payments_payment_source_check;

ALTER TABLE greenhouse_finance.expense_payments
  ADD CONSTRAINT expense_payments_payment_source_check
  CHECK (payment_source IN ('manual', 'payroll_system', 'nubox_sync', 'bank_statement'));