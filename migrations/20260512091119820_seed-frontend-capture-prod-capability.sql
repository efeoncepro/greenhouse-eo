-- Up Migration

-- OQ-6 frontend capture helper V1.1
-- Completa el Triple Gate canónico para production captures (pnpm fe:capture --env=production):
--   1. GREENHOUSE_CAPTURE_ALLOW_PROD=true env var
--   2. --prod CLI flag
--   3. operator declara GREENHOUSE_CAPTURE_ACTOR_CAPABILITY=platform.frontend.capture_prod
-- después de validar que posee esta capability vigente.
--
-- V1.2 (futuro) usará lookup PG real vía can(); por ahora el seed garantiza
-- TS↔DB parity (regla canónica TASK-611 capabilities_registry).

INSERT INTO greenhouse_core.capabilities_registry (
  capability_key,
  module,
  default_scope,
  description,
  deprecated_at
)
VALUES (
  'platform.frontend.capture_prod',
  'platform',
  'all',
  'Allows running production captures via pnpm fe:capture --env=production (frontend capture helper V1.1, OQ-6). Triple Gate: env var + CLI flag + this capability. Audit log registra cada run para forensic.',
  NULL
)
ON CONFLICT (capability_key) DO UPDATE
SET
  module = EXCLUDED.module,
  default_scope = EXCLUDED.default_scope,
  description = EXCLUDED.description,
  deprecated_at = NULL,
  updated_at = NOW();

-- Anti pre-up-marker guard: confirmar que la capability quedó registrada.
DO $$
DECLARE expected_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM greenhouse_core.capabilities_registry
     WHERE capability_key = 'platform.frontend.capture_prod'
       AND deprecated_at IS NULL
  ) INTO expected_exists;

  IF NOT expected_exists THEN
    RAISE EXCEPTION 'OQ-6 anti pre-up-marker check: platform.frontend.capture_prod was NOT seeded into capabilities_registry. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

-- Marcar como deprecated en lugar de delete (registry es append-only auditable).
UPDATE greenhouse_core.capabilities_registry
   SET deprecated_at = NOW()
 WHERE capability_key = 'platform.frontend.capture_prod';