-- Up Migration

-- TASK-703b correction — Cascade should NOT supersede costs/income.
-- ========================================================================
-- Original cascade (migration 20260428000125705) supersedía expense_payments
-- e income_payments cuando se re-anclaba un OTB. Eso es estructuralmente
-- INCORRECTO: esos rows representan costos reales (gastos del negocio) e
-- ingresos reales (cobros) que aparecen en P&L, cost-attribution, ICO,
-- impuestos. Marcarlos superseded los excluye de queries que filtran
-- `superseded_by_otb_id IS NULL` y rompe la contabilidad financiera.
--
-- Decisión canónica: el cascade SOLO afecta:
--   1. settlement_legs (ledger-only, transferencias internas)
--   2. account_balances (proyección derivada, se reconstruye)
--
-- expense_payments e income_payments NO se cascade-supersede. La math del
-- materializer ya los filtra por fecha — si un expense_payment tiene
-- payment_date < OTB.genesisDate, no entra en ningún daily row post-anchor.
-- No hay double-count.
--
-- Cleanup: revertir cualquier expense_payments / income_payments que tienen
-- superseded_by_otb_id != NULL (resultado del cascade defectuoso anterior).

-- 1. Update SQL function: skip expense_payments e income_payments
CREATE OR REPLACE FUNCTION greenhouse_finance.cascade_supersede_pre_otb_transactions(
  p_account_id TEXT,
  p_otb_id TEXT,
  p_genesis_date DATE,
  p_reason TEXT
)
RETURNS TABLE (
  superseded_settlement_legs INT,
  superseded_income_payments INT,
  superseded_expense_payments INT,
  pruned_balance_rows INT
)
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_legs INT := 0;
  v_balances INT := 0;
BEGIN
  -- Settlement legs touching this instrument before genesis (ledger-only)
  WITH updated AS (
    UPDATE greenhouse_finance.settlement_legs
    SET superseded_by_otb_id = p_otb_id,
        superseded_at = v_now,
        superseded_reason = p_reason
    WHERE instrument_id = p_account_id
      AND transaction_date < p_genesis_date
      AND superseded_by_otb_id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*)::INT INTO v_legs FROM updated;

  -- expense_payments e income_payments NO SE TOCAN — son costos/ingresos reales.
  -- El materializer los filtra por fecha automáticamente; si están < genesisDate
  -- no entran en account_balances post-anchor, sin necesidad de superseded flag.

  -- Prune derived projections (account_balances are pure projections; their
  -- audit value is in the source transactions, which are preserved).
  WITH deleted AS (
    DELETE FROM greenhouse_finance.account_balances
    WHERE account_id = p_account_id
      AND balance_date < p_genesis_date
    RETURNING 1
  )
  SELECT COUNT(*)::INT INTO v_balances FROM deleted;

  -- Return counts. income/expense counts always 0 by design.
  RETURN QUERY SELECT v_legs, 0, 0, v_balances;
END $fn$;

COMMENT ON FUNCTION greenhouse_finance.cascade_supersede_pre_otb_transactions(TEXT, TEXT, DATE, TEXT) IS
  'TASK-703b corrected: cascade ONLY supersede settlement_legs (ledger-only) y prune account_balances. expense_payments e income_payments NUNCA se supersede — son costos/ingresos reales que aparecen en P&L, cost-attribution, etc. El materializer ya filtra por fecha; no necesita superseded flag para evitar double-count.';

-- 2. Cleanup: revertir expense_payments / income_payments incorrectamente marcados
-- como superseded por OTBs (consecuencia del cascade defectuoso anterior).
UPDATE greenhouse_finance.expense_payments
SET superseded_by_otb_id = NULL
WHERE superseded_by_otb_id IS NOT NULL;

UPDATE greenhouse_finance.income_payments
SET superseded_by_otb_id = NULL
WHERE superseded_by_otb_id IS NOT NULL;

-- Down Migration

-- (no down — restoring the cost-broken cascade is not desirable)
