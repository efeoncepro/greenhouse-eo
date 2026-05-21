-- Up Migration

-- ════════════════════════════════════════════════════════════════════════════
-- TASK-916 Slice 1 — RpA V2 PRODUCTIVE snapshot foundation (sibling de TASK-913)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Tabla per-task snapshot canonical para el pipeline RpA V2 PRODUCTIVO
-- (Efeonce + Sky). Sibling físicamente separado de `task_rpa_demo_snapshots`
-- (TASK-913, demo teamspace). Cada compute reactivo persiste un snapshot per
-- task con resultado de `calculateRpaV2` (lee `task_status_transitions`, NO la
-- tabla `_demo`) + forensic trail (source_event_id + computed_at +
-- formula_version).
--
-- Diferencias vs el sibling demo (clone + repoint, NO rediseño):
-- - `workspace_id ... CHECK (workspace_id IN ('efeonce','sky'))` (NO `= 'demo'`)
-- - SIN `DEFAULT 'demo'` — el INSERT setea el workspace desde el payload del
--   evento `notion.task.status_transitioned` (emitido por la captura prod
--   TASK-912, que ya resolvió el workspace autoritativo por parent.data_source_id)
-- - Nombres de índices/triggers/funciones `task_rpa_snapshots_*` (sin `_demo`)
--
-- Idéntico al demo: columnas, triggers append-only (con excepción de las
-- columnas writeback), grants `greenhouse_ops`/`greenhouse_runtime`, índices
-- (source_event UNIQUE parcial, task_latest, writeback_pending, paridad).
--
-- Persistence canonical PG (no BQ) para V1 productive:
-- - OLTP-fit para writeback near-realtime
-- - Sin streaming buffer issues (cf. TASK-900 bug class ai_signals)
-- - Audit trail forensic preservado (append-only)
-- - Cuando la materialización agregada `rpa_avg_v2` emerja (TASK-917), sí pasa a
--   BQ materializer canonical pattern TASK-900; este snapshot PG queda como
--   audit trail forensic preserved
--
-- Defense in depth (mismo pattern TASK-910/913):
-- - CHECK constraint workspace_id IN ('efeonce','sky') enforce PG-side
-- - Triggers append-only anti-UPDATE/anti-DELETE (audit trail forensic)
-- - Unique index parcial source_event_id (idempotency canonical)
-- - Index hot path (task_source_id, computed_at DESC) para latest per task
-- - written_to_notion_at populated cuando writeback success (Slice 4)
--
-- Spec canónica: TASK-916 (receta de clonado) + TASK-901 RPA_V1.md §9 writeback.
-- Pattern fuente: migration TASK-913 20260519130951001 (task_rpa_demo_snapshots).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS greenhouse_delivery.task_rpa_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  task_source_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL CHECK (workspace_id IN ('efeonce', 'sky')),

  -- TASK-901 calculateRpaV2 result canonical shape
  rpa_value INTEGER NULL,
  rpa_data_status TEXT NOT NULL CHECK (rpa_data_status IN (
    'valid',
    'unavailable',
    'low_confidence',
    'suppressed'
  )),
  source_mode TEXT NOT NULL CHECK (source_mode IN ('canonical', 'unavailable')),
  correction_transitions_count INTEGER NOT NULL DEFAULT 0
    CHECK (correction_transitions_count >= 0),

  -- TASK-913 forensic trail canonical
  formula_version TEXT NOT NULL DEFAULT 'rpa_v2.0',
  source_event_id TEXT NULL,
  source_event_received_at TIMESTAMPTZ NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Writeback Notion tracking (populated by Slice 4 worker post-PATCH success)
  written_to_notion_at TIMESTAMPTZ NULL,
  notion_writeback_event_id TEXT NULL,
  notion_writeback_attempt_count INTEGER NOT NULL DEFAULT 0
    CHECK (notion_writeback_attempt_count >= 0),
  notion_writeback_last_error TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_delivery.task_rpa_snapshots IS
  'TASK-916 Slice 1 — Append-only snapshot per-task del compute RpA V2 PRODUCTIVO (calculateRpaV2 sobre task_status_transitions). CHECK workspace_id IN (efeonce,sky) enforce. Triggers anti-UPDATE/DELETE excepto columns writeback (written_to_notion_at, notion_writeback_*). Idempotent UNIQUE source_event_id partial. Sibling de task_rpa_demo_snapshots (TASK-913).';

-- ────────────────────────────────────────────────────────────────────────────
-- Indexes canonical
-- ────────────────────────────────────────────────────────────────────────────

-- UNIQUE partial idempotency (re-compute mismo event = no-op INSERT)
CREATE UNIQUE INDEX IF NOT EXISTS task_rpa_snapshots_source_event_id_unique_idx
  ON greenhouse_delivery.task_rpa_snapshots (source_event_id)
  WHERE source_event_id IS NOT NULL;

-- Hot path: latest snapshot per task (Slice 4 writeback worker lookup)
CREATE INDEX IF NOT EXISTS task_rpa_snapshots_task_latest_idx
  ON greenhouse_delivery.task_rpa_snapshots (task_source_id, computed_at DESC);

-- Writeback pending queue (Slice 4 worker): rows con `written_to_notion_at IS NULL`
CREATE INDEX IF NOT EXISTS task_rpa_snapshots_writeback_pending_idx
  ON greenhouse_delivery.task_rpa_snapshots (created_at ASC)
  WHERE written_to_notion_at IS NULL AND rpa_data_status = 'valid';

-- Paridad signal (Slice 5 / TASK-917): writeback success rows con rpa_value para diff
CREATE INDEX IF NOT EXISTS task_rpa_snapshots_paridad_idx
  ON greenhouse_delivery.task_rpa_snapshots (task_source_id, written_to_notion_at DESC)
  WHERE written_to_notion_at IS NOT NULL AND rpa_data_status = 'valid';

-- ────────────────────────────────────────────────────────────────────────────
-- Triggers anti-UPDATE/anti-DELETE (append-only audit con excepciones writeback)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_rpa_snapshots_guard_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Identity columns immutable forever (audit forensic)
  IF OLD.snapshot_id <> NEW.snapshot_id THEN
    RAISE EXCEPTION 'task_rpa_snapshots: snapshot_id is immutable';
  END IF;
  IF OLD.task_source_id <> NEW.task_source_id THEN
    RAISE EXCEPTION 'task_rpa_snapshots: task_source_id is immutable';
  END IF;
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'task_rpa_snapshots: workspace_id is immutable';
  END IF;
  IF OLD.computed_at <> NEW.computed_at THEN
    RAISE EXCEPTION 'task_rpa_snapshots: computed_at is immutable';
  END IF;
  IF OLD.formula_version <> NEW.formula_version THEN
    RAISE EXCEPTION 'task_rpa_snapshots: formula_version is immutable';
  END IF;
  IF COALESCE(OLD.source_event_id, '') <> COALESCE(NEW.source_event_id, '') THEN
    RAISE EXCEPTION 'task_rpa_snapshots: source_event_id is immutable';
  END IF;
  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'task_rpa_snapshots: created_at is immutable';
  END IF;

  -- Compute result columns immutable (audit forensic — recompute = nuevo row)
  IF OLD.rpa_value IS DISTINCT FROM NEW.rpa_value THEN
    RAISE EXCEPTION 'task_rpa_snapshots: rpa_value is immutable (recompute = nuevo row)';
  END IF;
  IF OLD.rpa_data_status <> NEW.rpa_data_status THEN
    RAISE EXCEPTION 'task_rpa_snapshots: rpa_data_status is immutable (recompute = nuevo row)';
  END IF;
  IF OLD.source_mode <> NEW.source_mode THEN
    RAISE EXCEPTION 'task_rpa_snapshots: source_mode is immutable';
  END IF;
  IF OLD.correction_transitions_count <> NEW.correction_transitions_count THEN
    RAISE EXCEPTION 'task_rpa_snapshots: correction_transitions_count is immutable';
  END IF;

  -- Writeback columns CAN BE UPDATED (Slice 4 worker populates post-PATCH success):
  -- - written_to_notion_at, notion_writeback_event_id, notion_writeback_attempt_count,
  --   notion_writeback_last_error

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_rpa_snapshots_guard_update_trigger
  ON greenhouse_delivery.task_rpa_snapshots;

CREATE TRIGGER task_rpa_snapshots_guard_update_trigger
  BEFORE UPDATE ON greenhouse_delivery.task_rpa_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_delivery.task_rpa_snapshots_guard_update();

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_rpa_snapshots_guard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'task_rpa_snapshots: rows are append-only; DELETE rejected (snapshot_id=%)', OLD.snapshot_id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_rpa_snapshots_guard_delete_trigger
  ON greenhouse_delivery.task_rpa_snapshots;

CREATE TRIGGER task_rpa_snapshots_guard_delete_trigger
  BEFORE DELETE ON greenhouse_delivery.task_rpa_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_delivery.task_rpa_snapshots_guard_delete();

-- ────────────────────────────────────────────────────────────────────────────
-- Ownership + grants canonical
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_delivery.task_rpa_snapshots OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_delivery.task_rpa_snapshots
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
      AND table_name = 'task_rpa_snapshots'
  ) INTO snapshot_table_exists;
  IF NOT snapshot_table_exists THEN
    RAISE EXCEPTION 'TASK-916 anti pre-up-marker: task_rpa_snapshots NOT created.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_rpa_snapshots_source_event_id_unique_idx') INTO source_event_idx_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_rpa_snapshots_task_latest_idx') INTO task_latest_idx_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_rpa_snapshots_writeback_pending_idx') INTO writeback_pending_idx_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_rpa_snapshots_paridad_idx') INTO paridad_idx_exists;

  IF NOT (source_event_idx_exists AND task_latest_idx_exists AND writeback_pending_idx_exists AND paridad_idx_exists) THEN
    RAISE EXCEPTION 'TASK-916 anti pre-up-marker: indexes NOT all created (source_event=%, task_latest=%, writeback_pending=%, paridad=%).',
      source_event_idx_exists, task_latest_idx_exists, writeback_pending_idx_exists, paridad_idx_exists;
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='task_rpa_snapshots_guard_update_trigger' AND NOT tgisinternal) INTO update_trigger_exists;
  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='task_rpa_snapshots_guard_delete_trigger' AND NOT tgisinternal) INTO delete_trigger_exists;

  IF NOT (update_trigger_exists AND delete_trigger_exists) THEN
    RAISE EXCEPTION 'TASK-916 anti pre-up-marker: triggers NOT created (update=%, delete=%).', update_trigger_exists, delete_trigger_exists;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS task_rpa_snapshots_guard_update_trigger ON greenhouse_delivery.task_rpa_snapshots;
DROP TRIGGER IF EXISTS task_rpa_snapshots_guard_delete_trigger ON greenhouse_delivery.task_rpa_snapshots;
DROP FUNCTION IF EXISTS greenhouse_delivery.task_rpa_snapshots_guard_update();
DROP FUNCTION IF EXISTS greenhouse_delivery.task_rpa_snapshots_guard_delete();
DROP TABLE IF EXISTS greenhouse_delivery.task_rpa_snapshots;
