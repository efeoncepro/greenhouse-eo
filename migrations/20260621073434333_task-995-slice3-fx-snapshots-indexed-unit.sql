-- Up Migration

-- TASK-995 Slice 3 — fx_snapshots Option A: admit CLF→CLP indexed-unit snapshots.
-- ADR GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1 §7 (snapshot model = Option A:
-- extend fx_snapshots with an indexed-unit discriminator rather than a parallel
-- table). Additive + reversible + behavior-flag-gated: no writer persists a CLF
-- snapshot until FINANCE_CLF_INCOME_PROJECTION_ENABLED is ON (Slice 3 writer).
--
-- A UF fact converts native CLF -> functional CLP. So we widen ONLY from_currency
-- to admit 'CLF' (the source unit). to_currency stays CLP|USD|MXN — CLF is NEVER a
-- conversion target (it's a unit of account, not cash). `from_unit_class` marks
-- an indexed-unit conversion explicitly so it is never confused with an FX-market
-- rate; existing rows backfill to 'currency'.

-- 1. Discriminator column (default 'currency' backfills all existing FX rows).
ALTER TABLE greenhouse_finance.fx_snapshots
  ADD COLUMN IF NOT EXISTS from_unit_class TEXT NOT NULL DEFAULT 'currency';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fx_snapshots_from_unit_class_check') THEN
    ALTER TABLE greenhouse_finance.fx_snapshots
      ADD CONSTRAINT fx_snapshots_from_unit_class_check
      CHECK (from_unit_class = ANY (ARRAY['currency','indexed_unit']));
  END IF;
END
$$;

-- 2. Widen from_currency to admit CLF (the indexed source unit). to_currency
--    constraint is intentionally left narrow (CLP|USD|MXN).
ALTER TABLE greenhouse_finance.fx_snapshots
  DROP CONSTRAINT IF EXISTS fx_snapshots_from_currency_check;
ALTER TABLE greenhouse_finance.fx_snapshots
  ADD CONSTRAINT fx_snapshots_from_currency_check
  CHECK (from_currency = ANY (ARRAY['CLP','USD','MXN','CLF']));

-- 3. Integrity invariant: an indexed-unit snapshot must have from_currency='CLF'
--    (and CLF only appears on indexed-unit rows). Prevents a CLF FX-market row or
--    a mislabeled indexed-unit row. NOT VALID + VALIDATE (zero CLF rows today).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fx_snapshots_indexed_unit_clf_coherence_check') THEN
    ALTER TABLE greenhouse_finance.fx_snapshots
      ADD CONSTRAINT fx_snapshots_indexed_unit_clf_coherence_check
      CHECK (
        (from_unit_class = 'indexed_unit' AND from_currency = 'CLF')
        OR (from_unit_class = 'currency' AND from_currency <> 'CLF')
      ) NOT VALID;
    ALTER TABLE greenhouse_finance.fx_snapshots
      VALIDATE CONSTRAINT fx_snapshots_indexed_unit_clf_coherence_check;
  END IF;
END
$$;

-- 4. Anti pre-up-marker bug guard.
DO $$
DECLARE has_col boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='greenhouse_finance' AND table_name='fx_snapshots'
      AND column_name='from_unit_class'
  ) INTO has_col;

  IF NOT has_col THEN
    RAISE EXCEPTION 'TASK-995 Slice 3 anti pre-up-marker check: fx_snapshots.from_unit_class was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_finance.fx_snapshots
  DROP CONSTRAINT IF EXISTS fx_snapshots_indexed_unit_clf_coherence_check;
ALTER TABLE greenhouse_finance.fx_snapshots
  DROP CONSTRAINT IF EXISTS fx_snapshots_from_currency_check;
ALTER TABLE greenhouse_finance.fx_snapshots
  ADD CONSTRAINT fx_snapshots_from_currency_check
  CHECK (from_currency = ANY (ARRAY['CLP','USD','MXN']));
ALTER TABLE greenhouse_finance.fx_snapshots
  DROP CONSTRAINT IF EXISTS fx_snapshots_from_unit_class_check;
ALTER TABLE greenhouse_finance.fx_snapshots
  DROP COLUMN IF EXISTS from_unit_class;
