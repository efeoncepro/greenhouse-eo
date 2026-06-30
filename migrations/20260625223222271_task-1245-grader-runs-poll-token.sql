-- Up Migration

-- TASK-1245 — Growth AI Visibility · poll_token: handle de poll público NO enumerable (EPIC-020).
-- El `public_id` del run es SECUENCIAL (EO-GRUN-#####) → enumerable, NO sirve como autorización de un
-- endpoint público sin sesión. Como en el status público "el handle ES la auth", el poll necesita un
-- token de alta entropía (256 bits, mismo patrón que `grader_reports.report_token`): un atacante no puede
-- adivinarlo ni enumerar runs/reportTokens ajenos. ADDITIVE + idempotente: cada run existente recibe su
-- propio token (el DEFAULT volátil se evalúa por fila en el rewrite). El `public_id` queda como id
-- humano-legible interno (admin/ops), NUNCA como handle de auth. Los grants table-level de grader_runs
-- ya cubren la columna nueva. Reader/endpoint en TASK-1245 resuelven poll_token (o submissionId en el
-- path convergente) → run; el public_id secuencial NUNCA autoriza.

ALTER TABLE greenhouse_growth.grader_runs
  ADD COLUMN IF NOT EXISTS poll_token TEXT NOT NULL
    DEFAULT ('gpt-' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

CREATE UNIQUE INDEX IF NOT EXISTS grader_runs_poll_token_idx
  ON greenhouse_growth.grader_runs (poll_token);

-- Anti pre-up-marker: aborta si la columna o el índice único no quedaron creados realmente.
DO $$
DECLARE col_ok boolean; idx_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_runs' AND column_name = 'poll_token'
  ) INTO col_ok;
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_growth' AND indexname = 'grader_runs_poll_token_idx'
  ) INTO idx_ok;

  IF NOT (col_ok AND idx_ok) THEN
    RAISE EXCEPTION 'TASK-1245 anti pre-up-marker: grader_runs.poll_token / unique idx NO creados (col=% idx=%). Markers invertidos.',
      col_ok, idx_ok;
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.grader_runs_poll_token_idx;
ALTER TABLE greenhouse_growth.grader_runs DROP COLUMN IF EXISTS poll_token;
