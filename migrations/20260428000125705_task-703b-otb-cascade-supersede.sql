-- Up Migration

-- TASK-703b — OTB cascade supersede.
-- ========================================================================
-- When a new OTB (Opening Trial Balance) is declared at a later genesis_date,
-- the older OTB AND every transaction (settlement_leg, income_payment,
-- expense_payment) dated before the new genesis must be marked superseded
-- so the materialization chain ignores them. Their effect is encapsulated
-- in the new OTB.opening_balance.
--
-- Pattern: anti-DELETE. Pre-anchor transactions stay in PG with a pointer
-- to the OTB that superseded them. Audit trail preserved. Materializer
-- filters `superseded_by_otb_id IS NULL` everywhere.
--
-- Same shape as `superseded_by_payment_id` (TASK-702) but with a different
-- semantic: payment-supersede chains are intra-document (replacing an old
-- payment row); otb-supersede is anchor-driven (data before a canonical
-- anchor is out of scope for the running chain).
--
-- Scope: settlement_legs + income_payments + expense_payments. These are
-- the three transaction primitives that drive `materializeAccountBalance`.

-- ── settlement_legs ─────────────────────────────────────────────────────
ALTER TABLE greenhouse_finance.settlement_legs
  ADD COLUMN IF NOT EXISTS superseded_by_otb_id TEXT,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settlement_legs_superseded_by_otb_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.settlement_legs
      ADD CONSTRAINT settlement_legs_superseded_by_otb_fk
      FOREIGN KEY (superseded_by_otb_id)
      REFERENCES greenhouse_finance.account_opening_trial_balance(obtb_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_settlement_legs_superseded_by_otb
  ON greenhouse_finance.settlement_legs (superseded_by_otb_id)
  WHERE superseded_by_otb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_settlement_legs_active_by_instrument_date
  ON greenhouse_finance.settlement_legs (instrument_id, transaction_date)
  WHERE superseded_by_otb_id IS NULL;

COMMENT ON COLUMN greenhouse_finance.settlement_legs.superseded_by_otb_id IS
  'Anti-DELETE: marca un settlement_leg como superseded por una OTB anchor. La OTB.opening_balance ya encapsula el efecto neto de este leg, por lo que el materializer lo excluye del chain. Audit-preserved.';

-- ── income_payments ─────────────────────────────────────────────────────
ALTER TABLE greenhouse_finance.income_payments
  ADD COLUMN IF NOT EXISTS superseded_by_otb_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'income_payments_superseded_by_otb_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.income_payments
      ADD CONSTRAINT income_payments_superseded_by_otb_fk
      FOREIGN KEY (superseded_by_otb_id)
      REFERENCES greenhouse_finance.account_opening_trial_balance(obtb_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_income_payments_superseded_by_otb
  ON greenhouse_finance.income_payments (superseded_by_otb_id)
  WHERE superseded_by_otb_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.income_payments.superseded_by_otb_id IS
  'Anti-DELETE: marca un income_payment como superseded por una OTB anchor. Coexiste con superseded_by_payment_id (TASK-702). Materializer filtra por AMBAS columnas.';

-- ── expense_payments ────────────────────────────────────────────────────
ALTER TABLE greenhouse_finance.expense_payments
  ADD COLUMN IF NOT EXISTS superseded_by_otb_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expense_payments_superseded_by_otb_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.expense_payments
      ADD CONSTRAINT expense_payments_superseded_by_otb_fk
      FOREIGN KEY (superseded_by_otb_id)
      REFERENCES greenhouse_finance.account_opening_trial_balance(obtb_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expense_payments_superseded_by_otb
  ON greenhouse_finance.expense_payments (superseded_by_otb_id)
  WHERE superseded_by_otb_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.expense_payments.superseded_by_otb_id IS
  'Anti-DELETE: marca un expense_payment como superseded por una OTB anchor. Coexiste con superseded_by_payment_id (TASK-702). Materializer filtra por AMBAS columnas.';

-- ── SQL function: cascade supersede ─────────────────────────────────────
-- Atomic helper invoked by the OTB declaration TS helper. Marks all
-- transactions for a given account that predate the new OTB as superseded
-- by that OTB, and prunes the derived account_balances projections so the
-- chain rebuilds cleanly from the anchor.
--
-- Returns counts for telemetry.
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
  v_income INT := 0;
  v_expense INT := 0;
  v_balances INT := 0;
BEGIN
  -- Settlement legs touching this instrument before genesis
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

  -- Income payments hitting this account before genesis
  WITH updated AS (
    UPDATE greenhouse_finance.income_payments
    SET superseded_by_otb_id = p_otb_id
    WHERE payment_account_id = p_account_id
      AND payment_date < p_genesis_date
      AND superseded_by_otb_id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*)::INT INTO v_income FROM updated;

  -- Expense payments hitting this account before genesis
  WITH updated AS (
    UPDATE greenhouse_finance.expense_payments
    SET superseded_by_otb_id = p_otb_id
    WHERE payment_account_id = p_account_id
      AND payment_date < p_genesis_date
      AND superseded_by_otb_id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*)::INT INTO v_expense FROM updated;

  -- Prune derived projections (account_balances are pure projections; their
  -- audit value is in the source transactions, which are preserved).
  WITH deleted AS (
    DELETE FROM greenhouse_finance.account_balances
    WHERE account_id = p_account_id
      AND balance_date < p_genesis_date
    RETURNING 1
  )
  SELECT COUNT(*)::INT INTO v_balances FROM deleted;

  RETURN QUERY SELECT v_legs, v_income, v_expense, v_balances;
END $fn$;

COMMENT ON FUNCTION greenhouse_finance.cascade_supersede_pre_otb_transactions(TEXT, TEXT, DATE, TEXT) IS
  'TASK-703b: marca transacciones pre-anchor como superseded por la OTB y poda account_balances derivados. Idempotente: solo afecta filas con superseded_by_otb_id IS NULL. Devuelve counts para telemetry.';

-- Down Migration

-- (Down intentionally not implemented for cascade-supersede:
--  rolling back would risk re-counting superseded transactions
--  in the active chain. Forward-only by design.)
