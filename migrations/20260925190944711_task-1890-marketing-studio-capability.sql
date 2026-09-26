-- Up Migration

-- TASK-1890 — Capability de lectura de Efeonce Marketing Studio. Es lo que el gateway Efeonce MCP verifica para la
-- PERSONA antes de federar las tools studio.* (TASK-1891); el bearer de servicio de Studio acota por organización.
-- Catálogo TS (entitlements-catalog.ts) y grant (runtime.ts) viajan en el mismo commit.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('marketing_studio.campaign.read', 'marketing_studio', ARRAY['read'], ARRAY['organization', 'tenant'],
   'Leer campañas de Marketing Studio (estados, piezas, copys, anuncios, plan de medios y calendario) por API o MCP. No escribe ni aprueba', NOW(), NULL)
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
    WHERE capability_key = 'marketing_studio.campaign.read' AND deprecated_at IS NULL) THEN
    RAISE EXCEPTION 'TASK-1890 anti pre-up-marker check: marketing_studio.campaign.read no quedó registrada';
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW() WHERE capability_key = 'marketing_studio.campaign.read';
