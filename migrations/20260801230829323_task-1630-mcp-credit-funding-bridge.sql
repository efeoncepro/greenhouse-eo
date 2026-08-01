-- Up Migration

-- TASK-1630 / TASK-1626: add the explicit MCP executor lane. The gateway remains a
-- Greenhouse OAuth client and never receives a direct Globe/database authority.
INSERT INTO greenhouse_core.sister_platform_consumers (
  sister_platform_consumer_id, public_id, sister_platform_key, consumer_name,
  consumer_type, credential_status, token_prefix, token_hash, hash_algorithm,
  allowed_greenhouse_scope_types, rate_limit_per_minute, rate_limit_per_hour,
  notes, metadata_json
)
VALUES (
  'spc-efeonce-mcp-gateway', 'SPC-MCP-GATEWAY', 'mcp', 'Efeonce MCP Gateway',
  'internal_service', 'active', 'mcp_unusable_',
  encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'), 'sha256',
  ARRAY['internal']::text[], 30, 300,
  'Internal RFC 8693 identity bridge. The generated consumer credential has no recoverable bearer and is never used by the gateway.',
  '{"credentialUse":"rfc8693-workload-identity-only"}'::jsonb
)
ON CONFLICT (sister_platform_consumer_id) DO NOTHING;

INSERT INTO greenhouse_core.sister_platform_oauth_clients (
  sister_platform_oauth_client_id, sister_platform_consumer_id, client_id, client_name,
  client_status, client_type, require_human_session, redirect_uris, allowed_scopes,
  code_ttl_seconds, access_token_ttl_seconds, require_pkce, issue_identity_inline,
  policy_json, metadata_json
)
VALUES (
  'spoauth-client-efeonce-mcp-gateway', 'spc-efeonce-mcp-gateway',
  'efeonce-mcp-gateway', 'Efeonce MCP Gateway funding bridge',
  'active', 'confidential', FALSE, ARRAY['https://mcp.efeonce.org/mcp']::text[],
  ARRAY['globe.credits.funding.ensure']::text[], 300, 300, TRUE, FALSE,
  '{
    "schemaVersion":"1",
    "audience":{"tenantTypes":["efeonce_internal"]},
    "requiredScopes":["globe.credits.funding.ensure"],
    "capabilityScopes":["globe.credits.funding.ensure"],
    "claims":{"includeGreenhouseRoles":false},
    "revocation":{"mode":"userinfo_revalidation","revalidateAfterSeconds":60,"requireOnPrivilegedAction":true}
  }'::jsonb,
  '{"workspaceBindingProvider":"globe","grantType":"rfc8693_internal"}'::jsonb
)
ON CONFLICT (sister_platform_oauth_client_id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM greenhouse_core.sister_platform_oauth_clients client
      JOIN greenhouse_core.sister_platform_consumers consumer
        ON consumer.sister_platform_consumer_id = client.sister_platform_consumer_id
     WHERE client.sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-gateway'
       AND client.client_id = 'efeonce-mcp-gateway'
       AND client.client_status = 'active'
       AND client.client_type = 'confidential'
       AND client.allowed_scopes = ARRAY['globe.credits.funding.ensure']::text[]
       AND client.policy_json #> '{capabilityScopes}' = jsonb_build_array('globe.credits.funding.ensure'::text)
       AND client.metadata_json->>'workspaceBindingProvider' = 'globe'
       AND consumer.sister_platform_key = 'mcp'
       AND consumer.credential_status = 'active'
  ) THEN
    RAISE EXCEPTION 'TASK-1630 exact MCP OAuth client contract is unavailable or drifted.';
  END IF;
END
$$;

DO $$
DECLARE
  constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'greenhouse_core.globe_credit_funding_one_shot_authorities'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%executor_channel%'
  LOOP
    EXECUTE format(
      'ALTER TABLE greenhouse_core.globe_credit_funding_one_shot_authorities DROP CONSTRAINT %I',
      constraint_row.conname
    );
  END LOOP;

  FOR constraint_row IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'greenhouse_core.globe_credit_funding_authority_executions'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%executor_channel%'
  LOOP
    EXECUTE format(
      'ALTER TABLE greenhouse_core.globe_credit_funding_authority_executions DROP CONSTRAINT %I',
      constraint_row.conname
    );
  END LOOP;
END
$$;

ALTER TABLE greenhouse_core.globe_credit_funding_one_shot_authorities
  ADD CONSTRAINT globe_credit_funding_authorities_executor_channel_v2_check
    CHECK (executor_channel IN ('oauth', 'browser', 'mcp')),
  ADD CONSTRAINT globe_credit_funding_authorities_executor_binding_v2_check CHECK (
    executor_channel = 'oauth'
    OR (
      executor_channel = 'browser'
      AND executor_client_id = 'greenhouse-portal'
      AND executor_user_id = issuer_user_id
      AND executor_auth_mode = issuer_auth_mode
      AND executor_auth_mode <> 'agent'
    )
    OR (
      executor_channel = 'mcp'
      AND executor_client_id = 'efeonce-mcp-gateway'
      AND executor_auth_mode = 'agent'
    )
  );

ALTER TABLE greenhouse_core.globe_credit_funding_authority_executions
  ADD CONSTRAINT globe_credit_funding_authority_executions_channel_v2_check
    CHECK (executor_channel IN ('oauth', 'browser', 'mcp'));

CREATE OR REPLACE FUNCTION greenhouse_core.enforce_globe_credit_funding_intent_authority()
RETURNS trigger AS $$
DECLARE
  policy_requires boolean := FALSE;
  policy_threshold integer;
  agent_enabled boolean := FALSE;
  agent_authority_required boolean := FALSE;
  agent_grant_limit integer;
  agent_monthly_cap_limit integer;
  plan_credits integer;
  plan_monthly_cap integer;
  one_shot_valid boolean := FALSE;
BEGIN
  IF NEW.actor_user_id LIKE 'globe:service:%'
     OR NEW.actor_user_id LIKE 'service:%'
     OR NEW.actor_user_id LIKE 'globe:workload:%'
     OR NEW.actor_user_id LIKE 'workload:%'
     OR NEW.actor_auth_mode IN ('unknown', 'service', 'workload', 'api_key', 'app') THEN
    RAISE EXCEPTION 'globe_credit_funding_intent_actor_must_be_authenticated_user';
  END IF;

  IF NEW.phase <> 'confirmed' THEN RETURN NEW; END IF;

  IF NEW.actor_auth_mode NOT IN ('agent', 'credentials', 'both', 'microsoft_sso', 'google_sso') THEN
    RAISE EXCEPTION 'globe_credit_funding_intent_auth_mode_not_allowed';
  END IF;

  SELECT p.requires_second_confirmer,
         p.second_confirmer_above_credits,
         p.agent_confirmation_enabled,
         p.agent_one_shot_authority_required,
         p.agent_max_grant_credits,
         p.agent_max_monthly_cap_credits
    INTO policy_requires,
         policy_threshold,
         agent_enabled,
         agent_authority_required,
         agent_grant_limit,
         agent_monthly_cap_limit
    FROM greenhouse_core.globe_credit_funding_policies p
   WHERE p.globe_workspace_id = NEW.globe_workspace_id;

  policy_requires := COALESCE(policy_requires, FALSE);
  agent_enabled := COALESCE(agent_enabled, FALSE);
  agent_authority_required := COALESCE(agent_authority_required, FALSE);
  plan_credits := NULLIF(NEW.plan #>> '{grantCredits}', '')::integer;
  plan_monthly_cap := NULLIF(NEW.plan #>> '{monthlyCapAfter}', '')::integer;

  IF NEW.actor_auth_mode = 'agent' THEN
    IF NOT agent_enabled THEN
      RAISE EXCEPTION 'globe_credit_funding_agent_confirmation_forbidden';
    END IF;
    IF plan_credits IS NULL OR agent_grant_limit IS NULL OR plan_credits > agent_grant_limit THEN
      RAISE EXCEPTION 'globe_credit_funding_agent_limit_exceeded';
    END IF;
    IF plan_monthly_cap IS NOT NULL
       AND (agent_monthly_cap_limit IS NULL OR plan_monthly_cap > agent_monthly_cap_limit) THEN
      RAISE EXCEPTION 'globe_credit_funding_agent_limit_exceeded';
    END IF;
  END IF;

  IF (NEW.actor_auth_mode = 'agent' AND agent_authority_required) OR NEW.authority_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM greenhouse_core.globe_credit_funding_one_shot_authorities authority
        JOIN greenhouse_core.globe_credit_funding_authority_executions execution
          ON execution.authority_id = authority.authority_id
        JOIN greenhouse_core.globe_credit_funding_intents proposed
          ON proposed.globe_workspace_id = NEW.globe_workspace_id
         AND proposed.proposal_id = NEW.proposal_id
         AND proposed.phase = 'proposed'
       WHERE authority.authority_id = NEW.authority_id
         AND execution.execution_id = NEW.authority_execution_id
         AND proposed.authority_id = authority.authority_id
         AND proposed.authority_execution_id = execution.execution_id
         AND authority.globe_workspace_id = NEW.globe_workspace_id
         AND authority.executor_user_id = NEW.actor_user_id
         AND execution.executor_user_id = NEW.actor_user_id
         AND authority.executor_channel = execution.executor_channel
         AND authority.executor_client_id = execution.executor_client_id
         AND authority.executor_auth_mode = NEW.actor_auth_mode
         AND execution.actor_auth_mode = NEW.actor_auth_mode
         AND (
           (
             authority.executor_channel = 'browser'
             AND authority.executor_client_id = 'greenhouse-portal'
             AND authority.executor_user_id = authority.issuer_user_id
             AND authority.executor_auth_mode = authority.issuer_auth_mode
             AND execution.first_auth_evidence_ref = authority.issuer_auth_evidence_ref
           )
           OR (
             authority.executor_channel = 'oauth'
             AND EXISTS (
               SELECT 1
                 FROM greenhouse_core.sister_platform_oauth_clients oauth_client
                WHERE oauth_client.client_id = authority.executor_client_id
                  AND oauth_client.client_status = 'active'
                  AND oauth_client.client_type = 'public'
                  AND oauth_client.metadata_json->>'workspaceBindingProvider' = 'globe'
             )
           )
           OR (
             authority.executor_channel = 'mcp'
             AND authority.executor_client_id = 'efeonce-mcp-gateway'
             AND authority.executor_auth_mode = 'agent'
             AND EXISTS (
               SELECT 1
                 FROM greenhouse_core.sister_platform_oauth_clients oauth_client
                 JOIN greenhouse_core.sister_platform_consumers consumer
                   ON consumer.sister_platform_consumer_id = oauth_client.sister_platform_consumer_id
                WHERE oauth_client.client_id = 'efeonce-mcp-gateway'
                  AND oauth_client.client_status = 'active'
                  AND oauth_client.client_type = 'confidential'
                  AND oauth_client.allowed_scopes = ARRAY['globe.credits.funding.ensure']::text[]
                  AND oauth_client.policy_json #> '{capabilityScopes}' =
                      jsonb_build_array('globe.credits.funding.ensure'::text)
                  AND oauth_client.metadata_json->>'workspaceBindingProvider' = 'globe'
                  AND consumer.sister_platform_key = 'mcp'
                  AND consumer.credential_status = 'active'
                  AND (consumer.expires_at IS NULL OR consumer.expires_at > CURRENT_TIMESTAMP)
             )
           )
         )
         AND execution.state = 'confirming'
         AND execution.proposal_id = NEW.proposal_id
         AND execution.plan_fingerprint = NEW.plan_fingerprint
         AND proposed.plan_fingerprint = NEW.plan_fingerprint
         AND authority.period_start = (NEW.plan #>> '{periodStart}')::timestamptz
         AND authority.period_end = (NEW.plan #>> '{periodEnd}')::timestamptz
         AND plan_credits <= authority.max_grant_credits
         AND COALESCE(plan_monthly_cap, NULLIF(NEW.plan #>> '{monthlyCapBefore}', '')::integer)
               <= authority.max_resulting_cap_credits
         AND NULLIF(NEW.plan #>> '{policyAvailableAfter}', '')::integer = authority.target_available_credits
    ) INTO one_shot_valid;

    IF NOT one_shot_valid THEN
      RAISE EXCEPTION 'globe_credit_funding_agent_one_shot_authority_required';
    END IF;
  END IF;

  IF policy_threshold IS NOT NULL AND plan_credits IS NOT NULL AND plan_credits > policy_threshold THEN
    policy_requires := TRUE;
  END IF;
  IF policy_requires AND NOT one_shot_valid AND NEW.proposed_by_user_id = NEW.actor_user_id THEN
    RAISE EXCEPTION 'globe_credit_funding_second_confirmer_required';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON CONSTRAINT globe_credit_funding_authorities_executor_binding_v2_check
  ON greenhouse_core.globe_credit_funding_one_shot_authorities IS
  'TASK-1630: explicit OAuth/browser/MCP channel binding; MCP is exact gateway client + agent only.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'globe_credit_funding_authorities_executor_binding_v2_check'
       AND pg_get_constraintdef(oid) LIKE '%efeonce-mcp-gateway%'
  ) THEN
    RAISE EXCEPTION 'TASK-1630 MCP authority channel constraint was not applied.';
  END IF;
END
$$;

-- Down Migration

-- Append-only evidence prevents narrowing the channel after any MCP authority has been issued.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM greenhouse_core.globe_credit_funding_one_shot_authorities
     WHERE executor_channel = 'mcp'
  ) OR EXISTS (
    SELECT 1
      FROM greenhouse_core.globe_credit_funding_authority_executions
     WHERE executor_channel = 'mcp'
  ) THEN
    RAISE EXCEPTION 'TASK-1630 rollback blocked: MCP one-shot authority evidence exists; use forward suspension.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM greenhouse_core.sister_platform_oauth_access_tokens
     WHERE sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-gateway'
  ) THEN
    RAISE EXCEPTION 'TASK-1630 rollback blocked: MCP exchanged-token evidence exists; use forward suspension.';
  END IF;
END
$$;

ALTER TABLE greenhouse_core.globe_credit_funding_one_shot_authorities
  DROP CONSTRAINT IF EXISTS globe_credit_funding_authorities_executor_binding_v2_check,
  DROP CONSTRAINT IF EXISTS globe_credit_funding_authorities_executor_channel_v2_check,
  ADD CONSTRAINT globe_credit_funding_authorities_executor_channel_v1_check
    CHECK (executor_channel IN ('oauth', 'browser')),
  ADD CONSTRAINT globe_credit_funding_authorities_executor_binding_v1_check CHECK (
    executor_channel = 'oauth'
    OR (
      executor_channel = 'browser'
      AND executor_client_id = 'greenhouse-portal'
      AND executor_user_id = issuer_user_id
      AND executor_auth_mode = issuer_auth_mode
      AND executor_auth_mode <> 'agent'
    )
  );

ALTER TABLE greenhouse_core.globe_credit_funding_authority_executions
  DROP CONSTRAINT IF EXISTS globe_credit_funding_authority_executions_channel_v2_check,
  ADD CONSTRAINT globe_credit_funding_authority_executions_channel_v1_check
    CHECK (executor_channel IN ('oauth', 'browser'));

DELETE FROM greenhouse_core.sister_platform_oauth_clients
 WHERE sister_platform_oauth_client_id = 'spoauth-client-efeonce-mcp-gateway';

DELETE FROM greenhouse_core.sister_platform_consumers
 WHERE sister_platform_consumer_id = 'spc-efeonce-mcp-gateway';

-- Revert only the MCP branch while preserving the TASK-1629 one-shot checks.
CREATE OR REPLACE FUNCTION greenhouse_core.enforce_globe_credit_funding_intent_authority()
RETURNS trigger AS $$
DECLARE
  policy_requires boolean := FALSE;
  policy_threshold integer;
  agent_enabled boolean := FALSE;
  agent_authority_required boolean := FALSE;
  agent_grant_limit integer;
  agent_monthly_cap_limit integer;
  plan_credits integer;
  plan_monthly_cap integer;
  one_shot_valid boolean := FALSE;
BEGIN
  IF NEW.actor_user_id LIKE 'globe:service:%'
     OR NEW.actor_user_id LIKE 'service:%'
     OR NEW.actor_user_id LIKE 'globe:workload:%'
     OR NEW.actor_user_id LIKE 'workload:%'
     OR NEW.actor_auth_mode IN ('unknown', 'service', 'workload', 'api_key', 'app') THEN
    RAISE EXCEPTION 'globe_credit_funding_intent_actor_must_be_authenticated_user';
  END IF;
  IF NEW.phase <> 'confirmed' THEN RETURN NEW; END IF;
  IF NEW.actor_auth_mode NOT IN ('agent', 'credentials', 'both', 'microsoft_sso', 'google_sso') THEN
    RAISE EXCEPTION 'globe_credit_funding_intent_auth_mode_not_allowed';
  END IF;
  SELECT p.requires_second_confirmer, p.second_confirmer_above_credits,
         p.agent_confirmation_enabled, p.agent_one_shot_authority_required,
         p.agent_max_grant_credits, p.agent_max_monthly_cap_credits
    INTO policy_requires, policy_threshold, agent_enabled, agent_authority_required,
         agent_grant_limit, agent_monthly_cap_limit
    FROM greenhouse_core.globe_credit_funding_policies p
   WHERE p.globe_workspace_id = NEW.globe_workspace_id;
  policy_requires := COALESCE(policy_requires, FALSE);
  agent_enabled := COALESCE(agent_enabled, FALSE);
  agent_authority_required := COALESCE(agent_authority_required, FALSE);
  plan_credits := NULLIF(NEW.plan #>> '{grantCredits}', '')::integer;
  plan_monthly_cap := NULLIF(NEW.plan #>> '{monthlyCapAfter}', '')::integer;
  IF NEW.actor_auth_mode = 'agent' THEN
    IF NOT agent_enabled THEN RAISE EXCEPTION 'globe_credit_funding_agent_confirmation_forbidden'; END IF;
    IF plan_credits IS NULL OR agent_grant_limit IS NULL OR plan_credits > agent_grant_limit THEN
      RAISE EXCEPTION 'globe_credit_funding_agent_limit_exceeded';
    END IF;
    IF plan_monthly_cap IS NOT NULL
       AND (agent_monthly_cap_limit IS NULL OR plan_monthly_cap > agent_monthly_cap_limit) THEN
      RAISE EXCEPTION 'globe_credit_funding_agent_limit_exceeded';
    END IF;
  END IF;
  IF (NEW.actor_auth_mode = 'agent' AND agent_authority_required) OR NEW.authority_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM greenhouse_core.globe_credit_funding_one_shot_authorities authority
        JOIN greenhouse_core.globe_credit_funding_authority_executions execution
          ON execution.authority_id = authority.authority_id
        JOIN greenhouse_core.globe_credit_funding_intents proposed
          ON proposed.globe_workspace_id = NEW.globe_workspace_id
         AND proposed.proposal_id = NEW.proposal_id
         AND proposed.phase = 'proposed'
       WHERE authority.authority_id = NEW.authority_id
         AND execution.execution_id = NEW.authority_execution_id
         AND proposed.authority_id = authority.authority_id
         AND proposed.authority_execution_id = execution.execution_id
         AND authority.globe_workspace_id = NEW.globe_workspace_id
         AND authority.executor_user_id = NEW.actor_user_id
         AND execution.executor_user_id = NEW.actor_user_id
         AND authority.executor_channel = execution.executor_channel
         AND authority.executor_client_id = execution.executor_client_id
         AND authority.executor_auth_mode = NEW.actor_auth_mode
         AND execution.actor_auth_mode = NEW.actor_auth_mode
         AND (
           (authority.executor_channel = 'browser'
            AND authority.executor_client_id = 'greenhouse-portal'
            AND authority.executor_user_id = authority.issuer_user_id
            AND authority.executor_auth_mode = authority.issuer_auth_mode
            AND execution.first_auth_evidence_ref = authority.issuer_auth_evidence_ref)
           OR
           (authority.executor_channel = 'oauth'
            AND EXISTS (
              SELECT 1 FROM greenhouse_core.sister_platform_oauth_clients oauth_client
               WHERE oauth_client.client_id = authority.executor_client_id
                 AND oauth_client.client_status = 'active'
                 AND oauth_client.client_type = 'public'
                 AND oauth_client.metadata_json->>'workspaceBindingProvider' = 'globe'))
         )
         AND execution.state = 'confirming'
         AND execution.proposal_id = NEW.proposal_id
         AND execution.plan_fingerprint = NEW.plan_fingerprint
         AND proposed.plan_fingerprint = NEW.plan_fingerprint
         AND authority.period_start = (NEW.plan #>> '{periodStart}')::timestamptz
         AND authority.period_end = (NEW.plan #>> '{periodEnd}')::timestamptz
         AND plan_credits <= authority.max_grant_credits
         AND COALESCE(plan_monthly_cap, NULLIF(NEW.plan #>> '{monthlyCapBefore}', '')::integer)
               <= authority.max_resulting_cap_credits
         AND NULLIF(NEW.plan #>> '{policyAvailableAfter}', '')::integer = authority.target_available_credits
    ) INTO one_shot_valid;
    IF NOT one_shot_valid THEN RAISE EXCEPTION 'globe_credit_funding_agent_one_shot_authority_required'; END IF;
  END IF;
  IF policy_threshold IS NOT NULL AND plan_credits IS NOT NULL AND plan_credits > policy_threshold THEN
    policy_requires := TRUE;
  END IF;
  IF policy_requires AND NOT one_shot_valid AND NEW.proposed_by_user_id = NEW.actor_user_id THEN
    RAISE EXCEPTION 'globe_credit_funding_second_confirmer_required';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
