-- Up Migration

-- TASK-1829 — Capabilities del authorization server propio (EPIC-044):
--   identity.auth_client.register   registrar clientes OAuth confidenciales pre-registrados
--   identity.auth_consent.revoke    revocar consentimientos (y sus familias de tokens) por sujeto/cliente
-- Grant en src/lib/entitlements/runtime.ts (EFEONCE_ADMIN) en el mismo PR (invariante TASK-873/935).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('identity.auth_client.register', 'identity', ARRAY['execute'], ARRAY['tenant'],
   'Registrar un cliente OAuth confidencial pre-registrado en el emisor auth.efeonce.org (TASK-1829).', NOW(), NULL),
  ('identity.auth_consent.revoke', 'identity', ARRAY['execute'], ARRAY['tenant'],
   'Revocar el consentimiento OAuth de un sujeto para un cliente y revocar sus tokens vivos (TASK-1829).', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard (ISSUE-068).
DO $$
DECLARE seeded INTEGER;
BEGIN
  SELECT COUNT(*) INTO seeded
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('identity.auth_client.register', 'identity.auth_consent.revoke')
    AND deprecated_at IS NULL;

  IF seeded <> 2 THEN
    RAISE EXCEPTION 'TASK-1829 anti pre-up-marker: expected 2 seeded capabilities, got %. Markers may be inverted.', seeded;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN ('identity.auth_client.register', 'identity.auth_consent.revoke');
