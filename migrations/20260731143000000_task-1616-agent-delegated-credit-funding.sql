-- Up Migration

-- TASK-1616 — agent-native funding is an explicit delegated policy, not a forged human session.
-- Default remains fail-closed for every workspace. The internal owner-operated workspace receives
-- bounded authority so an authenticated agent with both Greenhouse entitlements can fund Globe.

ALTER TABLE greenhouse_core.globe_credit_funding_intents
  ADD COLUMN IF NOT EXISTS actor_auth_mode text NOT NULL DEFAULT 'unknown';

ALTER TABLE greenhouse_core.globe_credit_funding_policies
  ADD COLUMN IF NOT EXISTS agent_confirmation_enabled boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agent_max_grant_credits integer,
  ADD COLUMN IF NOT EXISTS agent_max_monthly_cap_credits integer;

ALTER TABLE greenhouse_core.globe_credit_funding_policies
  DROP CONSTRAINT IF EXISTS globe_credit_funding_policies_agent_limits_positive;

ALTER TABLE greenhouse_core.globe_credit_funding_policies
  ADD CONSTRAINT globe_credit_funding_policies_agent_limits_positive CHECK (
    (agent_max_grant_credits IS NULL OR agent_max_grant_credits > 0)
    AND (agent_max_monthly_cap_credits IS NULL OR agent_max_monthly_cap_credits > 0)
  );

UPDATE greenhouse_core.globe_credit_funding_policies
   SET agent_confirmation_enabled = TRUE,
       agent_max_grant_credits = 1000,
       agent_max_monthly_cap_credits = 2000,
       updated_at = NOW()
 WHERE globe_workspace_id = 'greenhouse-org:efeonce';

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
  -- Workload service principals remain forbidden. Agent users are separate authenticated personas
  -- and are governed below by workspace policy, Greenhouse entitlements and bounded credit limits.
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

DO $$
DECLARE
  policy_ready boolean;
  intent_column_ready boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM greenhouse_core.globe_credit_funding_policies
     WHERE globe_workspace_id = 'greenhouse-org:efeonce'
       AND agent_confirmation_enabled = TRUE
       AND agent_max_grant_credits = 1000
       AND agent_max_monthly_cap_credits = 2000
  ) INTO policy_ready;

  IF NOT policy_ready THEN
    RAISE EXCEPTION 'TASK-1616 delegated agent funding policy was not applied.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'greenhouse_core'
       AND table_name = 'globe_credit_funding_intents'
       AND column_name = 'actor_auth_mode'
  ) INTO intent_column_ready;

  IF NOT intent_column_ready THEN
    RAISE EXCEPTION 'TASK-1616 actor_auth_mode evidence column was not applied.';
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.globe_credit_funding_policies
   SET agent_confirmation_enabled = FALSE,
       agent_max_grant_credits = NULL,
       agent_max_monthly_cap_credits = NULL,
       updated_at = NOW()
 WHERE globe_workspace_id = 'greenhouse-org:efeonce';

CREATE OR REPLACE FUNCTION greenhouse_core.enforce_globe_credit_funding_intent_authority()
RETURNS trigger AS $$
DECLARE
  policy_requires boolean := FALSE;
  policy_threshold integer;
  plan_credits integer;
BEGIN
  IF NEW.actor_user_id LIKE 'globe:service:%' OR NEW.actor_user_id LIKE 'service:%' THEN
    RAISE EXCEPTION 'globe_credit_funding_intent_actor_must_be_human';
  END IF;

  IF NEW.phase <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT p.requires_second_confirmer, p.second_confirmer_above_credits
    INTO policy_requires, policy_threshold
    FROM greenhouse_core.globe_credit_funding_policies p
   WHERE p.globe_workspace_id = NEW.globe_workspace_id;

  policy_requires := COALESCE(policy_requires, FALSE);

  IF policy_threshold IS NOT NULL THEN
    plan_credits := NULLIF(NEW.plan #>> '{grantCredits}', '')::integer;
    IF plan_credits IS NOT NULL AND plan_credits > policy_threshold THEN
      policy_requires := TRUE;
    END IF;
  END IF;

  IF policy_requires AND NEW.proposed_by_user_id = NEW.actor_user_id THEN
    RAISE EXCEPTION 'globe_credit_funding_second_confirmer_required';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE greenhouse_core.globe_credit_funding_policies
  DROP CONSTRAINT IF EXISTS globe_credit_funding_policies_agent_limits_positive;

ALTER TABLE greenhouse_core.globe_credit_funding_policies
  DROP COLUMN IF EXISTS agent_confirmation_enabled,
  DROP COLUMN IF EXISTS agent_max_grant_credits,
  DROP COLUMN IF EXISTS agent_max_monthly_cap_credits;

ALTER TABLE greenhouse_core.globe_credit_funding_intents
  DROP COLUMN IF EXISTS actor_auth_mode;

