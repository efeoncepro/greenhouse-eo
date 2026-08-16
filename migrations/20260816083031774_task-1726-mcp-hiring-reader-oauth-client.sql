-- Up Migration

-- TASK-1726: a dedicated delegated-read OAuth client keeps the Hiring reader
-- independent from the exact one-shot funding contract. Both clients share the
-- same workload consumer/service account, but neither scope can authorize the other.
INSERT INTO greenhouse_core.sister_platform_oauth_clients (
  sister_platform_oauth_client_id, sister_platform_consumer_id, client_id, client_name,
  client_status, client_type, require_human_session, redirect_uris, allowed_scopes,
  code_ttl_seconds, access_token_ttl_seconds, require_pkce, issue_identity_inline,
  policy_json, metadata_json
)
VALUES (
  'spoauth-client-efeonce-mcp-hiring', 'spc-efeonce-mcp-gateway',
  'efeonce-mcp-hiring', 'Efeonce MCP delegated Hiring reader',
  'active', 'confidential', FALSE, ARRAY['https://mcp.efeonce.org/mcp']::text[],
  ARRAY['hiring.talent_pool.read']::text[], 300, 300, TRUE, FALSE,
  '{
    "schemaVersion":"1",
    "audience":{"tenantTypes":["efeonce_internal"]},
    "requiredScopes":["hiring.talent_pool.read"],
    "capabilityScopes":["hiring.talent_pool.read"],
    "claims":{"includeGreenhouseRoles":false},
    "revocation":{"mode":"userinfo_revalidation","revalidateAfterSeconds":0,"requireOnPrivilegedAction":true}
  }'::jsonb,
  '{"resourceFamily":"hiring","grantType":"rfc8693_internal","purpose":"talent_pool_candidate_review"}'::jsonb
)
ON CONFLICT (sister_platform_oauth_client_id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM greenhouse_core.sister_platform_oauth_clients client
      JOIN greenhouse_core.sister_platform_consumers consumer
        ON consumer.sister_platform_consumer_id = client.sister_platform_consumer_id
     WHERE client.sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-hiring'
       AND client.client_id = 'efeonce-mcp-hiring'
       AND client.client_status = 'active'
       AND client.client_type = 'confidential'
       AND client.allowed_scopes = ARRAY['hiring.talent_pool.read']::text[]
       AND client.policy_json #> '{capabilityScopes}' = jsonb_build_array('hiring.talent_pool.read'::text)
       AND client.metadata_json->>'resourceFamily' = 'hiring'
       AND consumer.sister_platform_key = 'mcp'
       AND consumer.credential_status = 'active'
       AND (consumer.expires_at IS NULL OR consumer.expires_at > CURRENT_TIMESTAMP)
  ) THEN
    RAISE EXCEPTION 'TASK-1726 exact MCP Hiring OAuth client contract is unavailable or drifted.';
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.sister_platform_oauth_clients
 WHERE sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-hiring'
   AND client_id = 'efeonce-mcp-hiring';
