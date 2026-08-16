-- Up Migration

-- TASK-1726: the OAuth policy parser requires a bounded revalidation interval
-- between 15 and 300 seconds. The original Hiring client seed used zero, which
-- made the persisted client fail closed as client_policy_invalid at runtime.
UPDATE greenhouse_core.sister_platform_oauth_clients
   SET policy_json = jsonb_set(
         policy_json,
         '{revocation,revalidateAfterSeconds}',
         to_jsonb(15),
         FALSE
       ),
       updated_at = CURRENT_TIMESTAMP
 WHERE sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-hiring'
   AND client_id = 'efeonce-mcp-hiring'
   AND policy_json #>> '{revocation,revalidateAfterSeconds}' = '0';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM greenhouse_core.sister_platform_oauth_clients
     WHERE sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-hiring'
       AND client_id = 'efeonce-mcp-hiring'
       AND policy_json #>> '{revocation,revalidateAfterSeconds}' = '15'
       AND policy_json #> '{capabilityScopes}' = jsonb_build_array('hiring.talent_pool.read'::text)
       AND metadata_json->>'resourceFamily' = 'hiring'
  ) THEN
    RAISE EXCEPTION 'TASK-1726 MCP Hiring OAuth policy correction is unavailable or drifted.';
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.sister_platform_oauth_clients
   SET policy_json = jsonb_set(
         policy_json,
         '{revocation,revalidateAfterSeconds}',
         to_jsonb(0),
         FALSE
       ),
       updated_at = CURRENT_TIMESTAMP
 WHERE sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-hiring'
   AND client_id = 'efeonce-mcp-hiring'
   AND policy_json #>> '{revocation,revalidateAfterSeconds}' = '15';
