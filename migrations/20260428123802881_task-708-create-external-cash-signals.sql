-- Up Migration
--
-- TASK-708 Slice 0 — D1: external_cash_signals canonical lane
-- ===========================================================
-- Generic write-only lane for external cash signals. Single shape, multi-source
-- via `source_system` discriminator. Replaces the implicit Nubox bank-movement
-- ingest into income_payments / expense_payments. Future sources (Previred,
-- file imports, HubSpot, Stripe) inherit the same shape — no migration of live
-- data required when adding a new source.
--
-- Hard rules enforced structurally:
--   - UNIQUE (source_system, source_event_id) → upstream sync is idempotent.
--   - resolved_account_id FK to accounts(account_id) → cuenta resuelta es real.
--   - space_id FK to spaces(space_id) → tenant isolation.
--   - account_resolution_status / document_kind / resolution_method /
--     promoted_payment_kind enforced via CHECK soft enums (project convention).
--   - signal_id is TEXT app-generated ('signal-<uuid>') matching the project
--     pattern from payment-ledger (`pay-<uuid>`).
--
-- Cross-table invariants (signal ↔ payment) are enforced by trigger in a
-- separate migration (task-708-enforce-promoted-payment-invariant-trigger).

SET search_path = greenhouse_finance, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_finance.external_cash_signals (
  signal_id                  TEXT PRIMARY KEY,
  source_system              TEXT NOT NULL,
  source_event_id            TEXT NOT NULL,
  source_payload_json        JSONB NOT NULL,
  source_observed_at         TIMESTAMPTZ NOT NULL,
  document_kind              TEXT NOT NULL,
  document_id                TEXT,
  signal_date                DATE NOT NULL,
  amount                     NUMERIC(18, 2) NOT NULL,
  currency                   TEXT NOT NULL,
  account_resolution_status  TEXT NOT NULL DEFAULT 'unresolved',
  resolved_account_id        TEXT,
  resolved_at                TIMESTAMPTZ,
  resolved_by_user_id        TEXT,
  resolution_method          TEXT,
  promoted_payment_kind      TEXT,
  promoted_payment_id        TEXT,
  superseded_at              TIMESTAMPTZ,
  superseded_reason          TEXT,
  space_id                   TEXT NOT NULL,
  observed_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT external_cash_signals_source_event_unique
    UNIQUE (source_system, source_event_id),
  CONSTRAINT external_cash_signals_document_kind_check
    CHECK (document_kind IN ('income', 'expense', 'unknown')),
  CONSTRAINT external_cash_signals_account_resolution_status_check
    CHECK (account_resolution_status IN (
      'unresolved',
      'resolved_high_confidence',
      'resolved_low_confidence',
      'adopted',
      'superseded',
      'dismissed'
    )),
  CONSTRAINT external_cash_signals_resolution_method_check
    CHECK (
      resolution_method IS NULL OR resolution_method IN (
        'auto_exact_match',
        'manual_admin',
        'cartola_match',
        'superseded_by_otb'
      )
    ),
  CONSTRAINT external_cash_signals_promoted_payment_kind_check
    CHECK (
      promoted_payment_kind IS NULL OR promoted_payment_kind IN (
        'income_payment',
        'expense_payment'
      )
    ),
  CONSTRAINT external_cash_signals_promoted_pair_check
    CHECK (
      (promoted_payment_id IS NULL AND promoted_payment_kind IS NULL)
      OR (promoted_payment_id IS NOT NULL AND promoted_payment_kind IS NOT NULL)
    ),
  CONSTRAINT external_cash_signals_resolved_pair_check
    CHECK (
      (account_resolution_status IN ('unresolved', 'dismissed', 'superseded'))
      OR (account_resolution_status IN ('resolved_high_confidence', 'resolved_low_confidence', 'adopted')
          AND resolved_account_id IS NOT NULL)
    ),
  CONSTRAINT external_cash_signals_amount_positive
    CHECK (amount > 0),

  CONSTRAINT external_cash_signals_resolved_account_fkey
    FOREIGN KEY (resolved_account_id)
    REFERENCES greenhouse_finance.accounts (account_id)
    ON DELETE SET NULL,
  CONSTRAINT external_cash_signals_space_fkey
    FOREIGN KEY (space_id)
    REFERENCES greenhouse_core.spaces (space_id)
    ON DELETE RESTRICT
);

-- Hot path indexes
CREATE INDEX IF NOT EXISTS idx_external_cash_signals_status_space
  ON greenhouse_finance.external_cash_signals (account_resolution_status, space_id, source_system);

CREATE INDEX IF NOT EXISTS idx_external_cash_signals_unresolved
  ON greenhouse_finance.external_cash_signals (source_system, space_id, signal_date DESC)
  WHERE account_resolution_status = 'unresolved';

CREATE INDEX IF NOT EXISTS idx_external_cash_signals_document
  ON greenhouse_finance.external_cash_signals (document_kind, document_id)
  WHERE document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_cash_signals_promoted_payment
  ON greenhouse_finance.external_cash_signals (promoted_payment_kind, promoted_payment_id)
  WHERE promoted_payment_id IS NOT NULL;

-- updated_at trigger (project convention)
CREATE OR REPLACE FUNCTION greenhouse_finance.fn_external_cash_signals_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_external_cash_signals_touch_updated_at
  ON greenhouse_finance.external_cash_signals;

CREATE TRIGGER trg_external_cash_signals_touch_updated_at
  BEFORE UPDATE ON greenhouse_finance.external_cash_signals
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.fn_external_cash_signals_touch_updated_at();

COMMENT ON TABLE greenhouse_finance.external_cash_signals IS
  'TASK-708 D1: lane canonica generica de senales de cash externas (Nubox bank movements, Previred, file imports, HubSpot, Stripe, manual admin). El sync externo ESCRIBE aca; nunca toca income_payments / expense_payments directamente. Promocion a payment canonico ocurre solo via auto-adopt (D3 + D5) o manual admin con capability finance.cash.adopt-external-signal.';

COMMENT ON COLUMN greenhouse_finance.external_cash_signals.source_event_id IS
  'ID upstream que identifica el evento de forma idempotente (nubox_movement_id, previred_planilla_id, etc.). UNIQUE (source_system, source_event_id) garantiza que un sync corra N veces sin duplicar.';

COMMENT ON COLUMN greenhouse_finance.external_cash_signals.account_resolution_status IS
  'Estado de resolucion de cuenta canonica Greenhouse. unresolved = sin cuenta. resolved_high_confidence = una sola regla D5 matcheo. resolved_low_confidence = match heuristico (no auto-adopt). adopted = ya creo payment canonico. superseded = reemplazada por otra senal/payment. dismissed = descartada manual.';

COMMENT ON COLUMN greenhouse_finance.external_cash_signals.promoted_payment_id IS
  'TASK-708 D4: cuando la senal genera cash canonico Greenhouse, este campo apunta al payment_id correspondiente. Soft FK polymorphic (income_payments o expense_payments segun promoted_payment_kind). Invariante cruzada via trigger fn_enforce_promoted_payment_invariant.';

-- Down Migration
--
-- Note: external_cash_signals contiene audit data sensible. Down migration solo
-- es seguro si no hay rows. En produccion el rollback adecuado es desactivar
-- el path de escritura (feature flag NUBOX_CASH_WRITES_ENABLED) y dejar la
-- tabla intacta para audit.

DROP TRIGGER IF EXISTS trg_external_cash_signals_touch_updated_at
  ON greenhouse_finance.external_cash_signals;
DROP FUNCTION IF EXISTS greenhouse_finance.fn_external_cash_signals_touch_updated_at();

DROP INDEX IF EXISTS greenhouse_finance.idx_external_cash_signals_status_space;
DROP INDEX IF EXISTS greenhouse_finance.idx_external_cash_signals_unresolved;
DROP INDEX IF EXISTS greenhouse_finance.idx_external_cash_signals_document;
DROP INDEX IF EXISTS greenhouse_finance.idx_external_cash_signals_promoted_payment;

DROP TABLE IF EXISTS greenhouse_finance.external_cash_signals;
