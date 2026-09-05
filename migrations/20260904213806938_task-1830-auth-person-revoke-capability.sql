-- Up Migration

-- TASK-1830 — Capability de revocación de acceso de una persona externa (EPIC-044):
--   identity.auth_person.revoke   revocar sesión, passkeys y TOTP de un sujeto del emisor
--
-- Módulo `organization` para quedar junto a las demás de identidad externa (TASK-1631/1829).
-- Grant en src/lib/entitlements/runtime.ts (EFEONCE_ADMIN) en el mismo PR (invariante TASK-873/935).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('identity.auth_person.revoke', 'organization', ARRAY['execute'], ARRAY['tenant'],
   'Revocar la sesión, los passkeys y el TOTP de una persona externa en auth.efeonce.org (TASK-1830).',
   NOW(), NULL)
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
  WHERE capability_key = 'identity.auth_person.revoke'
    AND deprecated_at IS NULL;

  IF seeded <> 1 THEN
    RAISE EXCEPTION 'TASK-1830 anti pre-up-marker: expected identity.auth_person.revoke seeded, got %. Markers may be inverted.', seeded;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'identity.auth_person.revoke';
