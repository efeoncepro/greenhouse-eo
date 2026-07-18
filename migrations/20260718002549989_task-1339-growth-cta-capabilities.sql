-- Up Migration

-- TASK-1339 — Growth CTA & Popup Engine: seed de las 4 capabilities gobernadas
-- `growth.cta.*` en capabilities_registry (mismo PR que el catalog TS + grants en
-- runtime.ts — gate capability-grant-coverage). Upsert idempotente; Down = soft
-- deprecate (NUNCA DELETE del registry).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('growth.cta.read', 'growth', ARRAY['read'], ARRAY['tenant'],
   'TASK-1339 — Leer definiciones de CTA, versiones, contratos publicados y resumen de conversión (solo server_confirmed cuenta como conversión). Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('growth.cta.author', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1339 — Autorar versiones draft de CTA (definición + versión nueva; published es inmutable, editar = versión nueva). Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('growth.cta.publish', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1339 — Publicar/deprecar/archivar versiones de CTA y gestionar surface bindings (publish atómico con gate de acción resoluble contra Growth Forms). Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('growth.cta.pause', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1339 — Pausar/reanudar una versión publicada (stop de emergencia per-version, arch §16.3). Capability separada de publish a propósito: pausar no exige autoridad de publicación. Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard (ISSUE-068): las 4 capabilities deben quedar activas.
DO $$
DECLARE cap_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cap_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('growth.cta.read', 'growth.cta.author', 'growth.cta.publish', 'growth.cta.pause')
    AND deprecated_at IS NULL;

  IF cap_count <> 4 THEN
    RAISE EXCEPTION 'TASK-1339 anti pre-up-marker: expected 4 active growth.cta capabilities, got %. Markers may be inverted.', cap_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
   SET deprecated_at = NOW()
 WHERE capability_key IN ('growth.cta.read', 'growth.cta.author', 'growth.cta.publish', 'growth.cta.pause')
   AND deprecated_at IS NULL;
