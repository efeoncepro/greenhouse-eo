CREATE SCHEMA IF NOT EXISTS `efeonce-group.greenhouse`
OPTIONS(
  location = "US",
  description = "Greenhouse portal tenant configuration and app-owned tables"
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.clients` (
  client_id STRING NOT NULL OPTIONS(description = "Stable tenant identifier used in JWT and filters"),
  client_name STRING NOT NULL OPTIONS(description = "Tenant display name"),
  status STRING NOT NULL OPTIONS(description = "Tenant lifecycle status: onboarding, active, disabled"),
  active BOOL NOT NULL OPTIONS(description = "Quick auth gate for portal access"),
  primary_contact_email STRING OPTIONS(description = "Primary tenant contact email retained for metadata and bootstrap"),
  password_hash STRING OPTIONS(description = "Legacy auth column retained for backward compatibility; runtime auth reads greenhouse.client_users"),
  password_hash_algorithm STRING OPTIONS(description = "Legacy auth column retained for backward compatibility"),
  role STRING NOT NULL OPTIONS(description = "client or admin"),
  notion_project_ids ARRAY<STRING> OPTIONS(description = "Allowed Notion project ids for tenant scope"),
  hubspot_company_id STRING OPTIONS(description = "HubSpot company id linked to this tenant"),
  allowed_email_domains ARRAY<STRING> OPTIONS(description = "Optional domain allowlist"),
  feature_flags ARRAY<STRING> OPTIONS(description = "Enabled portal capabilities for this tenant"),
  timezone STRING OPTIONS(description = "Display timezone for portal metrics"),
  portal_home_path STRING OPTIONS(description = "Default route after login"),
  auth_mode STRING OPTIONS(description = "Legacy tenant-level auth marker retained for metadata and migration tracking"),
  notes STRING OPTIONS(description = "Operational notes for tenant setup"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Row creation time"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last config update"),
  last_login_at TIMESTAMP OPTIONS(description = "Last successful portal login")
)
OPTIONS(description = "Greenhouse tenants and their scope configuration");

MERGE `efeonce-group.greenhouse.clients` AS target
USING (
  SELECT
    'greenhouse-demo-client' AS client_id,
    'Greenhouse Demo' AS client_name,
    'active' AS status,
    TRUE AS active,
    'client.portal@efeonce.com' AS primary_contact_email,
    CAST(NULL AS STRING) AS password_hash,
    CAST(NULL AS STRING) AS password_hash_algorithm,
    'client' AS role,
    ['2dc39c2f-efe7-803e-abcd-d74ff4a40940', '23339c2f-efe7-80e0-9331-e9d44054cb10', '30639c2f-efe7-80f7-975a-eff92a518fb2', '2dc39c2f-efe7-80d9-b209-ed222af4d7bf'] AS notion_project_ids,
    CAST(NULL AS STRING) AS hubspot_company_id,
    ['efeonce.com'] AS allowed_email_domains,
    ['dashboard-kpis'] AS feature_flags,
    'America/Santiago' AS timezone,
    '/dashboard' AS portal_home_path,
    'credentials' AS auth_mode,
    'Bootstrap tenant for the Greenhouse portal MVP. Runtime auth now lives in greenhouse.client_users and scope tables.' AS notes,
    CURRENT_TIMESTAMP() AS created_at,
    CURRENT_TIMESTAMP() AS updated_at,
    CAST(NULL AS TIMESTAMP) AS last_login_at
) AS source
ON target.client_id = source.client_id
WHEN MATCHED THEN
  UPDATE SET
    client_name = source.client_name,
    status = source.status,
    active = source.active,
    primary_contact_email = source.primary_contact_email,
    role = source.role,
    notion_project_ids = source.notion_project_ids,
    allowed_email_domains = source.allowed_email_domains,
    feature_flags = source.feature_flags,
    timezone = source.timezone,
    portal_home_path = source.portal_home_path,
    auth_mode = source.auth_mode,
    notes = source.notes,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    client_id,
    client_name,
    status,
    active,
    primary_contact_email,
    password_hash,
    password_hash_algorithm,
    role,
    notion_project_ids,
    hubspot_company_id,
    allowed_email_domains,
    feature_flags,
    timezone,
    portal_home_path,
    auth_mode,
    notes,
    created_at,
    updated_at,
    last_login_at
  )
  VALUES (
    source.client_id,
    source.client_name,
    source.status,
    source.active,
    source.primary_contact_email,
    source.password_hash,
    source.password_hash_algorithm,
    source.role,
    source.notion_project_ids,
    source.hubspot_company_id,
    source.allowed_email_domains,
    source.feature_flags,
    source.timezone,
    source.portal_home_path,
    source.auth_mode,
    source.notes,
    source.created_at,
    source.updated_at,
    source.last_login_at
  );
