-- Up Migration

-- TASK-1171 Slice 3 — Capability gobernada para ACTIVAR el sync ICO de un cliente
-- (Full API Parity: la acción "prender ICO para el cliente X" deja de ser admin-coarse
-- vía /api/integrations/notion/register y pasa a un command + endpoint + capability
-- governado, Nexa-operable). Grant (runtime.ts, mismo PR): EFEONCE_ADMIN ∪
-- EFEONCE_OPERATIONS ∪ EFEONCE_ACCOUNT (account = onboarding de cliente).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'delivery.ico.sync.enable',
    'delivery',
    ARRAY['update'],
    ARRAY['tenant'],
    'TASK-1171 — Activar el sync Notion->ICO de un cliente ya conectado (flip sync_enabled=TRUE en space_notion_sources). Reemplaza el path admin-coarse por una accion gobernada/idempotente/auditada (command enableClientIcoSync + endpoint POST /api/delivery/ico/enable-sync). Grant: EFEONCE_ADMIN + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
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
  WHERE capability_key = 'delivery.ico.sync.enable'
    AND deprecated_at IS NULL;

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1171 anti pre-up-marker check: delivery.ico.sync.enable NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'delivery.ico.sync.enable'
  AND deprecated_at IS NULL;
