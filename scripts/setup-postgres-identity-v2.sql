-- ============================================================
-- Greenhouse Identity & Access V2 — PostgreSQL Schema Extensions
-- ============================================================
-- Extends greenhouse_core tables for full RBAC model.
-- Reference: docs/tasks/to-do/GREENHOUSE_IDENTITY_ACCESS_V2.md
-- Reference: docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md
--
-- This script is idempotent (IF NOT EXISTS / ON CONFLICT).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ALTER client_users — add SSO, auth, and session columns
-- ────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_core.client_users
  ADD COLUMN IF NOT EXISTS microsoft_oid TEXT,
  ADD COLUMN IF NOT EXISTS microsoft_tenant_id TEXT,
  ADD COLUMN IF NOT EXISTS microsoft_email TEXT,
  ADD COLUMN IF NOT EXISTS google_sub TEXT,
  ADD COLUMN IF NOT EXISTS google_email TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_hash_algorithm TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Santiago',
  ADD COLUMN IF NOT EXISTS default_portal_home_path TEXT,
  ADD COLUMN IF NOT EXISTS last_login_provider TEXT,
  ADD COLUMN IF NOT EXISTS member_id TEXT REFERENCES greenhouse_core.members(member_id);

-- SSO lookup indexes (unique partial — only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS client_users_microsoft_oid_idx
  ON greenhouse_core.client_users (microsoft_oid) WHERE microsoft_oid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS client_users_google_sub_idx
  ON greenhouse_core.client_users (google_sub) WHERE google_sub IS NOT NULL;

CREATE INDEX IF NOT EXISTS client_users_email_lower_idx
  ON greenhouse_core.client_users (LOWER(email));

CREATE INDEX IF NOT EXISTS client_users_member_idx
  ON greenhouse_core.client_users (member_id) WHERE member_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. ALTER user_role_assignments — temporal validity + audit
-- ────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_core.user_role_assignments
  ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by_user_id TEXT;

-- ────────────────────────────────────────────────────────────
-- 3. Scope tables
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.user_project_scopes (
  scope_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.user_campaign_scopes (
  scope_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.user_client_scopes (
  scope_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES greenhouse_core.clients(client_id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS user_project_scopes_user_idx
  ON greenhouse_core.user_project_scopes (user_id) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS user_campaign_scopes_user_idx
  ON greenhouse_core.user_campaign_scopes (user_id) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS user_client_scopes_user_idx
  ON greenhouse_core.user_client_scopes (user_id) WHERE active = TRUE;

-- ────────────────────────────────────────────────────────────
-- 4. Audit events (immutable — INSERT + SELECT only)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.audit_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_user_id TEXT,
  target_user_id TEXT,
  target_client_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS audit_events_actor_idx
  ON greenhouse_core.audit_events (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_target_user_idx
  ON greenhouse_core.audit_events (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_type_idx
  ON greenhouse_core.audit_events (event_type, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 5. Client feature flags
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.client_feature_flags (
  flag_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES greenhouse_core.clients(client_id) ON DELETE CASCADE,
  flag_code TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT client_feature_flags_unique UNIQUE (client_id, flag_code)
);

CREATE INDEX IF NOT EXISTS client_feature_flags_client_idx
  ON greenhouse_core.client_feature_flags (client_id) WHERE enabled = TRUE;

-- ────────────────────────────────────────────────────────────
-- 6. Role catalog V2 seed
-- ────────────────────────────────────────────────────────────

-- New V2 roles
INSERT INTO greenhouse_core.roles (role_code, role_name, role_family, description, tenant_type, is_admin, is_internal, route_group_scope)
VALUES
  ('collaborator', 'Collaborator', 'collaborator', 'Base role for Efeonce internal users — personal self-service', 'efeonce_internal', FALSE, TRUE, ARRAY['my']),
  ('hr_manager', 'HR Manager', 'domain_operator', 'HR Business Partner — leave, attendance, org structure', 'efeonce_internal', FALSE, TRUE, ARRAY['hr']),
  ('finance_analyst', 'Finance Analyst', 'domain_operator', 'Finance read + write — income, expenses, reconciliation', 'efeonce_internal', FALSE, TRUE, ARRAY['finance']),
  ('finance_admin', 'Finance Admin', 'domain_operator', 'Full finance admin — bank accounts, exchange rates', 'efeonce_internal', FALSE, TRUE, ARRAY['finance']),
  ('people_viewer', 'People Viewer', 'domain_operator', 'Read access to collaborator profiles and capacity', 'efeonce_internal', FALSE, TRUE, ARRAY['people']),
  ('ai_tooling_admin', 'AI Tooling Admin', 'domain_operator', 'AI tool catalog, licenses, wallets, credits', 'efeonce_internal', FALSE, TRUE, ARRAY['ai_tooling'])
ON CONFLICT (role_code) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  role_family = EXCLUDED.role_family,
  description = EXCLUDED.description,
  route_group_scope = EXCLUDED.route_group_scope,
  updated_at = CURRENT_TIMESTAMP;

-- Update existing roles with correct route_group_scope
UPDATE greenhouse_core.roles
SET route_group_scope = ARRAY['client'], updated_at = CURRENT_TIMESTAMP
WHERE role_code IN ('client_executive', 'client_manager', 'client_specialist')
  AND route_group_scope = ARRAY[]::TEXT[];

UPDATE greenhouse_core.roles
SET route_group_scope = ARRAY['internal'], updated_at = CURRENT_TIMESTAMP
WHERE role_code IN ('efeonce_account', 'efeonce_operations')
  AND route_group_scope = ARRAY[]::TEXT[];

UPDATE greenhouse_core.roles
SET route_group_scope = ARRAY['hr'], updated_at = CURRENT_TIMESTAMP
WHERE role_code = 'hr_payroll'
  AND route_group_scope = ARRAY[]::TEXT[];

UPDATE greenhouse_core.roles
SET route_group_scope = ARRAY['internal', 'employee'], updated_at = CURRENT_TIMESTAMP
WHERE role_code = 'employee'
  AND route_group_scope = ARRAY[]::TEXT[];

UPDATE greenhouse_core.roles
SET route_group_scope = ARRAY['internal', 'finance'], updated_at = CURRENT_TIMESTAMP
WHERE role_code = 'finance_manager'
  AND route_group_scope = ARRAY[]::TEXT[];

UPDATE greenhouse_core.roles
SET route_group_scope = ARRAY['admin', 'client', 'my', 'internal', 'hr', 'finance', 'people', 'ai_tooling'], updated_at = CURRENT_TIMESTAMP
WHERE role_code = 'efeonce_admin'
  AND route_group_scope = ARRAY[]::TEXT[];

-- ────────────────────────────────────────────────────────────
-- 7. Serving view: session_360
-- Fast-path session resolution for login
-- ────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS greenhouse_serving.session_360;
CREATE OR REPLACE VIEW greenhouse_serving.session_360 AS
SELECT
  u.user_id,
  u.public_id,
  u.email,
  u.full_name,
  u.tenant_type,
  u.auth_mode,
  u.status,
  u.active,
  u.client_id,
  c.client_name,
  u.identity_profile_id,
  u.member_id,
  u.microsoft_oid,
  u.microsoft_tenant_id,
  u.microsoft_email,
  u.google_sub,
  u.google_email,
  u.avatar_url,
  u.password_hash,
  u.password_hash_algorithm,
  COALESCE(u.timezone, c.timezone, 'America/Santiago') AS timezone,
  u.default_portal_home_path,
  u.last_login_at,
  u.last_login_provider,
  -- Account 360: space + organization context (nullable until M1 migration runs)
  spc.space_id,
  spc.public_id AS space_public_id,
  org.organization_id,
  org.public_id AS organization_public_id,
  org.organization_name,
  -- Active role codes (temporal filter)
  COALESCE(
    ARRAY_AGG(DISTINCT ura.role_code) FILTER (
      WHERE ura.active
        AND ura.role_code IS NOT NULL
        AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)
    ),
    ARRAY[]::TEXT[]
  ) AS role_codes,
  -- Route groups derived from roles
  COALESCE(
    ARRAY_AGG(DISTINCT rg) FILTER (WHERE rg IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS route_groups,
  -- Feature flags for tenant
  COALESCE(
    ARRAY_AGG(DISTINCT cff.flag_code) FILTER (WHERE cff.enabled),
    ARRAY[]::TEXT[]
  ) AS feature_flags
FROM greenhouse_core.client_users AS u
LEFT JOIN greenhouse_core.clients AS c
  ON c.client_id = u.client_id
LEFT JOIN greenhouse_core.spaces AS spc
  ON spc.client_id = u.client_id AND spc.active = TRUE
LEFT JOIN greenhouse_core.organizations AS org
  ON org.organization_id = spc.organization_id AND org.active = TRUE
LEFT JOIN greenhouse_core.user_role_assignments AS ura
  ON ura.user_id = u.user_id
LEFT JOIN greenhouse_core.roles AS r
  ON r.role_code = ura.role_code
LEFT JOIN LATERAL UNNEST(r.route_group_scope) AS rg ON TRUE
LEFT JOIN greenhouse_core.client_feature_flags AS cff
  ON cff.client_id = u.client_id
GROUP BY
  u.user_id, u.public_id, u.email, u.full_name, u.tenant_type,
  u.auth_mode, u.status, u.active, u.client_id, c.client_name,
  c.timezone, u.identity_profile_id, u.member_id,
  u.microsoft_oid, u.microsoft_tenant_id, u.microsoft_email,
  u.google_sub, u.google_email, u.avatar_url,
  u.password_hash, u.password_hash_algorithm,
  u.timezone, u.default_portal_home_path,
  u.last_login_at, u.last_login_provider,
  spc.space_id, spc.public_id,
  org.organization_id, org.public_id, org.organization_name;

-- Update user_360 to include new columns
DROP VIEW IF EXISTS greenhouse_serving.user_360;
CREATE OR REPLACE VIEW greenhouse_serving.user_360 AS
SELECT
  u.user_id,
  u.public_id,
  u.email,
  u.full_name,
  u.tenant_type,
  u.auth_mode,
  u.status,
  u.active,
  u.last_login_at,
  u.client_id,
  c.client_name,
  u.identity_profile_id,
  ip.public_id AS identity_public_id,
  ip.full_name AS identity_full_name,
  ip.canonical_email AS identity_email,
  u.member_id,
  u.microsoft_oid,
  u.google_sub,
  u.avatar_url,
  COALESCE(u.timezone, 'America/Santiago') AS timezone,
  COALESCE(
    ARRAY_AGG(DISTINCT ura.role_code) FILTER (WHERE ura.active AND ura.role_code IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS active_role_codes,
  u.created_at,
  u.updated_at
FROM greenhouse_core.client_users AS u
LEFT JOIN greenhouse_core.clients AS c
  ON c.client_id = u.client_id
LEFT JOIN greenhouse_core.identity_profiles AS ip
  ON ip.profile_id = u.identity_profile_id
LEFT JOIN greenhouse_core.user_role_assignments AS ura
  ON ura.user_id = u.user_id
GROUP BY
  u.user_id, u.public_id, u.email, u.full_name, u.tenant_type,
  u.auth_mode, u.status, u.active, u.last_login_at,
  u.client_id, c.client_name, u.identity_profile_id,
  ip.public_id, ip.full_name, ip.canonical_email,
  u.member_id, u.microsoft_oid, u.google_sub, u.avatar_url,
  u.timezone, u.created_at, u.updated_at;

-- ────────────────────────────────────────────────────────────
-- 8. Grants
-- ────────────────────────────────────────────────────────────

-- Serving views
GRANT SELECT ON greenhouse_serving.session_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.session_360 TO greenhouse_migrator;
GRANT SELECT ON greenhouse_serving.user_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.user_360 TO greenhouse_migrator;

-- Scope tables
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_project_scopes TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_campaign_scopes TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_client_scopes TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_feature_flags TO greenhouse_runtime;

-- Audit (INSERT + SELECT only for runtime)
GRANT SELECT, INSERT ON greenhouse_core.audit_events TO greenhouse_runtime;

-- Migrator gets full access
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_project_scopes TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_campaign_scopes TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_client_scopes TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_feature_flags TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.audit_events TO greenhouse_migrator;
