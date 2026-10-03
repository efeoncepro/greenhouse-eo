-- Up Migration

-- TASK-1894 — Capabilities de escritura de Efeonce Marketing Studio con autoridad de persona. Son lo que el gateway
-- Efeonce MCP verificará para la PERSONA antes de pedir a Studio una escritura:
--   * marketing_studio.asset.write    — subir piezas y registrar versiones nuevas.
--   * marketing_studio.campaign.write — crear y editar campañas.
-- Separadas de la lectura (campaign.read), de la descarga (asset.download) y de la aprobación (TASK-1899).
-- Catálogo TS (entitlements-catalog.ts) y grants (runtime.ts) viajan en el mismo commit. Puramente aditiva (expand).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('marketing_studio.asset.write', 'marketing_studio', ARRAY['create', 'update'], ARRAY['tenant'],
   'Subir piezas y registrar versiones nuevas en Marketing Studio con autoridad de persona. No aprueba versiones ni emite enlaces de descarga', NOW(), NULL),
  ('marketing_studio.campaign.write', 'marketing_studio', ARRAY['create', 'update'], ARRAY['tenant'],
   'Crear y editar campañas de Marketing Studio con autoridad de persona. No aprueba piezas ni las publica', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker: aborta si alguna de las dos capabilities no quedó registrada y vigente.
DO $$
DECLARE registered_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('marketing_studio.asset.write', 'marketing_studio.campaign.write')
    AND deprecated_at IS NULL;

  IF registered_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1894 anti pre-up-marker check: se esperaban 2 capabilities de escritura de marketing_studio vigentes, hay %', registered_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN ('marketing_studio.asset.write', 'marketing_studio.campaign.write');
