-- Schema Snapshot Baseline
-- Generated: 2026-04-01T08:39:28.759Z
-- Source: greenhouse-pg-dev / greenhouse_app
-- Purpose: Reference snapshot of existing schema state before node-pg-migrate adoption.

-- ============================================================
-- Schema: greenhouse_ai (7 tables)
-- ============================================================

CREATE TABLE greenhouse_ai.credit_ledger (
  ledger_id text NOT NULL,
  wallet_id text NOT NULL,
  request_id text,
  entry_type text NOT NULL,
  credit_amount integer NOT NULL,
  balance_before integer NOT NULL,
  balance_after integer NOT NULL,
  consumed_by_member_id text,
  client_id text,
  notion_task_id text,
  notion_project_id text,
  project_name text,
  asset_description text,
  unit_cost numeric,
  cost_currency text,
  total_cost numeric,
  total_cost_clp numeric,
  reload_reason text,
  reload_reference text,
  notes text,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_ai.credit_wallets (
  wallet_id text NOT NULL,
  wallet_name text NOT NULL,
  wallet_scope text NOT NULL,
  client_id text,
  tool_id text NOT NULL,
  credit_unit_name text NOT NULL,
  initial_balance integer NOT NULL,
  current_balance integer NOT NULL,
  reserved_balance integer NOT NULL DEFAULT 0,
  monthly_limit integer,
  monthly_consumed integer NOT NULL DEFAULT 0,
  monthly_reset_day integer NOT NULL DEFAULT 1,
  low_balance_threshold integer,
  valid_from date NOT NULL,
  valid_until date,
  wallet_status text NOT NULL DEFAULT 'active'::text,
  notes text,
  alert_sent boolean NOT NULL DEFAULT false,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_ai.member_tool_licenses (
  license_id text NOT NULL,
  member_id text NOT NULL,
  tool_id text NOT NULL,
  license_status text NOT NULL,
  activated_at date,
  expires_at date,
  access_level text,
  license_key text,
  account_email text,
  notes text,
  assigned_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_ai.nexa_feedback (
  feedback_id uuid NOT NULL DEFAULT gen_random_uuid(),
  response_id text NOT NULL,
  user_id text NOT NULL,
  client_id text NOT NULL,
  sentiment text NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_ai.nexa_messages (
  message_id text NOT NULL,
  thread_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  tool_invocations jsonb,
  suggestions ARRAY NOT NULL DEFAULT ARRAY[]::text[],
  model_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_ai.nexa_threads (
  thread_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  client_id text NOT NULL,
  title text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_ai.tool_catalog (
  tool_id text NOT NULL,
  tool_name text NOT NULL,
  provider_id text NOT NULL,
  vendor text,
  tool_category text NOT NULL,
  tool_subcategory text,
  cost_model text NOT NULL,
  subscription_amount numeric,
  subscription_currency text,
  subscription_billing_cycle text,
  subscription_seats integer,
  credit_unit_name text,
  credit_unit_cost numeric,
  credit_unit_currency text,
  credits_included_monthly integer,
  fin_supplier_id text,
  description text,
  website_url text,
  icon_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Schema: greenhouse_core (36 tables)
-- ============================================================

CREATE TABLE greenhouse_core.asset_access_log (
  access_log_id text NOT NULL,
  asset_id text NOT NULL,
  action text NOT NULL,
  actor_user_id text,
  occurred_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE greenhouse_core.assets (
  asset_id text NOT NULL,
  public_id text NOT NULL,
  visibility text NOT NULL,
  status text NOT NULL,
  bucket_name text NOT NULL,
  object_path text NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  retention_class text NOT NULL,
  owner_aggregate_type text NOT NULL,
  owner_aggregate_id text,
  owner_client_id text,
  owner_space_id text,
  owner_member_id text,
  uploaded_by_user_id text,
  attached_by_user_id text,
  deleted_by_user_id text,
  upload_source text NOT NULL DEFAULT 'user'::text,
  download_count integer NOT NULL DEFAULT 0,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uploaded_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attached_at timestamp with time zone,
  deleted_at timestamp with time zone,
  last_downloaded_at timestamp with time zone
);

CREATE TABLE greenhouse_core.audit_events (
  event_id text NOT NULL,
  event_type text NOT NULL,
  actor_user_id text,
  target_user_id text,
  target_client_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.auth_tokens (
  token_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text,
  email text NOT NULL,
  client_id text,
  token_type text NOT NULL,
  token_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  used_at timestamp with time zone
);

CREATE TABLE greenhouse_core.business_line_metadata (
  module_code text NOT NULL,
  label text NOT NULL,
  label_full text,
  claim text,
  loop_phase text,
  loop_phase_label text,
  lead_identity_profile_id text,
  lead_name text,
  color_hex text NOT NULL,
  color_bg text,
  icon_name text,
  hubspot_enum_value text NOT NULL,
  notion_label text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_core.campaign_project_links (
  campaign_project_link_id text NOT NULL,
  campaign_id text NOT NULL,
  space_id text NOT NULL,
  project_source_system text NOT NULL DEFAULT 'notion'::text,
  project_source_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.campaigns (
  campaign_id text NOT NULL,
  eo_id text NOT NULL,
  slug text NOT NULL,
  space_id text NOT NULL,
  display_name text NOT NULL,
  description text,
  campaign_type text NOT NULL DEFAULT 'campaign'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  planned_launch_date date,
  actual_launch_date date,
  owner_user_id text,
  created_by_user_id text,
  tags ARRAY NOT NULL DEFAULT '{}'::text[],
  channels ARRAY NOT NULL DEFAULT '{}'::text[],
  notes text,
  budget_clp numeric(14,2),
  currency text NOT NULL DEFAULT 'CLP'::text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.client_feature_flags (
  flag_id text NOT NULL,
  client_id text NOT NULL,
  flag_code text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.client_service_modules (
  assignment_id text NOT NULL,
  client_id text NOT NULL,
  module_id text NOT NULL,
  source_system text,
  source_reference text,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  assigned_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.client_team_assignments (
  assignment_id text NOT NULL,
  client_id text NOT NULL,
  member_id text NOT NULL,
  fte_allocation numeric(5,3) NOT NULL DEFAULT 0,
  hours_per_month integer,
  role_title_override text,
  active boolean NOT NULL DEFAULT true,
  start_date date,
  end_date date,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  contracted_hours_month integer,
  assignment_type text NOT NULL DEFAULT 'internal'::text
);

CREATE TABLE greenhouse_core.client_users (
  user_id text NOT NULL,
  public_id text,
  client_id text,
  identity_profile_id text,
  email text,
  full_name text,
  tenant_type text NOT NULL DEFAULT 'client'::text,
  auth_mode text,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  microsoft_oid text,
  microsoft_tenant_id text,
  microsoft_email text,
  google_sub text,
  google_email text,
  avatar_url text,
  password_hash text,
  password_hash_algorithm text,
  timezone text DEFAULT 'America/Santiago'::text,
  default_portal_home_path text,
  last_login_provider text,
  member_id text
);

CREATE TABLE greenhouse_core.clients (
  client_id text NOT NULL,
  public_id text,
  client_name text NOT NULL,
  legal_name text,
  tenant_type text NOT NULL DEFAULT 'client'::text,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  hubspot_company_id text,
  timezone text,
  country_code text,
  billing_currency text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.departments (
  department_id text NOT NULL,
  name text NOT NULL,
  description text,
  parent_department_id text,
  head_member_id text,
  business_unit text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.entity_source_links (
  link_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  source_system text NOT NULL,
  source_object_type text NOT NULL,
  source_object_id text NOT NULL,
  source_display_name text,
  is_primary boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.identity_profile_source_links (
  link_id text NOT NULL,
  profile_id text NOT NULL,
  source_system text NOT NULL,
  source_object_type text NOT NULL,
  source_object_id text NOT NULL,
  source_user_id text,
  source_email text,
  source_display_name text,
  is_primary boolean NOT NULL DEFAULT false,
  is_login_identity boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.identity_profiles (
  profile_id text NOT NULL,
  public_id text,
  profile_type text NOT NULL,
  canonical_email text,
  full_name text NOT NULL,
  job_title text,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  default_auth_mode text,
  primary_source_system text,
  primary_source_object_type text,
  primary_source_object_id text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  serial_number integer DEFAULT nextval('greenhouse_core.identity_profile_serial'::regclass)
);

CREATE TABLE greenhouse_core.members (
  member_id text NOT NULL,
  public_id text,
  identity_profile_id text,
  department_id text,
  reports_to_member_id text,
  display_name text NOT NULL,
  primary_email text,
  phone text,
  job_level text,
  employment_type text,
  hire_date date,
  contract_end_date date,
  daily_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_name text,
  last_name text,
  preferred_name text,
  legal_name text,
  birth_date date,
  biography text,
  avatar_url text,
  role_title text,
  role_category text,
  org_role_id text,
  profession_id text,
  seniority_level text,
  location_city text,
  location_country text,
  time_zone text,
  email_aliases ARRAY,
  contact_channel text,
  contact_handle text,
  relevance_note text,
  azure_oid text,
  notion_user_id text,
  notion_display_name text,
  hubspot_owner_id text,
  teams_user_id text,
  slack_user_id text,
  years_experience numeric(4,1),
  efeonce_start_date date,
  languages ARRAY,
  assignable boolean NOT NULL DEFAULT true,
  prior_work_years numeric(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE greenhouse_core.notion_workspace_source_bindings (
  binding_id text NOT NULL,
  space_id text NOT NULL,
  source_system text NOT NULL,
  source_object_type text NOT NULL,
  source_object_id text NOT NULL,
  binding_role text NOT NULL,
  source_display_name text,
  is_primary boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.notion_workspaces (
  space_id text NOT NULL,
  public_id text,
  client_id text,
  space_name text NOT NULL,
  space_type text NOT NULL DEFAULT 'client_space'::text,
  primary_project_database_source_id text,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.organizations (
  organization_id text NOT NULL,
  public_id text,
  organization_name text NOT NULL,
  legal_name text,
  tax_id text,
  tax_id_type text,
  industry text,
  country text DEFAULT 'CL'::text,
  hubspot_company_id text,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  organization_type text DEFAULT 'other'::text,
  legal_address text,
  is_operating_entity boolean NOT NULL DEFAULT false
);

CREATE TABLE greenhouse_core.person_memberships (
  membership_id text NOT NULL,
  public_id text,
  profile_id text NOT NULL,
  organization_id text,
  space_id text,
  membership_type text NOT NULL DEFAULT 'team_member'::text,
  role_label text,
  department text,
  start_date date,
  end_date date,
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.providers (
  provider_id text NOT NULL,
  public_id text,
  provider_name text NOT NULL,
  legal_name text,
  provider_type text,
  website_url text,
  primary_email text,
  primary_contact_name text,
  country_code text,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.role_view_assignments (
  role_code text NOT NULL,
  view_code text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  granted_by text,
  granted_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text
);

CREATE TABLE greenhouse_core.roles (
  role_code text NOT NULL,
  role_name text NOT NULL,
  role_family text,
  description text,
  tenant_type text,
  is_admin boolean NOT NULL DEFAULT false,
  is_internal boolean NOT NULL DEFAULT false,
  route_group_scope ARRAY NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.service_history (
  history_id text NOT NULL,
  service_id text NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  changed_by text,
  changed_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.service_modules (
  module_id text NOT NULL,
  module_code text NOT NULL,
  module_name text NOT NULL,
  business_line text,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  module_kind text,
  parent_module_code text
);

CREATE TABLE greenhouse_core.services (
  service_id text NOT NULL,
  public_id text,
  hubspot_service_id text,
  name text NOT NULL,
  space_id text NOT NULL,
  organization_id text,
  hubspot_company_id text,
  hubspot_deal_id text,
  pipeline_stage text NOT NULL DEFAULT 'onboarding'::text,
  start_date date,
  target_end_date date,
  total_cost numeric(14,2),
  amount_paid numeric(14,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'CLP'::text,
  linea_de_servicio text NOT NULL,
  servicio_especifico text NOT NULL,
  modalidad text DEFAULT 'continua'::text,
  billing_frequency text DEFAULT 'monthly'::text,
  country text DEFAULT 'CL'::text,
  notion_project_id text,
  hubspot_last_synced_at timestamp with time zone,
  hubspot_sync_status text DEFAULT 'pending'::text,
  active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active'::text,
  created_by text,
  updated_by text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.space_notion_sources (
  source_id text NOT NULL,
  space_id text NOT NULL,
  notion_db_proyectos character varying(32) NOT NULL,
  notion_db_tareas character varying(32) NOT NULL,
  notion_db_sprints character varying(32),
  notion_db_revisiones character varying(32),
  notion_workspace_id character varying(36),
  sync_enabled boolean NOT NULL DEFAULT true,
  sync_frequency character varying(20) NOT NULL DEFAULT 'daily'::character varying,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by character varying(100)
);

CREATE TABLE greenhouse_core.spaces (
  space_id text NOT NULL,
  public_id text,
  organization_id text,
  client_id text,
  space_name text NOT NULL,
  space_type text NOT NULL DEFAULT 'client_space'::text,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.user_campaign_scopes (
  scope_id text NOT NULL,
  user_id text NOT NULL,
  campaign_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.user_client_scopes (
  scope_id text NOT NULL,
  user_id text NOT NULL,
  client_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.user_project_scopes (
  scope_id text NOT NULL,
  user_id text NOT NULL,
  project_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.user_role_assignments (
  assignment_id text NOT NULL,
  user_id text NOT NULL,
  role_code text NOT NULL,
  client_id text,
  scope_level text,
  project_id text,
  campaign_id text,
  status text NOT NULL DEFAULT 'active'::text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  effective_to timestamp with time zone,
  assigned_by_user_id text
);

CREATE TABLE greenhouse_core.user_view_overrides (
  user_id text NOT NULL,
  view_code text NOT NULL,
  override_type text NOT NULL,
  reason text,
  expires_at timestamp with time zone,
  granted_by text NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.view_access_log (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target_role text,
  target_user text,
  view_code text NOT NULL,
  performed_by text NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_core.view_registry (
  view_code text NOT NULL,
  section text NOT NULL,
  label text NOT NULL,
  description text,
  route_group text NOT NULL,
  route_path text NOT NULL,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  parent_view_code text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text
);

-- ============================================================
-- Schema: greenhouse_cost_intelligence (2 tables)
-- ============================================================

CREATE TABLE greenhouse_cost_intelligence.period_closure_config (
  config_id text NOT NULL,
  require_payroll_exported boolean NOT NULL DEFAULT true,
  require_income_recorded boolean NOT NULL DEFAULT true,
  require_expenses_recorded boolean NOT NULL DEFAULT true,
  require_bank_reconciled boolean NOT NULL DEFAULT false,
  require_fx_locked boolean NOT NULL DEFAULT true,
  margin_alert_threshold_pct numeric(5,2) NOT NULL DEFAULT 15.00,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text
);

CREATE TABLE greenhouse_cost_intelligence.period_closures (
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  closure_status text NOT NULL DEFAULT 'open'::text,
  payroll_status text NOT NULL DEFAULT 'pending'::text,
  income_status text NOT NULL DEFAULT 'pending'::text,
  expense_status text NOT NULL DEFAULT 'pending'::text,
  reconciliation_status text NOT NULL DEFAULT 'not_required'::text,
  fx_status text NOT NULL DEFAULT 'pending'::text,
  readiness_pct integer NOT NULL DEFAULT 0,
  closed_at timestamp with time zone,
  closed_by text,
  reopened_at timestamp with time zone,
  reopened_by text,
  reopened_reason text,
  snapshot_revision integer NOT NULL DEFAULT 1,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Schema: greenhouse_crm (3 tables)
-- ============================================================

CREATE TABLE greenhouse_crm.companies (
  company_record_id text NOT NULL,
  client_id text,
  hubspot_company_id text NOT NULL,
  company_name text NOT NULL,
  legal_name text,
  owner_user_id text,
  lifecycle_stage text,
  industry text,
  country_code text,
  website_url text,
  active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  source_updated_at timestamp with time zone,
  synced_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id text,
  payload_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  owner_member_id text
);

CREATE TABLE greenhouse_crm.contacts (
  contact_record_id text NOT NULL,
  client_id text,
  company_record_id text,
  linked_user_id text,
  linked_identity_profile_id text,
  hubspot_contact_id text NOT NULL,
  hubspot_primary_company_id text,
  hubspot_associated_company_ids ARRAY NOT NULL DEFAULT ARRAY[]::text[],
  email text,
  first_name text,
  last_name text,
  display_name text NOT NULL,
  job_title text,
  phone text,
  mobile_phone text,
  lifecycle_stage text,
  lead_status text,
  owner_user_id text,
  active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  source_updated_at timestamp with time zone,
  synced_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id text,
  payload_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  owner_member_id text
);

CREATE TABLE greenhouse_crm.deals (
  deal_record_id text NOT NULL,
  client_id text,
  company_record_id text,
  module_id text,
  hubspot_deal_id text NOT NULL,
  hubspot_company_id text,
  deal_name text NOT NULL,
  pipeline_id text,
  stage_id text,
  stage_name text,
  amount numeric(14,2),
  currency text,
  close_date date,
  owner_user_id text,
  is_closed_won boolean NOT NULL DEFAULT false,
  is_closed_lost boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  source_updated_at timestamp with time zone,
  synced_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id text,
  payload_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  owner_member_id text
);

-- ============================================================
-- Schema: greenhouse_delivery (7 tables)
-- ============================================================

CREATE TABLE greenhouse_delivery.projects (
  project_record_id text NOT NULL,
  client_id text,
  module_id text,
  notion_project_id text NOT NULL,
  project_name text NOT NULL,
  project_status text,
  project_phase text,
  owner_member_id text,
  start_date date,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  source_updated_at timestamp with time zone,
  synced_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id text,
  payload_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  project_database_source_id text,
  space_id text,
  project_summary text,
  page_url text,
  completion_label text,
  on_time_pct_source numeric(6,2),
  avg_rpa_source numeric(10,2)
);

CREATE TABLE greenhouse_delivery.space_property_mappings (
  id text NOT NULL,
  space_id text NOT NULL,
  notion_property_name text NOT NULL,
  conformed_field_name text NOT NULL,
  notion_type text NOT NULL,
  target_type text NOT NULL,
  coercion_rule text NOT NULL DEFAULT 'direct'::text,
  is_required boolean NOT NULL DEFAULT false,
  fallback_value text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text
);

CREATE TABLE greenhouse_delivery.sprints (
  sprint_record_id text NOT NULL,
  project_record_id text,
  notion_sprint_id text NOT NULL,
  sprint_name text NOT NULL,
  sprint_status text,
  start_date date,
  end_date date,
  is_deleted boolean NOT NULL DEFAULT false,
  source_updated_at timestamp with time zone,
  synced_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id text,
  payload_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  project_database_source_id text,
  space_id text,
  page_url text,
  completed_tasks_count integer,
  total_tasks_count integer,
  completion_pct_source numeric(6,2)
);

CREATE TABLE greenhouse_delivery.staff_aug_events (
  staff_aug_event_id text NOT NULL,
  placement_id text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_delivery.staff_aug_onboarding_items (
  onboarding_item_id text NOT NULL,
  placement_id text NOT NULL,
  item_key text NOT NULL,
  item_label text NOT NULL,
  category text NOT NULL DEFAULT 'general'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  sort_order integer NOT NULL DEFAULT 0,
  blocker_note text,
  verified_at timestamp with time zone,
  verified_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_delivery.staff_aug_placements (
  placement_id text NOT NULL,
  public_id text,
  assignment_id text NOT NULL,
  client_id text NOT NULL,
  space_id text,
  organization_id text,
  member_id text NOT NULL,
  provider_id text,
  service_module_assignment_id text,
  business_unit text NOT NULL,
  status text NOT NULL DEFAULT 'pipeline'::text,
  lifecycle_stage text NOT NULL DEFAULT 'draft'::text,
  provider_relationship_type text NOT NULL DEFAULT 'direct'::text,
  pay_regime_snapshot text,
  contract_type_snapshot text,
  compensation_version_id_snapshot text,
  cost_rate_amount numeric(14,2),
  cost_rate_currency text,
  cost_rate_source text NOT NULL DEFAULT 'payroll_snapshot'::text,
  billing_rate_amount numeric(14,2),
  billing_rate_currency text NOT NULL DEFAULT 'USD'::text,
  billing_frequency text NOT NULL DEFAULT 'monthly'::text,
  external_contract_ref text,
  legal_entity text,
  contractor_country text,
  client_reporting_to text,
  client_communication_channel text,
  client_tools ARRAY NOT NULL DEFAULT ARRAY[]::text[],
  required_skills ARRAY NOT NULL DEFAULT ARRAY[]::text[],
  matched_skills ARRAY NOT NULL DEFAULT ARRAY[]::text[],
  placement_notes text,
  contract_start_date date,
  contract_end_date date,
  actual_end_date date,
  renewal_alert_days integer NOT NULL DEFAULT 60,
  sla_availability_percent numeric(5,2),
  sla_response_hours integer,
  sla_notice_period_days integer NOT NULL DEFAULT 30,
  latest_snapshot_id text,
  created_by_user_id text,
  updated_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_delivery.tasks (
  task_record_id text NOT NULL,
  project_record_id text,
  sprint_record_id text,
  client_id text,
  module_id text,
  assignee_member_id text,
  notion_task_id text NOT NULL,
  notion_project_id text,
  notion_sprint_id text,
  task_name text NOT NULL,
  task_status text,
  task_phase text,
  task_priority text,
  due_date date,
  completed_at timestamp with time zone,
  estimated_hours numeric(10,2),
  is_deleted boolean NOT NULL DEFAULT false,
  source_updated_at timestamp with time zone,
  synced_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id text,
  payload_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  project_database_source_id text,
  space_id text,
  delivery_compliance text,
  days_late integer,
  is_rescheduled boolean NOT NULL DEFAULT false,
  performance_indicator_label text,
  performance_indicator_code text,
  client_change_round_final integer,
  rpa_value numeric(10,2),
  frame_versions integer,
  frame_comments integer,
  open_frame_comments integer,
  client_review_open boolean NOT NULL DEFAULT false,
  workflow_review_open boolean NOT NULL DEFAULT false,
  blocker_count integer,
  last_frame_comment text,
  page_url text,
  completion_label text,
  rescheduled_days integer,
  client_change_round_label text,
  rpa_semaphore_source text,
  original_due_date date,
  execution_time_label text,
  changes_time_label text,
  review_time_label text,
  workflow_change_round integer
);

-- ============================================================
-- Schema: greenhouse_finance (18 tables)
-- ============================================================

CREATE TABLE greenhouse_finance.accounts (
  account_id text NOT NULL,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text,
  account_number_full text,
  currency text NOT NULL,
  account_type text NOT NULL,
  country_code text NOT NULL DEFAULT 'CL'::text,
  is_active boolean NOT NULL DEFAULT true,
  opening_balance numeric NOT NULL DEFAULT 0,
  opening_balance_date date,
  notes text,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_finance.bank_statement_rows (
  row_id text NOT NULL,
  period_id text NOT NULL,
  transaction_date date NOT NULL,
  value_date date,
  description text NOT NULL,
  reference text,
  amount numeric(14,2) NOT NULL,
  balance numeric(14,2),
  match_status text NOT NULL DEFAULT 'unmatched'::text,
  matched_type text,
  matched_id text,
  matched_payment_id text,
  match_confidence numeric(5,2),
  notes text,
  matched_by_user_id text,
  matched_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_finance.client_economics (
  snapshot_id text NOT NULL,
  client_id text NOT NULL,
  client_name text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  total_revenue_clp numeric(14,2) DEFAULT 0,
  direct_costs_clp numeric(14,2) DEFAULT 0,
  indirect_costs_clp numeric(14,2) DEFAULT 0,
  gross_margin_clp numeric(14,2) DEFAULT 0,
  gross_margin_percent numeric(6,4),
  net_margin_clp numeric(14,2) DEFAULT 0,
  net_margin_percent numeric(6,4),
  headcount_fte numeric(6,2),
  revenue_per_fte numeric(14,2),
  cost_per_fte numeric(14,2),
  notes text,
  computed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_finance.client_profiles (
  client_profile_id text NOT NULL,
  client_id text,
  hubspot_company_id text,
  tax_id text,
  tax_id_type text,
  legal_name text,
  billing_address text,
  billing_country text,
  payment_terms_days integer DEFAULT 30,
  payment_currency text DEFAULT 'CLP'::text,
  requires_po boolean NOT NULL DEFAULT false,
  requires_hes boolean NOT NULL DEFAULT false,
  current_po_number text,
  current_hes_number text,
  finance_contacts jsonb,
  special_conditions text,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  organization_id text
);

CREATE TABLE greenhouse_finance.cost_allocations (
  allocation_id text NOT NULL,
  expense_id text NOT NULL,
  client_id text NOT NULL,
  client_name text NOT NULL,
  allocation_percent numeric(6,4) NOT NULL,
  allocated_amount_clp numeric(14,2) NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  allocation_method text NOT NULL DEFAULT 'manual'::text,
  notes text,
  created_by_user_id text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_finance.economic_indicators (
  indicator_id text NOT NULL,
  indicator_code text NOT NULL,
  indicator_date date NOT NULL,
  value numeric NOT NULL,
  source text,
  unit text,
  frequency text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_finance.exchange_rates (
  rate_id text NOT NULL,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL,
  rate_date date NOT NULL,
  source text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_finance.expenses (
  expense_id text NOT NULL,
  client_id text,
  expense_type text NOT NULL,
  description text NOT NULL,
  currency text NOT NULL,
  subtotal numeric(14,2) NOT NULL,
  tax_rate numeric(6,4),
  tax_amount numeric(14,2),
  total_amount numeric(14,2) NOT NULL,
  exchange_rate_to_clp numeric(14,6),
  total_amount_clp numeric(14,2) NOT NULL,
  payment_date date,
  payment_status text NOT NULL DEFAULT 'pending'::text,
  payment_method text,
  payment_account_id text,
  payment_reference text,
  document_number text,
  document_date date,
  due_date date,
  supplier_id text,
  supplier_name text,
  supplier_invoice_number text,
  payroll_period_id text,
  payroll_entry_id text,
  member_id text,
  member_name text,
  social_security_type text,
  social_security_institution text,
  social_security_period text,
  tax_type text,
  tax_period text,
  tax_form_number text,
  miscellaneous_category text,
  service_line text,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_frequency text,
  is_reconciled boolean NOT NULL DEFAULT false,
  reconciliation_id text,
  linked_income_id text,
  notes text,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cost_category text DEFAULT 'operational'::text,
  cost_is_direct boolean DEFAULT false,
  allocated_client_id text,
  nubox_purchase_id bigint,
  nubox_document_status text,
  nubox_supplier_rut text,
  nubox_supplier_name text,
  nubox_origin text,
  nubox_last_synced_at timestamp with time zone,
  direct_overhead_scope text DEFAULT 'none'::text,
  direct_overhead_kind text,
  direct_overhead_member_id text,
  is_annulled boolean DEFAULT false,
  sii_document_status text,
  receipt_date date,
  purchase_type text,
  balance_nubox numeric,
  vat_unrecoverable_amount numeric,
  vat_fixed_assets_amount numeric,
  vat_common_use_amount numeric,
  nubox_pdf_url text,
  dte_type_code text,
  dte_folio text,
  exempt_amount numeric,
  other_taxes_amount numeric,
  withholding_amount numeric,
  period_year integer,
  period_month integer,
  space_id text,
  source_type text,
  payment_provider text,
  payment_rail text
);

CREATE TABLE greenhouse_finance.factoring_operations (
  operation_id text NOT NULL,
  income_id text NOT NULL,
  factoring_provider_id text NOT NULL,
  nominal_amount numeric(14,2) NOT NULL,
  advance_amount numeric(14,2) NOT NULL,
  fee_amount numeric(14,2) NOT NULL,
  fee_rate numeric(6,4) NOT NULL,
  operation_date date NOT NULL,
  settlement_date date,
  status text NOT NULL DEFAULT 'active'::text,
  linked_expense_id text,
  linked_payment_id text,
  notes text,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_finance.income (
  income_id text NOT NULL,
  client_id text,
  client_profile_id text,
  hubspot_company_id text,
  hubspot_deal_id text,
  client_name text NOT NULL,
  invoice_number text,
  invoice_date date NOT NULL,
  due_date date,
  description text,
  currency text NOT NULL,
  subtotal numeric(14,2) NOT NULL,
  tax_rate numeric(6,4),
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL,
  exchange_rate_to_clp numeric(14,6),
  total_amount_clp numeric(14,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending'::text,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  collection_method text DEFAULT 'direct'::text,
  po_number text,
  hes_number text,
  service_line text,
  income_type text DEFAULT 'service_fee'::text,
  is_reconciled boolean NOT NULL DEFAULT false,
  reconciliation_id text,
  notes text,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  partner_id text,
  partner_name text,
  partner_share_percent numeric(6,4),
  partner_share_amount numeric(14,2),
  net_after_partner numeric(14,2),
  nubox_document_id bigint,
  nubox_sii_track_id bigint,
  nubox_emission_status text,
  dte_type_code text,
  dte_folio text,
  nubox_emitted_at timestamp with time zone,
  nubox_last_synced_at timestamp with time zone,
  organization_id text,
  referenced_income_id text,
  is_annulled boolean DEFAULT false,
  dte_type_abbreviation text,
  dte_type_name text,
  exempt_amount numeric,
  other_taxes_amount numeric,
  withholding_amount numeric,
  balance_nubox numeric,
  payment_form text,
  payment_form_name text,
  origin text,
  period_year integer,
  period_month integer,
  nubox_pdf_url text,
  nubox_xml_url text,
  nubox_details_url text,
  nubox_references_url text,
  client_main_activity text,
  purchase_order_id text,
  hes_id text
);

CREATE TABLE greenhouse_finance.income_line_items (
  line_item_id text NOT NULL,
  income_id text NOT NULL,
  line_number integer NOT NULL,
  description text,
  quantity numeric,
  unit_price numeric,
  total_amount numeric,
  discount_percent numeric,
  is_exempt boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE greenhouse_finance.income_payments (
  payment_id text NOT NULL,
  income_id text NOT NULL,
  payment_date date,
  amount numeric(14,2) NOT NULL,
  currency text,
  reference text,
  payment_method text,
  payment_account_id text,
  payment_source text NOT NULL DEFAULT 'client_direct'::text,
  notes text,
  recorded_by_user_id text,
  recorded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_reconciled boolean NOT NULL DEFAULT false,
  reconciliation_row_id text,
  reconciled_at timestamp with time zone,
  reconciled_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_finance.nubox_emission_log (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  income_id text NOT NULL,
  idempotence_id uuid NOT NULL,
  request_payload jsonb NOT NULL,
  response_status integer,
  response_body jsonb,
  nubox_document_id bigint,
  emission_status text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE greenhouse_finance.purchase_orders (
  po_id text NOT NULL,
  po_number text NOT NULL,
  client_id text NOT NULL,
  organization_id text,
  space_id text,
  authorized_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'CLP'::text,
  exchange_rate_to_clp numeric DEFAULT 1,
  authorized_amount_clp numeric NOT NULL,
  invoiced_amount_clp numeric DEFAULT 0,
  remaining_amount_clp numeric,
  invoice_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active'::text,
  issue_date date NOT NULL,
  expiry_date date,
  received_at timestamp with time zone DEFAULT now(),
  description text,
  service_scope text,
  contact_name text,
  contact_email text,
  notes text,
  attachment_url text,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  attachment_asset_id text
);

CREATE TABLE greenhouse_finance.quotes (
  quote_id text NOT NULL,
  client_id text,
  organization_id text,
  client_name text,
  quote_number text,
  quote_date date,
  due_date date,
  description text,
  currency text NOT NULL DEFAULT 'CLP'::text,
  subtotal numeric,
  tax_rate numeric DEFAULT 0.19,
  tax_amount numeric,
  total_amount numeric,
  exchange_rate_to_clp numeric DEFAULT 1,
  total_amount_clp numeric,
  status text DEFAULT 'sent'::text,
  converted_to_income_id text,
  expiry_date date,
  nubox_document_id text,
  nubox_sii_track_id text,
  nubox_emission_status text,
  dte_type_code text DEFAULT '52'::text,
  dte_folio text,
  nubox_emitted_at timestamp with time zone,
  nubox_last_synced_at timestamp with time zone,
  notes text,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE greenhouse_finance.reconciliation_periods (
  period_id text NOT NULL,
  account_id text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  opening_balance numeric(14,2) NOT NULL,
  closing_balance_bank numeric(14,2),
  closing_balance_system numeric(14,2),
  difference numeric(14,2),
  status text NOT NULL DEFAULT 'draft'::text,
  statement_imported boolean NOT NULL DEFAULT false,
  statement_imported_at timestamp with time zone,
  statement_row_count integer,
  reconciled_by_user_id text,
  reconciled_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_finance.service_entry_sheets (
  hes_id text NOT NULL,
  hes_number text NOT NULL,
  purchase_order_id text,
  client_id text NOT NULL,
  organization_id text,
  space_id text,
  service_description text NOT NULL,
  service_period_start date,
  service_period_end date,
  deliverables_summary text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'CLP'::text,
  amount_clp numeric NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by text,
  rejection_reason text,
  income_id text,
  invoiced boolean DEFAULT false,
  client_contact_name text,
  client_contact_email text,
  attachment_url text,
  notes text,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE greenhouse_finance.suppliers (
  supplier_id text NOT NULL,
  provider_id text,
  legal_name text NOT NULL,
  trade_name text,
  tax_id text,
  tax_id_type text,
  country_code text NOT NULL DEFAULT 'CL'::text,
  category text NOT NULL,
  service_type text,
  is_international boolean NOT NULL DEFAULT false,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  website_url text,
  bank_name text,
  bank_account_number text,
  bank_account_type text,
  bank_routing text,
  payment_currency text NOT NULL DEFAULT 'CLP'::text,
  default_payment_terms integer NOT NULL DEFAULT 30,
  default_payment_method text,
  requires_po boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  organization_id text
);

-- ============================================================
-- Schema: greenhouse_hr (5 tables)
-- ============================================================

CREATE TABLE greenhouse_hr.leave_balances (
  balance_id text NOT NULL,
  member_id text NOT NULL,
  leave_type_code text NOT NULL,
  year integer NOT NULL,
  allowance_days numeric(10,2) NOT NULL DEFAULT 0,
  carried_over_days numeric(10,2) NOT NULL DEFAULT 0,
  used_days numeric(10,2) NOT NULL DEFAULT 0,
  reserved_days numeric(10,2) NOT NULL DEFAULT 0,
  updated_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  progressive_extra_days numeric(10,2) NOT NULL DEFAULT 0,
  adjustment_days numeric(10,2) NOT NULL DEFAULT 0,
  accumulated_periods numeric(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE greenhouse_hr.leave_policies (
  policy_id text NOT NULL,
  leave_type_code text NOT NULL,
  policy_name text NOT NULL,
  accrual_type text NOT NULL DEFAULT 'annual_fixed'::text,
  annual_days numeric(10,2) NOT NULL DEFAULT 0,
  max_carry_over_days numeric(10,2) NOT NULL DEFAULT 0,
  requires_approval boolean NOT NULL DEFAULT true,
  min_advance_days integer NOT NULL DEFAULT 0,
  max_consecutive_days numeric(10,2),
  min_continuous_days numeric(10,2),
  max_accumulation_periods numeric(10,2),
  progressive_enabled boolean NOT NULL DEFAULT false,
  progressive_base_years integer NOT NULL DEFAULT 10,
  progressive_interval_years integer NOT NULL DEFAULT 3,
  progressive_max_extra_days integer NOT NULL DEFAULT 10,
  applicable_employment_types ARRAY NOT NULL DEFAULT '{}'::text[],
  applicable_pay_regimes ARRAY NOT NULL DEFAULT '{}'::text[],
  allow_negative_balance boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_hr.leave_request_actions (
  action_id text NOT NULL,
  request_id text NOT NULL,
  action text NOT NULL,
  actor_user_id text,
  actor_member_id text,
  actor_name text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_hr.leave_requests (
  request_id text NOT NULL,
  member_id text NOT NULL,
  leave_type_code text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  requested_days numeric(10,2) NOT NULL,
  status text NOT NULL,
  reason text,
  attachment_url text,
  supervisor_member_id text,
  hr_reviewer_user_id text,
  decided_at timestamp with time zone,
  decided_by text,
  notes text,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attachment_asset_id text
);

CREATE TABLE greenhouse_hr.leave_types (
  leave_type_code text NOT NULL,
  leave_type_name text NOT NULL,
  description text,
  default_annual_allowance_days numeric(10,2) NOT NULL DEFAULT 0,
  requires_attachment boolean NOT NULL DEFAULT false,
  is_paid boolean NOT NULL DEFAULT true,
  color_token text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Schema: greenhouse_notifications (5 tables)
-- ============================================================

CREATE TABLE greenhouse_notifications.email_deliveries (
  delivery_id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  email_type text NOT NULL,
  domain text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  recipient_user_id text,
  subject text NOT NULL,
  resend_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  has_attachments boolean NOT NULL DEFAULT false,
  delivery_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_event_id text,
  source_entity text,
  actor_email text,
  error_message text,
  attempt_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_notifications.email_subscriptions (
  subscription_id uuid NOT NULL DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  recipient_user_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_notifications.notification_log (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  notification_id uuid,
  user_id text NOT NULL,
  category text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL,
  skip_reason text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE greenhouse_notifications.notification_preferences (
  preference_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  category text NOT NULL,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  muted_until timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_notifications.notifications (
  notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  space_id text,
  category text NOT NULL,
  title text NOT NULL,
  body text,
  action_url text,
  icon text,
  metadata jsonb DEFAULT '{}'::jsonb,
  read_at timestamp with time zone,
  archived_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'unread'::text,
  channel text DEFAULT 'in_app'::text
);

-- ============================================================
-- Schema: greenhouse_payroll (12 tables)
-- ============================================================

CREATE TABLE greenhouse_payroll.attendance_monthly_snapshot (
  member_id text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  working_days integer NOT NULL DEFAULT 0,
  days_present integer NOT NULL DEFAULT 0,
  days_absent integer NOT NULL DEFAULT 0,
  days_on_leave integer NOT NULL DEFAULT 0,
  days_on_unpaid_leave integer NOT NULL DEFAULT 0,
  days_holiday integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'hybrid'::text,
  snapshot_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_payroll.chile_afp_rates (
  afp_rate_id text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  afp_name text NOT NULL,
  total_rate numeric(6,4) NOT NULL,
  source text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_payroll.chile_previred_indicators (
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  imm_clp numeric(14,2),
  sis_rate numeric(6,4),
  tope_afp_uf numeric(10,4),
  tope_cesantia_uf numeric(10,4),
  source text,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_payroll.chile_tax_brackets (
  bracket_id text NOT NULL,
  tax_table_version text NOT NULL,
  bracket_order integer NOT NULL,
  from_utm numeric(10,4) NOT NULL,
  to_utm numeric(10,4),
  rate numeric(6,4) NOT NULL,
  deduction_utm numeric(10,4) NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_payroll.compensation_versions (
  version_id text NOT NULL,
  member_id text NOT NULL,
  version integer NOT NULL,
  pay_regime text NOT NULL,
  currency text NOT NULL,
  base_salary numeric(14,2) NOT NULL,
  remote_allowance numeric(14,2) NOT NULL DEFAULT 0,
  bonus_otd_min numeric(14,2) NOT NULL DEFAULT 0,
  bonus_otd_max numeric(14,2) NOT NULL DEFAULT 0,
  bonus_rpa_min numeric(14,2) NOT NULL DEFAULT 0,
  bonus_rpa_max numeric(14,2) NOT NULL DEFAULT 0,
  afp_name text,
  afp_rate numeric(6,4),
  health_system text,
  health_plan_uf numeric(10,4),
  unemployment_rate numeric(6,4),
  contract_type text NOT NULL DEFAULT 'indefinido'::text,
  has_apv boolean NOT NULL DEFAULT false,
  apv_amount numeric(14,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  is_current boolean NOT NULL DEFAULT false,
  change_reason text,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fixed_bonus_label text,
  fixed_bonus_amount numeric(14,2) NOT NULL DEFAULT 0,
  gratificacion_legal_mode text NOT NULL DEFAULT 'ninguna'::text,
  colacion_amount numeric(14,2) NOT NULL DEFAULT 0,
  movilizacion_amount numeric(14,2) NOT NULL DEFAULT 0,
  afp_cotizacion_rate numeric(6,4),
  afp_comision_rate numeric(6,4),
  desired_net_clp numeric(14,2)
);

CREATE TABLE greenhouse_payroll.payroll_bonus_config (
  config_id text NOT NULL,
  otd_threshold numeric(6,2) NOT NULL,
  rpa_threshold numeric(6,2) NOT NULL,
  effective_from date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  otd_floor numeric(6,2) NOT NULL DEFAULT 70,
  rpa_full_payout_threshold numeric(6,2) NOT NULL DEFAULT 1.70,
  rpa_soft_band_end numeric(6,2) NOT NULL DEFAULT 2.00,
  rpa_soft_band_floor_factor numeric(6,4) NOT NULL DEFAULT 0.8000
);

CREATE TABLE greenhouse_payroll.payroll_entries (
  entry_id text NOT NULL,
  period_id text NOT NULL,
  member_id text NOT NULL,
  compensation_version_id text NOT NULL,
  pay_regime text NOT NULL,
  currency text NOT NULL,
  base_salary numeric(14,2) NOT NULL,
  remote_allowance numeric(14,2) NOT NULL DEFAULT 0,
  member_display_name text,
  kpi_otd_percent numeric(6,2),
  kpi_rpa_avg numeric(6,2),
  kpi_otd_qualifies boolean,
  kpi_rpa_qualifies boolean,
  kpi_tasks_completed integer,
  kpi_data_source text DEFAULT 'notion_ops'::text,
  bonus_otd_amount numeric(14,2) NOT NULL DEFAULT 0,
  bonus_rpa_amount numeric(14,2) NOT NULL DEFAULT 0,
  bonus_other_amount numeric(14,2) NOT NULL DEFAULT 0,
  bonus_other_description text,
  gross_total numeric(14,2) NOT NULL,
  chile_afp_name text,
  chile_afp_rate numeric(6,4),
  chile_afp_amount numeric(14,2),
  chile_health_system text,
  chile_health_amount numeric(14,2),
  chile_unemployment_rate numeric(6,4),
  chile_unemployment_amount numeric(14,2),
  chile_taxable_base numeric(14,2),
  chile_tax_amount numeric(14,2),
  chile_apv_amount numeric(14,2),
  chile_uf_value numeric(10,2),
  chile_total_deductions numeric(14,2),
  net_total_calculated numeric(14,2),
  net_total_override numeric(14,2),
  net_total numeric(14,2) NOT NULL,
  manual_override boolean NOT NULL DEFAULT false,
  manual_override_note text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bonus_otd_proration_factor numeric(6,4),
  bonus_rpa_proration_factor numeric(6,4),
  working_days_in_period integer,
  days_present integer,
  days_absent integer,
  days_on_leave integer,
  days_on_unpaid_leave integer,
  adjusted_base_salary numeric(14,2),
  adjusted_remote_allowance numeric(14,2),
  chile_gratificacion_legal numeric(14,2),
  chile_colacion_amount numeric(14,2),
  chile_movilizacion_amount numeric(14,2),
  adjusted_colacion_amount numeric(14,2),
  adjusted_movilizacion_amount numeric(14,2),
  colacion_amount numeric(14,2) NOT NULL DEFAULT 0,
  movilizacion_amount numeric(14,2) NOT NULL DEFAULT 0,
  chile_afp_cotizacion_amount numeric(14,2),
  chile_afp_comision_amount numeric(14,2),
  fixed_bonus_label text,
  fixed_bonus_amount numeric(14,2) NOT NULL DEFAULT 0,
  adjusted_fixed_bonus_amount numeric(14,2),
  chile_health_obligatoria_amount numeric(14,2),
  chile_health_voluntaria_amount numeric(14,2),
  chile_employer_sis_amount numeric(14,2),
  chile_employer_cesantia_amount numeric(14,2),
  chile_employer_mutual_amount numeric(14,2),
  chile_employer_total_cost numeric(14,2)
);

CREATE TABLE greenhouse_payroll.payroll_periods (
  period_id text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  calculated_at timestamp with time zone,
  calculated_by_user_id text,
  approved_at timestamp with time zone,
  approved_by_user_id text,
  exported_at timestamp with time zone,
  uf_value numeric(10,2),
  tax_table_version text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_payroll.payroll_receipts (
  receipt_id text NOT NULL,
  entry_id text NOT NULL,
  period_id text NOT NULL,
  member_id text NOT NULL,
  pay_regime text NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  source_event_id text NOT NULL,
  status text NOT NULL DEFAULT 'generated'::text,
  storage_bucket text,
  storage_path text,
  file_size_bytes integer,
  generated_at timestamp with time zone,
  generated_by text,
  generation_error text,
  email_recipient text,
  email_sent_at timestamp with time zone,
  email_delivery_id text,
  email_error text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  template_version text,
  asset_id text
);

CREATE TABLE greenhouse_payroll.previred_afp_rates (
  indicator_id text NOT NULL,
  indicator_date date NOT NULL,
  afp_code text NOT NULL,
  afp_name text NOT NULL,
  worker_rate numeric(6,4) NOT NULL,
  employer_rate numeric(6,4) NOT NULL DEFAULT 0,
  total_rate numeric(6,4) NOT NULL,
  source text,
  source_url text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_payroll.previred_period_indicators (
  indicator_id text NOT NULL,
  indicator_date date NOT NULL,
  imm_value numeric(14,2) NOT NULL,
  sis_rate numeric(6,4) NOT NULL,
  unemployment_rate_indefinite numeric(6,4) NOT NULL,
  unemployment_rate_fixed_term numeric(6,4) NOT NULL,
  afp_top_unf numeric(10,2) NOT NULL,
  unemployment_top_unf numeric(10,2) NOT NULL,
  apv_top_unf numeric(10,2) NOT NULL DEFAULT 50,
  source text,
  source_url text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_payroll.projected_payroll_promotions (
  promotion_id text NOT NULL,
  period_id text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  projection_mode text NOT NULL,
  as_of_date date NOT NULL,
  source_snapshot_count integer NOT NULL DEFAULT 0,
  promoted_entry_count integer NOT NULL DEFAULT 0,
  source_period_status text,
  actor_user_id text,
  actor_identifier text,
  promotion_status text NOT NULL DEFAULT 'started'::text,
  promoted_at timestamp with time zone,
  failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Schema: greenhouse_serving (11 tables)
-- ============================================================

CREATE TABLE greenhouse_serving.commercial_cost_attribution (
  member_id text NOT NULL,
  client_id text NOT NULL,
  client_name text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  base_labor_cost_target numeric(14,2) NOT NULL DEFAULT 0,
  internal_operational_cost_target numeric(14,2) NOT NULL DEFAULT 0,
  direct_overhead_target numeric(14,2) NOT NULL DEFAULT 0,
  shared_overhead_target numeric(14,2) NOT NULL DEFAULT 0,
  fte_contribution numeric(10,3) NOT NULL DEFAULT 0,
  allocation_ratio numeric(10,6) NOT NULL DEFAULT 0,
  commercial_labor_cost_target numeric(14,2) NOT NULL DEFAULT 0,
  commercial_direct_overhead_target numeric(14,2) NOT NULL DEFAULT 0,
  commercial_shared_overhead_target numeric(14,2) NOT NULL DEFAULT 0,
  commercial_loaded_cost_target numeric(14,2) NOT NULL DEFAULT 0,
  source_of_truth text NOT NULL,
  rule_version text NOT NULL,
  materialization_reason text,
  materialized_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_serving.ico_member_metrics (
  member_id text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  rpa_avg numeric(6,2),
  rpa_median numeric(6,2),
  otd_pct numeric(5,2),
  ftr_pct numeric(5,2),
  cycle_time_avg_days numeric(6,2),
  throughput_count integer,
  pipeline_velocity numeric(10,2),
  stuck_asset_count integer,
  stuck_asset_pct numeric(10,2),
  total_tasks integer,
  completed_tasks integer,
  active_tasks integer,
  materialized_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_serving.ico_organization_metrics (
  organization_id text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  rpa_avg numeric(6,2),
  rpa_median numeric(6,2),
  otd_pct numeric(5,2),
  ftr_pct numeric(5,2),
  cycle_time_avg_days numeric(6,2),
  throughput_count integer,
  pipeline_velocity numeric(8,2),
  stuck_asset_count integer,
  stuck_asset_pct numeric(5,2),
  total_tasks integer,
  completed_tasks integer,
  active_tasks integer,
  materialized_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_serving.member_capacity_economics (
  member_id text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  contracted_fte numeric(5,3) NOT NULL DEFAULT 1,
  contracted_hours integer NOT NULL,
  assigned_hours integer NOT NULL DEFAULT 0,
  usage_kind text NOT NULL DEFAULT 'missing'::text,
  used_hours numeric(10,2),
  usage_percent numeric(5,2),
  commercial_availability_hours integer NOT NULL,
  operational_availability_hours numeric(10,2),
  source_currency text NOT NULL,
  target_currency text NOT NULL DEFAULT 'CLP'::text,
  total_comp_source numeric(14,2),
  total_labor_cost_target numeric(14,2),
  direct_overhead_target numeric(14,2) NOT NULL DEFAULT 0,
  shared_overhead_target numeric(14,2) NOT NULL DEFAULT 0,
  loaded_cost_target numeric(14,2),
  cost_per_hour_target numeric(14,2),
  suggested_bill_rate_target numeric(14,2),
  fx_rate numeric(18,6),
  fx_rate_date date,
  fx_provider text,
  fx_strategy text,
  snapshot_status text NOT NULL DEFAULT 'partial'::text,
  source_compensation_version_id text,
  source_payroll_period_id text,
  assignment_count integer NOT NULL DEFAULT 0,
  materialized_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_serving.metric_threshold_overrides (
  override_id text NOT NULL DEFAULT ('mto-'::text || (gen_random_uuid())::text),
  organization_id text NOT NULL,
  metric_code text NOT NULL,
  optimal_min numeric,
  optimal_max numeric,
  attention_min numeric,
  attention_max numeric,
  critical_min numeric,
  critical_max numeric,
  changed_by text,
  changed_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_serving.operational_pl_snapshots (
  snapshot_id text NOT NULL,
  scope_type text NOT NULL,
  scope_id text NOT NULL,
  scope_name text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_closed boolean NOT NULL DEFAULT false,
  snapshot_revision integer NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'CLP'::text,
  revenue_clp numeric(18,2) NOT NULL DEFAULT 0,
  labor_cost_clp numeric(18,2) NOT NULL DEFAULT 0,
  direct_expense_clp numeric(18,2) NOT NULL DEFAULT 0,
  overhead_clp numeric(18,2) NOT NULL DEFAULT 0,
  total_cost_clp numeric(18,2) NOT NULL DEFAULT 0,
  gross_margin_clp numeric(18,2) NOT NULL DEFAULT 0,
  gross_margin_pct numeric(5,2),
  headcount_fte numeric(6,2),
  revenue_per_fte_clp numeric(18,2),
  cost_per_fte_clp numeric(18,2),
  computation_reason text,
  materialized_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_serving.organization_operational_metrics (
  organization_id text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  tasks_completed integer NOT NULL DEFAULT 0,
  tasks_active integer NOT NULL DEFAULT 0,
  tasks_total integer NOT NULL DEFAULT 0,
  rpa_avg numeric(6,2),
  otd_pct numeric(5,2),
  ftr_pct numeric(5,2),
  cycle_time_avg_days numeric(6,2),
  throughput_count integer,
  stuck_asset_count integer DEFAULT 0,
  source text NOT NULL DEFAULT 'ico_organization_metrics'::text,
  materialized_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_serving.period_closure_status (
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  closure_status text NOT NULL,
  payroll_closed boolean NOT NULL DEFAULT false,
  income_closed boolean NOT NULL DEFAULT false,
  expenses_closed boolean NOT NULL DEFAULT false,
  reconciliation_closed boolean NOT NULL DEFAULT false,
  fx_locked boolean NOT NULL DEFAULT false,
  readiness_pct integer NOT NULL DEFAULT 0,
  snapshot_revision integer NOT NULL DEFAULT 1,
  materialized_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_serving.person_operational_360 (
  member_id text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  rpa_avg numeric(6,2),
  rpa_median numeric(6,2),
  otd_pct numeric(5,2),
  ftr_pct numeric(5,2),
  cycle_time_avg_days numeric(6,2),
  cycle_time_p50_days numeric(6,2),
  cycle_time_variance numeric(6,2),
  throughput_count integer,
  pipeline_velocity numeric(10,2),
  stuck_asset_count integer DEFAULT 0,
  stuck_asset_pct numeric(10,2),
  total_tasks integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  active_tasks integer DEFAULT 0,
  utilization_pct numeric(5,2),
  allocation_variance numeric(5,3),
  cost_per_asset numeric(14,2),
  cost_per_hour numeric(14,2),
  quality_index numeric(5,2),
  dedication_index numeric(5,2),
  role_category text,
  total_fte_allocation numeric(5,3),
  contracted_hours_month integer,
  assigned_hours_month integer,
  used_hours_month integer,
  available_hours_month integer,
  expected_throughput numeric(6,1),
  capacity_health text,
  overcommitted boolean DEFAULT false,
  active_assignment_count integer DEFAULT 0,
  compensation_currency text,
  monthly_base_salary numeric(14,2),
  monthly_total_comp numeric(14,2),
  compensation_version_id text,
  source text NOT NULL DEFAULT 'person_intelligence'::text,
  engine_version text,
  materialized_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_serving.projected_payroll_snapshots (
  member_id text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  projection_mode text NOT NULL,
  as_of_date date NOT NULL,
  currency text NOT NULL,
  base_salary numeric(14,2) NOT NULL DEFAULT 0,
  remote_allowance numeric(14,2) NOT NULL DEFAULT 0,
  fixed_bonus_amount numeric(14,2) NOT NULL DEFAULT 0,
  bonus_otd_amount numeric(14,2) NOT NULL DEFAULT 0,
  bonus_rpa_amount numeric(14,2) NOT NULL DEFAULT 0,
  gross_total numeric(14,2) NOT NULL DEFAULT 0,
  total_deductions numeric(14,2) NOT NULL DEFAULT 0,
  net_total numeric(14,2) NOT NULL DEFAULT 0,
  kpi_otd_percent numeric(5,2),
  kpi_rpa_avg numeric(5,2),
  working_days_cut integer,
  working_days_total integer,
  days_absent integer DEFAULT 0,
  days_on_leave integer DEFAULT 0,
  uf_value numeric(10,2),
  snapshot_status text NOT NULL DEFAULT 'projected'::text,
  materialized_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_serving.staff_aug_placement_snapshots (
  snapshot_id text NOT NULL,
  placement_id text NOT NULL,
  assignment_id text NOT NULL,
  client_id text NOT NULL,
  client_name text,
  space_id text,
  space_name text,
  organization_id text,
  organization_name text,
  member_id text NOT NULL,
  member_name text,
  provider_id text,
  provider_name text,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_id text NOT NULL,
  placement_status text NOT NULL,
  billing_rate_amount numeric(14,2),
  billing_rate_currency text,
  projected_revenue_clp numeric(14,2) NOT NULL DEFAULT 0,
  cost_rate_amount numeric(14,2),
  cost_rate_currency text,
  payroll_gross_clp numeric(14,2) NOT NULL DEFAULT 0,
  payroll_employer_cost_clp numeric(14,2) NOT NULL DEFAULT 0,
  commercial_loaded_cost_clp numeric(14,2) NOT NULL DEFAULT 0,
  member_direct_expense_clp numeric(14,2) NOT NULL DEFAULT 0,
  tooling_cost_clp numeric(14,2) NOT NULL DEFAULT 0,
  gross_margin_proxy_clp numeric(14,2) NOT NULL DEFAULT 0,
  gross_margin_proxy_pct numeric(8,2),
  provider_tooling_snapshot_id text,
  source_compensation_version_id text,
  source_payroll_entry_id text,
  snapshot_status text NOT NULL DEFAULT 'partial'::text,
  refresh_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Schema: greenhouse_sync (14 tables)
-- ============================================================

CREATE TABLE greenhouse_sync.identity_reconciliation_proposals (
  proposal_id text NOT NULL,
  source_system text NOT NULL,
  source_object_type text NOT NULL,
  source_object_id text NOT NULL,
  source_display_name text,
  source_email text,
  discovered_in text NOT NULL,
  occurrence_count integer NOT NULL DEFAULT 1,
  candidate_member_id text,
  candidate_profile_id text,
  candidate_display_name text,
  match_confidence numeric(3,2) NOT NULL DEFAULT 0.00,
  match_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  resolved_by text,
  resolved_at timestamp with time zone,
  resolution_note text,
  sync_run_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_sync.outbox_events (
  event_id text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  occurred_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at timestamp with time zone
);

CREATE TABLE greenhouse_sync.outbox_reactive_log (
  event_id text NOT NULL,
  reacted_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handler text NOT NULL,
  result text,
  retries integer NOT NULL DEFAULT 0,
  last_error text
);

CREATE TABLE greenhouse_sync.projection_refresh_queue (
  refresh_id text NOT NULL,
  projection_name text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  priority integer NOT NULL DEFAULT 0,
  triggered_by_event_id text,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_sync.schema_migrations (
  migration_id text NOT NULL,
  migration_group text NOT NULL,
  applied_by text NOT NULL,
  applied_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes text
);

CREATE TABLE greenhouse_sync.service_sync_queue (
  queue_id text NOT NULL,
  service_id text NOT NULL,
  operation text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at timestamp with time zone
);

CREATE TABLE greenhouse_sync.source_sync_failures (
  sync_failure_id text NOT NULL,
  sync_run_id text,
  source_system text NOT NULL,
  source_object_type text NOT NULL,
  source_object_id text,
  error_code text,
  error_message text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  retryable boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at timestamp with time zone
);

CREATE TABLE greenhouse_sync.source_sync_runs (
  sync_run_id text NOT NULL,
  source_system text NOT NULL,
  source_object_type text NOT NULL,
  sync_mode text NOT NULL DEFAULT 'incremental'::text,
  status text NOT NULL DEFAULT 'running'::text,
  watermark_key text,
  watermark_start_value text,
  watermark_end_value text,
  records_read integer NOT NULL DEFAULT 0,
  records_written_raw integer NOT NULL DEFAULT 0,
  records_written_conformed integer NOT NULL DEFAULT 0,
  records_projected_postgres integer NOT NULL DEFAULT 0,
  triggered_by text,
  notes text,
  started_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_sync.source_sync_watermarks (
  watermark_id text NOT NULL,
  source_system text NOT NULL,
  source_object_type text NOT NULL,
  watermark_key text NOT NULL,
  watermark_value text,
  watermark_updated_at timestamp with time zone,
  sync_run_id text,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_sync.webhook_deliveries (
  webhook_delivery_id text NOT NULL,
  event_id text NOT NULL,
  webhook_subscription_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  attempt_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamp with time zone,
  last_http_status integer,
  last_error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp with time zone
);

CREATE TABLE greenhouse_sync.webhook_delivery_attempts (
  webhook_delivery_attempt_id text NOT NULL,
  webhook_delivery_id text NOT NULL,
  attempt_number integer NOT NULL,
  request_headers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_body_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_status integer,
  response_body text,
  started_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at timestamp with time zone,
  error_message text
);

CREATE TABLE greenhouse_sync.webhook_endpoints (
  webhook_endpoint_id text NOT NULL,
  endpoint_key text NOT NULL,
  provider_code text NOT NULL,
  handler_code text NOT NULL,
  auth_mode text NOT NULL DEFAULT 'shared_secret'::text,
  secret_ref text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_sync.webhook_inbox_events (
  webhook_inbox_event_id text NOT NULL,
  webhook_endpoint_id text NOT NULL,
  provider_code text NOT NULL,
  source_event_id text,
  idempotency_key text NOT NULL,
  headers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_body_text text,
  signature_verified boolean,
  status text NOT NULL DEFAULT 'received'::text,
  error_message text,
  received_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at timestamp with time zone
);

CREATE TABLE greenhouse_sync.webhook_subscriptions (
  webhook_subscription_id text NOT NULL,
  subscriber_code text NOT NULL,
  target_url text NOT NULL,
  auth_mode text NOT NULL DEFAULT 'hmac_sha256'::text,
  secret_ref text,
  event_filters_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  paused_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Total tables: 120
