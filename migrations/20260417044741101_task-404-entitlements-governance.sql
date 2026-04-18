-- Up Migration

-- Down Migration
CREATE TABLE greenhouse_core.role_entitlement_defaults (
  default_id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  role_code TEXT NOT NULL REFERENCES greenhouse_core.roles(role_code),
  capability TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT NOT NULL,
  effect TEXT NOT NULL CHECK (effect IN ('grant', 'revoke')),
  reason TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL
);

CREATE UNIQUE INDEX role_entitlement_defaults_unique_scope
  ON greenhouse_core.role_entitlement_defaults (space_id, role_code, capability, action, scope);

CREATE INDEX idx_role_entitlement_defaults_role
  ON greenhouse_core.role_entitlement_defaults (space_id, role_code, updated_at DESC);

CREATE TABLE greenhouse_core.user_entitlement_overrides (
  override_id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id),
  capability TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT NOT NULL,
  effect TEXT NOT NULL CHECK (effect IN ('grant', 'revoke')),
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  granted_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX user_entitlement_overrides_unique_scope
  ON greenhouse_core.user_entitlement_overrides (space_id, user_id, capability, action, scope);

CREATE INDEX idx_user_entitlement_overrides_active
  ON greenhouse_core.user_entitlement_overrides (space_id, user_id, expires_at);

CREATE TABLE greenhouse_core.entitlement_governance_audit_log (
  audit_id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (
    change_type IN (
      'role_default_grant',
      'role_default_revoke',
      'user_override_grant',
      'user_override_revoke',
      'startup_policy_update'
    )
  ),
  target_role TEXT,
  target_user TEXT,
  capability TEXT,
  action TEXT,
  scope TEXT,
  effect TEXT CHECK (effect IN ('grant', 'revoke')),
  policy_key TEXT,
  configured_path TEXT,
  performed_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entitlement_governance_audit_log_scope
  ON greenhouse_core.entitlement_governance_audit_log (space_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.role_entitlement_defaults TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_entitlement_overrides TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_core.entitlement_governance_audit_log TO greenhouse_runtime;
