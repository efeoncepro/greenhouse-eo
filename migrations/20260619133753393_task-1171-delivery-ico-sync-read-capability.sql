-- Up Migration

-- TASK-1171 Slice 5 — Capability de lectura del estado de sync ICO de un cliente
-- (verify-ICO preflight: "configurado != fluyendo"). Read gobernado, Nexa-operable
-- ("esta calculando ICO el cliente X?"). Grant (runtime.ts, mismo PR): route_group
-- internal ∪ EFEONCE_ADMIN (visibilidad interna del estado de onboarding ICO).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'delivery.ico.sync.read',
    'delivery',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-1171 — Leer el estado de sync ICO de un cliente (connected/enabled/calculating; preflight configurado != fluyendo). Reader getClientIcoSyncStatus + endpoint GET /api/delivery/ico/sync-status. Grant: route_group internal + EFEONCE_ADMIN.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard: aborta si el seed no quedo realmente aplicado.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'delivery.ico.sync.read'
    AND deprecated_at IS NULL;

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1171 anti pre-up-marker check: delivery.ico.sync.read NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'delivery.ico.sync.read'
  AND deprecated_at IS NULL;
