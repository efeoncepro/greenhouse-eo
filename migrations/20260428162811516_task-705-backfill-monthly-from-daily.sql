-- Up Migration
--
-- TASK-705 Slice 2 — Backfill account_balances_monthly from daily aggregation
-- ==============================================================================
-- Pobla account_balances_monthly desde account_balances daily. Idempotente via
-- UNIQUE constraint + ON CONFLICT DO UPDATE (re-run safe).
--
-- Logica de agregacion canonica:
--   - opening_balance: closing del primer dia del mes que tiene snapshot
--     (DISTINCT ON balance_date ASC). Refleja el opening del primer dia con
--     actividad o snapshot.
--   - closing_balance: closing del ultimo dia del mes con snapshot
--     (DISTINCT ON balance_date DESC). Es el saldo de cierre real.
--   - closing_balance_clp: idem closing_balance (CLP-converted).
--   - period_inflows / period_outflows: SUM del mes (acumulado de los dias).
--   - fx_gain_loss_*: SUM del mes (realized + translation acumulados).
--   - transaction_count: SUM del mes.
--   - last_transaction_at: MAX del mes.
--   - currency: del ultimo snapshot del mes (deberia ser estable; warning
--     si cambia entre dias).
--
-- Si un mes no tiene actividad, no genera row (no INSERTAR meses vacios; el
-- reader del drawer maneja gaps con array de meses esperados + LEFT JOIN).

SET search_path = greenhouse_finance, public;

INSERT INTO greenhouse_finance.account_balances_monthly (
  balance_id,
  account_id,
  space_id,
  balance_year,
  balance_month,
  currency,
  opening_balance,
  closing_balance,
  closing_balance_clp,
  period_inflows,
  period_outflows,
  fx_gain_loss_clp,
  fx_gain_loss_realized_clp,
  fx_gain_loss_translation_clp,
  transaction_count,
  last_transaction_at,
  computed_at
)
WITH monthly_buckets AS (
  SELECT
    account_id,
    space_id,
    EXTRACT(YEAR FROM balance_date)::int AS balance_year,
    EXTRACT(MONTH FROM balance_date)::int AS balance_month,
    currency,
    balance_date,
    opening_balance,
    closing_balance,
    closing_balance_clp,
    period_inflows,
    period_outflows,
    fx_gain_loss_clp,
    fx_gain_loss_realized_clp,
    fx_gain_loss_translation_clp,
    transaction_count,
    last_transaction_at
  FROM greenhouse_finance.account_balances
),
opening_per_month AS (
  SELECT DISTINCT ON (account_id, balance_year, balance_month)
    account_id, balance_year, balance_month, opening_balance
  FROM monthly_buckets
  ORDER BY account_id, balance_year, balance_month, balance_date ASC
),
closing_per_month AS (
  SELECT DISTINCT ON (account_id, balance_year, balance_month)
    account_id, balance_year, balance_month,
    space_id, currency, closing_balance, closing_balance_clp
  FROM monthly_buckets
  ORDER BY account_id, balance_year, balance_month, balance_date DESC
),
sums_per_month AS (
  SELECT
    account_id, balance_year, balance_month,
    SUM(period_inflows)::numeric AS period_inflows,
    SUM(period_outflows)::numeric AS period_outflows,
    SUM(fx_gain_loss_clp)::numeric AS fx_gain_loss_clp,
    SUM(fx_gain_loss_realized_clp)::numeric AS fx_gain_loss_realized_clp,
    SUM(fx_gain_loss_translation_clp)::numeric AS fx_gain_loss_translation_clp,
    SUM(transaction_count)::int AS transaction_count,
    MAX(last_transaction_at) AS last_transaction_at
  FROM monthly_buckets
  GROUP BY account_id, balance_year, balance_month
)
SELECT
  'acctbal-mo-' || c.account_id || '-' || c.balance_year || '-' || LPAD(c.balance_month::text, 2, '0') AS balance_id,
  c.account_id,
  c.space_id,
  c.balance_year,
  c.balance_month,
  c.currency,
  o.opening_balance,
  c.closing_balance,
  c.closing_balance_clp,
  s.period_inflows,
  s.period_outflows,
  s.fx_gain_loss_clp,
  s.fx_gain_loss_realized_clp,
  s.fx_gain_loss_translation_clp,
  s.transaction_count,
  s.last_transaction_at,
  NOW() AS computed_at
FROM closing_per_month c
JOIN opening_per_month o
  ON o.account_id = c.account_id
  AND o.balance_year = c.balance_year
  AND o.balance_month = c.balance_month
JOIN sums_per_month s
  ON s.account_id = c.account_id
  AND s.balance_year = c.balance_year
  AND s.balance_month = c.balance_month
ON CONFLICT (account_id, balance_year, balance_month) DO UPDATE
SET
  space_id = EXCLUDED.space_id,
  currency = EXCLUDED.currency,
  opening_balance = EXCLUDED.opening_balance,
  closing_balance = EXCLUDED.closing_balance,
  closing_balance_clp = EXCLUDED.closing_balance_clp,
  period_inflows = EXCLUDED.period_inflows,
  period_outflows = EXCLUDED.period_outflows,
  fx_gain_loss_clp = EXCLUDED.fx_gain_loss_clp,
  fx_gain_loss_realized_clp = EXCLUDED.fx_gain_loss_realized_clp,
  fx_gain_loss_translation_clp = EXCLUDED.fx_gain_loss_translation_clp,
  transaction_count = EXCLUDED.transaction_count,
  last_transaction_at = EXCLUDED.last_transaction_at,
  computed_at = NOW();

-- Down Migration
--
-- Down: limpia los rows backfilled. Es DELETE total porque el read model es
-- proyeccion derivada. Si se vuelve a aplicar la migracion, el INSERT lo
-- regenera desde daily.

DELETE FROM greenhouse_finance.account_balances_monthly;
