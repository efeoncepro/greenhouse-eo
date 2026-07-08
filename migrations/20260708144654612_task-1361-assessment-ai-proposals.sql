-- Up Migration

-- TASK-1361 Slice 1 — Assessment AI Assist: ledger append-only de propuestas IA gobernadas.
-- Additive-only. Extiende TASK-1360 (reusa greenhouse_hiring.touch_updated_at()).
-- Patrón propose→confirm→execute (espeja el confirm-ledger del AEO grader): la IA PROPONE
-- contenido (borrador de pregunta / puntaje de respuesta); el LLM NUNCA escribe el banco ni el
-- score. Solo confirmAiProposal (humano, capability-gated) aplica vía createQuestion/recordHumanScore.
-- Arch: GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md §Delta 2026-07-08.

-- hiring_assessment_ai_proposal — append-only. kind gobierna el target y el path de confirmación:
--   question_draft   → target_ref = "<competencyKey>@<level>"; confirmar crea una hiring_question (draft, gate SME).
--   response_score   → target_ref = "<responseId>"; confirmar aplica recordHumanScore (el humano fija el valor final).
-- proposed_json = salida estructurada del LLM (evidencia, NO verdad). model/provider/prompt_version = trazabilidad AI-Act.
-- input_digest = sha256 de los inputs (idempotencia + auditoría; NUNCA PII cruda).
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_ai_proposal (
  proposal_id      TEXT PRIMARY KEY DEFAULT ('aip-' || gen_random_uuid()::text),
  kind             TEXT NOT NULL CHECK (kind IN ('question_draft', 'response_score')),
  target_ref       TEXT NOT NULL,
  proposed_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider         TEXT NOT NULL,
  model            TEXT NOT NULL,
  prompt_version   TEXT NOT NULL,
  input_digest     TEXT,
  usage_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'rejected')),
  confirmed_ref    TEXT,
  decision_note    TEXT,
  confirmed_by     TEXT,
  confirmed_at     TIMESTAMPTZ,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hiring_ai_proposal_kind_status_idx
  ON greenhouse_hiring.hiring_assessment_ai_proposal (kind, status);
CREATE INDEX IF NOT EXISTS hiring_ai_proposal_target_idx
  ON greenhouse_hiring.hiring_assessment_ai_proposal (target_ref);
-- Cola de revisión humana (propuestas pendientes de confirmar) — índice parcial.
CREATE INDEX IF NOT EXISTS hiring_ai_proposal_pending_idx
  ON greenhouse_hiring.hiring_assessment_ai_proposal (created_at)
  WHERE status = 'proposed';

CREATE TRIGGER trg_hiring_ai_proposal_touch BEFORE UPDATE ON greenhouse_hiring.hiring_assessment_ai_proposal
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();

-- Anti pre-up-marker guard (ISSUE-068): aborta si la tabla no quedó creada.
DO $$
DECLARE table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_assessment_ai_proposal'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1361 anti pre-up-marker: hiring_assessment_ai_proposal was NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- Ownership + GRANTs (espeja TASK-1360). Aggregate mutable → DML completo a runtime.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_ai_proposal TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_ai_proposal TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_ai_proposal TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_ai_proposal;
