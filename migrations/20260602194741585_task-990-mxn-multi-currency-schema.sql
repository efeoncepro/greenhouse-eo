-- Up Migration
--
-- TASK-990 Slice 2 — MXN multi-currency finance core: schema expand, NO behavior flip.
-- Additive + reversible. CLP/USD rows untouched (new columns NULL, CHECKs widened).
-- No backfill. Write paths stay gated by FINANCE_CORE_MXN_ENABLED (default off).
-- ADR GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1 §5.2 (fx_snapshots) + §7 (planes).

-- ── 1. fx_snapshots: append-only FX evidence table (ADR §5.2 default model) ──
CREATE TABLE IF NOT EXISTS greenhouse_finance.fx_snapshots (
  snapshot_id            TEXT PRIMARY KEY,
  from_currency          TEXT NOT NULL CHECK (from_currency = ANY (ARRAY['CLP','USD','MXN'])),
  to_currency            TEXT NOT NULL CHECK (to_currency   = ANY (ARRAY['CLP','USD','MXN'])),
  rate                   NUMERIC(20, 8) NOT NULL CHECK (rate > 0),
  inverse_rate           NUMERIC(20, 8) NOT NULL CHECK (inverse_rate > 0),
  rate_date              DATE NOT NULL,
  rate_date_resolved     DATE,
  source                 TEXT NOT NULL,
  source_run_id          TEXT,
  composed_via           TEXT[],
  policy                 TEXT NOT NULL CHECK (policy = ANY (ARRAY['rate_at_event','rate_at_send','rate_at_period_close','rate_at_settlement','manual_override'])),
  locked_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by              TEXT NOT NULL CHECK (locked_by = ANY (ARRAY['system','finance_admin'])),
  manual_override_reason TEXT,
  superseded_by          TEXT REFERENCES greenhouse_finance.fx_snapshots (snapshot_id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A manual_override MUST carry a reason >= 10 chars (mirror runtime guard).
  CONSTRAINT fx_snapshots_manual_override_reason CHECK (
    policy <> 'manual_override' OR (manual_override_reason IS NOT NULL AND length(btrim(manual_override_reason)) >= 10)
  )
);

CREATE INDEX IF NOT EXISTS fx_snapshots_pair_date_idx
  ON greenhouse_finance.fx_snapshots (from_currency, to_currency, rate_date DESC);
CREATE INDEX IF NOT EXISTS fx_snapshots_active_idx
  ON greenhouse_finance.fx_snapshots (snapshot_id) WHERE superseded_by IS NULL;

-- Append-only: no DELETE; UPDATE only to set superseded_by (chain a replacement).
CREATE OR REPLACE FUNCTION greenhouse_finance.fx_snapshots_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'fx_snapshots is append-only — DELETE is not allowed (supersede instead)';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION greenhouse_finance.fx_snapshots_update_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF (to_jsonb(NEW) - 'superseded_by') IS DISTINCT FROM (to_jsonb(OLD) - 'superseded_by') THEN
    RAISE EXCEPTION 'fx_snapshots is append-only — only superseded_by may change';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fx_snapshots_no_delete_trigger ON greenhouse_finance.fx_snapshots;
CREATE TRIGGER fx_snapshots_no_delete_trigger
  BEFORE DELETE ON greenhouse_finance.fx_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.fx_snapshots_no_delete();

DROP TRIGGER IF EXISTS fx_snapshots_update_guard_trigger ON greenhouse_finance.fx_snapshots;
CREATE TRIGGER fx_snapshots_update_guard_trigger
  BEFORE UPDATE ON greenhouse_finance.fx_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.fx_snapshots_update_guard();

-- ── 2. CHECK widening: add 'MXN' to the 7 finance_core currency constraints ──
-- Instant validation: existing rows are CLP/USD and still satisfy the widened set.
ALTER TABLE greenhouse_finance.income
  DROP CONSTRAINT IF EXISTS income_currency_check,
  ADD CONSTRAINT income_currency_check CHECK (currency = ANY (ARRAY['CLP','USD','MXN']));

ALTER TABLE greenhouse_finance.expenses
  DROP CONSTRAINT IF EXISTS expenses_currency_check,
  ADD CONSTRAINT expenses_currency_check CHECK (currency = ANY (ARRAY['CLP','USD','MXN']));

ALTER TABLE greenhouse_finance.payment_obligations
  DROP CONSTRAINT IF EXISTS payment_obligations_currency_check,
  ADD CONSTRAINT payment_obligations_currency_check CHECK (currency = ANY (ARRAY['CLP','USD','MXN']));

ALTER TABLE greenhouse_finance.payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_currency_check,
  ADD CONSTRAINT payment_orders_currency_check CHECK (currency = ANY (ARRAY['CLP','USD','MXN']));

ALTER TABLE greenhouse_finance.payment_order_lines
  DROP CONSTRAINT IF EXISTS payment_order_lines_currency_check,
  ADD CONSTRAINT payment_order_lines_currency_check CHECK (currency = ANY (ARRAY['CLP','USD','MXN']));

ALTER TABLE greenhouse_finance.beneficiary_payment_profiles
  DROP CONSTRAINT IF EXISTS beneficiary_payment_profiles_currency_check,
  ADD CONSTRAINT beneficiary_payment_profiles_currency_check CHECK (currency = ANY (ARRAY['CLP','USD','MXN']));

ALTER TABLE greenhouse_finance.payment_order_processor_funding_policies
  DROP CONSTRAINT IF EXISTS payment_order_processor_funding_policies_order_currency_check,
  ADD CONSTRAINT payment_order_processor_funding_policies_order_currency_check
    CHECK (order_currency IS NULL OR order_currency = ANY (ARRAY['CLP','USD','MXN']));

-- ── 3. Additive nullable columns — native + USD reporting + FX snapshot FKs ──
-- income / expenses: native plane + USD reporting + 2 snapshot FKs (native→CLP, CLP→USD).
ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS native_amount NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS native_currency TEXT,
  ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS native_to_functional_fx_snapshot_id TEXT REFERENCES greenhouse_finance.fx_snapshots (snapshot_id),
  ADD COLUMN IF NOT EXISTS functional_to_reporting_fx_snapshot_id TEXT REFERENCES greenhouse_finance.fx_snapshots (snapshot_id);

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS native_amount NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS native_currency TEXT,
  ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS native_to_functional_fx_snapshot_id TEXT REFERENCES greenhouse_finance.fx_snapshots (snapshot_id),
  ADD COLUMN IF NOT EXISTS functional_to_reporting_fx_snapshot_id TEXT REFERENCES greenhouse_finance.fx_snapshots (snapshot_id);

-- payments: USD reporting plane + settlement snapshot FK.
ALTER TABLE greenhouse_finance.income_payments
  ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS settlement_fx_snapshot_id TEXT REFERENCES greenhouse_finance.fx_snapshots (snapshot_id);

ALTER TABLE greenhouse_finance.expense_payments
  ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS settlement_fx_snapshot_id TEXT REFERENCES greenhouse_finance.fx_snapshots (snapshot_id);

-- settlement_legs: USD reporting plane + FX snapshot FK.
ALTER TABLE greenhouse_finance.settlement_legs
  ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS fx_snapshot_id TEXT REFERENCES greenhouse_finance.fx_snapshots (snapshot_id);

-- Partial indexes for non-CLP currency/period queries (skip the CLP-only mass).
CREATE INDEX IF NOT EXISTS income_native_currency_idx
  ON greenhouse_finance.income (native_currency, invoice_date) WHERE native_currency IS NOT NULL;
CREATE INDEX IF NOT EXISTS expenses_native_currency_idx
  ON greenhouse_finance.expenses (native_currency, document_date) WHERE native_currency IS NOT NULL;

-- ── 4. GRANTs (runtime read/write; ownership stays greenhouse_ops) ──
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.fx_snapshots TO greenhouse_runtime;

-- ── 5. Extend canonical TASK-766/768 VIEWs with the USD reporting plane ──
-- Reproduces the CURRENT def EXACTLY (incl. the TASK-768 expense_type/income_type
-- + economic_category JOIN) and APPENDS payment_amount_usd + has_usd_drift at the
-- END (CREATE OR REPLACE only permits adding columns last). Additive: existing
-- consumers + economic-category readers untouched.
CREATE OR REPLACE VIEW greenhouse_finance.expense_payments_normalized AS
SELECT
  ep.payment_id,
  ep.expense_id,
  ep.payment_date,
  ep.amount AS payment_amount_native,
  ep.currency AS payment_currency,
  COALESCE(ep.amount_clp, CASE WHEN ep.currency = 'CLP' THEN ep.amount ELSE NULL END) AS payment_amount_clp,
  ep.exchange_rate_at_payment,
  ep.fx_gain_loss_clp,
  ep.payment_account_id,
  ep.payment_method,
  ep.payment_source,
  ep.is_reconciled,
  ep.payment_order_line_id,
  ep.reference,
  ep.recorded_by_user_id,
  ep.recorded_at,
  ep.created_at,
  (ep.currency <> 'CLP' AND ep.amount_clp IS NULL) AS has_clp_drift,
  e.expense_type,
  e.economic_category,
  COALESCE(ep.amount_usd, CASE WHEN ep.currency = 'USD' THEN ep.amount ELSE NULL END) AS payment_amount_usd,
  (ep.currency <> 'USD' AND ep.amount_usd IS NULL) AS has_usd_drift
FROM greenhouse_finance.expense_payments ep
  LEFT JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
WHERE ep.superseded_by_payment_id IS NULL
  AND ep.superseded_by_otb_id IS NULL
  AND ep.superseded_at IS NULL;

CREATE OR REPLACE VIEW greenhouse_finance.income_payments_normalized AS
SELECT
  ip.payment_id,
  ip.income_id,
  ip.payment_date,
  ip.amount AS payment_amount_native,
  ip.currency AS payment_currency,
  COALESCE(ip.amount_clp, CASE WHEN ip.currency = 'CLP' THEN ip.amount ELSE NULL END) AS payment_amount_clp,
  ip.exchange_rate_at_payment,
  ip.fx_gain_loss_clp,
  ip.payment_account_id,
  ip.payment_method,
  ip.payment_source,
  ip.is_reconciled,
  ip.reference,
  ip.recorded_by_user_id,
  ip.recorded_at,
  ip.created_at,
  (ip.currency <> 'CLP' AND ip.amount_clp IS NULL) AS has_clp_drift,
  i.income_type,
  i.economic_category,
  COALESCE(ip.amount_usd, CASE WHEN ip.currency = 'USD' THEN ip.amount ELSE NULL END) AS payment_amount_usd,
  (ip.currency <> 'USD' AND ip.amount_usd IS NULL) AS has_usd_drift
FROM greenhouse_finance.income_payments ip
  LEFT JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
WHERE ip.superseded_by_payment_id IS NULL
  AND ip.superseded_by_otb_id IS NULL
  AND ip.superseded_at IS NULL;

-- ── 6. Anti pre-up-marker guard: abort if the expand did not actually apply ──
DO $$
DECLARE
  fx_exists boolean;
  widened_count integer;
  income_native boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_finance' AND table_name = 'fx_snapshots'
  ) INTO fx_exists;
  IF NOT fx_exists THEN
    RAISE EXCEPTION 'TASK-990 anti pre-up-marker: greenhouse_finance.fx_snapshots was NOT created';
  END IF;

  SELECT count(*) INTO widened_count
  FROM pg_constraint
  WHERE conname IN (
      'income_currency_check','expenses_currency_check','payment_obligations_currency_check',
      'payment_orders_currency_check','payment_order_lines_currency_check',
      'beneficiary_payment_profiles_currency_check','payment_order_processor_funding_policies_order_currency_check'
    )
    AND pg_get_constraintdef(oid) ILIKE '%MXN%';
  IF widened_count < 7 THEN
    RAISE EXCEPTION 'TASK-990 anti pre-up-marker: expected 7 widened currency CHECKs, got %', widened_count;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_finance' AND table_name = 'income' AND column_name = 'native_currency'
  ) INTO income_native;
  IF NOT income_native THEN
    RAISE EXCEPTION 'TASK-990 anti pre-up-marker: income.native_currency column was NOT added';
  END IF;
END
$$;

-- Down Migration

-- Drop the VIEWs first: they reference ep.amount_usd / ip.amount_usd, so the
-- column drops below would be blocked while the view depends on them. They're
-- recreated at their original (TASK-768) shape afterwards.
DROP VIEW IF EXISTS greenhouse_finance.expense_payments_normalized;
DROP VIEW IF EXISTS greenhouse_finance.income_payments_normalized;

-- Drop additive columns.
ALTER TABLE greenhouse_finance.settlement_legs DROP COLUMN IF EXISTS amount_usd, DROP COLUMN IF EXISTS fx_snapshot_id;
ALTER TABLE greenhouse_finance.expense_payments DROP COLUMN IF EXISTS amount_usd, DROP COLUMN IF EXISTS settlement_fx_snapshot_id;
ALTER TABLE greenhouse_finance.income_payments DROP COLUMN IF EXISTS amount_usd, DROP COLUMN IF EXISTS settlement_fx_snapshot_id;
ALTER TABLE greenhouse_finance.expenses
  DROP COLUMN IF EXISTS native_amount, DROP COLUMN IF EXISTS native_currency, DROP COLUMN IF EXISTS amount_usd,
  DROP COLUMN IF EXISTS native_to_functional_fx_snapshot_id, DROP COLUMN IF EXISTS functional_to_reporting_fx_snapshot_id;
ALTER TABLE greenhouse_finance.income
  DROP COLUMN IF EXISTS native_amount, DROP COLUMN IF EXISTS native_currency, DROP COLUMN IF EXISTS amount_usd,
  DROP COLUMN IF EXISTS native_to_functional_fx_snapshot_id, DROP COLUMN IF EXISTS functional_to_reporting_fx_snapshot_id;

-- Recreate the VIEWs at their original (TASK-768) shape — CLP plane + economic_category, no USD.
CREATE VIEW greenhouse_finance.expense_payments_normalized AS
SELECT
  ep.payment_id, ep.expense_id, ep.payment_date,
  ep.amount AS payment_amount_native, ep.currency AS payment_currency,
  COALESCE(ep.amount_clp, CASE WHEN ep.currency = 'CLP' THEN ep.amount ELSE NULL END) AS payment_amount_clp,
  ep.exchange_rate_at_payment, ep.fx_gain_loss_clp, ep.payment_account_id, ep.payment_method,
  ep.payment_source, ep.is_reconciled, ep.payment_order_line_id, ep.reference,
  ep.recorded_by_user_id, ep.recorded_at, ep.created_at,
  (ep.currency <> 'CLP' AND ep.amount_clp IS NULL) AS has_clp_drift,
  e.expense_type, e.economic_category
FROM greenhouse_finance.expense_payments ep
  LEFT JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
WHERE ep.superseded_by_payment_id IS NULL AND ep.superseded_by_otb_id IS NULL AND ep.superseded_at IS NULL;

CREATE VIEW greenhouse_finance.income_payments_normalized AS
SELECT
  ip.payment_id, ip.income_id, ip.payment_date,
  ip.amount AS payment_amount_native, ip.currency AS payment_currency,
  COALESCE(ip.amount_clp, CASE WHEN ip.currency = 'CLP' THEN ip.amount ELSE NULL END) AS payment_amount_clp,
  ip.exchange_rate_at_payment, ip.fx_gain_loss_clp, ip.payment_account_id, ip.payment_method,
  ip.payment_source, ip.is_reconciled, ip.reference, ip.recorded_by_user_id, ip.recorded_at, ip.created_at,
  (ip.currency <> 'CLP' AND ip.amount_clp IS NULL) AS has_clp_drift,
  i.income_type, i.economic_category
FROM greenhouse_finance.income_payments ip
  LEFT JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
WHERE ip.superseded_by_payment_id IS NULL AND ip.superseded_by_otb_id IS NULL AND ip.superseded_at IS NULL;

GRANT SELECT ON greenhouse_finance.expense_payments_normalized TO greenhouse_runtime;
GRANT SELECT ON greenhouse_finance.income_payments_normalized TO greenhouse_runtime;

-- Re-narrow currency CHECKs to CLP/USD (fails loud if any MXN row exists — intended guard).
ALTER TABLE greenhouse_finance.income DROP CONSTRAINT IF EXISTS income_currency_check, ADD CONSTRAINT income_currency_check CHECK (currency = ANY (ARRAY['CLP','USD']));
ALTER TABLE greenhouse_finance.expenses DROP CONSTRAINT IF EXISTS expenses_currency_check, ADD CONSTRAINT expenses_currency_check CHECK (currency = ANY (ARRAY['CLP','USD']));
ALTER TABLE greenhouse_finance.payment_obligations DROP CONSTRAINT IF EXISTS payment_obligations_currency_check, ADD CONSTRAINT payment_obligations_currency_check CHECK (currency = ANY (ARRAY['CLP','USD']));
ALTER TABLE greenhouse_finance.payment_orders DROP CONSTRAINT IF EXISTS payment_orders_currency_check, ADD CONSTRAINT payment_orders_currency_check CHECK (currency = ANY (ARRAY['CLP','USD']));
ALTER TABLE greenhouse_finance.payment_order_lines DROP CONSTRAINT IF EXISTS payment_order_lines_currency_check, ADD CONSTRAINT payment_order_lines_currency_check CHECK (currency = ANY (ARRAY['CLP','USD']));
ALTER TABLE greenhouse_finance.beneficiary_payment_profiles DROP CONSTRAINT IF EXISTS beneficiary_payment_profiles_currency_check, ADD CONSTRAINT beneficiary_payment_profiles_currency_check CHECK (currency = ANY (ARRAY['CLP','USD']));
ALTER TABLE greenhouse_finance.payment_order_processor_funding_policies DROP CONSTRAINT IF EXISTS payment_order_processor_funding_policies_order_currency_check, ADD CONSTRAINT payment_order_processor_funding_policies_order_currency_check CHECK (order_currency IS NULL OR order_currency = ANY (ARRAY['CLP','USD']));

-- Drop fx_snapshots (triggers + functions + table).
DROP TRIGGER IF EXISTS fx_snapshots_update_guard_trigger ON greenhouse_finance.fx_snapshots;
DROP TRIGGER IF EXISTS fx_snapshots_no_delete_trigger ON greenhouse_finance.fx_snapshots;
DROP FUNCTION IF EXISTS greenhouse_finance.fx_snapshots_update_guard();
DROP FUNCTION IF EXISTS greenhouse_finance.fx_snapshots_no_delete();
DROP TABLE IF EXISTS greenhouse_finance.fx_snapshots;
