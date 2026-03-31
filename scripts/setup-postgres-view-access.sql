-- Admin Center — View Access Governance foundation
-- TASK-136

CREATE TABLE IF NOT EXISTS greenhouse_core.view_registry (
  view_code TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  route_group TEXT NOT NULL,
  route_path TEXT NOT NULL,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  parent_view_code TEXT REFERENCES greenhouse_core.view_registry(view_code),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_view_registry_section_order
  ON greenhouse_core.view_registry (section, display_order, label)
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS greenhouse_core.role_view_assignments (
  role_code TEXT NOT NULL REFERENCES greenhouse_core.roles(role_code),
  view_code TEXT NOT NULL REFERENCES greenhouse_core.view_registry(view_code),
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  PRIMARY KEY (role_code, view_code)
);

CREATE INDEX IF NOT EXISTS idx_role_view_assignments_role_code
  ON greenhouse_core.role_view_assignments (role_code, granted_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_core.user_view_overrides (
  user_id TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id),
  view_code TEXT NOT NULL REFERENCES greenhouse_core.view_registry(view_code),
  override_type TEXT NOT NULL CHECK (override_type IN ('grant', 'revoke')),
  reason TEXT,
  expires_at TIMESTAMPTZ,
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, view_code)
);

CREATE INDEX IF NOT EXISTS idx_user_view_overrides_active
  ON greenhouse_core.user_view_overrides (user_id, expires_at);

CREATE TABLE IF NOT EXISTS greenhouse_core.view_access_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('grant_role', 'revoke_role', 'grant_user', 'revoke_user', 'expire_user')),
  target_role TEXT,
  target_user TEXT,
  view_code TEXT NOT NULL REFERENCES greenhouse_core.view_registry(view_code),
  performed_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_view_access_log_created_at
  ON greenhouse_core.view_access_log (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.view_registry TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.role_view_assignments TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_view_overrides TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_core.view_access_log TO greenhouse_runtime;
