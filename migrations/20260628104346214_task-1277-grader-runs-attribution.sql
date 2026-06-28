-- Up Migration

-- TASK-1277 Slice 2 — Atribución per-org en grader_runs. Los runs SON el ledger de allowance:
-- no hace falta una tabla allowance separada. Agrega 4 columnas additive nullable (sin romper
-- el path del worker/enqueue existente), backfillea los runs legacy, e indexa para el conteo
-- de allowance por org+período del chokepoint (Slice 3).
--
--   - organization_id : org sujeto del run (cliente o prospecto). FK ON DELETE SET NULL.
--   - assignment_id   : el module_assignment que entitló el run (auditoría). FK ON DELETE SET NULL.
--   - run_source      : qué puerta originó el run (gate identity), para conteo y atribución.
--   - cost_attribution: bucket de costo (client | sales | internal | public).

SET search_path TO public, greenhouse_growth;

ALTER TABLE greenhouse_growth.grader_runs
  ADD COLUMN IF NOT EXISTS organization_id  TEXT,
  ADD COLUMN IF NOT EXISTS assignment_id    TEXT,
  ADD COLUMN IF NOT EXISTS run_source       TEXT,
  ADD COLUMN IF NOT EXISTS cost_attribution TEXT;

-- CHECK NOT VALID primero (no bloquea por filas legacy), VALIDATE tras el backfill.
ALTER TABLE greenhouse_growth.grader_runs
  DROP CONSTRAINT IF EXISTS grader_runs_run_source_check;
ALTER TABLE greenhouse_growth.grader_runs
  ADD CONSTRAINT grader_runs_run_source_check
  CHECK (run_source IS NULL OR run_source IN (
    'public', 'admin', 'portal_contracted', 'portal_trial', 'portal_pilot', 'operator_sales'
  )) NOT VALID;

ALTER TABLE greenhouse_growth.grader_runs
  DROP CONSTRAINT IF EXISTS grader_runs_cost_attribution_check;
ALTER TABLE greenhouse_growth.grader_runs
  ADD CONSTRAINT grader_runs_cost_attribution_check
  CHECK (cost_attribution IS NULL OR cost_attribution IN (
    'client', 'sales', 'internal', 'public'
  )) NOT VALID;

-- FKs NOT VALID (additive, no bloquean inserts legacy); referencian objetos canónicos.
ALTER TABLE greenhouse_growth.grader_runs
  DROP CONSTRAINT IF EXISTS grader_runs_organization_fk;
ALTER TABLE greenhouse_growth.grader_runs
  ADD CONSTRAINT grader_runs_organization_fk
  FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations(organization_id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE greenhouse_growth.grader_runs
  DROP CONSTRAINT IF EXISTS grader_runs_assignment_fk;
ALTER TABLE greenhouse_growth.grader_runs
  ADD CONSTRAINT grader_runs_assignment_fk
  FOREIGN KEY (assignment_id) REFERENCES greenhouse_client_portal.module_assignments(assignment_id)
  ON DELETE SET NULL NOT VALID;

-- Backfill idempotente de runs legacy: deriva run_source/cost_attribution del run_kind y
-- organization_id del profile enlazado (TASK-1243). Solo toca filas con run_source NULL.
UPDATE greenhouse_growth.grader_runs r
SET
  run_source = CASE
    WHEN r.run_kind = 'public_diagnostic' THEN 'public'
    ELSE 'admin'
  END,
  cost_attribution = CASE
    WHEN r.run_kind = 'public_diagnostic' THEN 'public'
    ELSE 'internal'
  END,
  organization_id = p.organization_id
FROM greenhouse_growth.grader_profiles p
WHERE r.profile_id = p.profile_id
  AND r.run_source IS NULL;

-- Filas sin profile match (defensa): marcar run_source/cost_attribution igual sin org.
UPDATE greenhouse_growth.grader_runs
SET
  run_source = CASE WHEN run_kind = 'public_diagnostic' THEN 'public' ELSE 'admin' END,
  cost_attribution = CASE WHEN run_kind = 'public_diagnostic' THEN 'public' ELSE 'internal' END
WHERE run_source IS NULL;

ALTER TABLE greenhouse_growth.grader_runs VALIDATE CONSTRAINT grader_runs_run_source_check;
ALTER TABLE greenhouse_growth.grader_runs VALIDATE CONSTRAINT grader_runs_cost_attribution_check;

-- Índice para el conteo de allowance por org + puerta portal + período (created_at del mes).
CREATE INDEX IF NOT EXISTS grader_runs_org_source_created_idx
  ON greenhouse_growth.grader_runs (organization_id, run_source, created_at DESC)
  WHERE organization_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_runs TO greenhouse_runtime;

-- Anti pre-up-marker guard: aborta si las columnas no quedaron creadas.
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'grader_runs'
    AND column_name IN ('organization_id', 'assignment_id', 'run_source', 'cost_attribution');
  IF col_count < 4 THEN
    RAISE EXCEPTION 'TASK-1277 anti pre-up-marker check: expected 4 attribution columns, got %', col_count;
  END IF;
END
$$;

-- Down Migration

SET search_path TO public, greenhouse_growth;

DROP INDEX IF EXISTS greenhouse_growth.grader_runs_org_source_created_idx;

ALTER TABLE greenhouse_growth.grader_runs
  DROP CONSTRAINT IF EXISTS grader_runs_run_source_check,
  DROP CONSTRAINT IF EXISTS grader_runs_cost_attribution_check,
  DROP CONSTRAINT IF EXISTS grader_runs_organization_fk,
  DROP CONSTRAINT IF EXISTS grader_runs_assignment_fk;

ALTER TABLE greenhouse_growth.grader_runs
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS assignment_id,
  DROP COLUMN IF EXISTS run_source,
  DROP COLUMN IF EXISTS cost_attribution;