-- Up Migration
--
-- TASK-979 — Monthly Contractor Payment Run: governance + audit tracking table.
--
-- Tabla append-only que persiste cada corrida mensual de preparación de pagos a
-- contractors. La corrida BARRE los obligations `provider_payroll` (source_kind
-- 'contractor_payable') del período aún no batcheados en una orden y prepara las
-- payment orders agrupadas por moneda en estado `pending_approval` (NO paga sola).
--
-- Persiste:
--   - status canonical: 'running' | 'succeeded' | 'failed'
--   - trigger_source: 'manual' (V1) | 'scheduled' (forward-compat Cloud Scheduler)
--   - prepared_order_ids: las payment orders creadas por esta corrida
--   - totals_by_currency JSONB: {CLP:{payables,netTotal}, USD:{...}} para el surface
--   - cutoff_date: el due_date límite del barrido (cierre mes operativo + 5 hábiles)
--   - timing para forensic + auditoría ("quién corrió la de mayo y qué preparó").
--
-- Pattern fuente canonical Greenhouse: TASK-900 ico_materialization_runs +
-- TASK-848 release_manifests. INSERT-only (anti-UPDATE / anti-DELETE trigger),
-- ownership greenhouse_ops, grants SELECT/INSERT/UPDATE a greenhouse_runtime.
--
-- La idempotencia REAL de la corrida NO vive en esta tabla — vive en el filtro
-- un-ordered (LEFT JOIN payment_order_lines) + el lock UNIQUE de
-- payment_order_lines(obligation_id). Esta tabla es auditoría + observabilidad.
--
-- Migration markers protocolo TASK-768 / ISSUE-068: marker '-- Up Migration'
-- al inicio + anti pre-up DO block que aborta si la tabla no quedó creada.

CREATE TABLE IF NOT EXISTS greenhouse_sync.contractor_payment_runs (
  payment_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  period_year INT NOT NULL CHECK (period_year >= 2020 AND period_year <= 2100),
  period_month INT NOT NULL CHECK (period_month >= 1 AND period_month <= 12),

  trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN (
    'manual',
    'scheduled'
  )),
  triggered_by_user_id TEXT NULL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,

  status TEXT NOT NULL CHECK (status IN (
    'running',
    'succeeded',
    'failed'
  )),

  -- El due_date límite del barrido (cierre mes operativo + 5 días hábiles, TASK-978).
  cutoff_date DATE NULL,

  -- Payment orders preparadas por esta corrida (pueden ser >1: una por moneda).
  prepared_order_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Counts del barrido.
  payables_included INT NULL CHECK (payables_included IS NULL OR payables_included >= 0),
  obligations_swept INT NULL CHECK (obligations_swept IS NULL OR obligations_swept >= 0),

  -- {CLP:{payables:N, netTotal:"123.45"}, USD:{...}} — net total por moneda (una
  -- corrida puede abarcar CLP+USD; nunca un único total cross-currency).
  totals_by_currency JSONB NULL,

  notes TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Tuple invariant: una corrida terminal DEBE tener completed_at.
  CONSTRAINT contractor_payment_runs_terminal_requires_completed_at
    CHECK (
      status NOT IN ('succeeded', 'failed')
      OR completed_at IS NOT NULL
    )
);

-- INDEX canonical para "última corrida del período" (LIMIT 1 DESC O(log n)).
CREATE INDEX IF NOT EXISTS contractor_payment_runs_lookup_idx
  ON greenhouse_sync.contractor_payment_runs (
    period_year,
    period_month,
    started_at DESC
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Extiende el CHECK de greenhouse_hr.contractor_payable_events.event_type con
-- 'payment_order_created' (TASK-792 lo creó sin este valor). La corrida (y
-- cualquier creación de payment order desde la obligación del payable) transiciona
-- el payable obligation_created → payment_order_created y appendea ese evento.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_hr.contractor_payable_events
  DROP CONSTRAINT IF EXISTS contractor_payable_events_event_type_check;

ALTER TABLE greenhouse_hr.contractor_payable_events
  ADD CONSTRAINT contractor_payable_events_event_type_check
  CHECK (event_type IN (
    'created',
    'ready_for_finance',
    'obligation_created',
    'payment_order_created',
    'blocked',
    'cancelled',
    'updated'
  ));

-- Ownership + grants canonical (mirror TASK-900 / TASK-848).
ALTER TABLE greenhouse_sync.contractor_payment_runs OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_sync.contractor_payment_runs
  TO greenhouse_runtime;

-- ────────────────────────────────────────────────────────────────────────────
-- Anti-UPDATE / anti-DELETE triggers (append-only audit trail).
-- Pattern canonical TASK-900 ico_materialization_runs_guard_update.
-- UPDATE allowed only for the `running → succeeded|failed` patch of the same row.
-- DELETE is unconditionally rejected.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_sync.contractor_payment_runs_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.payment_run_id <> NEW.payment_run_id THEN
    RAISE EXCEPTION 'contractor_payment_runs: payment_run_id is immutable';
  END IF;

  IF OLD.period_year <> NEW.period_year
     OR OLD.period_month <> NEW.period_month THEN
    RAISE EXCEPTION 'contractor_payment_runs: period_year/period_month immutable';
  END IF;

  IF OLD.trigger_source <> NEW.trigger_source THEN
    RAISE EXCEPTION 'contractor_payment_runs: trigger_source is immutable';
  END IF;

  IF OLD.started_at <> NEW.started_at THEN
    RAISE EXCEPTION 'contractor_payment_runs: started_at is immutable';
  END IF;

  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'contractor_payment_runs: created_at is immutable';
  END IF;

  IF OLD.status <> 'running' THEN
    RAISE EXCEPTION 'contractor_payment_runs: only running rows may be patched; got status=%', OLD.status;
  END IF;

  IF NEW.status NOT IN ('succeeded', 'failed') THEN
    RAISE EXCEPTION 'contractor_payment_runs: running may only transition to succeeded/failed; got %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_payment_runs_guard_update_trigger
  ON greenhouse_sync.contractor_payment_runs;

CREATE TRIGGER contractor_payment_runs_guard_update_trigger
  BEFORE UPDATE ON greenhouse_sync.contractor_payment_runs
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_sync.contractor_payment_runs_guard_update();

CREATE OR REPLACE FUNCTION greenhouse_sync.contractor_payment_runs_guard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'contractor_payment_runs: rows are append-only; DELETE rejected (payment_run_id=%)', OLD.payment_run_id;
END;
$$;

DROP TRIGGER IF EXISTS contractor_payment_runs_guard_delete_trigger
  ON greenhouse_sync.contractor_payment_runs;

CREATE TRIGGER contractor_payment_runs_guard_delete_trigger
  BEFORE DELETE ON greenhouse_sync.contractor_payment_runs
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_sync.contractor_payment_runs_guard_delete();

-- ────────────────────────────────────────────────────────────────────────────
-- Anti pre-up-marker check (TASK-768 / ISSUE-068 canonical pattern).
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  table_exists BOOLEAN;
  lookup_index_exists BOOLEAN;
  update_trigger_exists BOOLEAN;
  delete_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_sync'
      AND table_name = 'contractor_payment_runs'
  ) INTO table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_sync'
      AND indexname = 'contractor_payment_runs_lookup_idx'
  ) INTO lookup_index_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'contractor_payment_runs_guard_update_trigger'
      AND NOT tgisinternal
  ) INTO update_trigger_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'contractor_payment_runs_guard_delete_trigger'
      AND NOT tgisinternal
  ) INTO delete_trigger_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-979 anti pre-up-marker: greenhouse_sync.contractor_payment_runs was NOT created. Migration markers may be inverted.';
  END IF;

  IF NOT lookup_index_exists THEN
    RAISE EXCEPTION 'TASK-979 anti pre-up-marker: contractor_payment_runs_lookup_idx NOT created.';
  END IF;

  IF NOT update_trigger_exists THEN
    RAISE EXCEPTION 'TASK-979 anti pre-up-marker: contractor_payment_runs_guard_update_trigger NOT created.';
  END IF;

  IF NOT delete_trigger_exists THEN
    RAISE EXCEPTION 'TASK-979 anti pre-up-marker: contractor_payment_runs_guard_delete_trigger NOT created.';
  END IF;
END
$$;

-- Down Migration

-- Restaura el CHECK original de contractor_payable_events.event_type (sin
-- 'payment_order_created'). Revierte sólo la extensión TASK-979.
ALTER TABLE greenhouse_hr.contractor_payable_events
  DROP CONSTRAINT IF EXISTS contractor_payable_events_event_type_check;

ALTER TABLE greenhouse_hr.contractor_payable_events
  ADD CONSTRAINT contractor_payable_events_event_type_check
  CHECK (event_type IN (
    'created',
    'ready_for_finance',
    'obligation_created',
    'blocked',
    'cancelled',
    'updated'
  ));

DROP TRIGGER IF EXISTS contractor_payment_runs_guard_delete_trigger
  ON greenhouse_sync.contractor_payment_runs;

DROP TRIGGER IF EXISTS contractor_payment_runs_guard_update_trigger
  ON greenhouse_sync.contractor_payment_runs;

DROP FUNCTION IF EXISTS greenhouse_sync.contractor_payment_runs_guard_delete();
DROP FUNCTION IF EXISTS greenhouse_sync.contractor_payment_runs_guard_update();

DROP INDEX IF EXISTS greenhouse_sync.contractor_payment_runs_lookup_idx;

DROP TABLE IF EXISTS greenhouse_sync.contractor_payment_runs;
