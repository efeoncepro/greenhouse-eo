-- Up Migration

-- TASK-1852: dedicated confidential exchange client for the delegated WRITE class
-- "open client access to contracted services" (client_services.enablement.write).
-- Same workload consumer as the other MCP exchange clients; no scope can authorize another.
-- Inert until GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS lists the client and the Entra
-- app exposes efeonce.mcp.client_services.write; the app-lane primitive still re-reads the human's
-- administration rights on every call.
INSERT INTO greenhouse_core.sister_platform_oauth_clients (
  sister_platform_oauth_client_id, sister_platform_consumer_id, client_id, client_name,
  client_status, client_type, require_human_session, redirect_uris, allowed_scopes,
  code_ttl_seconds, access_token_ttl_seconds, require_pkce, issue_identity_inline,
  policy_json, metadata_json
)
VALUES (
  'spoauth-client-efeonce-mcp-client-services', 'spc-efeonce-mcp-gateway',
  'efeonce-mcp-client-services', 'Efeonce MCP delegated client service enablement',
  'active', 'confidential', FALSE, ARRAY['https://mcp.efeonce.org/mcp']::text[],
  ARRAY['client_services.enablement.write']::text[], 300, 300, TRUE, FALSE,
  '{
    "schemaVersion":"1",
    "audience":{"tenantTypes":["efeonce_internal"]},
    "requiredScopes":["client_services.enablement.write"],
    "capabilityScopes":["client_services.enablement.write"],
    "claims":{"includeGreenhouseRoles":false},
    "revocation":{"mode":"userinfo_revalidation","revalidateAfterSeconds":15,"requireOnPrivilegedAction":true}
  }'::jsonb,
  '{"resourceFamily":"client_services","grantType":"rfc8693_internal","purpose":"client_service_enablement_delegated_write","taskId":"TASK-1852"}'::jsonb
)
ON CONFLICT (sister_platform_oauth_client_id) DO NOTHING;

-- Anti pre-up-marker guard: the exact contract must exist after this migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM greenhouse_core.sister_platform_oauth_clients client
      JOIN greenhouse_core.sister_platform_consumers consumer
        ON consumer.sister_platform_consumer_id = client.sister_platform_consumer_id
     WHERE client.sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-client-services'
       AND client.client_id = 'efeonce-mcp-client-services'
       AND client.client_status = 'active'
       AND client.client_type = 'confidential'
       AND client.allowed_scopes = ARRAY['client_services.enablement.write']::text[]
       AND client.policy_json #> '{capabilityScopes}' = jsonb_build_array('client_services.enablement.write'::text)
       AND client.policy_json #>> '{revocation,revalidateAfterSeconds}' = '15'
       AND client.metadata_json->>'resourceFamily' = 'client_services'
       AND consumer.sister_platform_key = 'mcp'
       AND consumer.credential_status = 'active'
       AND (consumer.expires_at IS NULL OR consumer.expires_at > CURRENT_TIMESTAMP)
  ) THEN
    RAISE EXCEPTION 'TASK-1852 anti pre-up-marker check: exact MCP client-services OAuth client contract is unavailable or drifted.';
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.sister_platform_oauth_clients
 WHERE sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-client-services'
   AND client_id = 'efeonce-mcp-client-services';
