-- Up Migration

-- TASK-1629 — autoridad exacta, expirable y de un solo uso para fondeo humano o agente de Globe.
-- La policy persistente sigue siendo el techo global; esta autoridad es un segundo AND-gate.

ALTER TABLE greenhouse_core.globe_credit_funding_policies
  ADD COLUMN IF NOT EXISTS agent_one_shot_authority_required boolean NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS greenhouse_core.globe_credit_funding_authority_issuers (
  globe_workspace_id             text        NOT NULL,
  issuer_user_id                 text        NOT NULL,
  active                         boolean     NOT NULL DEFAULT TRUE,
  max_target_available_credits   integer     NOT NULL CHECK (max_target_available_credits > 0),
  max_grant_credits              integer     NOT NULL CHECK (max_grant_credits > 0),
  max_resulting_cap_credits      integer     NOT NULL CHECK (max_resulting_cap_credits > 0),
  max_ttl_seconds                integer     NOT NULL DEFAULT 900 CHECK (max_ttl_seconds BETWEEN 60 AND 3600),
  configured_at                  timestamptz NOT NULL DEFAULT NOW(),
  configured_by                  text        NOT NULL,
  PRIMARY KEY (globe_workspace_id, issuer_user_id),
  CHECK (max_target_available_credits <= max_resulting_cap_credits),
  FOREIGN KEY (issuer_user_id) REFERENCES greenhouse_core.client_users(user_id)
);

CREATE TABLE IF NOT EXISTS greenhouse_core.globe_credit_funding_authority_issuer_revocations (
  globe_workspace_id  text        NOT NULL,
  issuer_user_id      text        NOT NULL,
  revoked_at          timestamptz NOT NULL DEFAULT NOW(),
  revoked_by_user_id  text        NOT NULL,
  reason_code         text        NOT NULL CHECK (reason_code IN ('operator_revoked', 'scope_changed', 'security_response')),
  correlation_id      text        NOT NULL,
  PRIMARY KEY (globe_workspace_id, issuer_user_id),
  FOREIGN KEY (globe_workspace_id, issuer_user_id)
    REFERENCES greenhouse_core.globe_credit_funding_authority_issuers (globe_workspace_id, issuer_user_id)
);

CREATE TABLE IF NOT EXISTS greenhouse_core.globe_credit_funding_authority_auth_attestations (
  attestation_id       text        PRIMARY KEY,
  issuer_user_id       text        NOT NULL REFERENCES greenhouse_core.client_users(user_id),
  auth_provider        text        NOT NULL,
  auth_mode            text        NOT NULL CHECK (auth_mode IN ('credentials', 'both', 'microsoft_sso', 'google_sso')),
  correlation_id       text        NOT NULL,
  attested_at          timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (issuer_user_id, correlation_id)
);

CREATE TABLE IF NOT EXISTS greenhouse_core.globe_credit_funding_one_shot_authorities (
  authority_id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version                 text        NOT NULL DEFAULT '1' CHECK (schema_version = '1'),
  globe_workspace_id             text        NOT NULL,
  operation_kind                 text        NOT NULL DEFAULT 'ensure_funded' CHECK (operation_kind = 'ensure_funded'),
  period_key                     text        NOT NULL,
  period_start                   timestamptz NOT NULL,
  period_end                     timestamptz NOT NULL,
  target_available_credits       integer     NOT NULL CHECK (target_available_credits > 0),
  max_grant_credits              integer     NOT NULL CHECK (max_grant_credits > 0),
  max_resulting_cap_credits      integer     NOT NULL CHECK (max_resulting_cap_credits > 0),
  issuer_user_id                 text        NOT NULL,
  issuer_entitlement             text        NOT NULL,
  issuer_auth_mode               text        NOT NULL CHECK (
    issuer_auth_mode IN ('credentials', 'both', 'microsoft_sso', 'google_sso')
  ),
  issuer_auth_evidence_ref       text        NOT NULL,
  executor_user_id               text        NOT NULL,
  executor_channel               text        NOT NULL CHECK (executor_channel IN ('oauth', 'browser')),
  executor_client_id             text        NOT NULL,
  executor_auth_mode             text        NOT NULL CHECK (
    executor_auth_mode IN ('agent', 'credentials', 'both', 'microsoft_sso', 'google_sso')
  ),
  not_before                     timestamptz NOT NULL,
  expires_at                     timestamptz NOT NULL,
  max_executions                 smallint    NOT NULL DEFAULT 1 CHECK (max_executions = 1),
  operation_key                  text        NOT NULL,
  instruction_fingerprint        char(64)    NOT NULL CHECK (instruction_fingerprint ~ '^[0-9a-f]{64}$'),
  evidence_ref                   text        NOT NULL,
  issued_at                      timestamptz NOT NULL DEFAULT NOW(),
  CHECK (period_start < period_end),
  CHECK (issued_at <= not_before AND not_before < expires_at),
  CHECK (expires_at <= issued_at + INTERVAL '1 hour'),
  CHECK (target_available_credits <= max_resulting_cap_credits),
  CHECK (
    executor_channel = 'oauth'
    OR (
      executor_channel = 'browser'
      AND executor_client_id = 'greenhouse-portal'
      AND executor_user_id = issuer_user_id
      AND executor_auth_mode = issuer_auth_mode
      AND executor_auth_mode <> 'agent'
    )
  ),
  UNIQUE (globe_workspace_id, operation_key),
  UNIQUE (globe_workspace_id, instruction_fingerprint),
  FOREIGN KEY (globe_workspace_id, issuer_user_id)
    REFERENCES greenhouse_core.globe_credit_funding_authority_issuers (globe_workspace_id, issuer_user_id),
  FOREIGN KEY (executor_user_id) REFERENCES greenhouse_core.client_users(user_id),
  FOREIGN KEY (issuer_auth_evidence_ref)
    REFERENCES greenhouse_core.globe_credit_funding_authority_auth_attestations(attestation_id)
);

CREATE TABLE IF NOT EXISTS greenhouse_core.globe_credit_funding_authority_revocations (
  revocation_id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_id           uuid        NOT NULL UNIQUE REFERENCES greenhouse_core.globe_credit_funding_one_shot_authorities(authority_id),
  revoked_at              timestamptz NOT NULL DEFAULT NOW(),
  revoked_by_user_id      text        NOT NULL,
  revoked_by_entitlement  text        NOT NULL,
  auth_evidence_ref       text        NOT NULL,
  reason_code             text        NOT NULL CHECK (reason_code IN ('operator_revoked', 'scope_changed', 'security_response')),
  correlation_id          text        NOT NULL
);

CREATE TABLE IF NOT EXISTS greenhouse_core.globe_credit_funding_authority_executions (
  execution_id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_id                 uuid        NOT NULL UNIQUE REFERENCES greenhouse_core.globe_credit_funding_one_shot_authorities(authority_id),
  executor_user_id             text        NOT NULL,
  executor_channel             text        NOT NULL CHECK (executor_channel IN ('oauth', 'browser')),
  executor_client_id           text        NOT NULL,
  first_auth_evidence_ref      text        NOT NULL,
  actor_auth_mode              text        NOT NULL CHECK (
    actor_auth_mode IN ('agent', 'credentials', 'both', 'microsoft_sso', 'google_sso')
  ),
  execution_fingerprint        char(64)    NOT NULL CHECK (execution_fingerprint ~ '^[0-9a-f]{64}$'),
  operation_key                text        NOT NULL UNIQUE,
  proposal_id                  text,
  plan_fingerprint             text,
  globe_operation_id           text,
  correlation_id               text        NOT NULL,
  propose_idempotency_key      text        NOT NULL,
  confirm_idempotency_key      text        NOT NULL,
  reconcile_idempotency_key    text        NOT NULL,
  state                        text        NOT NULL DEFAULT 'claimed' CHECK (
    state IN ('claimed', 'proposed', 'confirming', 'outcome_unknown', 'completed', 'failed_definitive', 'reconciled')
  ),
  outcome                      text CHECK (outcome IN ('completed', 'expired', 'no_effect', 'outcome_unknown')),
  globe_receipt_ref            text,
  receipt_digest               char(64) CHECK (receipt_digest IS NULL OR receipt_digest ~ '^[0-9a-f]{64}$'),
  dispatch_lease_owner         text,
  dispatch_lease_expires_at    timestamptz,
  dispatch_lease_generation    integer     NOT NULL DEFAULT 0 CHECK (dispatch_lease_generation >= 0),
  claimed_at                   timestamptz NOT NULL DEFAULT NOW(),
  updated_at                   timestamptz NOT NULL DEFAULT NOW(),
  completed_at                 timestamptz,
  CHECK (propose_idempotency_key <> confirm_idempotency_key),
  CHECK (confirm_idempotency_key <> reconcile_idempotency_key),
  CHECK ((dispatch_lease_owner IS NULL) = (dispatch_lease_expires_at IS NULL))
);

CREATE TABLE IF NOT EXISTS greenhouse_core.globe_credit_funding_authority_execution_events (
  event_id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id           uuid        NOT NULL REFERENCES greenhouse_core.globe_credit_funding_authority_executions(execution_id),
  event_type              text        NOT NULL CHECK (
    event_type IN ('claimed', 'lease_acquired', 'proposed', 'confirming', 'outcome_unknown', 'completed', 'failed_definitive', 'reconciled')
  ),
  event_fingerprint       char(64)    NOT NULL CHECK (event_fingerprint ~ '^[0-9a-f]{64}$'),
  correlation_id          text        NOT NULL,
  auth_evidence_ref      text        NOT NULL,
  evidence                jsonb       NOT NULL DEFAULT '{}'::jsonb,
  occurred_at             timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (execution_id, event_fingerprint)
);

ALTER TABLE greenhouse_core.globe_credit_funding_intents
  ADD COLUMN IF NOT EXISTS authority_id uuid,
  ADD COLUMN IF NOT EXISTS authority_execution_id uuid;

ALTER TABLE greenhouse_core.globe_credit_funding_intents
  ADD CONSTRAINT globe_credit_funding_intents_authority_fkey
    FOREIGN KEY (authority_id) REFERENCES greenhouse_core.globe_credit_funding_one_shot_authorities(authority_id),
  ADD CONSTRAINT globe_credit_funding_intents_authority_execution_fkey
    FOREIGN KEY (authority_execution_id) REFERENCES greenhouse_core.globe_credit_funding_authority_executions(execution_id),
  ADD CONSTRAINT globe_credit_funding_intents_authority_pair CHECK (
    (authority_id IS NULL) = (authority_execution_id IS NULL)
  );

-- El actor humano o agente puede confirmar sólo si la policy persistente Y la autoridad one-shot
-- exacta lo permiten. El trigger conserva los límites y el segundo confirmador configurables.
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

  IF NEW.phase <> 'confirmed' THEN
    RETURN NEW;
  END IF;

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

UPDATE greenhouse_core.globe_credit_funding_policies
   SET agent_one_shot_authority_required = TRUE,
       updated_at = NOW()
 WHERE globe_workspace_id = 'greenhouse-org:efeonce';

CREATE OR REPLACE FUNCTION greenhouse_core.reject_globe_credit_funding_authority_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'globe_credit_funding_authority_evidence_is_append_only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS globe_credit_funding_authorities_no_update_delete
  ON greenhouse_core.globe_credit_funding_one_shot_authorities;
CREATE TRIGGER globe_credit_funding_authorities_no_update_delete
  BEFORE UPDATE OR DELETE ON greenhouse_core.globe_credit_funding_one_shot_authorities
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.reject_globe_credit_funding_authority_evidence_mutation();
DROP TRIGGER IF EXISTS globe_credit_funding_authority_issuers_no_update_delete
  ON greenhouse_core.globe_credit_funding_authority_issuers;
CREATE TRIGGER globe_credit_funding_authority_issuers_no_update_delete
  BEFORE UPDATE OR DELETE ON greenhouse_core.globe_credit_funding_authority_issuers
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.reject_globe_credit_funding_authority_evidence_mutation();
DROP TRIGGER IF EXISTS globe_credit_funding_authority_issuer_revocations_no_update_delete
  ON greenhouse_core.globe_credit_funding_authority_issuer_revocations;
CREATE TRIGGER globe_credit_funding_authority_issuer_revocations_no_update_delete
  BEFORE UPDATE OR DELETE ON greenhouse_core.globe_credit_funding_authority_issuer_revocations
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.reject_globe_credit_funding_authority_evidence_mutation();
DROP TRIGGER IF EXISTS globe_credit_funding_authority_auth_attestations_no_update_delete
  ON greenhouse_core.globe_credit_funding_authority_auth_attestations;
CREATE TRIGGER globe_credit_funding_authority_auth_attestations_no_update_delete
  BEFORE UPDATE OR DELETE ON greenhouse_core.globe_credit_funding_authority_auth_attestations
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.reject_globe_credit_funding_authority_evidence_mutation();
DROP TRIGGER IF EXISTS globe_credit_funding_authority_revocations_no_update_delete
  ON greenhouse_core.globe_credit_funding_authority_revocations;
CREATE TRIGGER globe_credit_funding_authority_revocations_no_update_delete
  BEFORE UPDATE OR DELETE ON greenhouse_core.globe_credit_funding_authority_revocations
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.reject_globe_credit_funding_authority_evidence_mutation();
DROP TRIGGER IF EXISTS globe_credit_funding_authority_events_no_update_delete
  ON greenhouse_core.globe_credit_funding_authority_execution_events;
CREATE TRIGGER globe_credit_funding_authority_events_no_update_delete
  BEFORE UPDATE OR DELETE ON greenhouse_core.globe_credit_funding_authority_execution_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.reject_globe_credit_funding_authority_evidence_mutation();

CREATE INDEX globe_credit_funding_authorities_executor_active_idx
  ON greenhouse_core.globe_credit_funding_one_shot_authorities
  (executor_user_id, executor_channel, executor_client_id, expires_at DESC);
CREATE INDEX globe_credit_funding_authority_executions_state_idx
  ON greenhouse_core.globe_credit_funding_authority_executions (state, updated_at);

INSERT INTO greenhouse_core.globe_credit_funding_authority_issuers
  (globe_workspace_id, issuer_user_id, active, max_target_available_credits, max_grant_credits,
   max_resulting_cap_credits, max_ttl_seconds, configured_by)
VALUES ('greenhouse-org:efeonce', 'user-efeonce-admin-julio-reyes', TRUE, 2000, 1000, 4000, 900, 'migration:TASK-1629')
ON CONFLICT (globe_workspace_id, issuer_user_id) DO NOTHING;

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('platform.globe_credit_funding.ensure', 'platform', ARRAY['execute'], ARRAY['all'],
   'Ejecutar ensure-funded de Globe con autoridad one-shot exacta.', NOW(), NULL),
  ('platform.globe_credit_funding.authority.issue', 'platform', ARRAY['execute'], ARRAY['all'],
   'Emitir una autorización one-shot exacta para ensure-funded de Globe.', NOW(), NULL),
  ('platform.globe_credit_funding.authority.revoke', 'platform', ARRAY['execute'], ARRAY['all'],
   'Revocar una autorización one-shot antes de su ejecución.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

GRANT SELECT ON greenhouse_core.globe_credit_funding_authority_issuers TO greenhouse_runtime;
GRANT SELECT ON greenhouse_core.globe_credit_funding_authority_issuer_revocations TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_core.globe_credit_funding_authority_auth_attestations TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_core.globe_credit_funding_one_shot_authorities TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_core.globe_credit_funding_authority_revocations TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.globe_credit_funding_authority_executions TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_core.globe_credit_funding_authority_execution_events TO greenhouse_runtime;

-- Anti pre-up marker: la estructura y el issuer explícito deben existir antes de continuar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM greenhouse_core.globe_credit_funding_authority_issuers
     WHERE globe_workspace_id = 'greenhouse-org:efeonce'
       AND issuer_user_id = 'user-efeonce-admin-julio-reyes' AND active = TRUE
  ) THEN
    RAISE EXCEPTION 'TASK-1629 issuer one-shot no fue configurado.';
  END IF;
END
$$;

-- Down Migration

-- La evidencia financiera/audit no se destruye. Si la feature llegó a emitir una autoridad, el rollback
-- operativo es suspender scopes/routes/policy mediante un cambio forward, no borrar historia.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM greenhouse_core.globe_credit_funding_one_shot_authorities)
     OR EXISTS (SELECT 1 FROM greenhouse_core.globe_credit_funding_authority_revocations)
     OR EXISTS (SELECT 1 FROM greenhouse_core.globe_credit_funding_authority_issuer_revocations)
     OR EXISTS (SELECT 1 FROM greenhouse_core.globe_credit_funding_authority_auth_attestations)
     OR EXISTS (SELECT 1 FROM greenhouse_core.globe_credit_funding_authority_executions)
     OR EXISTS (SELECT 1 FROM greenhouse_core.globe_credit_funding_authority_execution_events)
     OR EXISTS (
       SELECT 1 FROM greenhouse_core.globe_credit_funding_intents
        WHERE authority_id IS NOT NULL OR authority_execution_id IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'TASK-1629 rollback blocked: one-shot funding evidence exists; use forward suspension.';
  END IF;
END
$$;

DROP TRIGGER IF EXISTS globe_credit_funding_intents_authority
  ON greenhouse_core.globe_credit_funding_intents;
DROP FUNCTION IF EXISTS greenhouse_core.enforce_globe_credit_funding_intent_authority();

ALTER TABLE greenhouse_core.globe_credit_funding_intents
  DROP CONSTRAINT IF EXISTS globe_credit_funding_intents_authority_pair,
  DROP CONSTRAINT IF EXISTS globe_credit_funding_intents_authority_execution_fkey,
  DROP CONSTRAINT IF EXISTS globe_credit_funding_intents_authority_fkey,
  DROP COLUMN IF EXISTS authority_execution_id,
  DROP COLUMN IF EXISTS authority_id;

DROP TABLE IF EXISTS greenhouse_core.globe_credit_funding_authority_execution_events;
DROP TABLE IF EXISTS greenhouse_core.globe_credit_funding_authority_executions;
DROP TABLE IF EXISTS greenhouse_core.globe_credit_funding_authority_revocations;
DROP TABLE IF EXISTS greenhouse_core.globe_credit_funding_one_shot_authorities;
DROP TABLE IF EXISTS greenhouse_core.globe_credit_funding_authority_auth_attestations;
DROP TABLE IF EXISTS greenhouse_core.globe_credit_funding_authority_issuer_revocations;
DROP TABLE IF EXISTS greenhouse_core.globe_credit_funding_authority_issuers;
DROP FUNCTION IF EXISTS greenhouse_core.reject_globe_credit_funding_authority_evidence_mutation();

ALTER TABLE greenhouse_core.globe_credit_funding_policies
  DROP COLUMN IF EXISTS agent_one_shot_authority_required;

-- Restaura el gate vigente antes de TASK-1629.
CREATE OR REPLACE FUNCTION greenhouse_core.enforce_globe_credit_funding_intent_authority()
RETURNS trigger AS $$
DECLARE
  policy_requires boolean := FALSE;
  policy_threshold integer;
  agent_enabled boolean := FALSE;
  agent_grant_limit integer;
  agent_monthly_cap_limit integer;
  plan_credits integer;
  plan_monthly_cap integer;
BEGIN
  IF NEW.actor_user_id LIKE 'globe:service:%'
     OR NEW.actor_user_id LIKE 'service:%'
     OR NEW.actor_auth_mode IN ('unknown', 'service', 'workload', 'api_key', 'app') THEN
    RAISE EXCEPTION 'globe_credit_funding_intent_actor_must_be_authenticated_user';
  END IF;
  IF NEW.phase <> 'confirmed' THEN RETURN NEW; END IF;
  IF NEW.actor_auth_mode NOT IN ('agent', 'credentials', 'both', 'microsoft_sso', 'google_sso') THEN
    RAISE EXCEPTION 'globe_credit_funding_intent_auth_mode_not_allowed';
  END IF;
  SELECT p.requires_second_confirmer, p.second_confirmer_above_credits,
         p.agent_confirmation_enabled, p.agent_max_grant_credits, p.agent_max_monthly_cap_credits
    INTO policy_requires, policy_threshold, agent_enabled, agent_grant_limit, agent_monthly_cap_limit
    FROM greenhouse_core.globe_credit_funding_policies p
   WHERE p.globe_workspace_id = NEW.globe_workspace_id;
  policy_requires := COALESCE(policy_requires, FALSE);
  agent_enabled := COALESCE(agent_enabled, FALSE);
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
  IF policy_threshold IS NOT NULL AND plan_credits IS NOT NULL AND plan_credits > policy_threshold THEN
    policy_requires := TRUE;
  END IF;
  IF policy_requires AND NEW.proposed_by_user_id = NEW.actor_user_id THEN
    RAISE EXCEPTION 'globe_credit_funding_second_confirmer_required';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER globe_credit_funding_intents_authority
  BEFORE INSERT ON greenhouse_core.globe_credit_funding_intents
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.enforce_globe_credit_funding_intent_authority();

DELETE FROM greenhouse_core.capabilities_registry
 WHERE capability_key IN (
  'platform.globe_credit_funding.ensure',
  'platform.globe_credit_funding.authority.issue',
  'platform.globe_credit_funding.authority.revoke'
 );
