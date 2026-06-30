-- Up Migration
--
-- TASK-1244 — Growth AI Visibility · Admin evidence review (EPIC-020 F).
--
-- Gate humano de release YMYL: un reporte cuyo score quedó `review_required`
-- (TASK-1227 lenguaje de riesgo / sentimiento bajo-confianza, TASK-1238 exactitud
-- de marca) NO se publica al público hasta que un operador interno lo apruebe.
--
-- `grader_report_reviews` es un LOG DE DECISIÓN APPEND-ONLY (= audit + estado en una
-- sola tabla, espejo de la inmutabilidad de `grader_reports`):
--   - una fila por decisión humana (`approved` | `rejected`) de un (run, score_version);
--   - el estado vigente de un (run, score_version) = la fila más reciente por created_at;
--   - AUSENCIA de fila = `pending` (los `review_required` nacen pending sin tocar el
--     writer de scoring → additive puro; el backfill de los existentes es no-op).
-- El validador de transición (pending → approved|rejected; idempotente; nunca
-- approved↔rejected) vive en `src/lib/growth/ai-visibility/review/state.ts` (pure) y se
-- aplica en el comando ANTES del INSERT; el CHECK acá sólo fija el enum + reason no vacía
-- en rejected.

SET search_path TO public, greenhouse_growth;

CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_report_reviews (
  review_id            TEXT PRIMARY KEY DEFAULT ('grrev-' || gen_random_uuid()::text),
  run_id               TEXT NOT NULL REFERENCES greenhouse_growth.grader_runs(run_id),
  -- Versión del score revisada: la aprobación queda ligada a ESTA versión. Un re-score
  -- (nueva score_version review_required) NO hereda la decisión → re-revisión obligatoria
  -- (anti "approve-once auto-release futuro"; propiedad de seguridad YMYL).
  score_version        TEXT NOT NULL,
  decision             TEXT NOT NULL,
  -- Razón interna (es-CL). Obligatoria en rejected (por qué se bloqueó); opcional en approved.
  reason               TEXT,
  reviewed_by_user_id  TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grader_report_reviews_decision_check
    CHECK (decision IN ('approved', 'rejected')),
  CONSTRAINT grader_report_reviews_reject_reason_check
    CHECK (decision <> 'rejected' OR (reason IS NOT NULL AND length(btrim(reason)) > 0))
);

-- Estado vigente por (run, score_version) = fila más reciente; los readers ordenan
-- por created_at DESC sobre este índice.
CREATE INDEX IF NOT EXISTS grader_report_reviews_run_version_idx
  ON greenhouse_growth.grader_report_reviews (run_id, score_version, created_at DESC);

-- Append-only: bloquea UPDATE/DELETE del log de decisión (defensa en profundidad,
-- aunque el GRANT solo dé SELECT/INSERT al runtime).
CREATE OR REPLACE FUNCTION greenhouse_growth.block_report_review_mutation()
  RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.grader_report_reviews es append-only (TASK-1244): % bloqueado.', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS grader_report_reviews_block_mutation ON greenhouse_growth.grader_report_reviews;
CREATE TRIGGER grader_report_reviews_block_mutation
  BEFORE UPDATE OR DELETE ON greenhouse_growth.grader_report_reviews
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_report_review_mutation();

-- Anti pre-up-marker: aborta si la tabla no quedó realmente creada.
DO $$
DECLARE review_table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_report_reviews'
  ) INTO review_table_exists;

  IF NOT review_table_exists THEN
    RAISE EXCEPTION 'TASK-1244 anti pre-up-marker check: greenhouse_growth.grader_report_reviews NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- Ownership + GRANTs (append-only: SELECT + INSERT al runtime/app; NO UPDATE/DELETE).
ALTER TABLE greenhouse_growth.grader_report_reviews OWNER TO greenhouse_ops;

GRANT SELECT, INSERT ON greenhouse_growth.grader_report_reviews TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.grader_report_reviews TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_report_reviews TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_growth.block_report_review_mutation() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_growth.block_report_review_mutation() TO greenhouse_app;

-- Down Migration

DROP TRIGGER IF EXISTS grader_report_reviews_block_mutation ON greenhouse_growth.grader_report_reviews;
DROP FUNCTION IF EXISTS greenhouse_growth.block_report_review_mutation();
DROP TABLE IF EXISTS greenhouse_growth.grader_report_reviews;
