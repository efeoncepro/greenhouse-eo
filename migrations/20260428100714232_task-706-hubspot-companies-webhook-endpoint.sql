-- Up Migration

-- TASK-706 — HubSpot companies webhook endpoint registration.
-- ========================================================================
-- Registra el endpoint canónico que recibe webhooks inbound de HubSpot
-- cuando una company o contact se crea/actualiza. El handler
-- 'hubspot-companies' valida firma v3 internamente y dispara
-- syncHubSpotCompanyById() por cada company id afectado.
--
-- Configuración requerida en HubSpot Developer Portal:
--   1. Crear/editar la app "Greenhouse Bridge".
--   2. Webhooks > Create subscription:
--      - company.creation
--      - company.propertyChange (lifecyclestage, name, domain, country, industry)
--      - contact.creation (opcional, para sincronizar contactos también)
--      - contact.propertyChange (opcional)
--   3. Target URL: https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies
--   4. Signature method: v3 (default)
--   5. Activar la subscription.
--
-- Secret: HUBSPOT_APP_CLIENT_SECRET (ya existe en Secret Manager).
-- Auth mode: 'provider_native' — el handler valida la firma internamente
-- usando la lógica HubSpot v3 (HMAC-SHA256 sobre method+uri+body+timestamp).

INSERT INTO greenhouse_sync.webhook_endpoints (
  webhook_endpoint_id, endpoint_key, provider_code, handler_code,
  auth_mode, secret_ref, active, created_at, updated_at
) VALUES (
  'webhook-hubspot-companies', 'hubspot-companies', 'hubspot', 'hubspot-companies',
  'provider_native', 'HUBSPOT_APP_CLIENT_SECRET', TRUE, NOW(), NOW()
)
ON CONFLICT (endpoint_key) DO UPDATE SET
  provider_code = EXCLUDED.provider_code,
  handler_code = EXCLUDED.handler_code,
  auth_mode = EXCLUDED.auth_mode,
  secret_ref = EXCLUDED.secret_ref,
  active = TRUE,
  updated_at = NOW();

-- Down Migration

DELETE FROM greenhouse_sync.webhook_endpoints WHERE endpoint_key = 'hubspot-companies';
