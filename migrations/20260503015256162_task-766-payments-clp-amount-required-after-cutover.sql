-- Up Migration

-- TASK-766 Slice 2 — CHECK constraint anti-regresión: cualquier futuro
-- INSERT/UPDATE de un payment non-CLP DEBE poblar amount_clp.
--
-- Patrón canónico mismo que TASK-708/728 (`expense_payments_account_required_after_cutover`):
--   * NOT VALID al crear → no escanea filas existentes (cero downtime).
--   * Cutover_date `2026-05-03 00:00:00+00` (post-merge TASK-766).
--   * Cualquier fila INSERTed o UPDATEd después de cutover queda sujeta
--     al constraint; legacy queda libre.
--   * Supersede-axis OR para que filas obsoletas no rompan el check si
--     se actualizan post-cutover.
--
-- VALIDATE CONSTRAINT en mismo migration:
--   * expense_payments: drift count 0 → VALIDATE seguro.
--   * income_payments: drift count 0 (post-backfill 1:1 del slice 2 phase 2) →
--     VALIDATE seguro. Los 21 registros que estaban CLP→CLP NULL ya tienen
--     amount_clp = amount. Cero non-CLP drift.
--
-- Si en el futuro hay drift > 0 al re-aplicar este migration, el VALIDATE
-- explota — eso es el comportamiento esperado (forma deliberada de detectar
-- breakage del helper recordExpensePayment / recordIncomePayment).

-- ── expense_payments ──────────────────────────────────────────────────
ALTER TABLE greenhouse_finance.expense_payments
  ADD CONSTRAINT expense_payments_clp_amount_required_after_cutover
  CHECK (
    currency = 'CLP'
    OR amount_clp IS NOT NULL
    OR superseded_by_payment_id IS NOT NULL
    OR superseded_by_otb_id IS NOT NULL
    OR created_at < '2026-05-03 00:00:00+00'::timestamp with time zone
  ) NOT VALID;

ALTER TABLE greenhouse_finance.expense_payments
  VALIDATE CONSTRAINT expense_payments_clp_amount_required_after_cutover;

-- ── income_payments ───────────────────────────────────────────────────
ALTER TABLE greenhouse_finance.income_payments
  ADD CONSTRAINT income_payments_clp_amount_required_after_cutover
  CHECK (
    currency = 'CLP'
    OR amount_clp IS NOT NULL
    OR superseded_by_payment_id IS NOT NULL
    OR superseded_by_otb_id IS NOT NULL
    OR created_at < '2026-05-03 00:00:00+00'::timestamp with time zone
  ) NOT VALID;

ALTER TABLE greenhouse_finance.income_payments
  VALIDATE CONSTRAINT income_payments_clp_amount_required_after_cutover;


-- Down Migration

ALTER TABLE greenhouse_finance.income_payments
  DROP CONSTRAINT IF EXISTS income_payments_clp_amount_required_after_cutover;

ALTER TABLE greenhouse_finance.expense_payments
  DROP CONSTRAINT IF EXISTS expense_payments_clp_amount_required_after_cutover;
