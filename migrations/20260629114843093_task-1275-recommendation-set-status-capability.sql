-- Up Migration

-- TASK-1275 — Capability del estado de ejecución del Plan AEO (parity con entitlements-catalog.ts).
-- recommendation.set_status: el operador (Growth/AM) registra el avance de cada recomendación
-- (org × gap key) vía `setRecommendationStatus`. Grant (runtime.ts) = mismo set operador que
-- run.operator (internal ∪ EFEONCE_ADMIN ∪ EFEONCE_ACCOUNT ∪ EFEONCE_OPERATIONS ∪ AI_TOOLING_ADMIN).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.ai_visibility.recommendation.set_status',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1275 — Registrar el estado de ejecución del Plan AEO por organización y recomendación (gap key): not_started/in_progress/blocked/done/dismissed. Write gobernado del operador (Growth/AM). Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS + AI_TOOLING_ADMIN.',
    NOW(),
    NULL
  )
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
  WHERE capability_key = 'growth.ai_visibility.recommendation.set_status'
    AND deprecated_at IS NULL;

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1275 anti pre-up-marker check: recommendation.set_status capability NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'growth.ai_visibility.recommendation.set_status'
  AND deprecated_at IS NULL;