CREATE SCHEMA IF NOT EXISTS greenhouse_crm;
CREATE SCHEMA IF NOT EXISTS greenhouse_delivery;

CREATE TABLE IF NOT EXISTS greenhouse_sync.source_sync_runs (
  sync_run_id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_object_type TEXT NOT NULL,
  sync_mode TEXT NOT NULL DEFAULT 'incremental',
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'failed', 'partial', 'cancelled')),
  watermark_key TEXT,
  watermark_start_value TEXT,
  watermark_end_value TEXT,
  records_read INTEGER NOT NULL DEFAULT 0,
  records_written_raw INTEGER NOT NULL DEFAULT 0,
  records_written_conformed INTEGER NOT NULL DEFAULT 0,
  records_projected_postgres INTEGER NOT NULL DEFAULT 0,
  triggered_by TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_sync.source_sync_watermarks (
  watermark_id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_object_type TEXT NOT NULL,
  watermark_key TEXT NOT NULL,
  watermark_value TEXT,
  watermark_updated_at TIMESTAMPTZ,
  sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT source_sync_watermarks_unique UNIQUE (source_system, source_object_type, watermark_key)
);

CREATE TABLE IF NOT EXISTS greenhouse_sync.source_sync_failures (
  sync_failure_id TEXT PRIMARY KEY,
  sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE CASCADE,
  source_system TEXT NOT NULL,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT,
  error_code TEXT,
  error_message TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  retryable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS greenhouse_crm.companies (
  company_record_id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  hubspot_company_id TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  legal_name TEXT,
  owner_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  owner_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  lifecycle_stage TEXT,
  industry TEXT,
  country_code TEXT,
  website_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL,
  payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_crm.deals (
  deal_record_id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  company_record_id TEXT REFERENCES greenhouse_crm.companies(company_record_id) ON DELETE SET NULL,
  module_id TEXT REFERENCES greenhouse_core.service_modules(module_id) ON DELETE SET NULL,
  hubspot_deal_id TEXT NOT NULL UNIQUE,
  hubspot_company_id TEXT,
  deal_name TEXT NOT NULL,
  pipeline_id TEXT,
  stage_id TEXT,
  stage_name TEXT,
  amount NUMERIC(14, 2),
  currency TEXT,
  close_date DATE,
  owner_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  owner_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  is_closed_won BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed_lost BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL,
  payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_crm.contacts (
  contact_record_id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  company_record_id TEXT REFERENCES greenhouse_crm.companies(company_record_id) ON DELETE SET NULL,
  linked_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  linked_identity_profile_id TEXT REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE SET NULL,
  hubspot_contact_id TEXT NOT NULL UNIQUE,
  hubspot_primary_company_id TEXT,
  hubspot_associated_company_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT NOT NULL,
  job_title TEXT,
  phone TEXT,
  mobile_phone TEXT,
  lifecycle_stage TEXT,
  lead_status TEXT,
  owner_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  owner_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL,
  payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_delivery.projects (
  project_record_id TEXT PRIMARY KEY,
  space_id TEXT REFERENCES greenhouse_core.notion_workspaces(space_id) ON DELETE SET NULL,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  module_id TEXT REFERENCES greenhouse_core.service_modules(module_id) ON DELETE SET NULL,
  project_database_source_id TEXT,
  notion_project_id TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  project_status TEXT,
  project_summary TEXT,
  completion_label TEXT,
  on_time_pct_source NUMERIC(6, 2),
  avg_rpa_source NUMERIC(10, 2),
  project_phase TEXT,
  owner_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  page_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL,
  payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_delivery.sprints (
  sprint_record_id TEXT PRIMARY KEY,
  project_record_id TEXT REFERENCES greenhouse_delivery.projects(project_record_id) ON DELETE SET NULL,
  space_id TEXT REFERENCES greenhouse_core.notion_workspaces(space_id) ON DELETE SET NULL,
  project_database_source_id TEXT,
  notion_sprint_id TEXT NOT NULL UNIQUE,
  sprint_name TEXT NOT NULL,
  sprint_status TEXT,
  start_date DATE,
  end_date DATE,
  completed_tasks_count INTEGER,
  total_tasks_count INTEGER,
  completion_pct_source NUMERIC(6, 2),
  page_url TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL,
  payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_delivery.tasks (
  task_record_id TEXT PRIMARY KEY,
  project_record_id TEXT REFERENCES greenhouse_delivery.projects(project_record_id) ON DELETE SET NULL,
  sprint_record_id TEXT REFERENCES greenhouse_delivery.sprints(sprint_record_id) ON DELETE SET NULL,
  space_id TEXT REFERENCES greenhouse_core.notion_workspaces(space_id) ON DELETE SET NULL,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  module_id TEXT REFERENCES greenhouse_core.service_modules(module_id) ON DELETE SET NULL,
  assignee_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  assignee_source_id TEXT,
  assignee_member_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  project_database_source_id TEXT,
  notion_task_id TEXT NOT NULL UNIQUE,
  notion_project_id TEXT,
  project_source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  notion_sprint_id TEXT,
  task_name TEXT NOT NULL,
  task_status TEXT,
  task_phase TEXT,
  task_priority TEXT,
  completion_label TEXT,
  delivery_compliance TEXT,
  days_late INTEGER,
  rescheduled_days INTEGER,
  is_rescheduled BOOLEAN NOT NULL DEFAULT FALSE,
  performance_indicator_label TEXT,
  performance_indicator_code TEXT,
  client_change_round_label TEXT,
  client_change_round_final INTEGER,
  rpa_semaphore_source TEXT,
  rpa_value NUMERIC(10, 2),
  frame_versions INTEGER,
  frame_comments INTEGER,
  open_frame_comments INTEGER,
  client_review_open BOOLEAN NOT NULL DEFAULT FALSE,
  workflow_review_open BOOLEAN NOT NULL DEFAULT FALSE,
  blocker_count INTEGER,
  last_frame_comment TEXT,
  original_due_date DATE,
  execution_time_label TEXT,
  changes_time_label TEXT,
  review_time_label TEXT,
  workflow_change_round INTEGER,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  page_url TEXT,
  estimated_hours NUMERIC(10, 2),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL,
  payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_delivery.space_property_mappings (
  id                    TEXT PRIMARY KEY,
  space_id              TEXT NOT NULL,
  notion_property_name  TEXT NOT NULL,
  conformed_field_name  TEXT NOT NULL,
  notion_type           TEXT NOT NULL,
  target_type           TEXT NOT NULL,
  coercion_rule         TEXT NOT NULL DEFAULT 'direct',
  is_required           BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_value        TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by            TEXT,
  CONSTRAINT spm_space_conformed_uq UNIQUE (space_id, conformed_field_name),
  CONSTRAINT spm_space_notion_uq UNIQUE (space_id, notion_property_name)
);

GRANT USAGE ON SCHEMA greenhouse_crm TO greenhouse_runtime;
GRANT USAGE, CREATE ON SCHEMA greenhouse_crm TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_delivery TO greenhouse_runtime;
GRANT USAGE, CREATE ON SCHEMA greenhouse_delivery TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_sync TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_sync TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_crm TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA greenhouse_crm TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_delivery TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA greenhouse_delivery TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_sync TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA greenhouse_sync TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_crm
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_delivery
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_sync
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_crm
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_delivery
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_sync
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO greenhouse_migrator;

ALTER TABLE greenhouse_delivery.projects
  ADD COLUMN IF NOT EXISTS space_id TEXT REFERENCES greenhouse_core.notion_workspaces(space_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_delivery.projects
  ADD COLUMN IF NOT EXISTS project_database_source_id TEXT;

ALTER TABLE greenhouse_delivery.projects
  ADD COLUMN IF NOT EXISTS project_summary TEXT;

ALTER TABLE greenhouse_delivery.projects
  ADD COLUMN IF NOT EXISTS completion_label TEXT;

ALTER TABLE greenhouse_delivery.projects
  ADD COLUMN IF NOT EXISTS on_time_pct_source NUMERIC(6, 2);

ALTER TABLE greenhouse_delivery.projects
  ADD COLUMN IF NOT EXISTS avg_rpa_source NUMERIC(10, 2);

ALTER TABLE greenhouse_delivery.projects
  ADD COLUMN IF NOT EXISTS page_url TEXT;

ALTER TABLE greenhouse_delivery.sprints
  ADD COLUMN IF NOT EXISTS space_id TEXT REFERENCES greenhouse_core.notion_workspaces(space_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_delivery.sprints
  ADD COLUMN IF NOT EXISTS project_database_source_id TEXT;

ALTER TABLE greenhouse_delivery.sprints
  ADD COLUMN IF NOT EXISTS completed_tasks_count INTEGER;

ALTER TABLE greenhouse_delivery.sprints
  ADD COLUMN IF NOT EXISTS total_tasks_count INTEGER;

ALTER TABLE greenhouse_delivery.sprints
  ADD COLUMN IF NOT EXISTS completion_pct_source NUMERIC(6, 2);

ALTER TABLE greenhouse_delivery.sprints
  ADD COLUMN IF NOT EXISTS page_url TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS space_id TEXT REFERENCES greenhouse_core.notion_workspaces(space_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS project_database_source_id TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS assignee_source_id TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS assignee_member_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS project_source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS completion_label TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS delivery_compliance TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS days_late INTEGER;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS rescheduled_days INTEGER;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS is_rescheduled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS performance_indicator_label TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS performance_indicator_code TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS client_change_round_label TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS client_change_round_final INTEGER;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS rpa_semaphore_source TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS rpa_value NUMERIC(10, 2);

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS frame_versions INTEGER;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS frame_comments INTEGER;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS open_frame_comments INTEGER;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS client_review_open BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS workflow_review_open BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS blocker_count INTEGER;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS last_frame_comment TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS original_due_date DATE;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS execution_time_label TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS changes_time_label TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS review_time_label TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS workflow_change_round INTEGER;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS page_url TEXT;

ALTER TABLE greenhouse_crm.companies
  ADD COLUMN IF NOT EXISTS owner_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_crm.deals
  ADD COLUMN IF NOT EXISTS owner_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_crm.contacts
  ADD COLUMN IF NOT EXISTS owner_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS source_sync_runs_source_idx
  ON greenhouse_sync.source_sync_runs (source_system, source_object_type, started_at DESC);

CREATE INDEX IF NOT EXISTS source_sync_runs_status_idx
  ON greenhouse_sync.source_sync_runs (status, started_at DESC);

CREATE INDEX IF NOT EXISTS source_sync_watermarks_lookup_idx
  ON greenhouse_sync.source_sync_watermarks (source_system, source_object_type, watermark_key);

CREATE INDEX IF NOT EXISTS source_sync_failures_source_idx
  ON greenhouse_sync.source_sync_failures (source_system, source_object_type, created_at DESC);

CREATE INDEX IF NOT EXISTS source_sync_failures_run_idx
  ON greenhouse_sync.source_sync_failures (sync_run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_companies_client_idx
  ON greenhouse_crm.companies (client_id);

CREATE INDEX IF NOT EXISTS crm_companies_owner_idx
  ON greenhouse_crm.companies (owner_user_id);

CREATE INDEX IF NOT EXISTS crm_companies_owner_member_idx
  ON greenhouse_crm.companies (owner_member_id);

CREATE INDEX IF NOT EXISTS crm_deals_client_idx
  ON greenhouse_crm.deals (client_id);

CREATE INDEX IF NOT EXISTS crm_deals_company_idx
  ON greenhouse_crm.deals (company_record_id);

CREATE INDEX IF NOT EXISTS crm_deals_module_idx
  ON greenhouse_crm.deals (module_id);

CREATE INDEX IF NOT EXISTS crm_deals_owner_member_idx
  ON greenhouse_crm.deals (owner_member_id);

CREATE INDEX IF NOT EXISTS crm_contacts_client_idx
  ON greenhouse_crm.contacts (client_id);

CREATE INDEX IF NOT EXISTS crm_contacts_company_idx
  ON greenhouse_crm.contacts (company_record_id);

CREATE INDEX IF NOT EXISTS crm_contacts_user_idx
  ON greenhouse_crm.contacts (linked_user_id);

CREATE INDEX IF NOT EXISTS crm_contacts_identity_idx
  ON greenhouse_crm.contacts (linked_identity_profile_id);

CREATE INDEX IF NOT EXISTS crm_contacts_owner_member_idx
  ON greenhouse_crm.contacts (owner_member_id);

CREATE INDEX IF NOT EXISTS crm_contacts_email_idx
  ON greenhouse_crm.contacts (LOWER(email));

CREATE INDEX IF NOT EXISTS delivery_projects_client_idx
  ON greenhouse_delivery.projects (client_id);

CREATE INDEX IF NOT EXISTS delivery_projects_space_idx
  ON greenhouse_delivery.projects (space_id);

CREATE INDEX IF NOT EXISTS delivery_projects_database_source_idx
  ON greenhouse_delivery.projects (project_database_source_id);

CREATE INDEX IF NOT EXISTS delivery_projects_module_idx
  ON greenhouse_delivery.projects (module_id);

CREATE INDEX IF NOT EXISTS delivery_sprints_project_idx
  ON greenhouse_delivery.sprints (project_record_id);

CREATE INDEX IF NOT EXISTS delivery_sprints_space_idx
  ON greenhouse_delivery.sprints (space_id);

CREATE INDEX IF NOT EXISTS delivery_sprints_database_source_idx
  ON greenhouse_delivery.sprints (project_database_source_id);

CREATE INDEX IF NOT EXISTS delivery_tasks_project_idx
  ON greenhouse_delivery.tasks (project_record_id);

CREATE INDEX IF NOT EXISTS delivery_tasks_database_source_idx
  ON greenhouse_delivery.tasks (project_database_source_id);

CREATE INDEX IF NOT EXISTS delivery_tasks_sprint_idx
  ON greenhouse_delivery.tasks (sprint_record_id);

CREATE INDEX IF NOT EXISTS delivery_tasks_client_idx
  ON greenhouse_delivery.tasks (client_id);

CREATE INDEX IF NOT EXISTS delivery_tasks_space_idx
  ON greenhouse_delivery.tasks (space_id);

CREATE INDEX IF NOT EXISTS delivery_tasks_module_idx
  ON greenhouse_delivery.tasks (module_id);

CREATE INDEX IF NOT EXISTS delivery_tasks_assignee_idx
  ON greenhouse_delivery.tasks (assignee_member_id);

CREATE INDEX IF NOT EXISTS delivery_spm_space_idx
  ON greenhouse_delivery.space_property_mappings (space_id);
