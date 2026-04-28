-- Up Migration
--
-- TASK-708 Slice 0 — payment_account_id required after cutover
-- =============================================================
-- Estado actual (2026-04-28):
--   - income_payments: 23 rows con payment_source='nubox_bank_sync' y
--     payment_account_id IS NULL (Cohorte A, runtime live phantoms).
--   - expense_payments: 65 rows con payment_source='manual' prefix
--     'exp-pay-backfill-EXP-NB-*' y payment_account_id IS NULL (Cohorte B,
--     historical backfill phantoms).
--
-- Esos rows son responsabilidad de TASK-708b (historical remediation). Esta
-- task (708) los protege del crecimiento: a partir del cutover timestamp,
-- ningun row nuevo puede insertarse con payment_account_id IS NULL salvo que
-- ya este superseded (caso edge de backfill controlado).
--
-- Cutover timestamp: '2026-04-28 12:38:18.834+00' (matches this migration's
-- UTC filename). Es estable, inmutable y unico — todos los environments lo
-- comparten.
--
-- Estrategia: CHECK condicional `created_at < cutover OR superseded OR
-- payment_account_id IS NOT NULL`. Permite los phantoms historicos (su
-- created_at es anterior al cutover) y exige cuenta para todo lo nuevo.

SET search_path = greenhouse_finance, public;

ALTER TABLE greenhouse_finance.income_payments
  ADD CONSTRAINT income_payments_account_required_after_cutover
  CHECK (
    payment_account_id IS NOT NULL
    OR superseded_by_payment_id IS NOT NULL
    OR superseded_by_otb_id IS NOT NULL
    OR created_at < TIMESTAMPTZ '2026-04-28 12:38:18.834+00'
  );

ALTER TABLE greenhouse_finance.expense_payments
  ADD CONSTRAINT expense_payments_account_required_after_cutover
  CHECK (
    payment_account_id IS NOT NULL
    OR superseded_by_payment_id IS NOT NULL
    OR superseded_by_otb_id IS NOT NULL
    OR created_at < TIMESTAMPTZ '2026-04-28 12:38:18.834+00'
  );

COMMENT ON CONSTRAINT income_payments_account_required_after_cutover
  ON greenhouse_finance.income_payments IS
  'TASK-708 Slice 0: cualquier income_payment creado en/despues del cutover (2026-04-28 12:38:18.834+00) DEBE tener payment_account_id NOT NULL salvo que ya este superseded. Phantoms historicos pre-cutover sobreviven hasta TASK-708b cleanup.';

COMMENT ON CONSTRAINT expense_payments_account_required_after_cutover
  ON greenhouse_finance.expense_payments IS
  'TASK-708 Slice 0: idem income_payments. Tras TASK-708b cleanup + decisión de seguridad, este CHECK puede promoverse a NOT NULL puro (vive como follow-up).';

-- Down Migration

ALTER TABLE greenhouse_finance.expense_payments
  DROP CONSTRAINT IF EXISTS expense_payments_account_required_after_cutover;

ALTER TABLE greenhouse_finance.income_payments
  DROP CONSTRAINT IF EXISTS income_payments_account_required_after_cutover;
