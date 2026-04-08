-- Up Migration

-- Recreate expense_payments table (original migration used wrong markers)

CREATE TABLE IF NOT EXISTS greenhouse_finance.expense_payments (
  payment_id              TEXT PRIMARY KEY,
  expense_id              TEXT NOT NULL REFERENCES greenhouse_finance.expenses(expense_id) ON DELETE CASCADE,
  payment_date            DATE NOT NULL,
  amount                  NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency                TEXT NOT NULL DEFAULT 'CLP',
  reference               TEXT,
  payment_method          TEXT,
  payment_account_id      TEXT,
  payment_source          TEXT NOT NULL DEFAULT 'manual'
    CHECK (payment_source IN ('manual', 'payroll_system', 'nubox_sync', 'bank_statement')),
  notes                   TEXT,
  recorded_by_user_id     TEXT,
  recorded_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_reconciled           BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_row_id   TEXT,
  reconciled_at           TIMESTAMPTZ,
  reconciled_by_user_id   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_payments_expense_id ON greenhouse_finance.expense_payments(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_payments_payment_date ON greenhouse_finance.expense_payments(payment_date);

CREATE UNIQUE INDEX IF NOT EXISTS finance_expense_payments_dedup_ref_idx
  ON greenhouse_finance.expense_payments (expense_id, reference)
  WHERE reference IS NOT NULL;

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION greenhouse_finance.fn_sync_expense_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  target_expense_id TEXT;
  new_amount_paid NUMERIC(14,2);
  expense_total NUMERIC(14,2);
  new_status TEXT;
BEGIN
  target_expense_id := COALESCE(NEW.expense_id, OLD.expense_id);

  SELECT COALESCE(SUM(amount), 0) INTO new_amount_paid
  FROM greenhouse_finance.expense_payments
  WHERE expense_id = target_expense_id;

  SELECT total_amount INTO expense_total
  FROM greenhouse_finance.expenses
  WHERE expense_id = target_expense_id;

  IF new_amount_paid >= expense_total THEN
    new_status := 'paid';
  ELSIF new_amount_paid > 0 THEN
    new_status := 'partial';
  ELSE
    new_status := 'pending';
  END IF;

  UPDATE greenhouse_finance.expenses SET
    amount_paid = new_amount_paid,
    payment_status = new_status,
    updated_at = NOW()
  WHERE expense_id = target_expense_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_expense_amount_paid
  ON greenhouse_finance.expense_payments;

CREATE TRIGGER trg_sync_expense_amount_paid
  AFTER INSERT OR UPDATE OR DELETE ON greenhouse_finance.expense_payments
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.fn_sync_expense_amount_paid();

-- Backfill paid expenses
INSERT INTO greenhouse_finance.expense_payments (
  payment_id, expense_id, payment_date, amount, currency,
  reference, payment_method, payment_source, notes, created_at
)
SELECT
  'exp-pay-backfill-' || expense_id,
  expense_id,
  COALESCE(payment_date, document_date, created_at::date),
  total_amount,
  currency,
  payment_reference,
  payment_method,
  'manual',
  'Backfill from legacy payment fields',
  CURRENT_TIMESTAMP
FROM greenhouse_finance.expenses
WHERE payment_status = 'paid'
  AND total_amount > 0
ON CONFLICT DO NOTHING;

-- Sync amount_paid for backfilled records
UPDATE greenhouse_finance.expenses e
SET amount_paid = sub.total_paid
FROM (
  SELECT expense_id, COALESCE(SUM(amount), 0) AS total_paid
  FROM greenhouse_finance.expense_payments
  GROUP BY expense_id
) sub
WHERE e.expense_id = sub.expense_id
  AND e.amount_paid <> sub.total_paid;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.expense_payments TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.expense_payments TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.expense_payments TO greenhouse_app;
GRANT EXECUTE ON FUNCTION greenhouse_finance.fn_sync_expense_amount_paid() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_finance.fn_sync_expense_amount_paid() TO greenhouse_migrator;
GRANT EXECUTE ON FUNCTION greenhouse_finance.fn_sync_expense_amount_paid() TO greenhouse_app;

-- Semantic comments
COMMENT ON TABLE greenhouse_finance.expense_payments IS
  'Pagos individuales contra documentos de compra. Cada fila es un pago realizado.
   expenses.amount_paid es derivado de SUM(expense_payments.amount) via trigger.
   Fuentes: manual, payroll_system, nubox_sync, bank_statement.';

COMMENT ON COLUMN greenhouse_finance.expenses.amount_paid IS
  'Denormalized aggregate. Derived from SUM(expense_payments.amount) by trigger trg_sync_expense_amount_paid.';

-- Down Migration

DROP TRIGGER IF EXISTS trg_sync_expense_amount_paid ON greenhouse_finance.expense_payments;
DROP FUNCTION IF EXISTS greenhouse_finance.fn_sync_expense_amount_paid();
DROP TABLE IF EXISTS greenhouse_finance.expense_payments;
ALTER TABLE greenhouse_finance.expenses DROP COLUMN IF EXISTS amount_paid;
