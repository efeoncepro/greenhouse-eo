-- Up Migration
--
-- TASK-908 Slice 0 — Status Transition Tracking foundation canonical.
--
-- Tabla append-only `greenhouse_delivery.task_status_transitions` que captura
-- cada cambio de status de las tareas Notion (Sky + Efeonce + tenants futuros).
-- Source canonical de truth para:
--   - calculateRpa (TASK-901) → countCorrectionTransitions → cuenta transiciones
--     'Listo para revisión → Cambios solicitados' (RpA per-task)
--   - calculateFtr (TASK-909) → delegado a calculateRpa
--   - calculateCycleTime (TASK-908 Slice 1) → status → En curso start +
--     descuento Bloqueado intervals
--   - Auditoría operativa (HR_ADMIN audit de RpA bonus post-TASK-901)
--
-- Schema canonical declarado en GREENHOUSE_TASK_STATUS_LIFECYCLE_V1.md
-- (Delta 2026-05-18 sección "Timestamp canonical obligatorio per transición").
--
-- Slice 0 SOLO crea la tabla + capabilities. La ingestion via webhook +
-- reactive consumer + BQ formula update viene en TASK-908b follow-up cuando
-- Notion webhook subscription esté registered operador-side.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Tabla canonical task_status_transitions
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_delivery.task_status_transitions (
  transition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  task_source_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,

  -- Canonical V1 enum cerrado (11 estados) per
  -- src/lib/delivery/task-status-canonical.ts TASK_STATUS_CANONICAL.
  -- Webhook handler (TASK-908b) normaliza via normalizeTaskStatus ANTES
  -- de insertar — tabla NUNCA almacena strings legacy.
  --
  -- Edge canonical: si webhook recibe primer evento sin from_status (e.g.
  -- task creada con primer status assignment), persistir 'Sin empezar' como
  -- sentinel canonical en lugar de NULL — preserva NOT NULL + simplifica
  -- LAG/LEAD window queries downstream.
  from_status TEXT NOT NULL CHECK (from_status IN (
    'Sin empezar',
    'Brief listo',
    'Pendiente aprobación interna',
    'En pausa',
    'Bloqueado',
    'En curso',
    'Listo para revisión',
    'Cambios solicitados',
    'Aprobado',
    'Cancelado',
    'Archivado'
  )),

  to_status TEXT NOT NULL CHECK (to_status IN (
    'Sin empezar',
    'Brief listo',
    'Pendiente aprobación interna',
    'En pausa',
    'Bloqueado',
    'En curso',
    'Listo para revisión',
    'Cambios solicitados',
    'Aprobado',
    'Cancelado',
    'Archivado'
  )),

  -- Timestamp canonical OBLIGATORIO per ADR
  -- GREENHOUSE_TASK_STATUS_LIFECYCLE_V1 (Delta 2026-05-18 §Timestamp canonical):
  -- - `canonical` (source_quality): event.timestamp del Notion webhook
  -- - `proxy`: polling con page.last_edited_time (lossy, marked)
  -- - `backfilled`: reconstruido históricamente best-effort via page history
  --
  -- Source of truth para TODA métrica temporal downstream (Cycle Time,
  -- Time-in-Status, Lead Time, Throughput rate). NUNCA persistir transition
  -- row sin transitioned_at populated.
  transitioned_at TIMESTAMPTZ NOT NULL,
  transitioned_by TEXT NULL,
  source_event_id TEXT NULL,
  source_quality TEXT NOT NULL DEFAULT 'canonical' CHECK (source_quality IN (
    'canonical',
    'proxy',
    'backfilled'
  )),

  -- Greenhouse-side processing time (para lag analysis webhook → ingestion)
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Snapshot canonical 360 al momento de la transition (lazy-resolved
  -- downstream — FK explicit no aplica porque el bridge identity puede no
  -- estar resolvable al moment de la transition)
  assignee_member_id TEXT NULL,
  space_id TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dedup canonical via source_event_id table-level UNIQUE per ADR
-- (NULL allowed para rows backfilled sin webhook origin — PG UNIQUE
-- "NULLs distinct" semantic permite múltiples NULLs).
CREATE UNIQUE INDEX IF NOT EXISTS task_status_transitions_source_event_id_unique_idx
  ON greenhouse_delivery.task_status_transitions (source_event_id)
  WHERE source_event_id IS NOT NULL;

-- Hot path 1: reconstruir history per task ordered most-recent first
CREATE INDEX IF NOT EXISTS task_status_transitions_task_lookup_idx
  ON greenhouse_delivery.task_status_transitions (task_source_id, transitioned_at DESC);

-- Hot path 2: queries "tareas que entraron a X estado en período Y"
CREATE INDEX IF NOT EXISTS task_status_transitions_to_status_recent_idx
  ON greenhouse_delivery.task_status_transitions (to_status, transitioned_at DESC);

-- Hot path 3: countCorrectionTransitions (TASK-901 calculateRpa + TASK-909
-- calculateFtr consumen). Partial index minimiza footprint y maximiza
-- query speed para la transición canonical de corrección.
CREATE INDEX IF NOT EXISTS task_status_transitions_correction_event_idx
  ON greenhouse_delivery.task_status_transitions (task_source_id, transitioned_at DESC)
  WHERE from_status = 'Listo para revisión' AND to_status = 'Cambios solicitados';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Append-only triggers (anti-UPDATE / anti-DELETE)
--    Pattern fuente: TASK-900 ico_materialization_runs + TASK-848
--    release_state_transitions. Audit canonical no se borra ni mutate.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_status_transitions_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo permitir UPDATE de campos "lazy resolution" (snapshot canonical 360
  -- post-ingestion: assignee_member_id, space_id pueden quedar NULL al insert
  -- y completarse después cuando el bridge identity resolve).
  IF OLD.transition_id <> NEW.transition_id THEN
    RAISE EXCEPTION 'task_status_transitions: transition_id is immutable';
  END IF;

  IF OLD.task_source_id <> NEW.task_source_id THEN
    RAISE EXCEPTION 'task_status_transitions: task_source_id is immutable';
  END IF;

  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'task_status_transitions: workspace_id is immutable';
  END IF;

  IF OLD.from_status <> NEW.from_status OR OLD.to_status <> NEW.to_status THEN
    RAISE EXCEPTION 'task_status_transitions: from_status/to_status are immutable (audit append-only)';
  END IF;

  IF OLD.transitioned_at <> NEW.transitioned_at THEN
    RAISE EXCEPTION 'task_status_transitions: transitioned_at is immutable';
  END IF;

  IF (OLD.source_event_id IS DISTINCT FROM NEW.source_event_id) THEN
    RAISE EXCEPTION 'task_status_transitions: source_event_id is immutable';
  END IF;

  IF OLD.captured_at <> NEW.captured_at THEN
    RAISE EXCEPTION 'task_status_transitions: captured_at is immutable';
  END IF;

  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'task_status_transitions: created_at is immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_status_transitions_guard_update_trigger
  ON greenhouse_delivery.task_status_transitions;

CREATE TRIGGER task_status_transitions_guard_update_trigger
  BEFORE UPDATE ON greenhouse_delivery.task_status_transitions
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_delivery.task_status_transitions_guard_update();

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_status_transitions_guard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'task_status_transitions: rows are append-only; DELETE rejected (transition_id=%)', OLD.transition_id;
END;
$$;

DROP TRIGGER IF EXISTS task_status_transitions_guard_delete_trigger
  ON greenhouse_delivery.task_status_transitions;

CREATE TRIGGER task_status_transitions_guard_delete_trigger
  BEFORE DELETE ON greenhouse_delivery.task_status_transitions
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_delivery.task_status_transitions_guard_delete();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Ownership + grants (canonical Greenhouse)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_delivery.task_status_transitions OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_delivery.task_status_transitions
  TO greenhouse_runtime;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Capabilities canonical V1.0 (granular least-privilege)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'cycle_time.compute.execute',
    'delivery',
    ARRAY['execute'],
    ARRAY['all'],
    'TASK-908 — Compute canonical Cycle Time per-task via calculateCycleTime helper. Consumed by future writeback path (TASK derivada V2) y admin debugging UI.',
    NOW(),
    NULL
  ),
  (
    'correction_transitions.compute.read',
    'delivery',
    ARRAY['read'],
    ARRAY['all'],
    'TASK-908 — Lectura de transiciones canonical "Listo para revisión → Cambios solicitados" para audit de RpA bonus (post TASK-901). Consumida por countCorrectionTransitions helper + audit endpoints.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Anti pre-up-marker guard (TASK-768 / ISSUE-068 canonical pattern)
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  table_exists BOOLEAN;
  source_event_id_idx_exists BOOLEAN;
  task_lookup_idx_exists BOOLEAN;
  correction_idx_exists BOOLEAN;
  update_trigger_exists BOOLEAN;
  delete_trigger_exists BOOLEAN;
  capability_count INTEGER;
  from_status_check_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_delivery'
      AND table_name = 'task_status_transitions'
  ) INTO table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_delivery'
      AND indexname = 'task_status_transitions_source_event_id_unique_idx'
  ) INTO source_event_id_idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_delivery'
      AND indexname = 'task_status_transitions_task_lookup_idx'
  ) INTO task_lookup_idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_delivery'
      AND indexname = 'task_status_transitions_correction_event_idx'
  ) INTO correction_idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'task_status_transitions_guard_update_trigger'
      AND NOT tgisinternal
  ) INTO update_trigger_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'task_status_transitions_guard_delete_trigger'
      AND NOT tgisinternal
  ) INTO delete_trigger_exists;

  SELECT COUNT(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('cycle_time.compute.execute', 'correction_transitions.compute.read')
    AND deprecated_at IS NULL;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'greenhouse_delivery'
      AND t.relname = 'task_status_transitions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%from_status%'
  ) INTO from_status_check_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-908 anti pre-up-marker: greenhouse_delivery.task_status_transitions was NOT created. Migration markers may be inverted.';
  END IF;

  IF NOT source_event_id_idx_exists THEN
    RAISE EXCEPTION 'TASK-908 anti pre-up-marker: task_status_transitions_source_event_id_unique_idx NOT created.';
  END IF;

  IF NOT task_lookup_idx_exists THEN
    RAISE EXCEPTION 'TASK-908 anti pre-up-marker: task_status_transitions_task_lookup_idx NOT created.';
  END IF;

  IF NOT correction_idx_exists THEN
    RAISE EXCEPTION 'TASK-908 anti pre-up-marker: task_status_transitions_correction_event_idx NOT created.';
  END IF;

  IF NOT update_trigger_exists THEN
    RAISE EXCEPTION 'TASK-908 anti pre-up-marker: update guard trigger NOT created.';
  END IF;

  IF NOT delete_trigger_exists THEN
    RAISE EXCEPTION 'TASK-908 anti pre-up-marker: delete guard trigger NOT created.';
  END IF;

  IF capability_count <> 2 THEN
    RAISE EXCEPTION 'TASK-908 anti pre-up-marker: expected 2 capabilities (cycle_time.compute.execute + correction_transitions.compute.read), got %', capability_count;
  END IF;

  IF NOT from_status_check_exists THEN
    RAISE EXCEPTION 'TASK-908 anti pre-up-marker: from_status CHECK constraint canonical enum NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS task_status_transitions_guard_delete_trigger
  ON greenhouse_delivery.task_status_transitions;

DROP TRIGGER IF EXISTS task_status_transitions_guard_update_trigger
  ON greenhouse_delivery.task_status_transitions;

DROP FUNCTION IF EXISTS greenhouse_delivery.task_status_transitions_guard_delete();
DROP FUNCTION IF EXISTS greenhouse_delivery.task_status_transitions_guard_update();

DROP INDEX IF EXISTS greenhouse_delivery.task_status_transitions_correction_event_idx;
DROP INDEX IF EXISTS greenhouse_delivery.task_status_transitions_to_status_recent_idx;
DROP INDEX IF EXISTS greenhouse_delivery.task_status_transitions_task_lookup_idx;
DROP INDEX IF EXISTS greenhouse_delivery.task_status_transitions_source_event_id_unique_idx;

DROP TABLE IF EXISTS greenhouse_delivery.task_status_transitions;

-- Soft-delete capabilities (canonical Greenhouse — NUNCA delete rows registry)
UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN ('cycle_time.compute.execute', 'correction_transitions.compute.read')
  AND deprecated_at IS NULL;
