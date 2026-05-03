-- Up Migration

-- TASK-751 — Wireup payment_order_lines ↔ expense_payments
--
-- Cuando una payment_order pasa a 'paid' (TASK-750), un consumer reactive
-- llama recordExpensePayment() por cada line para cerrar el ciclo:
-- order.line.paid → expense_payment + settlement_leg + reconciliation
-- ready. Esta migration agrega el link bidireccional para idempotency
-- y queries reverse.
--
-- Reglas:
--   - Ambas columnas son NULLABLE: una expense_payment puede existir sin
--     order (registrada manualmente por el operator legacy path).
--   - FK con ON DELETE SET NULL: cancelar la order no borra el pago real
--     (que ya ocurrió en el banco).
--   - Idempotency key: payment_order_line_id es UNIQUE en expense_payments
--     (NULL multi-permitido en partial unique).

ALTER TABLE greenhouse_finance.expense_payments
  ADD COLUMN IF NOT EXISTS payment_order_line_id TEXT
    REFERENCES greenhouse_finance.payment_order_lines(line_id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE greenhouse_finance.payment_order_lines
  ADD COLUMN IF NOT EXISTS expense_payment_id TEXT
    REFERENCES greenhouse_finance.expense_payments(payment_id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

-- Idempotency: una line sólo genera UN expense_payment vivo.
CREATE UNIQUE INDEX IF NOT EXISTS expense_payments_payment_order_line_uniq
  ON greenhouse_finance.expense_payments (payment_order_line_id)
  WHERE payment_order_line_id IS NOT NULL
    AND superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL;

CREATE INDEX IF NOT EXISTS payment_order_lines_expense_payment_idx
  ON greenhouse_finance.payment_order_lines (expense_payment_id)
  WHERE expense_payment_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.expense_payments.payment_order_line_id IS
  'TASK-751 - Link al payment_order_line que disparo este expense_payment. NULL para pagos legacy registrados directamente sin pasar por order. Partial unique: solo 1 expense_payment vivo por line (excluyendo superseded).';

COMMENT ON COLUMN greenhouse_finance.payment_order_lines.expense_payment_id IS
  'TASK-751 - Link reverse al expense_payment generado al ejecutar la order. Permite queries fast desde la order al ledger sin join via metadata. ON DELETE SET NULL: cancelar la line no borra el payment.';


-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.payment_order_lines_expense_payment_idx;
DROP INDEX IF EXISTS greenhouse_finance.expense_payments_payment_order_line_uniq;

ALTER TABLE greenhouse_finance.payment_order_lines
  DROP COLUMN IF EXISTS expense_payment_id;

ALTER TABLE greenhouse_finance.expense_payments
  DROP COLUMN IF EXISTS payment_order_line_id;
