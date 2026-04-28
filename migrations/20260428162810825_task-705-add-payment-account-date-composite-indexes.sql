-- Up Migration
--
-- TASK-705 Slice 4 — Composite indexes alineados al patron real de tesoreria
-- =============================================================================
-- AccountDetailDrawer y getBankOverview filtran constantemente por:
--   WHERE payment_account_id = $1
--     AND payment_date BETWEEN $2 AND $3
--     AND superseded_by_payment_id IS NULL
--     AND superseded_by_otb_id IS NULL
--   ORDER BY payment_date DESC
--
-- Indexes existentes:
--   - income_payments_space_payment_account_idx (space_id, payment_account_id) — sin payment_date
--   - expense_payments_space_payment_account_idx (space_id, payment_account_id) — sin payment_date
--   - idx_expense_payments_payment_date (payment_date) — sin account
--
-- El patron real de tesoreria escanea por (account, date) ordenado. Los indexes
-- actuales obligan a sort posterior y/o full-scan filtered. Este indice cubre
-- el patron completamente (index-only scan posible).
--
-- Tambien excluye filas superseded del index para cubrir el filter mas comun
-- (PARTIAL INDEX) — reduce tamaño + acelera lookup.

SET search_path = greenhouse_finance, public;

-- income_payments: composite (payment_account_id, payment_date DESC) excluyendo superseded.
-- Patron canonico: lookup por cuenta + rango fecha + ordenado descendente.
CREATE INDEX IF NOT EXISTS idx_income_payments_account_date_active
  ON greenhouse_finance.income_payments (payment_account_id, payment_date DESC)
  WHERE payment_account_id IS NOT NULL
    AND superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL
    AND superseded_at IS NULL;

-- expense_payments: idem.
CREATE INDEX IF NOT EXISTS idx_expense_payments_account_date_active
  ON greenhouse_finance.expense_payments (payment_account_id, payment_date DESC)
  WHERE payment_account_id IS NOT NULL
    AND superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL
    AND superseded_at IS NULL;

-- settlement_legs: el reader del drawer hace JOIN con UNION de fallback payments.
-- El predicate canonico es (instrument_id, transaction_date DESC) excluyendo superseded.
CREATE INDEX IF NOT EXISTS idx_settlement_legs_instrument_date_active
  ON greenhouse_finance.settlement_legs (instrument_id, transaction_date DESC)
  WHERE instrument_id IS NOT NULL
    AND superseded_at IS NULL
    AND superseded_by_otb_id IS NULL;

COMMENT ON INDEX greenhouse_finance.idx_income_payments_account_date_active IS
  'TASK-705: composite (payment_account_id, payment_date DESC) excluyendo superseded chains. Cubre lookup canonico de tesoreria por cuenta + rango fecha; index-only scan para queries de overview/drawer.';

COMMENT ON INDEX greenhouse_finance.idx_expense_payments_account_date_active IS
  'TASK-705: idem income_payments. Excluye filas superseded (TASK-708b convention).';

COMMENT ON INDEX greenhouse_finance.idx_settlement_legs_instrument_date_active IS
  'TASK-705: composite (instrument_id, transaction_date DESC) excluyendo legs superseded. Acelera la query UNION del drawer (settlement_legs + fallback payments).';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_settlement_legs_instrument_date_active;
DROP INDEX IF EXISTS greenhouse_finance.idx_expense_payments_account_date_active;
DROP INDEX IF EXISTS greenhouse_finance.idx_income_payments_account_date_active;
