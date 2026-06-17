-- Up Migration

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'public_site.runtime_binding.read',
    'public_site',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-1161 — Lectura read-only del binding Astro/Vercel del sitio publico via GET /api/admin/public-site/binding. No deploy, rollback, asset writes ni cutover.',
    NOW(),
    NULL
  ),
  (
    'public_site.route_ownership.read',
    'public_site',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-1161 — Lectura read-only de la matriz de ownership de rutas Public Site dentro del contrato public-site-astro-binding.v1.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

DO $$
DECLARE
  capability_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'public_site.runtime_binding.read',
    'public_site.route_ownership.read'
  )
    AND deprecated_at IS NULL;

  IF capability_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1161 anti pre-up-marker: expected 2 Public Site Astro binding capabilities, got %.', capability_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'public_site.runtime_binding.read',
  'public_site.route_ownership.read'
)
  AND deprecated_at IS NULL;
