-- Up Migration

-- TASK-766 Slice 2 — Backfill defensivo del amount_clp para registros
-- legacy + columna requires_fx_repair para non-CLP sin amount_clp.
--
-- Estado actual confirmado vía SQL discovery (2026-05-02):
--   * expense_payments: 0 filas con currency='CLP' AND amount_clp IS NULL
--     (clean) y 0 filas con currency!='CLP' AND amount_clp IS NULL
--   * income_payments: 21 filas con currency='CLP' AND amount_clp IS NULL
--     (backfill 1:1 trivial seguro) y 0 filas non-CLP sin amount_clp
--
-- Patrón: mismo template que TASK-708b (cascade-supersede backfill) —
-- aditivo + idempotente + atomic.

-- ── Phase 1: agregar columna requires_fx_repair (default FALSE) ────────
ALTER TABLE greenhouse_finance.expense_payments
  ADD COLUMN IF NOT EXISTS requires_fx_repair BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE greenhouse_finance.income_payments
  ADD COLUMN IF NOT EXISTS requires_fx_repair BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Phase 2: backfill 1:1 seguro (solo CLP→CLP donde amount_clp IS NULL) ──
-- Caso trivialmente seguro: si la moneda nativa es CLP, amount == amount_clp.
-- No requiere FX resolution. Idempotente (re-run no afecta filas ya con valor).
UPDATE greenhouse_finance.expense_payments
   SET amount_clp = amount
 WHERE currency = 'CLP'
   AND amount_clp IS NULL;

UPDATE greenhouse_finance.income_payments
   SET amount_clp = amount
 WHERE currency = 'CLP'
   AND amount_clp IS NULL;

-- ── Phase 3: marcar drift residual (non-CLP sin amount_clp) ────────────
-- Estos registros requieren FX resolution histórico (vía resolveExchangeRateToClp
-- con payment_date) — el repair endpoint del slice 5 los procesa.
UPDATE greenhouse_finance.expense_payments
   SET requires_fx_repair = TRUE
 WHERE currency <> 'CLP'
   AND amount_clp IS NULL
   AND superseded_by_payment_id IS NULL
   AND superseded_by_otb_id IS NULL
   AND superseded_at IS NULL;

UPDATE greenhouse_finance.income_payments
   SET requires_fx_repair = TRUE
 WHERE currency <> 'CLP'
   AND amount_clp IS NULL
   AND superseded_by_payment_id IS NULL
   AND superseded_by_otb_id IS NULL
   AND superseded_at IS NULL;

-- ── Phase 4: indexes parciales para signal queries + repair endpoint ───
CREATE INDEX IF NOT EXISTS expense_payments_requires_fx_repair_idx
  ON greenhouse_finance.expense_payments (requires_fx_repair, payment_date)
  WHERE requires_fx_repair = TRUE;

CREATE INDEX IF NOT EXISTS income_payments_requires_fx_repair_idx
  ON greenhouse_finance.income_payments (requires_fx_repair, payment_date)
  WHERE requires_fx_repair = TRUE;


-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.income_payments_requires_fx_repair_idx;
DROP INDEX IF EXISTS greenhouse_finance.expense_payments_requires_fx_repair_idx;

-- NOTA: no revertimos los UPDATEs del backfill — el down sería destructivo
-- y los CLP→CLP backfilled son canónicos. La columna requires_fx_repair
-- queda removida; cualquier consumer del flag debería estar quitado primero.
ALTER TABLE greenhouse_finance.income_payments
  DROP COLUMN IF EXISTS requires_fx_repair;

ALTER TABLE greenhouse_finance.expense_payments
  DROP COLUMN IF EXISTS requires_fx_repair;
