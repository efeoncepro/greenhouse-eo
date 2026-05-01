-- TASK-759 V2 — Payslip deliveries table foundation.
--
-- Separa el lifecycle del PDF (artefacto en payroll_receipts) del lifecycle
-- de los envíos (mensajes individuales en payslip_deliveries). Un PDF
-- puede generar N deliveries: committed (promesa pre-pago), paid (recibo
-- final), cancelled (notificación de cancelación), revised (ajuste),
-- manual_resend (reenvío operativo).
--
-- Backfill: rows existentes en payroll_receipts con email_sent_at NOT NULL
-- generan 1 delivery row por receipt usando delivery_trigger como kind.

-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_payroll.payslip_deliveries (
  delivery_id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_receipts(receipt_id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_entries(entry_id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  period_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,

  delivery_kind TEXT NOT NULL,
  payment_order_id TEXT REFERENCES greenhouse_finance.payment_orders(order_id) ON DELETE SET NULL,
  payment_order_line_id TEXT REFERENCES greenhouse_finance.payment_order_lines(line_id) ON DELETE SET NULL,

  source_event_id TEXT,
  triggered_by_user_id TEXT,

  status TEXT NOT NULL,
  email_recipient TEXT,
  email_subject TEXT,
  email_provider_id TEXT,
  error_message TEXT,

  template_version TEXT,

  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  superseded_by TEXT REFERENCES greenhouse_payroll.payslip_deliveries(delivery_id) ON DELETE SET NULL,

  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE greenhouse_payroll.payslip_deliveries
  DROP CONSTRAINT IF EXISTS payslip_deliveries_kind_check;
ALTER TABLE greenhouse_payroll.payslip_deliveries
  ADD CONSTRAINT payslip_deliveries_kind_check
    CHECK (delivery_kind IN (
      'period_exported',
      'payment_committed',
      'payment_paid',
      'payment_cancelled',
      'payment_revised',
      'manual_resend'
    ));

ALTER TABLE greenhouse_payroll.payslip_deliveries
  DROP CONSTRAINT IF EXISTS payslip_deliveries_status_check;
ALTER TABLE greenhouse_payroll.payslip_deliveries
  ADD CONSTRAINT payslip_deliveries_status_check
    CHECK (status IN ('queued', 'sent', 'failed', 'skipped', 'superseded'));

-- Idempotency: 1 delivery activo por (entry, kind) — los manual_resend van
-- como rows nuevos cada vez. Implementado por partial unique index gated
-- por kinds idempotentes.
CREATE UNIQUE INDEX IF NOT EXISTS payslip_deliveries_unique_active_idempotent
  ON greenhouse_payroll.payslip_deliveries (entry_id, delivery_kind)
  WHERE delivery_kind IN ('period_exported', 'payment_committed', 'payment_paid', 'payment_cancelled', 'payment_revised')
    AND superseded_by IS NULL
    AND status IN ('sent', 'queued');

CREATE INDEX IF NOT EXISTS payslip_deliveries_receipt_idx
  ON greenhouse_payroll.payslip_deliveries (receipt_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payslip_deliveries_entry_idx
  ON greenhouse_payroll.payslip_deliveries (entry_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payslip_deliveries_member_period_idx
  ON greenhouse_payroll.payslip_deliveries (member_id, period_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payslip_deliveries_payment_order_idx
  ON greenhouse_payroll.payslip_deliveries (payment_order_id, delivery_kind)
  WHERE payment_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payslip_deliveries_failed_idx
  ON greenhouse_payroll.payslip_deliveries (failed_at DESC, status)
  WHERE status = 'failed';

COMMENT ON TABLE greenhouse_payroll.payslip_deliveries IS
  'TASK-759 V2 — Append-only ledger de envíos de comunicaciones de nómina al colaborador. Cada PDF (payroll_receipts) puede tener N deliveries (committed promise + paid receipt + revisions + manual resends).';

COMMENT ON COLUMN greenhouse_payroll.payslip_deliveries.delivery_kind IS
  'Tipo de comunicación: period_exported (legacy), payment_committed (759b), payment_paid (759 V1), payment_cancelled (759c), payment_revised (759c future), manual_resend.';

COMMENT ON COLUMN greenhouse_payroll.payslip_deliveries.superseded_by IS
  'Si esta delivery fue reemplazada por un revised/cancelled posterior, FK a la nueva. NULL = activa. Audit chain preservado.';

-- Backfill: 1 delivery row por cada payroll_receipts con email enviado o fallido.
-- Usa delivery_trigger como kind (default period_exported para legacy).
INSERT INTO greenhouse_payroll.payslip_deliveries (
  delivery_id, receipt_id, entry_id, member_id, period_id,
  delivery_kind, payment_order_line_id,
  source_event_id, status, email_recipient, email_provider_id,
  template_version, sent_at, failed_at, error_message,
  created_at, updated_at
)
SELECT
  'pdv-backfill-' || receipt_id || '-' || COALESCE(delivery_trigger, 'period_exported') AS delivery_id,
  receipt_id,
  entry_id,
  member_id,
  period_id,
  COALESCE(delivery_trigger, 'period_exported') AS delivery_kind,
  payment_order_line_id,
  source_event_id,
  CASE
    WHEN status = 'email_sent' THEN 'sent'
    WHEN status = 'email_failed' THEN 'failed'
    ELSE 'queued'
  END AS status,
  email_recipient,
  email_delivery_id,
  template_version,
  email_sent_at,
  CASE WHEN status = 'email_failed' THEN COALESCE(updated_at, created_at) ELSE NULL END,
  email_error,
  COALESCE(email_sent_at, created_at),
  updated_at
FROM greenhouse_payroll.payroll_receipts
WHERE email_sent_at IS NOT NULL OR email_error IS NOT NULL
ON CONFLICT (delivery_id) DO NOTHING;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_payroll.payslip_deliveries CASCADE;
