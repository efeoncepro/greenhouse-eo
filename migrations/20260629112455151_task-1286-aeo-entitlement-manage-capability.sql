-- Up Migration

-- TASK-1286 — Capability para asignar/cambiar/superseder tiers AEO por organización.
-- Grant runtime: EFEONCE_ACCOUNT + EFEONCE_ADMIN. La mutación real vive en `assignAeoTier`.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.ai_visibility.entitlement.manage',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1286 — Asignar, cambiar o superseder tiers AEO por organización mediante el command gobernado assignAeoTier. Grant: EFEONCE_ACCOUNT + EFEONCE_ADMIN.',
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
  WHERE capability_key = 'growth.ai_visibility.entitlement.manage'
    AND deprecated_at IS NULL;

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1286 anti pre-up-marker check: AEO entitlement manage capability NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'growth.ai_visibility.entitlement.manage'
  AND deprecated_at IS NULL;
