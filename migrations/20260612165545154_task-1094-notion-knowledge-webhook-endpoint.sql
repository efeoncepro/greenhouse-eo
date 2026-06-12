-- Up Migration

-- TASK-1094 — Registra el endpoint de webhook `notion-knowledge` en el bus inbound.
-- auth_mode='provider_native': el handler valida HMAC internamente (mismo patrón TASK-912).
-- El secret HMAC se resuelve en runtime vía NOTION_KNOWLEDGE_WEBHOOK_SIGNING_SECRET_REF.

INSERT INTO greenhouse_sync.webhook_endpoints (
  webhook_endpoint_id, endpoint_key, provider_code, handler_code,
  auth_mode, secret_ref, active, created_at, updated_at
) VALUES (
  'webhook-notion-knowledge',
  'notion-knowledge',
  'notion',
  'notion-knowledge',
  'provider_native',
  'NOTION_KNOWLEDGE_WEBHOOK_SIGNING_SECRET_REF',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (endpoint_key) DO UPDATE SET
  provider_code = EXCLUDED.provider_code,
  handler_code = EXCLUDED.handler_code,
  auth_mode = EXCLUDED.auth_mode,
  secret_ref = EXCLUDED.secret_ref,
  active = TRUE,
  updated_at = NOW();

-- Anti pre-up-marker guard: aborta si la fila no quedó registrada.
DO $$
DECLARE registered_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_sync.webhook_endpoints
  WHERE endpoint_key = 'notion-knowledge';

  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1094 anti pre-up-marker: endpoint notion-knowledge NO registrado.';
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_sync.webhook_endpoints WHERE endpoint_key = 'notion-knowledge';
