-- Up Migration

-- TASK-1234 Slice 1 — Async run execution worker.
-- Additive: `execution_prompts` persiste los prompts resueltos (promptId + promptText)
-- de un run para que el worker async lo ejecute sin re-derivar (captura el efecto de
-- discoveryOnly/competitor). Sin esto, un run encolado `pending` no es resumible por el
-- worker de forma determinista. Default '[]' → runs legacy quedan vacíos (no se re-ejecutan).

ALTER TABLE greenhouse_growth.grader_runs
  ADD COLUMN IF NOT EXISTS execution_prompts JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si la columna no quedó creada.
DO $$
DECLARE col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_growth'
      AND table_name = 'grader_runs'
      AND column_name = 'execution_prompts'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-1234 anti pre-up-marker: greenhouse_growth.grader_runs.execution_prompts NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_growth.grader_runs
  DROP COLUMN IF EXISTS execution_prompts;
