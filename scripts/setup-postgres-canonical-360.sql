CREATE SCHEMA IF NOT EXISTS greenhouse_core;
CREATE SCHEMA IF NOT EXISTS greenhouse_serving;
CREATE SCHEMA IF NOT EXISTS greenhouse_sync;

CREATE TABLE IF NOT EXISTS greenhouse_core.clients (
  client_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  client_name TEXT NOT NULL,
  legal_name TEXT,
  tenant_type TEXT NOT NULL DEFAULT 'client',
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  hubspot_company_id TEXT,
  timezone TEXT,
  country_code TEXT,
  billing_currency TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.spaces (
  space_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  space_name TEXT NOT NULL,
  space_type TEXT NOT NULL DEFAULT 'client_space'
    CHECK (space_type IN ('client_space', 'internal_space')),
  primary_project_database_source_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.space_source_bindings (
  binding_id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE CASCADE,
  source_system TEXT NOT NULL,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  binding_role TEXT NOT NULL,
  source_display_name TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT space_source_bindings_unique UNIQUE (space_id, source_system, source_object_type, source_object_id, binding_role)
);

CREATE TABLE IF NOT EXISTS greenhouse_core.identity_profiles (
  profile_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  profile_type TEXT NOT NULL,
  canonical_email TEXT,
  full_name TEXT NOT NULL,
  job_title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  default_auth_mode TEXT,
  primary_source_system TEXT,
  primary_source_object_type TEXT,
  primary_source_object_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.identity_profile_source_links (
  link_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE CASCADE,
  source_system TEXT NOT NULL,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  source_user_id TEXT,
  source_email TEXT,
  source_display_name TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_login_identity BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT identity_profile_source_links_unique UNIQUE (profile_id, source_system, source_object_type, source_object_id)
);

CREATE TABLE IF NOT EXISTS greenhouse_core.client_users (
  user_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id),
  identity_profile_id TEXT REFERENCES greenhouse_core.identity_profiles(profile_id),
  email TEXT,
  full_name TEXT,
  tenant_type TEXT NOT NULL DEFAULT 'client',
  auth_mode TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.departments (
  department_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_department_id TEXT REFERENCES greenhouse_core.departments(department_id),
  head_member_id TEXT,
  business_unit TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.members (
  member_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  identity_profile_id TEXT REFERENCES greenhouse_core.identity_profiles(profile_id),
  department_id TEXT REFERENCES greenhouse_core.departments(department_id),
  reports_to_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  display_name TEXT NOT NULL,
  primary_email TEXT,
  phone TEXT,
  job_level TEXT,
  employment_type TEXT,
  hire_date DATE,
  contract_end_date DATE,
  daily_required BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.providers (
  provider_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  provider_name TEXT NOT NULL,
  legal_name TEXT,
  provider_type TEXT,
  website_url TEXT,
  primary_email TEXT,
  primary_contact_name TEXT,
  country_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.service_modules (
  module_id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL UNIQUE,
  module_name TEXT NOT NULL,
  business_line TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.client_service_modules (
  assignment_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES greenhouse_core.clients(client_id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES greenhouse_core.service_modules(module_id) ON DELETE CASCADE,
  source_system TEXT,
  source_reference TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT client_service_modules_client_module_unique UNIQUE (client_id, module_id)
);

CREATE TABLE IF NOT EXISTS greenhouse_core.roles (
  role_code TEXT PRIMARY KEY,
  role_name TEXT NOT NULL,
  role_family TEXT,
  description TEXT,
  tenant_type TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  route_group_scope TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.user_role_assignments (
  assignment_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE CASCADE,
  role_code TEXT NOT NULL REFERENCES greenhouse_core.roles(role_code),
  client_id TEXT REFERENCES greenhouse_core.clients(client_id),
  scope_level TEXT,
  project_id TEXT,
  campaign_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_core.entity_source_links (
  link_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  source_display_name TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT entity_source_links_unique UNIQUE (entity_type, entity_id, source_system, source_object_type, source_object_id)
);

CREATE TABLE IF NOT EXISTS greenhouse_sync.outbox_events (
  event_id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS identity_profile_source_links_profile_idx
  ON greenhouse_core.identity_profile_source_links (profile_id);

CREATE INDEX IF NOT EXISTS client_users_client_idx
  ON greenhouse_core.client_users (client_id);

CREATE INDEX IF NOT EXISTS spaces_client_idx
  ON greenhouse_core.spaces (client_id);

CREATE INDEX IF NOT EXISTS spaces_workspace_idx
  ON greenhouse_core.spaces (primary_project_database_source_id);

CREATE INDEX IF NOT EXISTS space_source_bindings_space_idx
  ON greenhouse_core.space_source_bindings (space_id);

CREATE INDEX IF NOT EXISTS space_source_bindings_lookup_idx
  ON greenhouse_core.space_source_bindings (source_system, source_object_type, source_object_id, binding_role);

CREATE INDEX IF NOT EXISTS client_users_identity_idx
  ON greenhouse_core.client_users (identity_profile_id);

CREATE INDEX IF NOT EXISTS members_identity_idx
  ON greenhouse_core.members (identity_profile_id);

CREATE INDEX IF NOT EXISTS members_department_idx
  ON greenhouse_core.members (department_id);

CREATE INDEX IF NOT EXISTS members_reports_to_idx
  ON greenhouse_core.members (reports_to_member_id);

CREATE INDEX IF NOT EXISTS client_service_modules_client_idx
  ON greenhouse_core.client_service_modules (client_id);

CREATE INDEX IF NOT EXISTS client_service_modules_module_idx
  ON greenhouse_core.client_service_modules (module_id);

CREATE INDEX IF NOT EXISTS user_role_assignments_user_idx
  ON greenhouse_core.user_role_assignments (user_id);

CREATE INDEX IF NOT EXISTS outbox_events_pending_idx
  ON greenhouse_sync.outbox_events (status, occurred_at);

CREATE OR REPLACE VIEW greenhouse_serving.client_capability_360 AS
SELECT
  csm.assignment_id,
  csm.client_id,
  c.client_name,
  c.public_id AS client_public_id,
  csm.module_id,
  sm.module_code,
  sm.module_name,
  sm.business_line,
  csm.source_system,
  csm.source_reference,
  csm.status,
  csm.active,
  csm.assigned_at,
  csm.ends_at,
  csm.created_at,
  csm.updated_at
FROM greenhouse_core.client_service_modules AS csm
LEFT JOIN greenhouse_core.clients AS c
  ON c.client_id = csm.client_id
LEFT JOIN greenhouse_core.service_modules AS sm
  ON sm.module_id = csm.module_id;

CREATE OR REPLACE VIEW greenhouse_serving.client_360 AS
SELECT
  c.client_id,
  c.public_id,
  c.client_name,
  c.legal_name,
  c.tenant_type,
  c.status,
  c.active,
  c.hubspot_company_id,
  c.timezone,
  c.country_code,
  c.billing_currency,
  c.notes,
  COUNT(DISTINCT cu.user_id) FILTER (WHERE cu.active) AS active_user_count,
  COUNT(DISTINCT csm.assignment_id) FILTER (WHERE csm.active) AS active_module_count,
  COALESCE(
    ARRAY_AGG(DISTINCT sm.module_code) FILTER (WHERE csm.active AND sm.module_code IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS active_module_codes,
  c.created_at,
  c.updated_at
FROM greenhouse_core.clients AS c
LEFT JOIN greenhouse_core.client_users AS cu
  ON cu.client_id = c.client_id
LEFT JOIN greenhouse_core.client_service_modules AS csm
  ON csm.client_id = c.client_id
LEFT JOIN greenhouse_core.service_modules AS sm
  ON sm.module_id = csm.module_id
GROUP BY
  c.client_id,
  c.public_id,
  c.client_name,
  c.legal_name,
  c.tenant_type,
  c.status,
  c.active,
  c.hubspot_company_id,
  c.timezone,
  c.country_code,
  c.billing_currency,
  c.notes,
  c.created_at,
  c.updated_at;

CREATE OR REPLACE VIEW greenhouse_serving.space_360 AS
SELECT
  s.space_id,
  s.public_id,
  s.space_name,
  s.space_type,
  s.client_id,
  c.client_name,
  c.public_id AS client_public_id,
  c.tenant_type,
  s.primary_project_database_source_id,
  COALESCE(
    MAX(ssb.source_object_id) FILTER (
      WHERE ssb.active
        AND ssb.binding_role = 'delivery_workspace'
        AND ssb.source_system = 'notion'
        AND ssb.source_object_type = 'project_database'
    ),
    s.primary_project_database_source_id
  ) AS resolved_project_database_source_id,
  COUNT(DISTINCT ssb.binding_id) FILTER (WHERE ssb.active) AS source_binding_count,
  COUNT(DISTINCT cu.user_id) FILTER (WHERE cu.active) AS linked_user_count,
  s.status,
  s.active,
  s.notes,
  s.created_at,
  s.updated_at
FROM greenhouse_core.spaces AS s
LEFT JOIN greenhouse_core.clients AS c
  ON c.client_id = s.client_id
LEFT JOIN greenhouse_core.space_source_bindings AS ssb
  ON ssb.space_id = s.space_id
LEFT JOIN greenhouse_core.client_users AS cu
  ON cu.client_id = s.client_id
GROUP BY
  s.space_id,
  s.public_id,
  s.space_name,
  s.space_type,
  s.client_id,
  c.client_name,
  c.public_id,
  c.tenant_type,
  s.primary_project_database_source_id,
  s.status,
  s.active,
  s.notes,
  s.created_at,
  s.updated_at;

CREATE OR REPLACE VIEW greenhouse_serving.member_360 AS
SELECT
  m.member_id,
  m.public_id,
  m.display_name,
  m.primary_email,
  m.phone,
  m.job_level,
  m.employment_type,
  m.hire_date,
  m.contract_end_date,
  m.daily_required,
  m.status,
  m.active,
  m.identity_profile_id,
  ip.public_id AS identity_public_id,
  ip.canonical_email,
  ip.full_name AS identity_full_name,
  ip.profile_type,
  d.department_id,
  d.name AS department_name,
  manager.member_id AS reports_to_member_id,
  manager.display_name AS reports_to_member_name,
  COUNT(DISTINCT cu.user_id) FILTER (WHERE cu.active) AS linked_user_count,
  m.created_at,
  m.updated_at
FROM greenhouse_core.members AS m
LEFT JOIN greenhouse_core.identity_profiles AS ip
  ON ip.profile_id = m.identity_profile_id
LEFT JOIN greenhouse_core.departments AS d
  ON d.department_id = m.department_id
LEFT JOIN greenhouse_core.members AS manager
  ON manager.member_id = m.reports_to_member_id
LEFT JOIN greenhouse_core.client_users AS cu
  ON cu.identity_profile_id = m.identity_profile_id
GROUP BY
  m.member_id,
  m.public_id,
  m.display_name,
  m.primary_email,
  m.phone,
  m.job_level,
  m.employment_type,
  m.hire_date,
  m.contract_end_date,
  m.daily_required,
  m.status,
  m.active,
  m.identity_profile_id,
  ip.public_id,
  ip.canonical_email,
  ip.full_name,
  ip.profile_type,
  d.department_id,
  d.name,
  manager.member_id,
  manager.display_name,
  m.created_at,
  m.updated_at;

CREATE OR REPLACE VIEW greenhouse_serving.provider_360 AS
SELECT
  p.provider_id,
  p.public_id,
  p.provider_name,
  p.legal_name,
  p.provider_type,
  p.website_url,
  p.primary_email,
  p.primary_contact_name,
  p.country_code,
  p.status,
  p.active,
  p.notes,
  COUNT(DISTINCT esl.link_id) FILTER (WHERE esl.active) AS source_link_count,
  p.created_at,
  p.updated_at
FROM greenhouse_core.providers AS p
LEFT JOIN greenhouse_core.entity_source_links AS esl
  ON esl.entity_type = 'provider'
 AND esl.entity_id = p.provider_id
GROUP BY
  p.provider_id,
  p.public_id,
  p.provider_name,
  p.legal_name,
  p.provider_type,
  p.website_url,
  p.primary_email,
  p.primary_contact_name,
  p.country_code,
  p.status,
  p.active,
  p.notes,
  p.created_at,
  p.updated_at;

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
  ip.public_id,
  ip.full_name,
  ip.canonical_email,
  u.created_at,
  u.updated_at;

GRANT USAGE ON SCHEMA greenhouse_core TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_sync TO greenhouse_app;

GRANT USAGE ON SCHEMA greenhouse_core TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_sync TO greenhouse_runtime;

GRANT USAGE, CREATE ON SCHEMA greenhouse_core TO greenhouse_migrator;
GRANT USAGE, CREATE ON SCHEMA greenhouse_serving TO greenhouse_migrator;
GRANT USAGE, CREATE ON SCHEMA greenhouse_sync TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_core TO greenhouse_app;
GRANT SELECT ON ALL TABLES IN SCHEMA greenhouse_serving TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_sync TO greenhouse_app;

GRANT SELECT, REFERENCES ON ALL TABLES IN SCHEMA greenhouse_core TO greenhouse_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA greenhouse_serving TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_sync TO greenhouse_runtime;

GRANT SELECT, REFERENCES ON ALL TABLES IN SCHEMA greenhouse_core TO greenhouse_migrator;
GRANT SELECT ON ALL TABLES IN SCHEMA greenhouse_serving TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_sync TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_core
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_serving
GRANT SELECT ON TABLES TO greenhouse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_sync
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_core
GRANT SELECT, REFERENCES ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_serving
GRANT SELECT ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_sync
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_core
GRANT SELECT, REFERENCES ON TABLES TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_serving
GRANT SELECT ON TABLES TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_sync
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_migrator;
