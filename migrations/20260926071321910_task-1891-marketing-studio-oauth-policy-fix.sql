-- Up Migration

-- TASK-1891 forward fix. La migración 20260925193518521 sembró el cliente `efeonce-mcp-marketing-studio` con
-- `revocation.requireOnPrivilegedAction = false`, y `sisterPlatformOAuthPolicyV1Schema` exige el literal `true`.
-- La política no validaba: el canje respondía 503 («OAuth client policy is unavailable») y el provider del gateway
-- lo traducía a `upstream_unavailable` (visto en producción el 2026-09-26, revisión efeonce-mcp-gateway-00061-sbc).
-- Se corrige sólo el campo inválido; la migración aplicada no se edita.
UPDATE greenhouse_core.sister_platform_oauth_clients
   SET policy_json = jsonb_set(policy_json, '{revocation,requireOnPrivilegedAction}', 'true'::jsonb),
       updated_at = CURRENT_TIMESTAMP
 WHERE client_id = 'efeonce-mcp-marketing-studio'
   AND policy_json #> '{revocation,requireOnPrivilegedAction}' IS DISTINCT FROM 'true'::jsonb;

-- Guarda: el contrato que el parser exige debe quedar en la fila.
DO $$
DECLARE policy_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM greenhouse_core.sister_platform_oauth_clients client
     WHERE client.client_id = 'efeonce-mcp-marketing-studio'
       AND client.policy_json->>'schemaVersion' = '1'
       AND client.policy_json #> '{revocation,requireOnPrivilegedAction}' = 'true'::jsonb
       AND client.policy_json #>> '{revocation,mode}' = 'userinfo_revalidation'
       AND (client.policy_json #>> '{revocation,revalidateAfterSeconds}')::int BETWEEN 15 AND 300
       AND client.policy_json #> '{capabilityScopes}' = jsonb_build_array('marketing_studio.campaign.read'::text)
       AND client.policy_json #> '{requiredScopes}' = jsonb_build_array('marketing_studio.campaign.read'::text)
  ) INTO policy_ok;

  IF NOT policy_ok THEN
    RAISE EXCEPTION 'TASK-1891 policy fix: efeonce-mcp-marketing-studio policy_json still fails the V1 policy contract.';
  END IF;
END
$$;

-- Down Migration

-- Sin undo: volver a `false` sólo reinstala una política que el runtime rechaza.
SELECT 1;
