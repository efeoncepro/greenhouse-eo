-- Up Migration

-- TASK-1616 follow-up: authenticated session provenance must fail closed, and confirmation needs
-- append-only terminal phases so an ambiguous upstream response can be resumed with the original
-- idempotency key instead of poisoning the proposal permanently.

ALTER TABLE greenhouse_core.globe_credit_funding_intents
  DROP CONSTRAINT IF EXISTS globe_credit_funding_intents_phase_check;

ALTER TABLE greenhouse_core.globe_credit_funding_intents
  ADD CONSTRAINT globe_credit_funding_intents_phase_check
  CHECK (phase IN ('proposed', 'confirmed', 'completed', 'confirm_failed'));

ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_audit_event_type_check;

ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log
  ADD CONSTRAINT sister_platform_oauth_audit_event_type_check CHECK (
    event_type = ANY (
      ARRAY[
        'authorize_success'::text,
        'authorize_reject'::text,
        'token_success'::text,
        'token_reject'::text,
        'userinfo_success'::text,
        'userinfo_reject'::text,
        'code_replay'::text,
        'redirect_rejected'::text,
        'token_revoked'::text,
        'client_status_changed'::text,
        'client_policy_changed'::text
      ]
    )
  );

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

  IF NEW.phase <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  IF NEW.actor_auth_mode NOT IN ('agent', 'credentials', 'both', 'microsoft_sso', 'google_sso') THEN
    RAISE EXCEPTION 'globe_credit_funding_intent_auth_mode_not_allowed';
  END IF;

  SELECT p.requires_second_confirmer,
         p.second_confirmer_above_credits,
         p.agent_confirmation_enabled,
         p.agent_max_grant_credits,
         p.agent_max_monthly_cap_credits
    INTO policy_requires,
         policy_threshold,
         agent_enabled,
         agent_grant_limit,
         agent_monthly_cap_limit
    FROM greenhouse_core.globe_credit_funding_policies p
   WHERE p.globe_workspace_id = NEW.globe_workspace_id;

  policy_requires := COALESCE(policy_requires, FALSE);
  agent_enabled := COALESCE(agent_enabled, FALSE);
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

  IF policy_threshold IS NOT NULL AND plan_credits IS NOT NULL AND plan_credits > policy_threshold THEN
    policy_requires := TRUE;
  END IF;

  IF policy_requires AND NEW.proposed_by_user_id = NEW.actor_user_id THEN
    RAISE EXCEPTION 'globe_credit_funding_second_confirmer_required';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  phase_constraint_ready boolean;
BEGIN
  SELECT pg_get_constraintdef(oid) LIKE '%completed%confirm_failed%'
    INTO phase_constraint_ready
    FROM pg_constraint
   WHERE conname = 'globe_credit_funding_intents_phase_check';

  IF NOT COALESCE(phase_constraint_ready, FALSE) THEN
    RAISE EXCEPTION 'TASK-1616 terminal funding phases were not applied.';
  END IF;
END
$$;

-- Down Migration

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM greenhouse_core.globe_credit_funding_intents
     WHERE phase IN ('completed', 'confirm_failed')
  ) THEN
    RAISE EXCEPTION 'TASK-1616 rollback blocked: append-only terminal funding evidence exists.';
  END IF;
END
$$;

ALTER TABLE greenhouse_core.globe_credit_funding_intents
  DROP CONSTRAINT IF EXISTS globe_credit_funding_intents_phase_check;

ALTER TABLE greenhouse_core.globe_credit_funding_intents
  ADD CONSTRAINT globe_credit_funding_intents_phase_check
  CHECK (phase IN ('proposed', 'confirmed'));

ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_audit_event_type_check;

ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log
  ADD CONSTRAINT sister_platform_oauth_audit_event_type_check CHECK (
    event_type = ANY (
      ARRAY[
        'authorize_success'::text,
        'authorize_reject'::text,
        'token_success'::text,
        'token_reject'::text,
        'userinfo_success'::text,
        'userinfo_reject'::text,
        'code_replay'::text,
        'redirect_rejected'::text,
        'token_revoked'::text,
        'client_status_changed'::text
      ]
    )
  );

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
  IF NEW.actor_user_id LIKE 'globe:service:%' OR NEW.actor_user_id LIKE 'service:%' THEN
    RAISE EXCEPTION 'globe_credit_funding_intent_actor_must_be_authenticated_user';
  END IF;

  IF NEW.phase <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT p.requires_second_confirmer,
         p.second_confirmer_above_credits,
         p.agent_confirmation_enabled,
         p.agent_max_grant_credits,
         p.agent_max_monthly_cap_credits
    INTO policy_requires,
         policy_threshold,
         agent_enabled,
         agent_grant_limit,
         agent_monthly_cap_limit
    FROM greenhouse_core.globe_credit_funding_policies p
   WHERE p.globe_workspace_id = NEW.globe_workspace_id;

  policy_requires := COALESCE(policy_requires, FALSE);
  agent_enabled := COALESCE(agent_enabled, FALSE);
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

  IF policy_threshold IS NOT NULL AND plan_credits IS NOT NULL AND plan_credits > policy_threshold THEN
    policy_requires := TRUE;
  END IF;
  IF policy_requires AND NEW.proposed_by_user_id = NEW.actor_user_id THEN
    RAISE EXCEPTION 'globe_credit_funding_second_confirmer_required';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

