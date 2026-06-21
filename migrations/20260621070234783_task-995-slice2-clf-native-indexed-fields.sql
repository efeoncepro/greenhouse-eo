-- Up Migration

-- TASK-995 Slice 2 — CLF/UF indexed finance core: native/indexed unit fields.
-- ADR GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1 (accepted 2026-06-20). Additive,
-- reversible, behavior-flag-gated (default OFF): no writer populates these for
-- CLF yet (that lands in Slice 3+). This migration only WIDENS what the schema
-- can represent so a CLF native fact can carry its indexed-unit amount alongside
-- the legal/functional CLP — exactly mirroring the income/expenses native plane
-- introduced by TASK-990.
--
-- Identity preserved: total = neto_afecto + IVA + exento; native CLF + functional
-- CLP. CLF NEVER reaches cash lanes (accounts/payment_orders/settlement_legs);
-- those constraints are intentionally NOT touched here.

-- 1. payment_obligations: add the native plane it lacks (income/expenses already
--    have it from TASK-990). Mirrors income's columns + FK to fx_snapshots.
ALTER TABLE greenhouse_finance.payment_obligations
  ADD COLUMN IF NOT EXISTS native_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS native_currency TEXT,
  ADD COLUMN IF NOT EXISTS native_to_functional_fx_snapshot_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_obligations_native_to_functional_fx_snapshot_id_fkey'
  ) THEN
    ALTER TABLE greenhouse_finance.payment_obligations
      ADD CONSTRAINT payment_obligations_native_to_functional_fx_snapshot_id_fkey
      FOREIGN KEY (native_to_functional_fx_snapshot_id)
      REFERENCES greenhouse_finance.fx_snapshots(snapshot_id);
  END IF;
END
$$;

-- 2. FinanceNativeUnit guardrail on native_currency for the three ledger tables.
--    Allows CLP|USD|MXN|CLF (or NULL). NOT VALID + VALIDATE: existing native rows
--    are all NULL/cash today, so VALIDATE passes; this enforces the contract
--    going forward without a table rewrite. The CASH `currency` columns are NOT
--    widened — CLF can never be a settlement/cash currency.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_obligations_native_currency_finance_native_unit_check') THEN
    ALTER TABLE greenhouse_finance.payment_obligations
      ADD CONSTRAINT payment_obligations_native_currency_finance_native_unit_check
      CHECK (native_currency IS NULL OR native_currency = ANY (ARRAY['CLP','USD','MXN','CLF'])) NOT VALID;
    ALTER TABLE greenhouse_finance.payment_obligations
      VALIDATE CONSTRAINT payment_obligations_native_currency_finance_native_unit_check;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'income_native_currency_finance_native_unit_check') THEN
    ALTER TABLE greenhouse_finance.income
      ADD CONSTRAINT income_native_currency_finance_native_unit_check
      CHECK (native_currency IS NULL OR native_currency = ANY (ARRAY['CLP','USD','MXN','CLF'])) NOT VALID;
    ALTER TABLE greenhouse_finance.income
      VALIDATE CONSTRAINT income_native_currency_finance_native_unit_check;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_native_currency_finance_native_unit_check') THEN
    ALTER TABLE greenhouse_finance.expenses
      ADD CONSTRAINT expenses_native_currency_finance_native_unit_check
      CHECK (native_currency IS NULL OR native_currency = ANY (ARRAY['CLP','USD','MXN','CLF'])) NOT VALID;
    ALTER TABLE greenhouse_finance.expenses
      VALIDATE CONSTRAINT expenses_native_currency_finance_native_unit_check;
  END IF;
END
$$;

-- 3. Anti pre-up-marker bug guard: abort if the expected objects were not created.
DO $$
DECLARE missing_cols int;
BEGIN
  SELECT COUNT(*) INTO missing_cols
  FROM (VALUES ('native_amount'),('native_currency'),('native_to_functional_fx_snapshot_id')) AS expected(col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='greenhouse_finance' AND table_name='payment_obligations'
      AND column_name = expected.col
  );

  IF missing_cols > 0 THEN
    RAISE EXCEPTION 'TASK-995 Slice 2 anti pre-up-marker check: payment_obligations native columns were NOT created (% missing). Migration markers may be inverted.', missing_cols;
  END IF;
END
$$;

-- 4. GRANTs (columns inherit table grants; explicit re-grant for clarity/safety).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.payment_obligations TO greenhouse_runtime;

-- Down Migration

ALTER TABLE greenhouse_finance.expenses
  DROP CONSTRAINT IF EXISTS expenses_native_currency_finance_native_unit_check;
ALTER TABLE greenhouse_finance.income
  DROP CONSTRAINT IF EXISTS income_native_currency_finance_native_unit_check;
ALTER TABLE greenhouse_finance.payment_obligations
  DROP CONSTRAINT IF EXISTS payment_obligations_native_currency_finance_native_unit_check;
ALTER TABLE greenhouse_finance.payment_obligations
  DROP CONSTRAINT IF EXISTS payment_obligations_native_to_functional_fx_snapshot_id_fkey;
ALTER TABLE greenhouse_finance.payment_obligations
  DROP COLUMN IF EXISTS native_to_functional_fx_snapshot_id,
  DROP COLUMN IF EXISTS native_currency,
  DROP COLUMN IF EXISTS native_amount;
