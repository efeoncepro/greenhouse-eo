-- Up Migration

-- TASK-750 — Payment Orders + Lines + Artifacts V1
--
-- Capa runtime entre obligation y pago real. Una payment_order agrupa
-- N obligations en una orden auditada con maker-checker, scheduling,
-- artifacts (CSV/PDF/hash) y trazabilidad de submission.
--
-- Reglas duras:
--   - Una line apunta 1:1 a una obligation viva. Una obligation puede
--     vivir en N orders SOLO si las anteriores fueron cancelled o failed.
--     (Idempotency partial unique index sobre obligation_id WHERE state
--     NOT IN cancelled/failed).
--   - Order aprobada inmuta sus lines. Cambios crean nueva order +
--     cancel de la anterior. Estados terminales: paid, settled, closed,
--     cancelled, failed.
--   - Maker-checker: created_by != approved_by cuando require_approval.
--   - Cancelar order revierte el lock idempotente de las obligations.
--   - Artifacts (batch CSV, comprobante PDF) tienen content_hash + audit
--     de descargas en download_log_json.

-- ────────────────────────────────────────────────────────────────────
-- Tabla 1: payment_orders
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.payment_orders (
  order_id                 TEXT PRIMARY KEY,
  space_id                 TEXT,
  batch_kind               TEXT NOT NULL CHECK (batch_kind IN (
                             'payroll',
                             'supplier',
                             'tax',
                             'mixed',
                             'manual'
                           )),
  period_id                TEXT,
  title                    TEXT NOT NULL,
  description              TEXT,
  processor_slug           TEXT,
  payment_method           TEXT CHECK (payment_method IN (
                             'bank_transfer',
                             'wire',
                             'paypal',
                             'wise',
                             'deel',
                             'manual_cash',
                             'check',
                             'sii_pec',
                             'other'
                           )),
  source_account_id        TEXT,
  total_amount             NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  currency                 TEXT NOT NULL CHECK (currency IN ('CLP', 'USD')),
  fx_rate_snapshot         NUMERIC(14,6),
  fx_locked_at             TIMESTAMPTZ,
  scheduled_for            DATE,
  due_date                 DATE,
  submitted_at             TIMESTAMPTZ,
  paid_at                  TIMESTAMPTZ,
  state                    TEXT NOT NULL DEFAULT 'draft' CHECK (state IN (
                             'draft',
                             'pending_approval',
                             'approved',
                             'scheduled',
                             'submitted',
                             'paid',
                             'settled',
                             'closed',
                             'failed',
                             'cancelled'
                           )),
  require_approval         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by               TEXT NOT NULL,
  approved_by              TEXT,
  approved_at              TIMESTAMPTZ,
  cancelled_by             TEXT,
  cancelled_reason         TEXT,
  cancelled_at             TIMESTAMPTZ,
  superseded_by            TEXT REFERENCES greenhouse_finance.payment_orders(order_id) DEFERRABLE INITIALLY DEFERRED,
  external_reference       TEXT,
  external_status          TEXT,
  failure_reason           TEXT,
  metadata_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_orders_state_idx
  ON greenhouse_finance.payment_orders (state);

CREATE INDEX IF NOT EXISTS payment_orders_period_idx
  ON greenhouse_finance.payment_orders (period_id, state)
  WHERE period_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_orders_scheduled_idx
  ON greenhouse_finance.payment_orders (scheduled_for, state)
  WHERE scheduled_for IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_orders_due_idx
  ON greenhouse_finance.payment_orders (due_date, state)
  WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_orders_batch_kind_idx
  ON greenhouse_finance.payment_orders (batch_kind, state);

CREATE INDEX IF NOT EXISTS payment_orders_space_idx
  ON greenhouse_finance.payment_orders (space_id)
  WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_orders_external_ref_idx
  ON greenhouse_finance.payment_orders (external_reference)
  WHERE external_reference IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────
-- Tabla 2: payment_order_lines
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.payment_order_lines (
  line_id                  TEXT PRIMARY KEY,
  order_id                 TEXT NOT NULL REFERENCES greenhouse_finance.payment_orders(order_id) ON DELETE CASCADE,
  obligation_id            TEXT NOT NULL REFERENCES greenhouse_finance.payment_obligations(obligation_id),
  beneficiary_type         TEXT NOT NULL,
  beneficiary_id           TEXT NOT NULL,
  beneficiary_name         TEXT,
  obligation_kind          TEXT NOT NULL,
  amount                   NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency                 TEXT NOT NULL CHECK (currency IN ('CLP', 'USD')),
  is_partial               BOOLEAN NOT NULL DEFAULT FALSE,
  state                    TEXT NOT NULL DEFAULT 'pending' CHECK (state IN (
                             'pending',
                             'submitted',
                             'paid',
                             'failed',
                             'cancelled'
                           )),
  failure_reason           TEXT,
  metadata_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_order_lines_obligation_lock_uniq
  ON greenhouse_finance.payment_order_lines (obligation_id)
  WHERE state NOT IN ('cancelled', 'failed');

CREATE INDEX IF NOT EXISTS payment_order_lines_order_idx
  ON greenhouse_finance.payment_order_lines (order_id);

CREATE INDEX IF NOT EXISTS payment_order_lines_state_idx
  ON greenhouse_finance.payment_order_lines (state);

CREATE INDEX IF NOT EXISTS payment_order_lines_beneficiary_idx
  ON greenhouse_finance.payment_order_lines (beneficiary_type, beneficiary_id);

-- ────────────────────────────────────────────────────────────────────
-- Tabla 3: payment_order_artifacts
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.payment_order_artifacts (
  artifact_id              TEXT PRIMARY KEY,
  order_id                 TEXT NOT NULL REFERENCES greenhouse_finance.payment_orders(order_id) ON DELETE CASCADE,
  artifact_kind            TEXT NOT NULL CHECK (artifact_kind IN (
                             'batch_csv',
                             'batch_xml',
                             'submission_proof',
                             'payment_receipt',
                             'reconciliation_evidence',
                             'other'
                           )),
  asset_id                 TEXT,
  content_hash             TEXT,
  content_hash_algorithm   TEXT NOT NULL DEFAULT 'sha256' CHECK (content_hash_algorithm IN ('sha256')),
  file_name                TEXT,
  mime_type                TEXT,
  byte_size                BIGINT CHECK (byte_size IS NULL OR byte_size >= 0),
  download_log_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by             TEXT,
  generated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata_json            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS payment_order_artifacts_order_idx
  ON greenhouse_finance.payment_order_artifacts (order_id);

CREATE INDEX IF NOT EXISTS payment_order_artifacts_kind_idx
  ON greenhouse_finance.payment_order_artifacts (artifact_kind);

CREATE INDEX IF NOT EXISTS payment_order_artifacts_hash_idx
  ON greenhouse_finance.payment_order_artifacts (content_hash)
  WHERE content_hash IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────
-- Triggers updated_at
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_finance.payment_orders_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_orders_updated_at_trigger ON greenhouse_finance.payment_orders;

CREATE TRIGGER payment_orders_updated_at_trigger
  BEFORE UPDATE ON greenhouse_finance.payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.payment_orders_set_updated_at();

DROP TRIGGER IF EXISTS payment_order_lines_updated_at_trigger ON greenhouse_finance.payment_order_lines;

CREATE TRIGGER payment_order_lines_updated_at_trigger
  BEFORE UPDATE ON greenhouse_finance.payment_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.payment_orders_set_updated_at();

-- ────────────────────────────────────────────────────────────────────
-- Trigger maker-checker (defense in depth)
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_finance.assert_payment_order_maker_checker()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.require_approval = TRUE
     AND NEW.state = 'approved'
     AND NEW.approved_by IS NOT NULL
     AND NEW.approved_by = NEW.created_by THEN
    RAISE EXCEPTION
      'TASK-750 maker-checker: approver (%) cannot equal creator (%) when require_approval=TRUE',
      NEW.approved_by, NEW.created_by
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_orders_maker_checker_trigger ON greenhouse_finance.payment_orders;

CREATE TRIGGER payment_orders_maker_checker_trigger
  BEFORE INSERT OR UPDATE ON greenhouse_finance.payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.assert_payment_order_maker_checker();

-- ────────────────────────────────────────────────────────────────────
-- Comments
-- ────────────────────────────────────────────────────────────────────

COMMENT ON TABLE greenhouse_finance.payment_orders IS
  'TASK-750 - Payment orders. Capa runtime entre obligations (TASK-748) y pago real (expense_payments). Group N obligations into a single auditable order with maker-checker, scheduling, artifacts. See docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md.';

COMMENT ON TABLE greenhouse_finance.payment_order_lines IS
  'TASK-750 - Lines link orders to obligations 1:1. Idempotency partial unique index lockea una obligation a UNA order viva a la vez. Cancel/fail libera la obligation.';

COMMENT ON TABLE greenhouse_finance.payment_order_artifacts IS
  'TASK-750 - Artifacts (batch CSV, payment receipt, submission proof) con content_hash + download log para audit completo.';

COMMENT ON COLUMN greenhouse_finance.payment_orders.state IS
  'draft = creando; pending_approval = espera maker-checker; approved = aprobada inmutable; scheduled = lista en calendario; submitted = enviada a banco/processor; paid = ejecutada; settled = conciliada; closed = cerrada audit; failed = error submission; cancelled = revertida.';

COMMENT ON COLUMN greenhouse_finance.payment_orders.batch_kind IS
  'payroll = nomina periodo; supplier = facturas proveedor; tax = SII/Previred; mixed = combinada; manual = ad-hoc.';

COMMENT ON COLUMN greenhouse_finance.payment_order_lines.is_partial IS
  'TRUE cuando amount < obligation.amount. La diff queda como residual.';


-- Down Migration

DROP TRIGGER IF EXISTS payment_orders_maker_checker_trigger ON greenhouse_finance.payment_orders;
DROP FUNCTION IF EXISTS greenhouse_finance.assert_payment_order_maker_checker();
DROP TRIGGER IF EXISTS payment_order_lines_updated_at_trigger ON greenhouse_finance.payment_order_lines;
DROP TRIGGER IF EXISTS payment_orders_updated_at_trigger ON greenhouse_finance.payment_orders;
DROP FUNCTION IF EXISTS greenhouse_finance.payment_orders_set_updated_at();
DROP TABLE IF EXISTS greenhouse_finance.payment_order_artifacts;
DROP TABLE IF EXISTS greenhouse_finance.payment_order_lines;
DROP TABLE IF EXISTS greenhouse_finance.payment_orders;
