-- Up Migration

-- TASK-1229 — Capabilities del motor Growth Forms (8). Cada una se grantea en
-- runtime.ts (mismo PR) a roles internos reales; el coverage test rompe el build
-- si una capability can()-checked no tiene grant. allowed_actions usa el enum del
-- registry: read|execute (la intención publish/manage vive en el key).
-- Arch: GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md §21.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('growth.forms.read', 'growth', ARRAY['read'], ARRAY['tenant'],
   'TASK-1229 — Leer definitions y published render contracts del motor Growth Forms. Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('growth.forms.author', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1229 — Crear/editar draft form versions (author). Publicar crea versión nueva (inmutable). Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('growth.forms.review', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1229 — Revisar forms antes de publicar (gate de policy compiler). Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('growth.forms.publish', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1229 — Publicar/deprecar/archivar form versions (lifecycle). Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('growth.forms.submissions.read', 'growth', ARRAY['read'], ARRAY['tenant'],
   'TASK-1229 — Leer submissions aceptadas/rechazadas + estado de entrega. Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('growth.forms.destinations.manage', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1229 — Gestionar destination mappings + adapter settings. Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('growth.forms.retry_delivery', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1229 — Reintentar/dead-letter destination attempts. Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('growth.forms.surfaces.manage', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1229 — Gestionar host surfaces (WordPress/Astro/Next) + origin allowlist + embed keys. Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL)
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
  WHERE capability_key IN (
    'growth.forms.read', 'growth.forms.author', 'growth.forms.review', 'growth.forms.publish',
    'growth.forms.submissions.read', 'growth.forms.destinations.manage',
    'growth.forms.retry_delivery', 'growth.forms.surfaces.manage')
    AND deprecated_at IS NULL;

  IF seeded_count <> 8 THEN
    RAISE EXCEPTION 'TASK-1229 anti pre-up-marker check: growth.forms capabilities NOT seeded (count=%). Markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'growth.forms.read', 'growth.forms.author', 'growth.forms.review', 'growth.forms.publish',
  'growth.forms.submissions.read', 'growth.forms.destinations.manage',
  'growth.forms.retry_delivery', 'growth.forms.surfaces.manage')
  AND deprecated_at IS NULL;
