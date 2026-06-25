-- Up Migration

-- TASK-1251 Slice 3 — Defense-in-depth: un submission del motor materializa A LO SUMO un
-- lead. El reactive consumer `growth_grader_run_from_submission` ya es idempotente a nivel
-- app (findGraderLeadBySubmissionId), pero dos workers concurrentes tienen un TOCTOU; este
-- índice UNIQUE PARCIAL lo cierra en la DB (el segundo INSERT falla → retry → no-op).
-- Parcial (WHERE submission_id IS NOT NULL): no afecta el histórico a-medida (submission_id NULL).
-- Reemplaza el índice no-único `grader_leads_submission_idx` creado en la migración de binding.

DROP INDEX IF EXISTS greenhouse_growth.grader_leads_submission_idx;

CREATE UNIQUE INDEX IF NOT EXISTS grader_leads_submission_unique_idx
  ON greenhouse_growth.grader_leads (submission_id)
  WHERE submission_id IS NOT NULL;

-- Anti pre-up-marker: aborta si el índice único no quedó creado.
DO $$
DECLARE idx_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_growth' AND indexname = 'grader_leads_submission_unique_idx'
  ) INTO idx_ok;

  IF NOT idx_ok THEN
    RAISE EXCEPTION 'TASK-1251 Slice 3 anti pre-up-marker: grader_leads_submission_unique_idx NO creado. Markers invertidos.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.grader_leads_submission_unique_idx;
CREATE INDEX IF NOT EXISTS grader_leads_submission_idx
  ON greenhouse_growth.grader_leads (submission_id);
