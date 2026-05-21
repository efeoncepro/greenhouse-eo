-- Up Migration
--
-- TASK-912 Slice 1 — Notion status-transitions webhook endpoint PRODUCTIVO
-- (Efeonce + Sky) + capability granular.
--
-- Sibling del demo `notion-tasks-demo` (TASK-910). Endpoint dedicado
-- /api/webhooks/notion-status-transitions con secret HMAC separado del demo
-- (defense in depth — leak en uno NO compromete el otro). Auth mode
-- 'provider_native': el handler valida la firma internamente con
-- `resolveSecretByRef(NOTION_STATUS_TRANSITIONS_WEBHOOK_SIGNING_SECRET_REF)`.
--
-- El handler está gated por kill-switch flag `NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED`
-- (default OFF) — el endpoint puede recibir el verification handshake y (re)suscribirse
-- aunque el procesamiento esté apagado. Cero impacto en flujos de métricas existentes.
--
-- Pattern fuente: TASK-910 webhook_endpoints seed + TASK-908 capabilities seed.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. webhook_endpoints row productivo (dedicated endpoint + separate secret ref)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO greenhouse_sync.webhook_endpoints (
  webhook_endpoint_id, endpoint_key, provider_code, handler_code,
  auth_mode, secret_ref, active, created_at, updated_at
) VALUES (
  'webhook-notion-status-transitions',
  'notion-status-transitions',
  'notion',
  'notion-status-transitions',
  'provider_native',
  'NOTION_STATUS_TRANSITIONS_WEBHOOK_SIGNING_SECRET_REF',
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

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Capabilities granulares canonical V1.0 (least-privilege)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'notion.webhook.ingest_status_transitions',
    'delivery',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-912 — Ingesta de transiciones de estado Notion productivas (Efeonce/Sky) vía webhook + reactive consumer. EFEONCE_ADMIN + DEVOPS_OPERATOR.',
    NOW(),
    NULL
  ),
  (
    'notion.status_transitions.backfill_execute',
    'delivery',
    ARRAY['execute'],
    ARRAY['all'],
    'TASK-912 — Backfill histórico de transiciones de estado vía Notion page history API (destructive-capable, throttled). EFEONCE_ADMIN solo.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Anti pre-up-marker guard (TASK-768 / ISSUE-068 canonical pattern)
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  endpoint_count INTEGER;
  capability_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO endpoint_count
  FROM greenhouse_sync.webhook_endpoints
  WHERE endpoint_key = 'notion-status-transitions' AND active = TRUE;

  IF endpoint_count <> 1 THEN
    RAISE EXCEPTION 'TASK-912 anti pre-up-marker: webhook_endpoints notion-status-transitions NOT seeded (count=%).', endpoint_count;
  END IF;

  SELECT COUNT(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('notion.webhook.ingest_status_transitions', 'notion.status_transitions.backfill_execute')
    AND deprecated_at IS NULL;

  IF capability_count <> 2 THEN
    RAISE EXCEPTION 'TASK-912 anti pre-up-marker: expected 2 capabilities, got %.', capability_count;
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_sync.webhook_endpoints WHERE endpoint_key = 'notion-status-transitions';

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN ('notion.webhook.ingest_status_transitions', 'notion.status_transitions.backfill_execute')
  AND deprecated_at IS NULL;
