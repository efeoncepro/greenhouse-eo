-- Up Migration

-- TASK-1289 — Capability del override de modelo de negocio del perfil AEO (parity con
-- entitlements-catalog.ts). profile.set_business_model: el operador (Growth/AM) corrige el
-- `business_model` derivado de un perfil cuando la clasificación automática se equivocó. Es
-- una acción gobernada DISTINTA (reencuadra TODO run futuro de la org → blast real), por eso
-- una capability dedicada (least-privilege + auditable) en vez de reusar run.operator.
-- Grant (runtime.ts) = mismo set operador que run.operator/recommendation.set_status
-- (internal ∪ EFEONCE_ADMIN ∪ EFEONCE_ACCOUNT ∪ EFEONCE_OPERATIONS ∪ AI_TOOLING_ADMIN).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.ai_visibility.profile.set_business_model',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1289 — Override del modelo de negocio (business_model) de un perfil AEO: corrige la clasificación automática (consumer_b2c/b2b_service_provider/b2b_product_saas/retail_ecommerce/marketplace/public_institution/unknown) con auditoría append-only. Write gobernado del operador (Growth/AM). Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS + AI_TOOLING_ADMIN.',
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
  WHERE capability_key = 'growth.ai_visibility.profile.set_business_model'
    AND deprecated_at IS NULL;

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1289 anti pre-up-marker check: profile.set_business_model capability NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'growth.ai_visibility.profile.set_business_model'
  AND deprecated_at IS NULL;
