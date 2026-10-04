-- Owner: operador del release Greenhouse, TASK-1905.
-- Condición: release de capability catalog.manage listo; crear timestamp nuevo con pnpm migrate:create,
-- copiar este SQL y aplicar/readback en staging antes de producción. No habilita autoridad MCP (TASK-2003).
-- Up Migration

-- TASK-1905 — registry only. Role grants live in entitlements/runtime.ts:
-- efeonce_admin + efeonce_operations; never account or designer by campaign-write inheritance.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('marketing_studio.catalog.manage', 'marketing_studio', ARRAY['create', 'update'], ARRAY['tenant'],
   'Gobernar el catálogo versionado de canales de Marketing Studio. No concede aprobación de piezas ni publicación de campañas', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'marketing_studio.catalog.manage'
      AND module = 'marketing_studio'
      AND allowed_actions = ARRAY['create', 'update']::text[]
      AND allowed_scopes = ARRAY['tenant']::text[]
      AND deprecated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'TASK-1905 anti pre-up-marker check: catalog capability contract missing';
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'marketing_studio.catalog.manage';
