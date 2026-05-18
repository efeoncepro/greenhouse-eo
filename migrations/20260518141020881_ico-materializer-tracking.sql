-- Up Migration
--
-- TASK-900 — ICO Materializer Hardening: governance + audit tracking table.
--
-- Tabla append-only que persiste cada corrida del materializer ICO con:
--   - status canonical: 'running' | 'succeeded' | 'skipped_safety' | 'failed'
--   - blocking_signals JSONB cuando status='skipped_safety' (qué signal fuente
--     gateó la corrida)
--   - timing para forensic + lookup `last_materialization_at` desde el
--     incremental delta filter (Slice 4)
--
-- Pattern fuente canonical Greenhouse: TASK-848 release_manifests + TASK-849
-- release_watchdog_alert_state. INSERT-only (anti-UPDATE / anti-DELETE trigger),
-- ownership greenhouse_ops, grants SELECT/INSERT a greenhouse_runtime.
--
-- Migration markers protocolo TASK-768 / ISSUE-068: marker '-- Up Migration'
-- al inicio + anti pre-up DO block que aborta si la tabla no quedó creada.

CREATE TABLE IF NOT EXISTS greenhouse_sync.ico_materialization_runs (
  materialization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  table_name TEXT NOT NULL CHECK (table_name IN (
    'metrics_by_member',
    'metrics_by_project',
    'metrics_by_sprint',
    'metrics_by_organization',
    'metrics_by_business_unit'
  )),

  period_year INT NOT NULL CHECK (period_year >= 2020 AND period_year <= 2100),
  period_month INT NOT NULL CHECK (period_month >= 1 AND period_month <= 12),

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,

  status TEXT NOT NULL CHECK (status IN (
    'running',
    'succeeded',
    'skipped_safety',
    'failed'
  )),

  rows_merged INT NULL CHECK (rows_merged IS NULL OR rows_merged >= 0),
  rows_inserted INT NULL CHECK (rows_inserted IS NULL OR rows_inserted >= 0),

  -- JSONB array de BlockingSignalSummary cuando status='skipped_safety':
  --   [{signalId, severity, label, summary}]
  -- NULL para succeeded / failed / running.
  blocking_signals JSONB NULL,

  notes TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Tuple invariants. CHECK constraints aplican a la fila completa:
  CONSTRAINT ico_materialization_runs_skipped_requires_blocking_signals
    CHECK (
      status <> 'skipped_safety' OR blocking_signals IS NOT NULL
    ),
  CONSTRAINT ico_materialization_runs_succeeded_requires_completed_at
    CHECK (
      status NOT IN ('succeeded', 'failed', 'skipped_safety')
      OR completed_at IS NOT NULL
    )
);

-- INDEX canonical para `getLastSuccessfulMaterializationAt({tableName, periodYear, periodMonth})`.
-- Composite ordenado para que LIMIT 1 DESC sea O(log n) directo.
CREATE INDEX IF NOT EXISTS ico_materialization_runs_lookup_idx
  ON greenhouse_sync.ico_materialization_runs (
    table_name,
    period_year,
    period_month,
    started_at DESC
  );

-- INDEX parcial para signal reader (cuenta skipped_safety en ventana 24h).
CREATE INDEX IF NOT EXISTS ico_materialization_runs_skipped_safety_recent_idx
  ON greenhouse_sync.ico_materialization_runs (started_at DESC)
  WHERE status = 'skipped_safety';

-- Ownership + grants canonical (mirror TASK-848 release_manifests).
ALTER TABLE greenhouse_sync.ico_materialization_runs OWNER TO greenhouse_ops;

GRANT SELECT, INSERT ON greenhouse_sync.ico_materialization_runs
  TO greenhouse_runtime;

-- ────────────────────────────────────────────────────────────────────────────
-- Anti-UPDATE / anti-DELETE triggers (append-only audit trail).
-- Pattern canonical TASK-848 release_state_transitions_no_update.
-- ────────────────────────────────────────────────────────────────────────────

-- UPDATE allowed only for the `running → succeeded|failed` transition of the
-- same row (worker patchea completed_at + rows_merged + status). Other UPDATEs
-- are rejected to preserve audit. DELETE is unconditionally rejected.

CREATE OR REPLACE FUNCTION greenhouse_sync.ico_materialization_runs_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.materialization_id <> NEW.materialization_id THEN
    RAISE EXCEPTION 'ico_materialization_runs: materialization_id is immutable';
  END IF;

  IF OLD.table_name <> NEW.table_name THEN
    RAISE EXCEPTION 'ico_materialization_runs: table_name is immutable';
  END IF;

  IF OLD.period_year <> NEW.period_year
     OR OLD.period_month <> NEW.period_month THEN
    RAISE EXCEPTION 'ico_materialization_runs: period_year/period_month immutable';
  END IF;

  IF OLD.started_at <> NEW.started_at THEN
    RAISE EXCEPTION 'ico_materialization_runs: started_at is immutable';
  END IF;

  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'ico_materialization_runs: created_at is immutable';
  END IF;

  IF OLD.status <> 'running' THEN
    RAISE EXCEPTION 'ico_materialization_runs: only running rows may be patched; got status=%', OLD.status;
  END IF;

  IF NEW.status NOT IN ('succeeded', 'failed', 'skipped_safety') THEN
    RAISE EXCEPTION 'ico_materialization_runs: running may only transition to succeeded/failed/skipped_safety; got %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ico_materialization_runs_guard_update_trigger
  ON greenhouse_sync.ico_materialization_runs;

CREATE TRIGGER ico_materialization_runs_guard_update_trigger
  BEFORE UPDATE ON greenhouse_sync.ico_materialization_runs
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_sync.ico_materialization_runs_guard_update();

CREATE OR REPLACE FUNCTION greenhouse_sync.ico_materialization_runs_guard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ico_materialization_runs: rows are append-only; DELETE rejected (materialization_id=%)', OLD.materialization_id;
END;
$$;

DROP TRIGGER IF EXISTS ico_materialization_runs_guard_delete_trigger
  ON greenhouse_sync.ico_materialization_runs;

CREATE TRIGGER ico_materialization_runs_guard_delete_trigger
  BEFORE DELETE ON greenhouse_sync.ico_materialization_runs
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_sync.ico_materialization_runs_guard_delete();

-- ────────────────────────────────────────────────────────────────────────────
-- Anti pre-up-marker check (TASK-768 / ISSUE-068 canonical pattern).
-- Aborta si los markers de migration quedaron invertidos y la tabla/index/
-- triggers no fueron creados.
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  table_exists BOOLEAN;
  lookup_index_exists BOOLEAN;
  skipped_index_exists BOOLEAN;
  update_trigger_exists BOOLEAN;
  delete_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_sync'
      AND table_name = 'ico_materialization_runs'
  ) INTO table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_sync'
      AND indexname = 'ico_materialization_runs_lookup_idx'
  ) INTO lookup_index_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_sync'
      AND indexname = 'ico_materialization_runs_skipped_safety_recent_idx'
  ) INTO skipped_index_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'ico_materialization_runs_guard_update_trigger'
      AND NOT tgisinternal
  ) INTO update_trigger_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'ico_materialization_runs_guard_delete_trigger'
      AND NOT tgisinternal
  ) INTO delete_trigger_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-900 anti pre-up-marker: greenhouse_sync.ico_materialization_runs was NOT created. Migration markers may be inverted.';
  END IF;

  IF NOT lookup_index_exists THEN
    RAISE EXCEPTION 'TASK-900 anti pre-up-marker: ico_materialization_runs_lookup_idx NOT created.';
  END IF;

  IF NOT skipped_index_exists THEN
    RAISE EXCEPTION 'TASK-900 anti pre-up-marker: ico_materialization_runs_skipped_safety_recent_idx NOT created.';
  END IF;

  IF NOT update_trigger_exists THEN
    RAISE EXCEPTION 'TASK-900 anti pre-up-marker: ico_materialization_runs_guard_update_trigger NOT created.';
  END IF;

  IF NOT delete_trigger_exists THEN
    RAISE EXCEPTION 'TASK-900 anti pre-up-marker: ico_materialization_runs_guard_delete_trigger NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS ico_materialization_runs_guard_delete_trigger
  ON greenhouse_sync.ico_materialization_runs;

DROP TRIGGER IF EXISTS ico_materialization_runs_guard_update_trigger
  ON greenhouse_sync.ico_materialization_runs;

DROP FUNCTION IF EXISTS greenhouse_sync.ico_materialization_runs_guard_delete();
DROP FUNCTION IF EXISTS greenhouse_sync.ico_materialization_runs_guard_update();

DROP INDEX IF EXISTS greenhouse_sync.ico_materialization_runs_skipped_safety_recent_idx;
DROP INDEX IF EXISTS greenhouse_sync.ico_materialization_runs_lookup_idx;

DROP TABLE IF EXISTS greenhouse_sync.ico_materialization_runs;
