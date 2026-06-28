-- Up Migration

-- TASK-1277 Slice 3 — Capabilities del run chokepoint AEO (parity con entitlements-catalog.ts).
-- run.portal: un client_* dispara un análisis AEO de SU org (scope own). El acceso efectivo lo
--   gobierna el chokepoint (módulo per-org + allowance). Grant (runtime.ts): client_* + superset interno.
-- run.operator: Growth/AM corre el motor sobre cualquier cliente/prospecto (jugada de venta,
--   ilimitado, costo a "sales"; scope tenant). Grant: internal ∪ EFEONCE_ADMIN ∪ EFEONCE_ACCOUNT ∪
--   EFEONCE_OPERATIONS ∪ AI_TOOLING_ADMIN.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.ai_visibility.run.portal',
    'growth',
    ARRAY['execute'],
    ARRAY['own'],
    'TASK-1277 — Disparar un análisis AEO de la propia organización (puerta cliente). Governed: el chokepoint aplica entitlement (módulo per-org) -> ventana -> allowance -> costo. Grant: client_* + superset interno (cobertura).',
    NOW(),
    NULL
  ),
  (
    'growth.ai_visibility.run.operator',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1277 — Correr el motor AEO sobre cualquier cliente o prospecto como jugada de venta (ilimitado, costo atribuido a sales). Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS + AI_TOOLING_ADMIN.',
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
  WHERE capability_key IN ('growth.ai_visibility.run.portal', 'growth.ai_visibility.run.operator')
    AND deprecated_at IS NULL;

  IF seeded_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1277 anti pre-up-marker check: AEO run capabilities NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN ('growth.ai_visibility.run.portal', 'growth.ai_visibility.run.operator')
  AND deprecated_at IS NULL;