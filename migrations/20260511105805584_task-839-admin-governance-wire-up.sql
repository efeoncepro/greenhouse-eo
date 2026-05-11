-- Up Migration

-- TASK-839 / ISSUE-068 Fase 5
-- Aditivo: granular capabilities para governance y maker-checker metadata
-- para grants sensibles de user overrides. No cambia el runtime pure-function.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES
  ('access.governance.role_defaults.read', 'admin', ARRAY['read'], ARRAY['tenant','all'],
   'Read access governance role defaults in Admin Center.'),
  ('access.governance.role_defaults.update', 'admin', ARRAY['update'], ARRAY['tenant','all'],
   'Update access governance role defaults in Admin Center.'),
  ('access.governance.user_overrides.read', 'admin', ARRAY['read'], ARRAY['tenant','all'],
   'Read user-specific access governance overrides in Admin Center.'),
  ('access.governance.user_overrides.create', 'admin', ARRAY['create'], ARRAY['tenant','all'],
   'Create or replace user-specific access governance overrides in Admin Center.'),
  ('access.governance.user_overrides.approve', 'admin', ARRAY['approve'], ARRAY['tenant','all'],
   'Approve sensitive user-specific access governance grants in Admin Center.'),
  ('access.governance.startup_policy.update', 'admin', ARRAY['update'], ARRAY['tenant','all'],
   'Update per-user startup policy exceptions in Admin Center.'),
  ('access.governance.audit_log.read', 'admin', ARRAY['read'], ARRAY['tenant','all'],
   'Read access governance audit log in Admin Center.')
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

ALTER TABLE greenhouse_core.user_entitlement_overrides
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approval_requested_by text,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_reason text;

ALTER TABLE greenhouse_core.user_entitlement_overrides
  DROP CONSTRAINT IF EXISTS user_entitlement_overrides_approval_status_check;

ALTER TABLE greenhouse_core.user_entitlement_overrides
  ADD CONSTRAINT user_entitlement_overrides_approval_status_check
  CHECK (approval_status IN ('approved', 'pending_approval', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_user_entitlement_overrides_pending_approval
  ON greenhouse_core.user_entitlement_overrides (space_id, approval_status, updated_at DESC)
  WHERE approval_status = 'pending_approval';

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

DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT COUNT(*)
  INTO missing_count
  FROM (
    VALUES
      ('access.governance.role_defaults.read'),
      ('access.governance.role_defaults.update'),
      ('access.governance.user_overrides.read'),
      ('access.governance.user_overrides.create'),
      ('access.governance.user_overrides.approve'),
      ('access.governance.startup_policy.update'),
      ('access.governance.audit_log.read')
  ) AS expected(capability_key)
  WHERE NOT EXISTS (
    SELECT 1
    FROM greenhouse_core.capabilities_registry cr
    WHERE cr.capability_key = expected.capability_key
      AND cr.deprecated_at IS NULL
  );

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'TASK-839 anti pre-up-marker check: % access governance capabilities missing after seed.', missing_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'user_entitlement_overrides'
      AND column_name = 'approval_status'
  ) THEN
    RAISE EXCEPTION 'TASK-839 anti pre-up-marker check: approval_status was NOT added.';
  END IF;
END $$;

-- Down Migration

DELETE FROM greenhouse_core.entitlement_governance_audit_log
WHERE change_type IN (
  'user_override_approval_requested',
  'user_override_approved',
  'user_override_rejected'
);

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
      'startup_policy_update'
    )
  );

DROP INDEX IF EXISTS greenhouse_core.idx_user_entitlement_overrides_pending_approval;

ALTER TABLE greenhouse_core.user_entitlement_overrides
  DROP CONSTRAINT IF EXISTS user_entitlement_overrides_approval_status_check;

ALTER TABLE greenhouse_core.user_entitlement_overrides
  DROP COLUMN IF EXISTS approval_reason,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS approval_requested_by,
  DROP COLUMN IF EXISTS approval_status;

DELETE FROM greenhouse_core.capabilities_registry
WHERE capability_key IN (
  'access.governance.role_defaults.read',
  'access.governance.role_defaults.update',
  'access.governance.user_overrides.read',
  'access.governance.user_overrides.create',
  'access.governance.user_overrides.approve',
  'access.governance.startup_policy.update',
  'access.governance.audit_log.read'
);
