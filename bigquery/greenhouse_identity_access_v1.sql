CREATE SCHEMA IF NOT EXISTS `efeonce-group.greenhouse`
OPTIONS(
  location = "US",
  description = "Greenhouse portal tenant configuration, identity, access, and app-owned tables"
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.client_users` (
  user_id STRING NOT NULL OPTIONS(description = "Stable user identifier used in sessions and audit events"),
  client_id STRING OPTIONS(description = "Tenant identifier for client users. Null for internal-only Efeonce users if desired"),
  tenant_type STRING NOT NULL OPTIONS(description = "client or efeonce_internal"),
  email STRING NOT NULL OPTIONS(description = "Primary login email"),
  microsoft_oid STRING OPTIONS(description = "Microsoft Entra object id linked to this principal"),
  microsoft_tenant_id STRING OPTIONS(description = "Microsoft Entra tenant id used in the last successful SSO link"),
  microsoft_email STRING OPTIONS(description = "Microsoft account email linked to this principal"),
  full_name STRING NOT NULL OPTIONS(description = "Display name"),
  job_title STRING OPTIONS(description = "Optional business title"),
  status STRING NOT NULL OPTIONS(description = "invited, active, disabled, archived"),
  active BOOL NOT NULL OPTIONS(description = "Quick auth gate"),
  auth_mode STRING NOT NULL OPTIONS(description = "credentials, sso, both, password_reset_pending, or invited"),
  password_hash STRING OPTIONS(description = "Password hash for credentials auth"),
  password_hash_algorithm STRING OPTIONS(description = "Hash algorithm name, for example bcrypt"),
  default_portal_home_path STRING OPTIONS(description = "Default route after login"),
  timezone STRING OPTIONS(description = "Display timezone for the user"),
  locale STRING OPTIONS(description = "Optional locale for future i18n"),
  avatar_url STRING OPTIONS(description = "Optional avatar"),
  last_login_at TIMESTAMP OPTIONS(description = "Last successful portal login"),
  last_login_provider STRING OPTIONS(description = "Provider used in the last successful portal login"),
  invited_at TIMESTAMP OPTIONS(description = "Invitation timestamp"),
  invited_by_user_id STRING OPTIONS(description = "User who invited this account"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Row creation time"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last update time")
)
OPTIONS(description = "Greenhouse user principals separated from tenant metadata");

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.roles` (
  role_code STRING NOT NULL OPTIONS(description = "Stable role identifier"),
  role_name STRING NOT NULL OPTIONS(description = "Display label"),
  role_family STRING NOT NULL OPTIONS(description = "client, internal, or admin"),
  description STRING OPTIONS(description = "Role purpose and expectations"),
  tenant_type STRING NOT NULL OPTIONS(description = "client or efeonce_internal"),
  is_admin BOOL NOT NULL OPTIONS(description = "Whether the role can access admin routes"),
  is_internal BOOL NOT NULL OPTIONS(description = "Whether the role is internal to Efeonce"),
  route_group_scope ARRAY<STRING> OPTIONS(description = "Allowed route groups such as client, internal, admin"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Row creation time"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last update time")
)
OPTIONS(description = "Greenhouse role catalog");

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.user_role_assignments` (
  assignment_id STRING NOT NULL OPTIONS(description = "Stable role assignment identifier"),
  user_id STRING NOT NULL OPTIONS(description = "Assigned user"),
  client_id STRING OPTIONS(description = "Tenant context for tenant-scoped assignments"),
  role_code STRING NOT NULL OPTIONS(description = "Assigned role"),
  status STRING NOT NULL OPTIONS(description = "active, suspended, expired"),
  active BOOL NOT NULL OPTIONS(description = "Quick filter for current role assignment"),
  effective_from TIMESTAMP OPTIONS(description = "Assignment effective start"),
  effective_to TIMESTAMP OPTIONS(description = "Assignment effective end"),
  notes STRING OPTIONS(description = "Operational notes"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Row creation time"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last update time")
)
OPTIONS(description = "Role assignments per user and optional tenant context");

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.user_project_scopes` (
  scope_id STRING NOT NULL OPTIONS(description = "Stable project scope identifier"),
  user_id STRING NOT NULL OPTIONS(description = "Scoped user"),
  client_id STRING NOT NULL OPTIONS(description = "Tenant context"),
  project_id STRING NOT NULL OPTIONS(description = "Allowed project identifier"),
  access_level STRING NOT NULL OPTIONS(description = "viewer, manager, or executive_context"),
  active BOOL NOT NULL OPTIONS(description = "Whether the scope is currently active"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Row creation time"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last update time")
)
OPTIONS(description = "Project-level visibility scopes");

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.user_campaign_scopes` (
  scope_id STRING NOT NULL OPTIONS(description = "Stable campaign scope identifier"),
  user_id STRING NOT NULL OPTIONS(description = "Scoped user"),
  client_id STRING NOT NULL OPTIONS(description = "Tenant context"),
  campaign_id STRING NOT NULL OPTIONS(description = "Allowed campaign identifier"),
  access_level STRING NOT NULL OPTIONS(description = "viewer, manager, or executive_context"),
  active BOOL NOT NULL OPTIONS(description = "Whether the scope is currently active"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Row creation time"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last update time")
)
OPTIONS(description = "Campaign-level visibility scopes");

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.client_feature_flags` (
  flag_id STRING NOT NULL OPTIONS(description = "Stable flag assignment identifier"),
  client_id STRING NOT NULL OPTIONS(description = "Tenant identifier"),
  feature_code STRING NOT NULL OPTIONS(description = "Feature identifier"),
  status STRING NOT NULL OPTIONS(description = "enabled, disabled, staged"),
  active BOOL NOT NULL OPTIONS(description = "Quick filter for runtime enablement"),
  rollout_notes STRING OPTIONS(description = "Operational rollout notes"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Row creation time"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last update time")
)
OPTIONS(description = "Client-level feature enablement and staged rollout table");

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.audit_events` (
  event_id STRING NOT NULL OPTIONS(description = "Stable audit event identifier"),
  event_type STRING NOT NULL OPTIONS(description = "auth.login_success, auth.login_failure, admin.role_change, etc."),
  actor_user_id STRING OPTIONS(description = "User who triggered the event"),
  client_id STRING OPTIONS(description = "Tenant context if applicable"),
  target_entity_type STRING OPTIONS(description = "user, tenant, role_assignment, feature_flag, etc."),
  target_entity_id STRING OPTIONS(description = "Identifier of the target entity"),
  event_payload JSON OPTIONS(description = "Structured event detail payload"),
  occurred_at TIMESTAMP NOT NULL OPTIONS(description = "Event timestamp")
)
OPTIONS(description = "Audit trail for auth and admin actions");

MERGE `efeonce-group.greenhouse.roles` AS target
USING (
  SELECT 'client_executive' AS role_code, 'Client Executive' AS role_name, 'client' AS role_family, 'Executive client visibility over tenant-wide dashboards, campaigns, capacity, and risks.' AS description, 'client' AS tenant_type, FALSE AS is_admin, FALSE AS is_internal, ['client'] AS route_group_scope, CURRENT_TIMESTAMP() AS created_at, CURRENT_TIMESTAMP() AS updated_at
  UNION ALL
  SELECT 'client_manager', 'Client Manager', 'client', 'Operational client visibility with deeper project and campaign drilldowns.', 'client', FALSE, FALSE, ['client'], CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
  UNION ALL
  SELECT 'client_specialist', 'Client Specialist', 'client', 'Restricted client visibility over assigned campaign or project subsets.', 'client', FALSE, FALSE, ['client'], CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
  UNION ALL
  SELECT 'efeonce_account', 'Efeonce Account', 'internal', 'Account lead visibility across assigned client tenants.', 'efeonce_internal', FALSE, TRUE, ['internal'], CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
  UNION ALL
  SELECT 'efeonce_operations', 'Efeonce Operations', 'internal', 'Cross-tenant operational visibility across delivery, capacity, and risk.', 'efeonce_internal', FALSE, TRUE, ['internal'], CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
  UNION ALL
  SELECT 'hr_payroll', 'HR Payroll', 'internal', 'Specialized payroll access for human resources operations.', 'efeonce_internal', FALSE, TRUE, ['internal', 'hr'], CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
  UNION ALL
  SELECT 'efeonce_admin', 'Efeonce Admin', 'admin', 'Administrative access to tenants, users, scopes, feature flags, and governance surfaces.', 'efeonce_internal', TRUE, TRUE, ['internal', 'admin'], CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
) AS source
ON target.role_code = source.role_code
WHEN MATCHED THEN
  UPDATE SET
    role_name = source.role_name,
    role_family = source.role_family,
    description = source.description,
    tenant_type = source.tenant_type,
    is_admin = source.is_admin,
    is_internal = source.is_internal,
    route_group_scope = source.route_group_scope,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    role_code,
    role_name,
    role_family,
    description,
    tenant_type,
    is_admin,
    is_internal,
    route_group_scope,
    created_at,
    updated_at
  )
  VALUES (
    source.role_code,
    source.role_name,
    source.role_family,
    source.description,
    source.tenant_type,
    source.is_admin,
    source.is_internal,
    source.route_group_scope,
    source.created_at,
    source.updated_at
  );

MERGE `efeonce-group.greenhouse.client_users` AS target
USING (
  SELECT
    'user-greenhouse-demo-client-executive' AS user_id,
    'greenhouse-demo-client' AS client_id,
    'client' AS tenant_type,
    'client.portal@efeonce.com' AS email,
    CAST(NULL AS STRING) AS microsoft_oid,
    CAST(NULL AS STRING) AS microsoft_tenant_id,
    CAST(NULL AS STRING) AS microsoft_email,
    'Greenhouse Demo Executive' AS full_name,
    'Head of Marketing' AS job_title,
    'active' AS status,
    TRUE AS active,
    'credentials' AS auth_mode,
    '$2b$12$OI4jNGf9nErgMpp8d2SnzOLzWQBLgAPlqzUvQwKXLfQ52mPpQKOq.' AS password_hash,
    'bcrypt' AS password_hash_algorithm,
    '/dashboard' AS default_portal_home_path,
    'America/Santiago' AS timezone,
    'es-CL' AS locale,
    CAST(NULL AS STRING) AS avatar_url,
    CAST(NULL AS TIMESTAMP) AS last_login_at,
    CAST(NULL AS STRING) AS last_login_provider,
    CURRENT_TIMESTAMP() AS invited_at,
    CAST(NULL AS STRING) AS invited_by_user_id,
    CURRENT_TIMESTAMP() AS created_at,
    CURRENT_TIMESTAMP() AS updated_at
  UNION ALL
  SELECT
    'user-efeonce-admin-bootstrap',
    CAST(NULL AS STRING),
    'efeonce_internal',
    'admin.portal@efeonce.com',
    CAST(NULL AS STRING),
    CAST(NULL AS STRING),
    CAST(NULL AS STRING),
    'Efeonce Admin Bootstrap',
    'Portal Administrator',
    'invited',
    FALSE,
    'credentials',
    CAST(NULL AS STRING),
    CAST(NULL AS STRING),
    '/internal/dashboard',
    'America/Santiago',
    'es-CL',
    CAST(NULL AS STRING),
    CAST(NULL AS TIMESTAMP),
    CAST(NULL AS STRING),
    CAST(NULL AS TIMESTAMP),
    CAST(NULL AS STRING),
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
) AS source
ON target.user_id = source.user_id
WHEN MATCHED THEN
  UPDATE SET
    client_id = source.client_id,
    tenant_type = source.tenant_type,
    email = source.email,
    full_name = source.full_name,
    job_title = source.job_title,
    status = source.status,
    active = source.active,
    auth_mode = source.auth_mode,
    default_portal_home_path = source.default_portal_home_path,
    timezone = source.timezone,
    locale = source.locale,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    user_id,
    client_id,
    tenant_type,
    email,
    microsoft_oid,
    microsoft_tenant_id,
    microsoft_email,
    full_name,
    job_title,
    status,
    active,
    auth_mode,
    password_hash,
    password_hash_algorithm,
    default_portal_home_path,
    timezone,
    locale,
    avatar_url,
    last_login_at,
    last_login_provider,
    invited_at,
    invited_by_user_id,
    created_at,
    updated_at
  )
  VALUES (
    source.user_id,
    source.client_id,
    source.tenant_type,
    source.email,
    source.microsoft_oid,
    source.microsoft_tenant_id,
    source.microsoft_email,
    source.full_name,
    source.job_title,
    source.status,
    source.active,
    source.auth_mode,
    source.password_hash,
    source.password_hash_algorithm,
    source.default_portal_home_path,
    source.timezone,
    source.locale,
    source.avatar_url,
    source.last_login_at,
    source.last_login_provider,
    source.invited_at,
    source.invited_by_user_id,
    source.created_at,
    source.updated_at
  );

MERGE `efeonce-group.greenhouse.user_role_assignments` AS target
USING (
  SELECT
    'assignment-greenhouse-demo-client-executive' AS assignment_id,
    'user-greenhouse-demo-client-executive' AS user_id,
    'greenhouse-demo-client' AS client_id,
    'client_executive' AS role_code,
    'active' AS status,
    TRUE AS active,
    CURRENT_TIMESTAMP() AS effective_from,
    CAST(NULL AS TIMESTAMP) AS effective_to,
    'Bootstrap executive role for tenant demo access.' AS notes,
    CURRENT_TIMESTAMP() AS created_at,
    CURRENT_TIMESTAMP() AS updated_at
  UNION ALL
  SELECT
    'assignment-efeonce-admin-bootstrap',
    'user-efeonce-admin-bootstrap',
    CAST(NULL AS STRING),
    'efeonce_admin',
    'active',
    TRUE,
    CURRENT_TIMESTAMP(),
    CAST(NULL AS TIMESTAMP),
    'Bootstrap internal admin role for future admin routes.',
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
) AS source
ON target.assignment_id = source.assignment_id
WHEN MATCHED THEN
  UPDATE SET
    user_id = source.user_id,
    client_id = source.client_id,
    role_code = source.role_code,
    status = source.status,
    active = source.active,
    effective_from = source.effective_from,
    effective_to = source.effective_to,
    notes = source.notes,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    assignment_id,
    user_id,
    client_id,
    role_code,
    status,
    active,
    effective_from,
    effective_to,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    source.assignment_id,
    source.user_id,
    source.client_id,
    source.role_code,
    source.status,
    source.active,
    source.effective_from,
    source.effective_to,
    source.notes,
    source.created_at,
    source.updated_at
  );

MERGE `efeonce-group.greenhouse.user_project_scopes` AS target
USING (
  SELECT 'scope-demo-project-1' AS scope_id, 'user-greenhouse-demo-client-executive' AS user_id, 'greenhouse-demo-client' AS client_id, '2dc39c2f-efe7-803e-abcd-d74ff4a40940' AS project_id, 'executive_context' AS access_level, TRUE AS active, CURRENT_TIMESTAMP() AS created_at, CURRENT_TIMESTAMP() AS updated_at
  UNION ALL
  SELECT 'scope-demo-project-2', 'user-greenhouse-demo-client-executive', 'greenhouse-demo-client', '23339c2f-efe7-80e0-9331-e9d44054cb10', 'executive_context', TRUE, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
  UNION ALL
  SELECT 'scope-demo-project-3', 'user-greenhouse-demo-client-executive', 'greenhouse-demo-client', '30639c2f-efe7-80f7-975a-eff92a518fb2', 'executive_context', TRUE, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
  UNION ALL
  SELECT 'scope-demo-project-4', 'user-greenhouse-demo-client-executive', 'greenhouse-demo-client', '2dc39c2f-efe7-80d9-b209-ed222af4d7bf', 'executive_context', TRUE, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
) AS source
ON target.scope_id = source.scope_id
WHEN MATCHED THEN
  UPDATE SET
    user_id = source.user_id,
    client_id = source.client_id,
    project_id = source.project_id,
    access_level = source.access_level,
    active = source.active,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    scope_id,
    user_id,
    client_id,
    project_id,
    access_level,
    active,
    created_at,
    updated_at
  )
  VALUES (
    source.scope_id,
    source.user_id,
    source.client_id,
    source.project_id,
    source.access_level,
    source.active,
    source.created_at,
    source.updated_at
  );
