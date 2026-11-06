-- TASK-2094 synthetic dependency tables, NOT a deployment migration or a full schema replica.
-- session_360 and space_access_grants are loaded by the runner from their real migrations (Up section only).
CREATE SCHEMA greenhouse_core;
CREATE SCHEMA greenhouse_finance;
CREATE SCHEMA greenhouse_serving;
CREATE SCHEMA greenhouse_insights;
CREATE TABLE greenhouse_core.organizations (
  organization_id text PRIMARY KEY, public_id text, organization_name text, legal_name text,
  organization_type text DEFAULT 'client', hubspot_company_id text, active boolean DEFAULT true,
  is_operating_entity boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  commercial_party_id text DEFAULT 'synthetic-party', lifecycle_stage text DEFAULT 'active_client',
  lifecycle_stage_since timestamptz DEFAULT now(), lifecycle_stage_source text, lifecycle_stage_by text,
  is_dual_role boolean DEFAULT false, country text DEFAULT 'CL'
);
CREATE TABLE greenhouse_core.clients (
  client_id text PRIMARY KEY, client_name text, hubspot_company_id text, timezone text DEFAULT 'America/Santiago', active boolean DEFAULT true
);
CREATE TABLE greenhouse_core.spaces (
  space_id text PRIMARY KEY, public_id text, organization_id text REFERENCES greenhouse_core.organizations,
  client_id text REFERENCES greenhouse_core.clients, active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE greenhouse_core.client_users (
  user_id text PRIMARY KEY, public_id text, email text, full_name text, tenant_type text DEFAULT 'client',
  auth_mode text DEFAULT 'credentials', status text DEFAULT 'active', active boolean DEFAULT true,
  client_id text REFERENCES greenhouse_core.clients, identity_profile_id text, member_id text,
  microsoft_oid text, microsoft_tenant_id text, microsoft_email text, google_sub text, google_email text,
  avatar_url text, password_hash text, password_hash_algorithm text, timezone text, default_portal_home_path text,
  last_login_at timestamptz, last_login_provider text
);
CREATE TABLE greenhouse_core.person_memberships (
  membership_id text PRIMARY KEY, profile_id text, space_id text REFERENCES greenhouse_core.spaces,
  organization_id text REFERENCES greenhouse_core.organizations, active boolean DEFAULT true, is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE greenhouse_core.roles (role_code text PRIMARY KEY, route_group_scope text[]);
CREATE TABLE greenhouse_core.user_role_assignments (user_id text, role_code text, active boolean DEFAULT true, effective_to timestamptz);
CREATE TABLE greenhouse_core.client_feature_flags (client_id text, flag_code text, enabled boolean DEFAULT true);
CREATE TABLE greenhouse_core.service_modules (module_id text PRIMARY KEY, module_code text, business_line text);
-- Fixture of the upstream module projection, not a test of its producer.
CREATE TABLE greenhouse_core.v_client_active_modules (client_id text, module_id text, module_code text);
CREATE TABLE greenhouse_core.user_project_scopes (user_id text, project_id text, active boolean);
CREATE TABLE greenhouse_core.user_campaign_scopes (user_id text, campaign_id text, active boolean);
CREATE TABLE greenhouse_finance.client_profiles (
  client_profile_id text PRIMARY KEY, client_id text REFERENCES greenhouse_core.clients,
  organization_id text REFERENCES greenhouse_core.organizations, hubspot_company_id text, legal_name text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE greenhouse_core.services (
  service_id text PRIMARY KEY, hubspot_service_id text UNIQUE, name text, space_id text REFERENCES greenhouse_core.spaces,
  organization_id text REFERENCES greenhouse_core.organizations, hubspot_company_id text, hubspot_deal_id text,
  pipeline_stage text, status text, active boolean, engagement_kind text, unmapped_reason text,
  start_date date, target_end_date date, total_cost numeric, amount_paid numeric, currency text,
  linea_de_servicio text, servicio_especifico text, modalidad text, billing_frequency text, country text,
  notion_project_id text, hubspot_last_synced_at timestamptz, hubspot_sync_status text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE greenhouse_core.space_notion_sources (
  source_id text PRIMARY KEY, space_id text UNIQUE REFERENCES greenhouse_core.spaces,
  notion_db_proyectos text, notion_db_tareas text, notion_db_sprints text, notion_db_revisiones text,
  notion_workspace_id text, sync_enabled boolean DEFAULT true, sync_frequency text DEFAULT 'daily',
  last_synced_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), created_by text
);
-- Dependencies of the REAL snapshot table/trigger loaded from the foundation migration.
CREATE TABLE greenhouse_insights.insight_editions (edition_id text PRIMARY KEY);
CREATE TABLE greenhouse_insights.insight_retention_classes (retention_class text PRIMARY KEY);
INSERT INTO greenhouse_insights.insight_retention_classes VALUES ('evidence_snapshot');

-- TASK-2096: columns/tables the CURRENT session_360 migration reads (identity profile locale and
-- tenant/organization default locales). Synthetic shape, real names and types.
CREATE TABLE greenhouse_core.identity_profiles (profile_id text PRIMARY KEY, preferred_locale text);
ALTER TABLE greenhouse_core.clients ADD COLUMN default_locale text;
ALTER TABLE greenhouse_core.organizations ADD COLUMN default_locale text;
ALTER TABLE greenhouse_core.client_users ADD COLUMN locale text;
