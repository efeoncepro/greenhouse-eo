-- Up Migration
--
-- Loan Accounts Scaffold (TASK-702)
-- =================================
-- Mínimo necesario para anclar los pagos de cuotas de crédito que aparecen
-- en cartolas bancarias (ej. "Pago Cuota Crédito N° 420051383906" mensual).
-- Sin esta tabla, esos expense_payments quedan como kind=financial_cost
-- huérfanos y no se puede ver el saldo amortizado del crédito.
--
-- Esta migración crea la tabla con el shape mínimo. El cálculo de saldo
-- amortizado vivo (running outstanding) queda como follow-up: se calcula
-- desde SUM(expense_payments) anclados a loan_account_id en una task
-- derivada, no aquí. Esta scaffold es solo el contenedor de identidad +
-- los datos contractuales del crédito.

SET search_path = greenhouse_finance, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_finance.loan_accounts (
  loan_id              TEXT PRIMARY KEY,
  lender_name          TEXT NOT NULL,
  external_reference   TEXT,
  currency             TEXT NOT NULL DEFAULT 'CLP',
  original_amount      NUMERIC(14, 2),
  monthly_installment  NUMERIC(14, 2),
  installment_count    INTEGER,
  installments_paid    INTEGER NOT NULL DEFAULT 0,
  funding_account_id   TEXT REFERENCES greenhouse_finance.accounts(account_id) ON DELETE SET NULL,
  started_at           DATE,
  ends_at              DATE,
  status               TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paid_off', 'defaulted', 'cancelled')),
  notes                TEXT,
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loan_accounts_funding_account_id
  ON greenhouse_finance.loan_accounts (funding_account_id)
  WHERE funding_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loan_accounts_status
  ON greenhouse_finance.loan_accounts (status);

COMMENT ON TABLE greenhouse_finance.loan_accounts IS
  'Préstamos y créditos contraídos por la empresa. Cada cuota mensual visible en cartola se modela como expense kind=financial_cost con loan_account_id = este loan_id. Saldo amortizado vivo se computa desde SUM(expense_payments anclados).';

COMMENT ON COLUMN greenhouse_finance.loan_accounts.external_reference IS
  'Referencia del crédito en el banco emisor (ej. "420051383906" Santander).';

COMMENT ON COLUMN greenhouse_finance.loan_accounts.funding_account_id IS
  'La cuenta bancaria desde la cual se debitan las cuotas (ej. santander-clp).';

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.loan_accounts TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.loan_accounts TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.loan_accounts TO greenhouse_app;

-- Seed: el crédito Santander que aparece en cartola con cuota ~$102k mensual.
INSERT INTO greenhouse_finance.loan_accounts
  (loan_id, lender_name, external_reference, currency, monthly_installment, funding_account_id, status, notes)
VALUES
  ('loan-santander-420051383906', 'Santander', '420051383906', 'CLP', 102073, 'santander-clp', 'active',
   'Crédito Santander identificado en cartola CLP. Cuotas mensuales visibles 05/03 −$102.049 y 06/04 −$102.073. Original amount + installment_count pendientes de capturar desde contrato.')
ON CONFLICT (loan_id) DO NOTHING;

-- =========================================================================
-- expense.loan_account_id anchor (FK creada después de loan_accounts)
-- =========================================================================

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS loan_account_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_loan_account_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.expenses
      ADD CONSTRAINT expenses_loan_account_fk
      FOREIGN KEY (loan_account_id)
      REFERENCES greenhouse_finance.loan_accounts(loan_id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_expenses_loan_account_id
  ON greenhouse_finance.expenses (loan_account_id)
  WHERE loan_account_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.expenses.loan_account_id IS
  'Anchor canónico a greenhouse_finance.loan_accounts. Cuotas mensuales de crédito en cartola se anclan aquí para que cost_attribution recoja el costo financiero per crédito.';

-- Down Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_finance.idx_expenses_loan_account_id;

ALTER TABLE greenhouse_finance.expenses
  DROP CONSTRAINT IF EXISTS expenses_loan_account_fk,
  DROP COLUMN IF EXISTS loan_account_id;

DROP TABLE IF EXISTS greenhouse_finance.loan_accounts CASCADE;
