-- Up Migration
--
-- TASK-491 — Converge the ZapSign signature webhook onto the canonical inbound bus.
-- Registers endpoint_key='zapsign' so /api/webhooks/zapsign (served by the generic
-- [endpointKey] route + processInboundWebhook) dispatches to the `zapsign` handler.
-- The legacy one-off route src/app/api/webhooks/zapsign/route.ts is removed in the same PR.
--
-- auth_mode='bearer': the generic verifyAuth reads the Authorization Bearer header (or the
-- legacy x-zapsign-webhook-secret custom header — added to verifyAuth in this PR) and compares
-- to the resolved secret. This preserves the EXACT auth contract of the old route (which
-- enforced ZAPSIGN_WEBHOOK_SHARED_SECRET via Bearer or x-zapsign-webhook-secret) so ZapSign
-- needs zero reconfiguration. The handler does pure business logic (dispatch cascade), no auth.

INSERT INTO greenhouse_sync.webhook_endpoints (
  webhook_endpoint_id, endpoint_key, provider_code, handler_code,
  auth_mode, secret_ref, active, created_at, updated_at
) VALUES (
  'webhook-zapsign-signatures',
  'zapsign',
  'zapsign',
  'zapsign',
  'bearer',
  'ZAPSIGN_WEBHOOK_SHARED_SECRET',
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

-- Anti pre-up-marker guard: abort if the endpoint did not register.
DO $$
DECLARE endpoint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM greenhouse_sync.webhook_endpoints WHERE endpoint_key = 'zapsign'
  ) INTO endpoint_exists;

  IF NOT endpoint_exists THEN
    RAISE EXCEPTION 'TASK-491 anti pre-up-marker: webhook endpoint zapsign was NOT registered.';
  END IF;
END
$$;

-- Down Migration
DELETE FROM greenhouse_sync.webhook_endpoints WHERE endpoint_key = 'zapsign';
