-- Up Migration

-- TASK-1734 Slice 4 — Resolución de excepciones operator-only + manifest de confirmación
-- de run (ADR D1 manifest append-only + Delta 2026-08-16 punto 9 anti-anclaje).
--
-- 1. `resolution` en run_item: decisión humana UNO a uno sobre mandatory_review /
--    quality_sample (`confirmed` | `overridden` | `rejected_to_manual`). Terminal-once.
-- 2. `saw_proposal_before_scoring`: evidencia de anclaje del ADR — el carril mandatory
--    expone la propuesta antes del juicio humano; el manifest DEBE registrar si el revisor
--    la vio antes de emitir su score (`reviewer_saw_proposal_before_scoring`).
-- 3. Item status nuevo `rejected_to_manual`: la propuesta fue rechazada y la respuesta
--    vuelve a la cola manual (proposal `rejected`, human_score sigue NULL).
-- 4. run_event acepta `item_resolved` (decisión humana por item) y `run_confirm_manifest`
--    (el manifest append-only del batch confirm: hechos estructurados, NUNCA PII).

-- ── 1. Columnas de resolución en run_item ──
ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_item
  ADD COLUMN IF NOT EXISTS resolution TEXT
    CHECK (resolution IS NULL OR resolution IN ('confirmed', 'overridden', 'rejected_to_manual')),
  ADD COLUMN IF NOT EXISTS saw_proposal_before_scoring BOOLEAN,
  ADD COLUMN IF NOT EXISTS resolved_by TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- ── 2. Status `rejected_to_manual` en el CHECK del item ──
ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_item
  DROP CONSTRAINT IF EXISTS hiring_assessment_ai_scoring_run_item_status_check;

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_item
  ADD CONSTRAINT hiring_assessment_ai_scoring_run_item_status_check
  CHECK (status IN (
    'pending', 'claimed', 'proposed', 'abstained', 'failed',
    'stale', 'superseded_by_manual', 'cancelled', 'confirmed', 'rejected_to_manual'));

-- ── 3. Event types nuevos en la historia append-only ──
ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_event
  DROP CONSTRAINT IF EXISTS hiring_assessment_ai_scoring_run_event_event_type_check;

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_event
  ADD CONSTRAINT hiring_assessment_ai_scoring_run_event_event_type_check
  CHECK (event_type IN (
    'run_transition', 'item_transition', 'reconciliation', 'item_resolved', 'run_confirm_manifest'));

-- ── 4. Grants column-scoped (patrón del Slice 1: solo columnas de decisión mutan) ──
GRANT UPDATE (resolution, saw_proposal_before_scoring, resolved_by, resolved_at)
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run_item TO greenhouse_runtime;

-- ── 5. Anti pre-up-marker guard (ISSUE-068): aborta si el DDL no quedó aplicado ──
DO $$
DECLARE col_count integer; status_ok integer; event_ok integer;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_hiring'
    AND table_name = 'hiring_assessment_ai_scoring_run_item'
    AND column_name IN ('resolution', 'saw_proposal_before_scoring', 'resolved_by', 'resolved_at');

  SELECT COUNT(*) INTO status_ok
  FROM information_schema.check_constraints
  WHERE constraint_schema = 'greenhouse_hiring'
    AND constraint_name = 'hiring_assessment_ai_scoring_run_item_status_check'
    AND check_clause LIKE '%rejected_to_manual%';

  SELECT COUNT(*) INTO event_ok
  FROM information_schema.check_constraints
  WHERE constraint_schema = 'greenhouse_hiring'
    AND constraint_name = 'hiring_assessment_ai_scoring_run_event_event_type_check'
    AND check_clause LIKE '%run_confirm_manifest%';

  IF col_count <> 4 OR status_ok <> 1 OR event_ok <> 1 THEN
    RAISE EXCEPTION 'TASK-1734 Slice 4 anti pre-up-marker check failed: cols=% status_check=% event_check=%',
      col_count, status_ok, event_ok;
  END IF;
END
$$;

-- Down Migration

-- Solo antes de que exista evidencia de revisión retenida (posture ADR D3). Falla si hay
-- filas rejected_to_manual (protección deliberada del CHECK restaurado).
ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_event
  DROP CONSTRAINT IF EXISTS hiring_assessment_ai_scoring_run_event_event_type_check;

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_event
  ADD CONSTRAINT hiring_assessment_ai_scoring_run_event_event_type_check
  CHECK (event_type IN ('run_transition', 'item_transition', 'reconciliation'));

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_item
  DROP CONSTRAINT IF EXISTS hiring_assessment_ai_scoring_run_item_status_check;

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_item
  ADD CONSTRAINT hiring_assessment_ai_scoring_run_item_status_check
  CHECK (status IN (
    'pending', 'claimed', 'proposed', 'abstained', 'failed',
    'stale', 'superseded_by_manual', 'cancelled', 'confirmed'));

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_item
  DROP COLUMN IF EXISTS resolution,
  DROP COLUMN IF EXISTS saw_proposal_before_scoring,
  DROP COLUMN IF EXISTS resolved_by,
  DROP COLUMN IF EXISTS resolved_at;
