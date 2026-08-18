-- Up Migration

-- TASK-1734 Slice 2 — Evidencia de routing del risk router (ADR D2).
-- `routing_reasons` guarda los reason codes ESTABLES de la policy versionada que
-- clasificó el item (`mandatory_review` | `quality_sample` | `batch_eligible`):
-- array JSONB de códigos, NUNCA texto de respuesta ni PII. Aditiva sobre la tabla
-- de items del Slice 1 (20260816184326111); la columna nace con default '[]'.
ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_item
  ADD COLUMN IF NOT EXISTS routing_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Grant column-scoped adicional (el patrón del Slice 1: solo columnas de transición
-- aceptan UPDATE del runtime; el lineage sigue inmutable).
GRANT UPDATE (routing_reasons)
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run_item TO greenhouse_runtime;

-- Anti pre-up-marker guard (ISSUE-068): aborta si el DDL no quedó aplicado.
DO $$
DECLARE col_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_hiring'
      AND table_name = 'hiring_assessment_ai_scoring_run_item'
      AND column_name = 'routing_reasons'
  ) INTO col_ok;

  IF NOT col_ok THEN
    RAISE EXCEPTION 'TASK-1734 Slice 2 anti pre-up-marker check: routing_reasons was NOT added. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_item
  DROP COLUMN IF EXISTS routing_reasons;
