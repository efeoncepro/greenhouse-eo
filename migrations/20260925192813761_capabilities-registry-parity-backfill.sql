-- Up Migration

-- Paridad catálogo TS ⇆ capabilities_registry (detectada por parity.live.test.ts el 2026-09-25 durante TASK-1890).
-- Cuatro capabilities ya declaradas en entitlements-catalog.ts y con grant en runtime.ts no tenían fila en el
-- registro. Sembrarlas no concede nada nuevo: la autorización la resuelven el catálogo y los grants; el registro es
-- el inventario gobernado que consumen Admin Center y la paridad.
--   · identity.internal_access.{enroll,grant,revoke} — TASK-1836 (autoridad interna de Efeonce ID), en uso por
--     src/lib/identity/internal-access/commands.ts.
--   · growth.ga4.connect — TASK-1284; su migración de tablas sigue estacionada en pending-migrations y hace
--     ON CONFLICT DO UPDATE sobre esta misma fila, así que no choca cuando se aplique.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('identity.internal_access.enroll', 'organization', ARRAY['execute'], ARRAY['tenant'],
   'Enrolar a una persona interna en el acceso corporativo de Efeonce ID (autoridad separada de revocar y de delegar)', NOW(), NULL),
  ('identity.internal_access.revoke', 'organization', ARRAY['execute'], ARRAY['tenant'],
   'Revocar el acceso corporativo de Efeonce ID de una persona interna', NOW(), NULL),
  ('identity.internal_access.grant', 'organization', ARRAY['execute'], ARRAY['tenant'],
   'Delegar autoridad interna de Efeonce ID sobre organizaciones a una persona enrolada', NOW(), NULL),
  ('growth.ga4.connect', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'Conectar y desconectar una propiedad GA4 de una organización mediante OAuth de solo lectura.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker: aborta si alguna fila no quedó registrada.
DO $$
DECLARE missing text[];
BEGIN
  SELECT array_agg(k) INTO missing
    FROM unnest(ARRAY['identity.internal_access.enroll','identity.internal_access.revoke','identity.internal_access.grant','growth.ga4.connect']) k
   WHERE NOT EXISTS (SELECT 1 FROM greenhouse_core.capabilities_registry WHERE capability_key = k AND deprecated_at IS NULL);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'capabilities-registry-parity-backfill: faltan %', missing;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW()
 WHERE capability_key IN ('identity.internal_access.enroll','identity.internal_access.revoke','identity.internal_access.grant','growth.ga4.connect');
