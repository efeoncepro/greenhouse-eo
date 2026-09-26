-- Up Migration

-- TASK-1893 — Capability de descarga de originales de Efeonce Marketing Studio. Es lo que el gateway Efeonce MCP
-- verificará para la PERSONA antes de pedir a Studio una URL firmada de vida corta de una versión aprobada.
-- Separada de la lectura: ver una campaña no autoriza a llevarse el archivo final. Studio exige además el scope
-- studio:assets:download del bearer de servicio y acota por organización.
-- Catálogo TS (entitlements-catalog.ts) y grant (runtime.ts) viajan en el mismo commit.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('marketing_studio.asset.download', 'marketing_studio', ARRAY['read'], ARRAY['organization', 'tenant'],
   'Obtener un enlace de descarga de vida corta del original de una versión aprobada de Marketing Studio, con su estado de derechos de uso. Cada emisión queda auditada. No sube ni modifica piezas', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker: aborta si la capability no quedó registrada.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'marketing_studio.asset.download' AND deprecated_at IS NULL) THEN
    RAISE EXCEPTION 'TASK-1893 anti pre-up-marker check: marketing_studio.asset.download no quedó registrada';
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW() WHERE capability_key = 'marketing_studio.asset.download';
