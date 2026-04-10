-- Up Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

ALTER TABLE greenhouse_finance.shareholder_account_movements
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT;

UPDATE greenhouse_finance.shareholder_account_movements
SET
  source_type = CASE
    WHEN linked_payment_type = 'income_payment' AND linked_payment_id IS NOT NULL THEN 'income_payment'
    WHEN linked_payment_type = 'expense_payment' AND linked_payment_id IS NOT NULL THEN 'expense_payment'
    WHEN linked_expense_id IS NOT NULL THEN 'expense'
    WHEN linked_income_id IS NOT NULL THEN 'income'
    WHEN settlement_group_id IS NOT NULL THEN 'settlement_group'
    ELSE 'manual'
  END,
  source_id = CASE
    WHEN linked_payment_type IN ('income_payment', 'expense_payment') AND linked_payment_id IS NOT NULL THEN linked_payment_id
    WHEN linked_expense_id IS NOT NULL THEN linked_expense_id
    WHEN linked_income_id IS NOT NULL THEN linked_income_id
    WHEN settlement_group_id IS NOT NULL THEN settlement_group_id
    ELSE NULL
  END
WHERE source_type IS NULL;

ALTER TABLE greenhouse_finance.shareholder_account_movements
  ALTER COLUMN source_type SET DEFAULT 'manual';

UPDATE greenhouse_finance.shareholder_account_movements
SET source_type = 'manual'
WHERE source_type IS NULL;

ALTER TABLE greenhouse_finance.shareholder_account_movements
  ALTER COLUMN source_type SET NOT NULL;

ALTER TABLE greenhouse_finance.shareholder_account_movements
  DROP CONSTRAINT IF EXISTS chk_shareholder_account_movements_source_contract;

ALTER TABLE greenhouse_finance.shareholder_account_movements
  ADD CONSTRAINT chk_shareholder_account_movements_source_contract
  CHECK (
    source_type IN (
      'manual',
      'expense',
      'income',
      'expense_payment',
      'income_payment',
      'settlement_group'
    )
    AND (
      (source_type = 'manual' AND source_id IS NULL)
      OR (source_type <> 'manual' AND source_id IS NOT NULL)
    )
  );

CREATE INDEX IF NOT EXISTS idx_shareholder_account_movements_source
  ON greenhouse_finance.shareholder_account_movements (source_type, source_id)
  WHERE source_id IS NOT NULL;

-- Down Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_finance.idx_shareholder_account_movements_source;

ALTER TABLE greenhouse_finance.shareholder_account_movements
  DROP CONSTRAINT IF EXISTS chk_shareholder_account_movements_source_contract;

ALTER TABLE greenhouse_finance.shareholder_account_movements
  DROP COLUMN IF EXISTS source_id,
  DROP COLUMN IF EXISTS source_type;
