-- Up Migration

-- TASK-1290 Slice 2/3 — Capability de gobernanza del prompt set AEO (parity con entitlements-catalog.ts).
-- prompt_set.manage: el operador (Growth/AM) autora (draft) y aprueba (draft→active, congela) el
-- set de prompts por marca. Acción gobernada distinta (define QUÉ se le pregunta a los motores sobre
-- una marca → afecta la medición), por eso capability dedicada (least-privilege + auditable).
-- Grant (runtime.ts) = mismo set operador que run.operator
-- (internal ∪ EFEONCE_ADMIN ∪ EFEONCE_ACCOUNT ∪ EFEONCE_OPERATIONS ∪ AI_TOOLING_ADMIN).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.ai_visibility.prompt_set.manage',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1290 — Autorar (draft) y aprobar (draft→active, congela) el set de prompts AEO por marca (Query Fan-Out por arquetipo × buyer-intent). Write gobernado del operador (Growth/AM); define qué se le pregunta a los motores sobre la marca. Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS + AI_TOOLING_ADMIN.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'growth.ai_visibility.prompt_set.manage'
    AND deprecated_at IS NULL;

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1290 anti pre-up-marker check: prompt_set.manage capability NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'growth.ai_visibility.prompt_set.manage'
  AND deprecated_at IS NULL;
