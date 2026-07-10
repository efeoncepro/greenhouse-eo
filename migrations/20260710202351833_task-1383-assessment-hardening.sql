-- Up Migration

-- TASK-1383 Slice 1 — Assessment Engine hardening (auditoría 2026-07-10 pre-TASK-1363).
-- Additive + dedupe determinístico previo a los UNIQUE. Cierra a nivel de DATOS:
--   (1) idempotencia de respuestas (autosave duplicado sesgaba el AVG del score final),
--   (4) expiración de token, (5) actor del SME gate, (7) dedupe del ledger IA,
--   (9) inmutabilidad/versionado de templates (contrato pre-TASK-1364/1365: un template_id
--       con instancias = contenido CONGELADO; editar = crear versión nueva con supersede).

-- ── 1. Respuestas: dedupe (conservar la más reciente) + UNIQUE parciales ──
-- candidate_test: una respuesta por (assessment, question).
DELETE FROM greenhouse_hiring.hiring_assessment_response r
USING greenhouse_hiring.hiring_assessment_response newer
WHERE r.question_id IS NOT NULL
  AND newer.assessment_id = r.assessment_id
  AND newer.question_id = r.question_id
  AND (newer.created_at, newer.response_id) > (r.created_at, r.response_id);

-- interviewer_scorecard (question NULL): un rating por (assessment, competency).
DELETE FROM greenhouse_hiring.hiring_assessment_response r
USING greenhouse_hiring.hiring_assessment_response newer
WHERE r.question_id IS NULL
  AND newer.question_id IS NULL
  AND newer.assessment_id = r.assessment_id
  AND newer.competency_id = r.competency_id
  AND (newer.created_at, newer.response_id) > (r.created_at, r.response_id);

CREATE UNIQUE INDEX IF NOT EXISTS hiring_assessment_response_question_uniq
  ON greenhouse_hiring.hiring_assessment_response (assessment_id, question_id)
  WHERE question_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hiring_assessment_response_scorecard_uniq
  ON greenhouse_hiring.hiring_assessment_response (assessment_id, competency_id)
  WHERE question_id IS NULL;

-- ── 2. Token con vencimiento (enforcement en dominio: resolve/start/save/submit) ──
ALTER TABLE greenhouse_hiring.hiring_assessment
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- ── 3. SME gate auditable (quién movió la pregunta de estado) ──
ALTER TABLE greenhouse_hiring.hiring_question
  ADD COLUMN IF NOT EXISTS status_changed_by TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- ── 4. Ledger IA: dedupe de proposals pendientes duplicadas + UNIQUE parcial ──
DELETE FROM greenhouse_hiring.hiring_assessment_ai_proposal p
USING greenhouse_hiring.hiring_assessment_ai_proposal newer
WHERE p.status = 'proposed'
  AND p.input_digest IS NOT NULL
  AND newer.status = 'proposed'
  AND newer.kind = p.kind
  AND newer.input_digest = p.input_digest
  AND (newer.created_at, newer.proposal_id) > (p.created_at, p.proposal_id);

CREATE UNIQUE INDEX IF NOT EXISTS hiring_assessment_ai_proposal_pending_digest_uniq
  ON greenhouse_hiring.hiring_assessment_ai_proposal (kind, input_digest)
  WHERE status = 'proposed' AND input_digest IS NOT NULL;

-- ── 5. Templates: versionado + inmutabilidad una vez usados ──
ALTER TABLE greenhouse_hiring.hiring_assessment_template
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_template_id TEXT
    REFERENCES greenhouse_hiring.hiring_assessment_template (template_id) ON DELETE SET NULL;

-- Un template con instancias es INMUTABLE en contenido (name/role_hint/version/supersedes)
-- y en sus módulos (INSERT/UPDATE/DELETE). Solo `status` (retirar/archivar) sigue mutable.
-- Garantía a nivel de datos para TASK-1364/1365: template_id = contenido congelado.
CREATE OR REPLACE FUNCTION greenhouse_hiring.assert_assessment_template_immutable()
RETURNS TRIGGER AS $$
DECLARE target_template_id TEXT;
DECLARE has_instances BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'hiring_assessment_template' THEN
    -- Permitir cambios de status/updated_at; bloquear contenido.
    IF NEW.name IS NOT DISTINCT FROM OLD.name
       AND NEW.role_hint IS NOT DISTINCT FROM OLD.role_hint
       AND NEW.version IS NOT DISTINCT FROM OLD.version
       AND NEW.supersedes_template_id IS NOT DISTINCT FROM OLD.supersedes_template_id THEN
      RETURN NEW;
    END IF;

    target_template_id := OLD.template_id;
  ELSE
    target_template_id := COALESCE(OLD.template_id, NEW.template_id);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM greenhouse_hiring.hiring_assessment a
    WHERE a.template_id = target_template_id
  ) INTO has_instances;

  IF has_instances THEN
    RAISE EXCEPTION 'hiring_assessment_template % es inmutable: tiene instancias. Crear una versión nueva con supersedes_template_id (TASK-1383, contrato pre-1364/1365).', target_template_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hiring_template_immutable_trigger ON greenhouse_hiring.hiring_assessment_template;
CREATE TRIGGER hiring_template_immutable_trigger
  BEFORE UPDATE ON greenhouse_hiring.hiring_assessment_template
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.assert_assessment_template_immutable();

DROP TRIGGER IF EXISTS hiring_template_module_immutable_trigger ON greenhouse_hiring.hiring_assessment_template_module;
CREATE TRIGGER hiring_template_module_immutable_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON greenhouse_hiring.hiring_assessment_template_module
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.assert_assessment_template_immutable();

-- ── 6. Anti pre-up-marker guard (ISSUE-068) ──
DO $$
DECLARE idx_count INTEGER;
DECLARE col_count INTEGER;
DECLARE trg_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'greenhouse_hiring'
    AND indexname IN (
      'hiring_assessment_response_question_uniq',
      'hiring_assessment_response_scorecard_uniq',
      'hiring_assessment_ai_proposal_pending_digest_uniq'
    );

  IF idx_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1383 anti pre-up-marker: expected 3 unique indexes, got %.', idx_count;
  END IF;

  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_hiring'
    AND ((table_name = 'hiring_assessment' AND column_name = 'token_expires_at')
      OR (table_name = 'hiring_question' AND column_name IN ('status_changed_by', 'status_changed_at'))
      OR (table_name = 'hiring_assessment_template' AND column_name IN ('version', 'supersedes_template_id')));

  IF col_count <> 5 THEN
    RAISE EXCEPTION 'TASK-1383 anti pre-up-marker: expected 5 new columns, got %.', col_count;
  END IF;

  SELECT COUNT(*) INTO trg_count
  FROM pg_trigger
  WHERE tgname IN ('hiring_template_immutable_trigger', 'hiring_template_module_immutable_trigger');

  IF trg_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1383 anti pre-up-marker: expected 2 immutability triggers, got %.', trg_count;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS hiring_template_module_immutable_trigger ON greenhouse_hiring.hiring_assessment_template_module;
DROP TRIGGER IF EXISTS hiring_template_immutable_trigger ON greenhouse_hiring.hiring_assessment_template;
DROP FUNCTION IF EXISTS greenhouse_hiring.assert_assessment_template_immutable();
DROP INDEX IF EXISTS greenhouse_hiring.hiring_assessment_ai_proposal_pending_digest_uniq;
DROP INDEX IF EXISTS greenhouse_hiring.hiring_assessment_response_scorecard_uniq;
DROP INDEX IF EXISTS greenhouse_hiring.hiring_assessment_response_question_uniq;
ALTER TABLE greenhouse_hiring.hiring_assessment_template
  DROP COLUMN IF EXISTS supersedes_template_id,
  DROP COLUMN IF EXISTS version;
ALTER TABLE greenhouse_hiring.hiring_question
  DROP COLUMN IF EXISTS status_changed_at,
  DROP COLUMN IF EXISTS status_changed_by;
ALTER TABLE greenhouse_hiring.hiring_assessment
  DROP COLUMN IF EXISTS token_expires_at;
