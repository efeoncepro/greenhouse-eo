-- Up Migration

-- TASK-1385 — AI-Assisted Vacancy Public Copy (propose→confirm).
-- 1. Extiende el CHECK de `kind` del ledger de propuestas IA (TASK-1361) con el kind nuevo
--    `opening_public_copy` (la IA redacta los campos public_* de un hiring_opening; el confirm
--    humano aplica vía updateHiringOpening — el LLM nunca escribe el opening).
-- 2. Seed idempotente de la capability `hiring.opening.ai_assist` espejando el catálogo TS +
--    grant en runtime.ts (mismo PR). El confirm reusa `hiring.opening.write`.

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_proposal
  DROP CONSTRAINT IF EXISTS hiring_assessment_ai_proposal_kind_check;

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_proposal
  ADD CONSTRAINT hiring_assessment_ai_proposal_kind_check
  CHECK (kind IN ('question_draft', 'response_score', 'opening_public_copy'));

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.opening.ai_assist', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1385 — Proponer con IA el copy público (public_*) de una vacante desde inputs allowlist-safe (propose→confirm). Solo PROPONE; el confirm reusa hiring.opening.write. Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
   NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el CHECK o el seed no quedaron aplicados.
DO $$
DECLARE
  check_ok integer;
  seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO check_ok
  FROM pg_constraint
  WHERE conname = 'hiring_assessment_ai_proposal_kind_check'
    AND conrelid = 'greenhouse_hiring.hiring_assessment_ai_proposal'::regclass
    AND pg_get_constraintdef(oid) LIKE '%opening_public_copy%';

  IF check_ok <> 1 THEN
    RAISE EXCEPTION 'TASK-1385 anti pre-up-marker check: kind CHECK sin opening_public_copy (count=%).', check_ok;
  END IF;

  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'hiring.opening.ai_assist'
    AND deprecated_at IS NULL;

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1385 anti pre-up-marker check: hiring.opening.ai_assist NOT seeded (count=%).', seeded_count;
  END IF;
END
$$;

-- Down Migration

-- Rollback documentado: elimina las propuestas del kind nuevo (append-only ledger; el down solo
-- corre en rollback explícito) y restaura el CHECK original de TASK-1361.
DELETE FROM greenhouse_hiring.hiring_assessment_ai_proposal WHERE kind = 'opening_public_copy';

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_proposal
  DROP CONSTRAINT IF EXISTS hiring_assessment_ai_proposal_kind_check;

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_proposal
  ADD CONSTRAINT hiring_assessment_ai_proposal_kind_check
  CHECK (kind IN ('question_draft', 'response_score'));

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'hiring.opening.ai_assist'
  AND deprecated_at IS NULL;
