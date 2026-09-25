-- Up Migration

-- TASK-1891: cliente confidencial de canje RFC 8693 para leer Efeonce Marketing Studio por MCP
-- (marketing_studio.campaign.read). Mismo consumer de workload que los otros clientes MCP; ningún scope autoriza
-- a otro. Inerte hasta que GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS liste el cliente. En cada canje
-- Greenhouse ejecuta can(persona, 'marketing_studio.campaign.read'); Studio no conoce personas.
INSERT INTO greenhouse_core.sister_platform_oauth_clients (
  sister_platform_oauth_client_id, sister_platform_consumer_id, client_id, client_name,
  client_status, client_type, require_human_session, redirect_uris, allowed_scopes,
  code_ttl_seconds, access_token_ttl_seconds, require_pkce, issue_identity_inline,
  policy_json, metadata_json
)
VALUES (
  'spoauth-client-efeonce-mcp-marketing-studio', 'spc-efeonce-mcp-gateway',
  'efeonce-mcp-marketing-studio', 'Efeonce MCP delegated Marketing Studio read',
  'active', 'confidential', FALSE, ARRAY['https://mcp.efeonce.org/mcp']::text[],
  ARRAY['marketing_studio.campaign.read']::text[], 300, 300, TRUE, FALSE,
  '{
    "schemaVersion":"1",
    "audience":{"tenantTypes":["efeonce_internal"]},
    "requiredScopes":["marketing_studio.campaign.read"],
    "capabilityScopes":["marketing_studio.campaign.read"],
    "claims":{"includeGreenhouseRoles":false},
    "revocation":{"mode":"userinfo_revalidation","revalidateAfterSeconds":60,"requireOnPrivilegedAction":false}
  }'::jsonb,
  '{"resourceFamily":"marketing_studio","grantType":"rfc8693_internal","purpose":"marketing_studio_delegated_read","taskId":"TASK-1891"}'::jsonb
)
ON CONFLICT (sister_platform_oauth_client_id) DO NOTHING;

-- Anti pre-up-marker guard: el contrato exacto debe existir tras la migración.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM greenhouse_core.sister_platform_oauth_clients client
      JOIN greenhouse_core.sister_platform_consumers consumer
        ON consumer.sister_platform_consumer_id = client.sister_platform_consumer_id
     WHERE client.sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-marketing-studio'
       AND client.client_id = 'efeonce-mcp-marketing-studio'
       AND client.client_status = 'active'
       AND client.client_type = 'confidential'
       AND client.allowed_scopes = ARRAY['marketing_studio.campaign.read']::text[]
       AND client.policy_json #> '{capabilityScopes}' = jsonb_build_array('marketing_studio.campaign.read'::text)
       AND client.metadata_json->>'resourceFamily' = 'marketing_studio'
       AND consumer.sister_platform_key = 'mcp'
       AND consumer.credential_status = 'active'
       AND (consumer.expires_at IS NULL OR consumer.expires_at > CURRENT_TIMESTAMP)
  ) THEN
    RAISE EXCEPTION 'TASK-1891 anti pre-up-marker check: el cliente OAuth MCP de Marketing Studio no quedó con el contrato exacto.';
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.sister_platform_oauth_clients
 WHERE sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-marketing-studio'
   AND client_id = 'efeonce-mcp-marketing-studio';
