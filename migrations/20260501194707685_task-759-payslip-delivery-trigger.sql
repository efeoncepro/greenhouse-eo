-- TASK-759 — Payslip delivery trigger split lifecycle.
--
-- Adds audit columns to payroll_receipts so we can trace which event triggered
-- each email send: 'period_exported' (legacy, current behavior), 'payment_paid'
-- (new, when treasury executes the order), or 'manual_resend' (operator action).
--
-- Additive only — preserves all existing rows. Backfills email_sent rows to
-- 'period_exported' since that is the legacy behavior.
--
-- Spec: docs/tasks/in-progress/TASK-759-payslip-delivery-on-payment-paid.md

-- Up Migration

ALTER TABLE greenhouse_payroll.payroll_receipts
  ADD COLUMN IF NOT EXISTS delivery_trigger TEXT,
  ADD COLUMN IF NOT EXISTS payment_order_line_id TEXT;

ALTER TABLE greenhouse_payroll.payroll_receipts
  DROP CONSTRAINT IF EXISTS payroll_receipts_delivery_trigger_check;

ALTER TABLE greenhouse_payroll.payroll_receipts
  ADD CONSTRAINT payroll_receipts_delivery_trigger_check
    CHECK (
      delivery_trigger IS NULL
      OR delivery_trigger IN ('period_exported', 'payment_paid', 'manual_resend')
    );

ALTER TABLE greenhouse_payroll.payroll_receipts
  DROP CONSTRAINT IF EXISTS payroll_receipts_payment_order_line_fk;

ALTER TABLE greenhouse_payroll.payroll_receipts
  ADD CONSTRAINT payroll_receipts_payment_order_line_fk
    FOREIGN KEY (payment_order_line_id)
    REFERENCES greenhouse_finance.payment_order_lines(line_id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payroll_receipts_payment_order_line_idx
  ON greenhouse_payroll.payroll_receipts (payment_order_line_id)
  WHERE payment_order_line_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payroll_receipts_delivery_trigger_idx
  ON greenhouse_payroll.payroll_receipts (delivery_trigger, email_sent_at DESC)
  WHERE delivery_trigger IS NOT NULL;

-- Backfill: rows already sent today were sent via the legacy export trigger.
UPDATE greenhouse_payroll.payroll_receipts
   SET delivery_trigger = 'period_exported'
 WHERE email_sent_at IS NOT NULL
   AND delivery_trigger IS NULL;

COMMENT ON COLUMN greenhouse_payroll.payroll_receipts.delivery_trigger IS
  'TASK-759 — which lifecycle event triggered the email send. NULL = PDF generated but not yet emailed.';

COMMENT ON COLUMN greenhouse_payroll.payroll_receipts.payment_order_line_id IS
  'TASK-759 — when delivery_trigger = payment_paid, links to the payment_order_line that triggered the send. NULL otherwise.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_payroll.payroll_receipts_delivery_trigger_idx;
DROP INDEX IF EXISTS greenhouse_payroll.payroll_receipts_payment_order_line_idx;

ALTER TABLE greenhouse_payroll.payroll_receipts
  DROP CONSTRAINT IF EXISTS payroll_receipts_payment_order_line_fk;

ALTER TABLE greenhouse_payroll.payroll_receipts
  DROP CONSTRAINT IF EXISTS payroll_receipts_delivery_trigger_check;

ALTER TABLE greenhouse_payroll.payroll_receipts
  DROP COLUMN IF EXISTS payment_order_line_id,
  DROP COLUMN IF EXISTS delivery_trigger;
