-- Up Migration
--
-- Account Kind (asset|liability) + Opening Trial Balance (TASK-703).
-- =====================================================================
--
-- Cierra dos huecos arquitectónicos de TASK-702:
--
--   1. accounts.account_kind (GENERATED): distingue asset (banco, fintech,
--      cash, payroll_processor) de liability (credit_card,
--      shareholder_account). El motor `materializeAccountBalance` invierte
--      la convención de signo para liabilities.
--
--   2. account_opening_trial_balance: declaración explícita, supersedible y
--      audit-trail-preservada del estado de cada cuenta a una fecha genesis.
--      Reemplaza el setteo implícito de `accounts.opening_balance` por una
--      contraparte canónica de "trial balance" como hace cualquier sistema
--      contable serio (NetSuite, QuickBooks, Xero) al migrar legacy state.
--
-- Reglas duras:
--   - account_kind es GENERATED ALWAYS — no se setea manualmente; deriva de
--     instrument_category. Cuando se agregue una nueva category, basta con
--     declararla aquí en el CASE.
--   - OTBs nunca se eliminan ni se UPDATEan; cuando se revisa una OTB con
--     nueva data, se INSERTa otra fila apuntando con `superseded_by` a la
--     anterior. Mismo patrón que `superseded_by_payment_id` en payments.
--   - Cada cuenta liability DEBE tener una OTB activa. La regla se enforce
--     en runtime via `getFinanceLedgerHealth` (TASK-702) que reporta drift
--     si una liability está sin OTB.

SET search_path = greenhouse_finance, greenhouse_core, public;

-- =========================================================================
-- 1. accounts.account_kind (asset | liability)
-- =========================================================================

ALTER TABLE greenhouse_finance.accounts
  ADD COLUMN IF NOT EXISTS account_kind TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN instrument_category IN ('credit_card', 'shareholder_account')
        THEN 'liability'
      ELSE 'asset'
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_accounts_kind
  ON greenhouse_finance.accounts (account_kind);

COMMENT ON COLUMN greenhouse_finance.accounts.account_kind IS
  'Generated. ''asset'' = saldo positivo significa dinero a favor de la empresa (bancos, fintechs, cash, payroll processors transit). ''liability'' = saldo positivo significa deuda actual de la empresa (credit_card, shareholder_account, future loans/wallets). El motor materializeAccountBalance invierte la convención de signo para liabilities.';

-- =========================================================================
-- 2. Tabla account_opening_trial_balance
-- =========================================================================

CREATE TABLE IF NOT EXISTS greenhouse_finance.account_opening_trial_balance (
  obtb_id              TEXT PRIMARY KEY,
  account_id           TEXT NOT NULL REFERENCES greenhouse_finance.accounts(account_id) ON DELETE CASCADE,
  genesis_date         DATE NOT NULL,
  opening_balance      NUMERIC(14, 2) NOT NULL,
  opening_balance_clp  NUMERIC(14, 2) NOT NULL,
  declared_by_user_id  TEXT,
  declared_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  declaration_reason   TEXT NOT NULL,
  audit_status         TEXT NOT NULL DEFAULT 'estimated'
    CHECK (audit_status IN ('estimated', 'reconciled', 'audited')),
  evidence_refs        JSONB NOT NULL DEFAULT '[]'::jsonb,
  superseded_by        TEXT REFERENCES greenhouse_finance.account_opening_trial_balance(obtb_id) ON DELETE SET NULL,
  superseded_at        TIMESTAMPTZ,
  superseded_reason    TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otb_active
  ON greenhouse_finance.account_opening_trial_balance (account_id, genesis_date DESC)
  WHERE superseded_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_otb_account_id
  ON greenhouse_finance.account_opening_trial_balance (account_id);

CREATE INDEX IF NOT EXISTS idx_otb_superseded_by
  ON greenhouse_finance.account_opening_trial_balance (superseded_by)
  WHERE superseded_by IS NOT NULL;

COMMENT ON TABLE greenhouse_finance.account_opening_trial_balance IS
  'Opening Trial Balance (OTB) per account. Declaración explícita, supersedible y audit-preservada del estado de una cuenta a una fecha genesis. Reemplaza el opening implícito en accounts.opening_balance. Sirve para liability (TC, CCA accionista, loans) y para asset (validar contra cartola). El motor de saldos prioriza el OTB activo (superseded_by IS NULL) sobre accounts.opening_balance cuando ambos existen.';

COMMENT ON COLUMN greenhouse_finance.account_opening_trial_balance.audit_status IS
  '''estimated'' = saldo declarado con la mejor data disponible, sujeto a reconciliación con datos completos. ''reconciled'' = saldo derivado de cartola/extracto/ledger histórico verificable. ''audited'' = revisado por contador y firmado.';

COMMENT ON COLUMN greenhouse_finance.account_opening_trial_balance.evidence_refs IS
  'JSONB array de fuentes de verdad usadas para derivar el opening. Ejemplo: [{"type":"cartola","institution":"santander","period":"2026-02-01..2026-02-25","ref":"file:CartolaMovimiento-...xlsx"}, {"type":"deel_history","period":"2025-11..2026-02","note":"4 receipts pre-period"}].';

COMMENT ON COLUMN greenhouse_finance.account_opening_trial_balance.superseded_by IS
  'Anti-DELETE: cuando una OTB se revisa con nueva data, se INSERTa otra fila y la anterior queda superseded preservando audit. La activa es WHERE superseded_by IS NULL.';

-- =========================================================================
-- 3. Grants
-- =========================================================================

GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.account_opening_trial_balance TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.account_opening_trial_balance TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.account_opening_trial_balance TO greenhouse_app;

-- =========================================================================
-- Down Migration
-- =========================================================================

SET search_path = greenhouse_finance, greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_finance.idx_otb_superseded_by;
DROP INDEX IF EXISTS greenhouse_finance.idx_otb_account_id;
DROP INDEX IF EXISTS greenhouse_finance.idx_otb_active;

DROP TABLE IF EXISTS greenhouse_finance.account_opening_trial_balance;

DROP INDEX IF EXISTS greenhouse_finance.idx_accounts_kind;

ALTER TABLE greenhouse_finance.accounts
  DROP COLUMN IF EXISTS account_kind;
