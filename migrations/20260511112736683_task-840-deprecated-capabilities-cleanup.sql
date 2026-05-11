-- Up Migration

-- TASK-840 / ISSUE-068 Fase 6
-- Deprecated capabilities cleanup discipline. Add the granular deprecate
-- capability, repair live TS->DB registry drift found during discovery, and
-- allow audit rows for explicit capability deprecations.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES
  ('access.governance.capability.deprecate', 'admin', ARRAY['manage'], ARRAY['tenant','all'],
   'Mark stale capability registry rows as deprecated after operator review. EFEONCE_ADMIN only.'),
  ('commercial.engagement.recover_outbound', 'commercial', ARRAY['approve','update'], ARRAY['tenant','all'],
   'Retry or explicitly skip exhausted Sample Sprint outbound HubSpot projection dead letters.'),
  ('platform.release.watchdog.read', 'platform', ARRAY['read'], ARRAY['all'],
   'Read Production Release Watchdog state from admin endpoints and operational dashboards.')
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

ALTER TABLE greenhouse_core.entitlement_governance_audit_log
  DROP CONSTRAINT IF EXISTS entitlement_governance_audit_log_change_type_check;

ALTER TABLE greenhouse_core.entitlement_governance_audit_log
  ADD CONSTRAINT entitlement_governance_audit_log_change_type_check
  CHECK (
    change_type IN (
      'role_default_grant',
      'role_default_revoke',
      'user_override_grant',
      'user_override_revoke',
      'user_override_approval_requested',
      'user_override_approved',
      'user_override_rejected',
      'startup_policy_update',
      'capability_deprecated'
    )
  );

DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT COUNT(*)
  INTO missing_count
  FROM (
    VALUES
      ('access.governance.capability.deprecate'),
      ('commercial.engagement.recover_outbound'),
      ('platform.release.watchdog.read')
  ) AS expected(capability_key)
  WHERE NOT EXISTS (
    SELECT 1
    FROM greenhouse_core.capabilities_registry cr
    WHERE cr.capability_key = expected.capability_key
      AND cr.deprecated_at IS NULL
  );

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'TASK-840 anti pre-up-marker check: % capabilities missing after seed.', missing_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'entitlement_governance_audit_log_change_type_check'
      AND pg_get_constraintdef(oid) LIKE '%capability_deprecated%'
  ) THEN
    RAISE EXCEPTION 'TASK-840 anti pre-up-marker check: capability_deprecated audit change type missing.';
  END IF;
END $$;

-- Down Migration

DELETE FROM greenhouse_core.entitlement_governance_audit_log
WHERE change_type = 'capability_deprecated';

ALTER TABLE greenhouse_core.entitlement_governance_audit_log
  DROP CONSTRAINT IF EXISTS entitlement_governance_audit_log_change_type_check;

ALTER TABLE greenhouse_core.entitlement_governance_audit_log
  ADD CONSTRAINT entitlement_governance_audit_log_change_type_check
  CHECK (
    change_type IN (
      'role_default_grant',
      'role_default_revoke',
      'user_override_grant',
      'user_override_revoke',
      'user_override_approval_requested',
      'user_override_approved',
      'user_override_rejected',
      'startup_policy_update'
    )
  );

DELETE FROM greenhouse_core.capabilities_registry
WHERE capability_key IN (
  'access.governance.capability.deprecate',
  'commercial.engagement.recover_outbound',
  'platform.release.watchdog.read'
);
