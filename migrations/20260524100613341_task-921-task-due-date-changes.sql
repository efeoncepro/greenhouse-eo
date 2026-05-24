-- Up Migration
--
-- TASK-921 (M0) — Captura append-only de cambios de fecha límite + motivo de
-- reprogramación. Foundation del ADR GREENHOUSE_ATTRIBUTABLE_LATENESS_V1 §16
-- que TASK-922 (M2 freeze / atraso imputable) consume.
--
-- Sibling de greenhouse_delivery.task_status_transitions (TASK-908): mismo
-- patrón append-only (triggers anti-UPDATE/anti-DELETE) + CHECK enums cerrados
-- + UNIQUE partial source_event_id (idempotencia) + anti pre-up-marker guard.
--
-- Diferencia clave vs status_transitions: las columnas de MOTIVO
-- (reason_code, reason_source, reason_confidence) SON MUTABLES — el operador
-- confirma/corrige el motivo en Notion (propiedad `Motivo de reprogramación`)
-- → el consumer UPDATEa la fila a reason_source='operator_confirmed'. Todo lo
-- demás (la observación del cambio de fecha) es inmutable audit.
--
-- Captura: reusa el evento `notion.task.page_change_signal` ya emitido por el
-- webhook `notion-status-transitions` (TASK-912) — NO crea segundo endpoint.
-- Gateada por flag NOTION_DUE_DATE_CAPTURE_ENABLED (default OFF).
--
-- Esta migration SOLO crea la tabla. NO computa atraso (eso es TASK-922).

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Tabla canonical task_due_date_changes
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_delivery.task_due_date_changes (
  change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  task_source_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,

  -- Fecha límite antes y después del cambio. previous_due_date puede ser NULL
  -- en la observación baseline (primera vez que vemos la tarea sin histórico).
  -- new_due_date puede ser NULL si el operador limpió la fecha.
  previous_due_date DATE NULL,
  new_due_date DATE NULL,

  -- new - previous en días (NULL si alguna fecha es NULL). Diagnóstico; TASK-922
  -- computa atraso imputable real desde la fecha justa + freeze.
  days_delta INTEGER NULL,

  -- Estado canonical V1 al momento del cambio (input de la inferencia de motivo).
  -- Enum cerrado mirror de task_status_transitions. NULL tolerado (status no
  -- resoluble en el re-fetch).
  status_at_change TEXT NULL CHECK (status_at_change IS NULL OR status_at_change IN (
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

  -- Motivo de reprogramación (ADR §5 partición disjunta):
  --   client_requested / scope_change → EXTIENDEN la fecha justa (mueven la promesa)
  --   external_blocker               → lo maneja el freeze (estado Bloqueado)
  --   internal_not_prioritized       → slip de agencia (NO extiende)
  --   unspecified                    → default conservador (NO extiende; TASK-922
  --                                    lo trata como no-imputable-a-cliente)
  -- MUTABLE: el operador confirma/corrige vía Notion → reason_source flip.
  reason_code TEXT NOT NULL DEFAULT 'unspecified' CHECK (reason_code IN (
    'client_requested',
    'scope_change',
    'external_blocker',
    'internal_not_prioritized',
    'unspecified'
  )),

  -- inferred (Greenhouse) vs operator_confirmed (Notion). El bono (TASK-922+)
  -- SOLO usa operator_confirmed. MUTABLE.
  reason_source TEXT NOT NULL DEFAULT 'inferred' CHECK (reason_source IN (
    'inferred',
    'operator_confirmed'
  )),

  -- Confianza de la inferencia (NULL cuando operator_confirmed). MUTABLE.
  reason_confidence TEXT NULL CHECK (reason_confidence IS NULL OR reason_confidence IN (
    'high',
    'medium',
    'low'
  )),

  -- Timestamp canonical del cambio (last_edited_time de la página re-fetcheada,
  -- o el occurredAt del webhook como fallback). Inmutable.
  changed_at TIMESTAMPTZ NOT NULL,
  changed_by TEXT NULL,

  -- Idempotencia: el id del evento Notion. Dedup vía UNIQUE partial.
  source_event_id TEXT NULL,
  source_quality TEXT NOT NULL DEFAULT 'canonical' CHECK (source_quality IN (
    'canonical',
    'proxy',
    'backfilled'
  )),

  -- Greenhouse-side processing time (lag analysis). Inmutable.
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dedup canonical (NULL permite múltiples baseline/backfill sin event id).
CREATE UNIQUE INDEX IF NOT EXISTS task_due_date_changes_source_event_id_unique_idx
  ON greenhouse_delivery.task_due_date_changes (source_event_id)
  WHERE source_event_id IS NOT NULL;

-- Hot path 1: última fila por tarea (persist-if-changed + confirmación operador).
CREATE INDEX IF NOT EXISTS task_due_date_changes_task_lookup_idx
  ON greenhouse_delivery.task_due_date_changes (task_source_id, changed_at DESC);

-- Hot path 2: signal pending_reason_confirmation (filas inferidas sin confirmar).
CREATE INDEX IF NOT EXISTS task_due_date_changes_pending_reason_idx
  ON greenhouse_delivery.task_due_date_changes (reason_source, changed_at DESC)
  WHERE reason_source = 'inferred';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Append-only triggers (anti-UPDATE excepto motivo / anti-DELETE)
--    Pattern fuente: TASK-908 task_status_transitions guard (mutable lazy fields).
--    Acá los campos MUTABLES son los de motivo (confirmación operador).
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_due_date_changes_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Identity + observación del cambio: inmutables (audit append-only).
  IF OLD.change_id <> NEW.change_id THEN
    RAISE EXCEPTION 'task_due_date_changes: change_id is immutable';
  END IF;

  IF OLD.task_source_id <> NEW.task_source_id THEN
    RAISE EXCEPTION 'task_due_date_changes: task_source_id is immutable';
  END IF;

  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'task_due_date_changes: workspace_id is immutable';
  END IF;

  IF (OLD.previous_due_date IS DISTINCT FROM NEW.previous_due_date)
     OR (OLD.new_due_date IS DISTINCT FROM NEW.new_due_date)
     OR (OLD.days_delta IS DISTINCT FROM NEW.days_delta) THEN
    RAISE EXCEPTION 'task_due_date_changes: due-date observation columns are immutable (audit append-only)';
  END IF;

  IF (OLD.status_at_change IS DISTINCT FROM NEW.status_at_change) THEN
    RAISE EXCEPTION 'task_due_date_changes: status_at_change is immutable';
  END IF;

  IF OLD.changed_at <> NEW.changed_at THEN
    RAISE EXCEPTION 'task_due_date_changes: changed_at is immutable';
  END IF;

  IF (OLD.source_event_id IS DISTINCT FROM NEW.source_event_id) THEN
    RAISE EXCEPTION 'task_due_date_changes: source_event_id is immutable';
  END IF;

  IF OLD.captured_at <> NEW.captured_at THEN
    RAISE EXCEPTION 'task_due_date_changes: captured_at is immutable';
  END IF;

  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'task_due_date_changes: created_at is immutable';
  END IF;

  -- Permitido mutar SOLO: reason_code, reason_source, reason_confidence
  -- (confirmación/corrección del motivo por el operador vía Notion).
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_due_date_changes_guard_update_trigger
  ON greenhouse_delivery.task_due_date_changes;

CREATE TRIGGER task_due_date_changes_guard_update_trigger
  BEFORE UPDATE ON greenhouse_delivery.task_due_date_changes
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_delivery.task_due_date_changes_guard_update();

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_due_date_changes_guard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'task_due_date_changes: rows are append-only; DELETE rejected (change_id=%)', OLD.change_id;
END;
$$;

DROP TRIGGER IF EXISTS task_due_date_changes_guard_delete_trigger
  ON greenhouse_delivery.task_due_date_changes;

CREATE TRIGGER task_due_date_changes_guard_delete_trigger
  BEFORE DELETE ON greenhouse_delivery.task_due_date_changes
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_delivery.task_due_date_changes_guard_delete();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Ownership + grants (canonical Greenhouse)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_delivery.task_due_date_changes OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_delivery.task_due_date_changes
  TO greenhouse_runtime;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Anti pre-up-marker guard (TASK-768 / ISSUE-068 canonical pattern)
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  table_exists BOOLEAN;
  source_event_id_idx_exists BOOLEAN;
  task_lookup_idx_exists BOOLEAN;
  update_trigger_exists BOOLEAN;
  delete_trigger_exists BOOLEAN;
  reason_code_check_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_delivery'
      AND table_name = 'task_due_date_changes'
  ) INTO table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_delivery'
      AND indexname = 'task_due_date_changes_source_event_id_unique_idx'
  ) INTO source_event_id_idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_delivery'
      AND indexname = 'task_due_date_changes_task_lookup_idx'
  ) INTO task_lookup_idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'task_due_date_changes_guard_update_trigger'
      AND NOT tgisinternal
  ) INTO update_trigger_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'task_due_date_changes_guard_delete_trigger'
      AND NOT tgisinternal
  ) INTO delete_trigger_exists;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'greenhouse_delivery'
      AND t.relname = 'task_due_date_changes'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%reason_code%'
  ) INTO reason_code_check_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-921 anti pre-up-marker: greenhouse_delivery.task_due_date_changes was NOT created. Migration markers may be inverted.';
  END IF;

  IF NOT source_event_id_idx_exists THEN
    RAISE EXCEPTION 'TASK-921 anti pre-up-marker: task_due_date_changes_source_event_id_unique_idx NOT created.';
  END IF;

  IF NOT task_lookup_idx_exists THEN
    RAISE EXCEPTION 'TASK-921 anti pre-up-marker: task_due_date_changes_task_lookup_idx NOT created.';
  END IF;

  IF NOT update_trigger_exists THEN
    RAISE EXCEPTION 'TASK-921 anti pre-up-marker: update guard trigger NOT created.';
  END IF;

  IF NOT delete_trigger_exists THEN
    RAISE EXCEPTION 'TASK-921 anti pre-up-marker: delete guard trigger NOT created.';
  END IF;

  IF NOT reason_code_check_exists THEN
    RAISE EXCEPTION 'TASK-921 anti pre-up-marker: reason_code CHECK constraint canonical enum NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS task_due_date_changes_guard_delete_trigger
  ON greenhouse_delivery.task_due_date_changes;

DROP TRIGGER IF EXISTS task_due_date_changes_guard_update_trigger
  ON greenhouse_delivery.task_due_date_changes;

DROP FUNCTION IF EXISTS greenhouse_delivery.task_due_date_changes_guard_delete();
DROP FUNCTION IF EXISTS greenhouse_delivery.task_due_date_changes_guard_update();

DROP INDEX IF EXISTS greenhouse_delivery.task_due_date_changes_pending_reason_idx;
DROP INDEX IF EXISTS greenhouse_delivery.task_due_date_changes_task_lookup_idx;
DROP INDEX IF EXISTS greenhouse_delivery.task_due_date_changes_source_event_id_unique_idx;

DROP TABLE IF EXISTS greenhouse_delivery.task_due_date_changes;
