-- Up Migration

-- TASK-1010 Slice 3 — HubSpot deals webhook endpoint registration.
-- ========================================================================
-- Registra el endpoint canónico que recibe webhooks inbound de HubSpot cuando
-- un deal se crea o cambia de stage. El handler 'hubspot-deals' valida la firma
-- v3 internamente y, cuando el deal llega a closed-won (y el flag
-- CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED está ON), abre un caso de
-- onboarding en status='draft' para la organización del deal (spec §11.1).
--
-- Configuración requerida en HubSpot Developer Portal (operator-gated):
--   1. App "Greenhouse Bridge" → Webhooks > Create subscription:
--      - deal.creation
--      - deal.propertyChange (dealstage)
--   2. Target URL: https://greenhouse.efeoncepro.com/api/webhooks/hubspot-deals
--   3. Signature method: v3 (default)
--   4. Activar la subscription.
--
-- Secret: HUBSPOT_APP_CLIENT_SECRET (ya existe en Secret Manager).
-- Auth mode: 'provider_native' — el handler valida la firma internamente
-- (HMAC-SHA256 sobre method+uri+body+timestamp).

INSERT INTO greenhouse_sync.webhook_endpoints (
  webhook_endpoint_id, endpoint_key, provider_code, handler_code,
  auth_mode, secret_ref, active, created_at, updated_at
) VALUES (
  'webhook-hubspot-deals', 'hubspot-deals', 'hubspot', 'hubspot-deals',
  'provider_native', 'HUBSPOT_APP_CLIENT_SECRET', TRUE, NOW(), NOW()
)
ON CONFLICT (endpoint_key) DO UPDATE SET
  provider_code = EXCLUDED.provider_code,
  handler_code = EXCLUDED.handler_code,
  auth_mode = EXCLUDED.auth_mode,
  secret_ref = EXCLUDED.secret_ref,
  active = TRUE,
  updated_at = NOW();

-- Anti pre-up-marker check: aborta si la fila no quedó registrada.
DO $$
DECLARE endpoint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM greenhouse_sync.webhook_endpoints WHERE endpoint_key = 'hubspot-deals'
  ) INTO endpoint_exists;

  IF NOT endpoint_exists THEN
    RAISE EXCEPTION 'TASK-1010 anti pre-up-marker: webhook endpoint hubspot-deals was NOT registered. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_sync.webhook_endpoints WHERE endpoint_key = 'hubspot-deals';
