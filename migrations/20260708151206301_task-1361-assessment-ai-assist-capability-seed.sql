-- Up Migration

-- TASK-1361 Slice 5 — Capability del AI assist del Assessment Engine. Seed idempotente en
-- capabilities_registry espejando el catálogo TS + grant en runtime.ts (mismo PR).
-- Grant: ai_assist al tier operador (internal ∪ EFEONCE_ADMIN ∪ HR_MANAGER ∪ EFEONCE_OPERATIONS ∪
-- EFEONCE_ACCOUNT), igual que author. NUNCA client_*. El confirm reusa author/score.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.assessment.ai_assist', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1361 — Proponer borradores de pregunta / sugerencias de puntaje con IA (propose→confirm). Solo PROPONE; el confirm reusa author/score. Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
   NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el seed no quedó aplicado.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'hiring.assessment.ai_assist'
    AND deprecated_at IS NULL;
  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1361 anti pre-up-marker check: ai_assist capability NOT seeded (count=%).', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'hiring.assessment.ai_assist'
  AND deprecated_at IS NULL;
