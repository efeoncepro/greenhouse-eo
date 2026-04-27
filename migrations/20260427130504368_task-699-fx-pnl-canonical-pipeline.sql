-- Up Migration
--
-- Canonical FX P&L pipeline (TASK-699)
-- =====================================
--
-- The Banco view's "Resultado cambiario" card was always showing $0 because the
-- data model captured ONLY one of the three legitimate FX P&L sources for
-- treasury reporting:
--
--   1. Realized FX from settlements (rate at document vs rate at payment for
--      non-CLP invoices/expenses) — this is what `account_balances.fx_gain_loss_clp`
--      already captures via `getDailyFxGainLoss` summing `income_payments` +
--      `expense_payments`.
--
--   2. Translation FX from balance revaluation (USD/UF/EUR balances marked to
--      market each day as the exchange rate moves) — NEVER captured before. A
--      client with a USD balance saw $0 even when the exchange rate moved.
--
--   3. Realized FX from internal transfers between accounts of different
--      currencies (rate spread vs market rate) — placeholder for now; populated
--      by a follow-up task that introduces `internal_transfers` with rate tracking.
--
-- This migration:
--   - Splits `account_balances.fx_gain_loss_clp` into two real columns:
--     `fx_gain_loss_realized_clp` and `fx_gain_loss_translation_clp`.
--   - Backfills realized from the existing legacy column (the value was 100%
--     realized by construction).
--   - Creates the canonical VIEW `greenhouse_finance.fx_pnl_breakdown` that
--     unifies the 3 sources with a stable shape per account-day.
--   - Documents the canonical equation in column comments to prevent future
--     consumers from re-deriving FX P&L in ad-hoc queries.
--
-- The legacy column `fx_gain_loss_clp` is preserved as the sum
-- `realized + translation` — kept as a denormalized aggregate for backward
-- compatibility (existing consumers in `getBankOverview` and
-- `cash-position/route.ts` keep working without changes).
--
-- ⚠️ FOR AGENTS / FUTURE DEVS:
-- - DO NOT compute FX P&L from raw `income_payments`/`expense_payments` in a
--   new query. Use the VIEW or the helper `src/lib/finance/fx-pnl.ts`.
-- - When a NEW FX source appears (credit notes denominated in foreign currency,
--   forward contracts, etc.), extend BOTH the VIEW and the helper. Never branch
--   the equation in a consumer.
-- - The Reliability Control Plane "Finance FX Reconciliation" signal queries
--   this VIEW. Bypassing it produces inconsistent dashboards.
--
-- Pattern reference: `income_settlement_reconciliation` (migration
-- 20260426135618436) and helper `src/lib/finance/income-settlement.ts` —
-- canonical pattern for "one column composed of N legitimate mechanisms".

SET search_path = greenhouse_finance, public;

ALTER TABLE greenhouse_finance.account_balances
  ADD COLUMN IF NOT EXISTS fx_gain_loss_realized_clp NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fx_gain_loss_translation_clp NUMERIC(14, 2) NOT NULL DEFAULT 0;

-- Backfill: legacy `fx_gain_loss_clp` was 100% realized by construction.
UPDATE greenhouse_finance.account_balances
   SET fx_gain_loss_realized_clp = fx_gain_loss_clp
 WHERE fx_gain_loss_realized_clp = 0
   AND fx_gain_loss_clp <> 0;

CREATE OR REPLACE VIEW greenhouse_finance.fx_pnl_breakdown AS
SELECT
  ab.account_id,
  ab.balance_date,
  ab.currency,
  ab.fx_gain_loss_realized_clp::numeric(14, 2)    AS realized_clp,
  ab.fx_gain_loss_translation_clp::numeric(14, 2) AS translation_clp,
  0::numeric(14, 2)                                AS internal_transfer_clp,
  (
    ab.fx_gain_loss_realized_clp
    + ab.fx_gain_loss_translation_clp
  )::numeric(14, 2) AS total_clp
FROM greenhouse_finance.account_balances ab;

COMMENT ON VIEW greenhouse_finance.fx_pnl_breakdown IS
'Canonical FX P&L breakdown per account-day. Unifies 3 sources: realized (rate doc vs rate pago in payments), translation (mark-to-market revaluation of non-CLP closing balances), and internal transfers (rate spread vs market in cross-currency transfers, placeholder = 0 until follow-up task wires internal_transfers table). Read API: src/lib/finance/fx-pnl.ts. DO NOT re-derive — extend BOTH view + helper when a new source appears. Pattern: income_settlement_reconciliation (TASK-571).';

COMMENT ON COLUMN greenhouse_finance.account_balances.fx_gain_loss_clp IS
'Total FX gain/loss in CLP — denormalized aggregate of fx_gain_loss_realized_clp + fx_gain_loss_translation_clp. Kept for backward compatibility with existing consumers (getBankOverview, /api/finance/cash-position). New consumers MUST use VIEW greenhouse_finance.fx_pnl_breakdown or helper src/lib/finance/fx-pnl.ts.';

COMMENT ON COLUMN greenhouse_finance.account_balances.fx_gain_loss_realized_clp IS
'Realized FX from settlements (rate at document issuance vs rate at payment for non-CLP invoices/expenses). Source: SUM(income_payments.fx_gain_loss_clp + expense_payments.fx_gain_loss_clp) per account-day via getDailyFxGainLoss in src/lib/finance/account-balances.ts.';

COMMENT ON COLUMN greenhouse_finance.account_balances.fx_gain_loss_translation_clp IS
'Translation FX from mark-to-market revaluation of non-CLP closing balances. Computed in materializeAccountBalance as (closing_balance * rate_today) - previous_closing_balance_clp - (period_inflows - period_outflows) * rate_today. Zero by construction for CLP accounts. Zero (with structured warning via captureWithDomain) when resolveExchangeRateToClp fails for a given day — degrades honestly, never blocks materialization.';

GRANT SELECT ON greenhouse_finance.fx_pnl_breakdown TO greenhouse_runtime;
GRANT SELECT ON greenhouse_finance.fx_pnl_breakdown TO greenhouse_migrator;
GRANT SELECT ON greenhouse_finance.fx_pnl_breakdown TO greenhouse_app;

-- Down Migration

SET search_path = greenhouse_finance, public;

DROP VIEW IF EXISTS greenhouse_finance.fx_pnl_breakdown;

ALTER TABLE greenhouse_finance.account_balances
  DROP COLUMN IF EXISTS fx_gain_loss_translation_clp,
  DROP COLUMN IF EXISTS fx_gain_loss_realized_clp;
