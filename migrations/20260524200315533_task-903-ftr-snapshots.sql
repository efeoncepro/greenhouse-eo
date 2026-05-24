-- Up Migration

-- ════════════════════════════════════════════════════════════════════════════
-- TASK-903 Slice 0 — FTR snapshot foundation (sibling de TASK-916 task_rpa_snapshots)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Tabla per-task snapshot canonical para el pipeline FTR writeback PRODUCTIVO
-- (Efeonce + Sky). Clone + repoint de `task_rpa_snapshots` (TASK-916), NO
-- rediseño. Cada compute reactivo persiste un snapshot per task con resultado de
-- `calculateFtr` (delega a `calculateRpaV2` → `countCorrectionTransitions`, lee
-- `task_status_transitions`) + forensic trail (source_event_id + computed_at +
-- formula_version + rpa_value/rpa_data_status que produjo el veredicto).
--
-- FTR es derivada pura de RpA: `FTR = RpA.value === 0 ? 'pass' : 'fail'`. Por eso
-- el snapshot guarda tanto el veredicto FTR (`ftr_value`) como el RpA subyacente
-- (`rpa_value`/`rpa_data_status`) para audit forensic full reproducibility.
--
-- Diferencias vs el sibling RpA (clone + repoint):
-- - `ftr_value TEXT NULL CHECK (ftr_value IN ('pass','fail'))` (NO `rpa_value INTEGER`
--   como columna primaria — rpa_value queda como forensic)
-- - `ftr_data_status` como columna primaria (preserva `rpa_data_status` forensic)
-- - `formula_version DEFAULT 'ftr_v1.0'` (NO `rpa_v2.0`)
-- - Nombres de índices/triggers/funciones `task_ftr_snapshots_*`
--
-- Idéntico al RpA sibling: workspace_id CHECK IN ('efeonce','sky') (sin demo —
-- FTR no tiene carril demo), triggers append-only (excepto columnas writeback),
-- grants, índices (source_event UNIQUE parcial, task_latest, writeback_pending,
-- paridad). El writeback (Slice 2) escribe la propiedad Notion select `[GH] FTR`.
--
-- Spec canónica: TASK-903 (clone de TASK-916) + FTR_V1.md §9 writeback.
-- Pattern fuente: migration TASK-916 20260521182825984 (task_rpa_snapshots).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS greenhouse_delivery.task_ftr_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  task_source_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL CHECK (workspace_id IN ('efeonce', 'sky')),

  -- TASK-909 calculateFtr result canonical shape (veredicto binario)
  ftr_value TEXT NULL CHECK (ftr_value IN ('pass', 'fail')),
  ftr_data_status TEXT NOT NULL CHECK (ftr_data_status IN (
    'valid',
    'unavailable',
    'low_confidence'
  )),

  -- Forensic del RpA subyacente que produjo el veredicto FTR (full reproducibility)
  rpa_value INTEGER NULL,
  rpa_data_status TEXT NULL CHECK (rpa_data_status IS NULL OR rpa_data_status IN (
    'valid',
    'unavailable',
    'low_confidence',
    'suppressed'
  )),
  source_mode TEXT NOT NULL CHECK (source_mode IN ('canonical', 'unavailable')),

  -- Forensic trail canonical (mirror task_rpa_snapshots)
  formula_version TEXT NOT NULL DEFAULT 'ftr_v1.0',
  source_event_id TEXT NULL,
  source_event_received_at TIMESTAMPTZ NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Writeback Notion tracking (populated by Slice 2 worker post-PATCH success)
  written_to_notion_at TIMESTAMPTZ NULL,
  notion_writeback_event_id TEXT NULL,
  notion_writeback_attempt_count INTEGER NOT NULL DEFAULT 0
    CHECK (notion_writeback_attempt_count >= 0),
  notion_writeback_last_error TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_delivery.task_ftr_snapshots IS
  'TASK-903 Slice 0 — Append-only snapshot per-task del compute FTR PRODUCTIVO (calculateFtr, derivada pura de calculateRpaV2). CHECK workspace_id IN (efeonce,sky) enforce. Triggers anti-UPDATE/DELETE excepto columns writeback. Idempotent UNIQUE source_event_id partial. Sibling de task_rpa_snapshots (TASK-916).';

-- ────────────────────────────────────────────────────────────────────────────
-- Indexes canonical (mirror task_rpa_snapshots)
-- ────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS task_ftr_snapshots_source_event_id_unique_idx
  ON greenhouse_delivery.task_ftr_snapshots (source_event_id)
  WHERE source_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS task_ftr_snapshots_task_latest_idx
  ON greenhouse_delivery.task_ftr_snapshots (task_source_id, computed_at DESC);

-- Writeback pending queue (Slice 2 worker): rows con ftr_value writable pendientes
CREATE INDEX IF NOT EXISTS task_ftr_snapshots_writeback_pending_idx
  ON greenhouse_delivery.task_ftr_snapshots (created_at ASC)
  WHERE written_to_notion_at IS NULL AND ftr_data_status = 'valid' AND ftr_value IS NOT NULL;

-- Paridad signal: writeback success rows con ftr_value para diff
CREATE INDEX IF NOT EXISTS task_ftr_snapshots_paridad_idx
  ON greenhouse_delivery.task_ftr_snapshots (task_source_id, written_to_notion_at DESC)
  WHERE written_to_notion_at IS NOT NULL AND ftr_data_status = 'valid';

-- ────────────────────────────────────────────────────────────────────────────
-- Triggers anti-UPDATE/anti-DELETE (append-only audit con excepciones writeback)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_ftr_snapshots_guard_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Identity columns immutable forever (audit forensic)
  IF OLD.snapshot_id <> NEW.snapshot_id THEN
    RAISE EXCEPTION 'task_ftr_snapshots: snapshot_id is immutable';
  END IF;
  IF OLD.task_source_id <> NEW.task_source_id THEN
    RAISE EXCEPTION 'task_ftr_snapshots: task_source_id is immutable';
  END IF;
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'task_ftr_snapshots: workspace_id is immutable';
  END IF;
  IF OLD.computed_at <> NEW.computed_at THEN
    RAISE EXCEPTION 'task_ftr_snapshots: computed_at is immutable';
  END IF;
  IF OLD.formula_version <> NEW.formula_version THEN
    RAISE EXCEPTION 'task_ftr_snapshots: formula_version is immutable';
  END IF;
  IF COALESCE(OLD.source_event_id, '') <> COALESCE(NEW.source_event_id, '') THEN
    RAISE EXCEPTION 'task_ftr_snapshots: source_event_id is immutable';
  END IF;
  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'task_ftr_snapshots: created_at is immutable';
  END IF;

  -- Compute result columns immutable (audit forensic — recompute = nuevo row)
  IF OLD.ftr_value IS DISTINCT FROM NEW.ftr_value THEN
    RAISE EXCEPTION 'task_ftr_snapshots: ftr_value is immutable (recompute = nuevo row)';
  END IF;
  IF OLD.ftr_data_status <> NEW.ftr_data_status THEN
    RAISE EXCEPTION 'task_ftr_snapshots: ftr_data_status is immutable (recompute = nuevo row)';
  END IF;
  IF OLD.rpa_value IS DISTINCT FROM NEW.rpa_value THEN
    RAISE EXCEPTION 'task_ftr_snapshots: rpa_value is immutable';
  END IF;
  IF COALESCE(OLD.rpa_data_status, '') <> COALESCE(NEW.rpa_data_status, '') THEN
    RAISE EXCEPTION 'task_ftr_snapshots: rpa_data_status is immutable';
  END IF;
  IF OLD.source_mode <> NEW.source_mode THEN
    RAISE EXCEPTION 'task_ftr_snapshots: source_mode is immutable';
  END IF;

  -- Writeback columns CAN BE UPDATED (Slice 2 worker populates post-PATCH success):
  -- - written_to_notion_at, notion_writeback_event_id, notion_writeback_attempt_count,
  --   notion_writeback_last_error

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_ftr_snapshots_guard_update_trigger
  ON greenhouse_delivery.task_ftr_snapshots;

CREATE TRIGGER task_ftr_snapshots_guard_update_trigger
  BEFORE UPDATE ON greenhouse_delivery.task_ftr_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_delivery.task_ftr_snapshots_guard_update();

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_ftr_snapshots_guard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'task_ftr_snapshots: rows are append-only; DELETE rejected (snapshot_id=%)', OLD.snapshot_id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_ftr_snapshots_guard_delete_trigger
  ON greenhouse_delivery.task_ftr_snapshots;

CREATE TRIGGER task_ftr_snapshots_guard_delete_trigger
  BEFORE DELETE ON greenhouse_delivery.task_ftr_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_delivery.task_ftr_snapshots_guard_delete();

-- ────────────────────────────────────────────────────────────────────────────
-- Ownership + grants canonical
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_delivery.task_ftr_snapshots OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_delivery.task_ftr_snapshots
  TO greenhouse_runtime;

-- ────────────────────────────────────────────────────────────────────────────
-- Anti pre-up-marker guard (TASK-768 / ISSUE-068 canonical pattern)
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  snapshot_table_exists BOOLEAN;
  source_event_idx_exists BOOLEAN;
  task_latest_idx_exists BOOLEAN;
  writeback_pending_idx_exists BOOLEAN;
  paridad_idx_exists BOOLEAN;
  update_trigger_exists BOOLEAN;
  delete_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_delivery'
      AND table_name = 'task_ftr_snapshots'
  ) INTO snapshot_table_exists;
  IF NOT snapshot_table_exists THEN
    RAISE EXCEPTION 'TASK-903 anti pre-up-marker: task_ftr_snapshots NOT created.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_ftr_snapshots_source_event_id_unique_idx') INTO source_event_idx_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_ftr_snapshots_task_latest_idx') INTO task_latest_idx_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_ftr_snapshots_writeback_pending_idx') INTO writeback_pending_idx_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_ftr_snapshots_paridad_idx') INTO paridad_idx_exists;

  IF NOT (source_event_idx_exists AND task_latest_idx_exists AND writeback_pending_idx_exists AND paridad_idx_exists) THEN
    RAISE EXCEPTION 'TASK-903 anti pre-up-marker: indexes NOT all created (source_event=%, task_latest=%, writeback_pending=%, paridad=%).',
      source_event_idx_exists, task_latest_idx_exists, writeback_pending_idx_exists, paridad_idx_exists;
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='task_ftr_snapshots_guard_update_trigger' AND NOT tgisinternal) INTO update_trigger_exists;
  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='task_ftr_snapshots_guard_delete_trigger' AND NOT tgisinternal) INTO delete_trigger_exists;

  IF NOT (update_trigger_exists AND delete_trigger_exists) THEN
    RAISE EXCEPTION 'TASK-903 anti pre-up-marker: triggers NOT created (update=%, delete=%).', update_trigger_exists, delete_trigger_exists;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS task_ftr_snapshots_guard_update_trigger ON greenhouse_delivery.task_ftr_snapshots;
DROP TRIGGER IF EXISTS task_ftr_snapshots_guard_delete_trigger ON greenhouse_delivery.task_ftr_snapshots;
DROP FUNCTION IF EXISTS greenhouse_delivery.task_ftr_snapshots_guard_update();
DROP FUNCTION IF EXISTS greenhouse_delivery.task_ftr_snapshots_guard_delete();
DROP TABLE IF EXISTS greenhouse_delivery.task_ftr_snapshots;
