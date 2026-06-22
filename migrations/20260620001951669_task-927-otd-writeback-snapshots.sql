-- Up Migration

-- ════════════════════════════════════════════════════════════════════════════
-- TASK-927 Slice 2 — OTD writeback snapshot table (sibling de task_ftr_snapshots)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Snapshot/log append-only del writeback del bucket OTD freeze-aware a Notion
-- (`[GH] OTD`, select). Clone + repoint de `task_ftr_snapshots` (TASK-903), NO
-- rediseño.
--
-- Diferencia clave vs RpA/FTR (que son event-driven, una vez por transición): el
-- bucket OTD es `now()`-dependiente y se recomputa en un BATCH DIARIO. El mismo
-- task puede tener un bucket distinto cada día (on_time→overdue por paso del
-- tiempo, o flip por freeze). Por eso NO hay `source_event_id` (no hay evento que
-- lo dispare) y la idempotencia es **skip-if-unchanged**: el batch INSERTA un
-- snapshot nuevo solo cuando el bucket recomputado difiere del último ESCRITO
-- (el `otd_bucket` del último snapshot `written_to_notion_at IS NOT NULL` ES el
-- último valor en Notion).
--
-- Fuente del valor: `task_attributable_lateness_shadow.bucket_attributable` (M2
-- freeze-aware, PG; TASK-922), recomputado por `computeAttributableLatenessForTask`
-- (TASK-1174). Solo se escribe `data_status='valid'` (degradación honesta).
--
-- Idéntico al FTR sibling: workspace_id CHECK IN ('efeonce','sky') (sin demo),
-- triggers append-only (excepto columnas writeback), grants, índices.
-- Pattern fuente: migration TASK-903 20260524200315533 (task_ftr_snapshots).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS greenhouse_delivery.task_otd_writeback_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  task_source_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL CHECK (workspace_id IN ('efeonce', 'sky')),

  -- Bucket OTD freeze-aware (de task_attributable_lateness_shadow.bucket_attributable)
  otd_bucket TEXT NULL CHECK (otd_bucket IN (
    'on_time',
    'late_drop',
    'overdue',
    'carry_over',
    'not_applicable'
  )),
  otd_data_status TEXT NOT NULL CHECK (otd_data_status IN (
    'valid',
    'unavailable',
    'legacy_unknown'
  )),

  -- Forensic trail canonical (mirror task_ftr_snapshots; sin source_event_id: batch)
  formula_version TEXT NOT NULL DEFAULT 'otd_writeback_v1.0',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Writeback Notion tracking (populated by daily batch post-PATCH success)
  written_to_notion_at TIMESTAMPTZ NULL,
  notion_writeback_attempt_count INTEGER NOT NULL DEFAULT 0
    CHECK (notion_writeback_attempt_count >= 0),
  notion_writeback_last_error TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_delivery.task_otd_writeback_snapshots IS
  'TASK-927 Slice 2 — Append-only snapshot per-task del writeback del bucket OTD freeze-aware a Notion [GH] OTD (daily batch). CHECK workspace_id IN (efeonce,sky). Triggers anti-UPDATE/DELETE excepto columns writeback. Idempotencia skip-if-unchanged via el último snapshot escrito. Sibling de task_ftr_snapshots (TASK-903). Display-only, NO toca el bono.';

-- ────────────────────────────────────────────────────────────────────────────
-- Indexes canonical (mirror task_ftr_snapshots)
-- ────────────────────────────────────────────────────────────────────────────

-- Latest snapshot per task (idempotencia skip-if-unchanged + paridad)
CREATE INDEX IF NOT EXISTS task_otd_writeback_snapshots_task_latest_idx
  ON greenhouse_delivery.task_otd_writeback_snapshots (task_source_id, computed_at DESC);

-- Writeback pending queue (daily batch): rows con otd_bucket writable pendientes
CREATE INDEX IF NOT EXISTS task_otd_writeback_snapshots_writeback_pending_idx
  ON greenhouse_delivery.task_otd_writeback_snapshots (created_at ASC)
  WHERE written_to_notion_at IS NULL AND otd_data_status = 'valid' AND otd_bucket IS NOT NULL;

-- Dead-letter / lag signal: writable rows pendientes con attempts
CREATE INDEX IF NOT EXISTS task_otd_writeback_snapshots_deadletter_idx
  ON greenhouse_delivery.task_otd_writeback_snapshots (notion_writeback_attempt_count DESC, computed_at ASC)
  WHERE written_to_notion_at IS NULL AND otd_data_status = 'valid';

-- ────────────────────────────────────────────────────────────────────────────
-- Triggers anti-UPDATE/anti-DELETE (append-only con excepciones writeback)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_otd_writeback_snapshots_guard_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Identity + result columns immutable forever (audit forensic).
  IF OLD.snapshot_id <> NEW.snapshot_id THEN
    RAISE EXCEPTION 'task_otd_writeback_snapshots: snapshot_id is immutable';
  END IF;
  IF OLD.task_source_id <> NEW.task_source_id THEN
    RAISE EXCEPTION 'task_otd_writeback_snapshots: task_source_id is immutable';
  END IF;
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'task_otd_writeback_snapshots: workspace_id is immutable';
  END IF;
  IF OLD.otd_bucket IS DISTINCT FROM NEW.otd_bucket THEN
    RAISE EXCEPTION 'task_otd_writeback_snapshots: otd_bucket is immutable';
  END IF;
  IF OLD.computed_at <> NEW.computed_at THEN
    RAISE EXCEPTION 'task_otd_writeback_snapshots: computed_at is immutable';
  END IF;
  IF OLD.formula_version <> NEW.formula_version THEN
    RAISE EXCEPTION 'task_otd_writeback_snapshots: formula_version is immutable';
  END IF;
  -- Allowed mutations: solo columnas writeback
  -- (written_to_notion_at, notion_writeback_attempt_count, notion_writeback_last_error).
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_otd_writeback_snapshots_guard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'task_otd_writeback_snapshots: append-only, DELETE prohibido';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_otd_writeback_snapshots_no_update
  ON greenhouse_delivery.task_otd_writeback_snapshots;
CREATE TRIGGER task_otd_writeback_snapshots_no_update
  BEFORE UPDATE ON greenhouse_delivery.task_otd_writeback_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_delivery.task_otd_writeback_snapshots_guard_update();

DROP TRIGGER IF EXISTS task_otd_writeback_snapshots_no_delete
  ON greenhouse_delivery.task_otd_writeback_snapshots;
CREATE TRIGGER task_otd_writeback_snapshots_no_delete
  BEFORE DELETE ON greenhouse_delivery.task_otd_writeback_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_delivery.task_otd_writeback_snapshots_guard_delete();

-- ────────────────────────────────────────────────────────────────────────────
-- Ownership + grants (canonical Greenhouse)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_delivery.task_otd_writeback_snapshots OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_delivery.task_otd_writeback_snapshots
  TO greenhouse_runtime;

-- ────────────────────────────────────────────────────────────────────────────
-- Anti pre-up-marker guard (TASK-768 / ISSUE-068 canonical pattern)
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  table_exists BOOLEAN;
  pending_idx_exists BOOLEAN;
  update_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_delivery'
      AND table_name = 'task_otd_writeback_snapshots'
  ) INTO table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_delivery'
      AND indexname = 'task_otd_writeback_snapshots_writeback_pending_idx'
  ) INTO pending_idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'greenhouse_delivery'
      AND trigger_name = 'task_otd_writeback_snapshots_no_update'
  ) INTO update_trigger_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-927 anti pre-up-marker check: greenhouse_delivery.task_otd_writeback_snapshots was NOT created. Migration markers may be inverted.';
  END IF;

  IF NOT pending_idx_exists THEN
    RAISE EXCEPTION 'TASK-927 anti pre-up-marker check: writeback_pending_idx missing.';
  END IF;

  IF NOT update_trigger_exists THEN
    RAISE EXCEPTION 'TASK-927 anti pre-up-marker check: append-only UPDATE trigger missing.';
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_delivery.task_otd_writeback_snapshots;
DROP FUNCTION IF EXISTS greenhouse_delivery.task_otd_writeback_snapshots_guard_update();
DROP FUNCTION IF EXISTS greenhouse_delivery.task_otd_writeback_snapshots_guard_delete();
