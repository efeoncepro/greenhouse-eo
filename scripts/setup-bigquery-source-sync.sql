CREATE SCHEMA IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw`
OPTIONS(
  location = "__LOCATION__",
  description = "Greenhouse raw source backups for replay, audit and source-system recovery"
);

CREATE SCHEMA IF NOT EXISTS `__PROJECT_ID__.greenhouse_conformed`
OPTIONS(
  location = "__LOCATION__",
  description = "Greenhouse normalized source-system entities consumed by runtime projections and marts"
);

CREATE SCHEMA IF NOT EXISTS `__PROJECT_ID__.greenhouse_marts`
OPTIONS(
  location = "__LOCATION__",
  description = "Greenhouse analytical marts, 360 views and historical reporting outputs"
);

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.notion_projects_snapshots` (
  sync_run_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_object_type STRING NOT NULL,
  source_object_id STRING NOT NULL,
  source_parent_object_id STRING,
  source_created_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  source_deleted_at TIMESTAMP,
  archived BOOL,
  in_trash BOOL,
  is_deleted BOOL NOT NULL,
  payload_json JSON,
  payload_hash STRING,
  ingested_at TIMESTAMP NOT NULL,
  ingested_date DATE NOT NULL
)
PARTITION BY ingested_date
CLUSTER BY source_object_id, sync_run_id
OPTIONS(description = "Append-only raw snapshots of Notion project pages");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.notion_tasks_snapshots` (
  sync_run_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_object_type STRING NOT NULL,
  source_object_id STRING NOT NULL,
  source_parent_object_id STRING,
  source_created_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  source_deleted_at TIMESTAMP,
  archived BOOL,
  in_trash BOOL,
  is_deleted BOOL NOT NULL,
  payload_json JSON,
  payload_hash STRING,
  ingested_at TIMESTAMP NOT NULL,
  ingested_date DATE NOT NULL
)
PARTITION BY ingested_date
CLUSTER BY source_object_id, sync_run_id
OPTIONS(description = "Append-only raw snapshots of Notion task pages");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.notion_sprints_snapshots` (
  sync_run_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_object_type STRING NOT NULL,
  source_object_id STRING NOT NULL,
  source_parent_object_id STRING,
  source_created_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  source_deleted_at TIMESTAMP,
  archived BOOL,
  in_trash BOOL,
  is_deleted BOOL NOT NULL,
  payload_json JSON,
  payload_hash STRING,
  ingested_at TIMESTAMP NOT NULL,
  ingested_date DATE NOT NULL
)
PARTITION BY ingested_date
CLUSTER BY source_object_id, sync_run_id
OPTIONS(description = "Append-only raw snapshots of Notion sprint pages");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.notion_people_snapshots` (
  sync_run_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_object_type STRING NOT NULL,
  source_object_id STRING NOT NULL,
  source_parent_object_id STRING,
  source_created_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  source_deleted_at TIMESTAMP,
  archived BOOL,
  in_trash BOOL,
  is_deleted BOOL NOT NULL,
  payload_json JSON,
  payload_hash STRING,
  ingested_at TIMESTAMP NOT NULL,
  ingested_date DATE NOT NULL
)
PARTITION BY ingested_date
CLUSTER BY source_object_id, sync_run_id
OPTIONS(description = "Append-only raw snapshots of Notion people pages");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.notion_databases_snapshots` (
  sync_run_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_object_type STRING NOT NULL,
  source_object_id STRING NOT NULL,
  source_parent_object_id STRING,
  source_created_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  source_deleted_at TIMESTAMP,
  archived BOOL,
  in_trash BOOL,
  is_deleted BOOL NOT NULL,
  payload_json JSON,
  payload_hash STRING,
  ingested_at TIMESTAMP NOT NULL,
  ingested_date DATE NOT NULL
)
PARTITION BY ingested_date
CLUSTER BY source_object_id, sync_run_id
OPTIONS(description = "Append-only raw snapshots of Notion databases");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.hubspot_companies_snapshots` (
  sync_run_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_object_type STRING NOT NULL,
  source_object_id STRING NOT NULL,
  source_parent_object_id STRING,
  source_created_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  source_deleted_at TIMESTAMP,
  archived BOOL,
  is_deleted BOOL NOT NULL,
  payload_json JSON,
  payload_hash STRING,
  ingested_at TIMESTAMP NOT NULL,
  ingested_date DATE NOT NULL
)
PARTITION BY ingested_date
CLUSTER BY source_object_id, sync_run_id
OPTIONS(description = "Append-only raw snapshots of HubSpot companies");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.hubspot_deals_snapshots` (
  sync_run_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_object_type STRING NOT NULL,
  source_object_id STRING NOT NULL,
  source_parent_object_id STRING,
  source_created_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  source_deleted_at TIMESTAMP,
  archived BOOL,
  is_deleted BOOL NOT NULL,
  payload_json JSON,
  payload_hash STRING,
  ingested_at TIMESTAMP NOT NULL,
  ingested_date DATE NOT NULL
)
PARTITION BY ingested_date
CLUSTER BY source_object_id, sync_run_id
OPTIONS(description = "Append-only raw snapshots of HubSpot deals");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.hubspot_contacts_snapshots` (
  sync_run_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_object_type STRING NOT NULL,
  source_object_id STRING NOT NULL,
  source_parent_object_id STRING,
  source_created_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  source_deleted_at TIMESTAMP,
  archived BOOL,
  is_deleted BOOL NOT NULL,
  payload_json JSON,
  payload_hash STRING,
  ingested_at TIMESTAMP NOT NULL,
  ingested_date DATE NOT NULL
)
PARTITION BY ingested_date
CLUSTER BY source_object_id, sync_run_id
OPTIONS(description = "Append-only raw snapshots of HubSpot contacts");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.hubspot_owners_snapshots` (
  sync_run_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_object_type STRING NOT NULL,
  source_object_id STRING NOT NULL,
  source_parent_object_id STRING,
  source_created_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  source_deleted_at TIMESTAMP,
  archived BOOL,
  is_deleted BOOL NOT NULL,
  payload_json JSON,
  payload_hash STRING,
  ingested_at TIMESTAMP NOT NULL,
  ingested_date DATE NOT NULL
)
PARTITION BY ingested_date
CLUSTER BY source_object_id, sync_run_id
OPTIONS(description = "Append-only raw snapshots of HubSpot owners");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.hubspot_line_items_snapshots` (
  sync_run_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_object_type STRING NOT NULL,
  source_object_id STRING NOT NULL,
  source_parent_object_id STRING,
  source_created_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  source_deleted_at TIMESTAMP,
  archived BOOL,
  is_deleted BOOL NOT NULL,
  payload_json JSON,
  payload_hash STRING,
  ingested_at TIMESTAMP NOT NULL,
  ingested_date DATE NOT NULL
)
PARTITION BY ingested_date
CLUSTER BY source_object_id, sync_run_id
OPTIONS(description = "Append-only raw snapshots of HubSpot line items");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_conformed.delivery_projects` (
  project_source_id STRING NOT NULL,
  project_database_source_id STRING,
  space_id STRING,
  client_source_id STRING,
  client_id STRING,
  module_code STRING,
  module_id STRING,
  project_name STRING NOT NULL,
  project_status STRING,
  project_summary STRING,
  completion_label STRING,
  on_time_pct_source FLOAT64,
  avg_rpa_source FLOAT64,
  project_phase STRING,
  owner_source_id STRING,
  owner_member_id STRING,
  start_date DATE,
  end_date DATE,
  page_url STRING,
  last_edited_time TIMESTAMP,
  payload_hash STRING,
  is_deleted BOOL NOT NULL,
  sync_run_id STRING,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(synced_at)
CLUSTER BY project_source_id, client_id, module_id
OPTIONS(description = "Current-state conformed delivery projects derived from Notion");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_conformed.delivery_tasks` (
  task_source_id STRING NOT NULL,
  project_source_id STRING,
  sprint_source_id STRING,
  project_database_source_id STRING,
  space_id STRING,
  client_source_id STRING,
  client_id STRING,
  module_code STRING,
  module_id STRING,
  task_name STRING NOT NULL,
  task_status STRING,
  task_phase STRING,
  task_priority STRING,
  assignee_source_id STRING,
  assignee_member_id STRING,
  assignee_member_ids ARRAY<STRING>,
  completion_label STRING,
  delivery_compliance STRING,
  days_late INT64,
  rescheduled_days INT64,
  is_rescheduled BOOL,
  performance_indicator_label STRING,
  performance_indicator_code STRING,
  client_change_round_label STRING,
  client_change_round_final INT64,
  rpa_semaphore_source STRING,
  rpa_value FLOAT64,
  frame_versions INT64,
  frame_comments INT64,
  open_frame_comments INT64,
  client_review_open BOOL,
  workflow_review_open BOOL,
  blocker_count INT64,
  last_frame_comment STRING,
  original_due_date DATE,
  execution_time_label STRING,
  changes_time_label STRING,
  review_time_label STRING,
  workflow_change_round INT64,
  due_date DATE,
  completed_at TIMESTAMP,
  page_url STRING,
  last_edited_time TIMESTAMP,
  payload_hash STRING,
  is_deleted BOOL NOT NULL,
  sync_run_id STRING,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(synced_at)
CLUSTER BY task_source_id, project_source_id, assignee_member_id
OPTIONS(description = "Current-state conformed delivery tasks derived from Notion");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_conformed.delivery_sprints` (
  sprint_source_id STRING NOT NULL,
  project_source_id STRING,
  project_database_source_id STRING,
  space_id STRING,
  sprint_name STRING NOT NULL,
  sprint_status STRING,
  start_date DATE,
  end_date DATE,
  completed_tasks_count INT64,
  total_tasks_count INT64,
  completion_pct_source FLOAT64,
  page_url STRING,
  last_edited_time TIMESTAMP,
  payload_hash STRING,
  is_deleted BOOL NOT NULL,
  sync_run_id STRING,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(synced_at)
CLUSTER BY sprint_source_id, project_source_id
OPTIONS(description = "Current-state conformed delivery sprints derived from Notion");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_conformed.crm_companies` (
  company_source_id STRING NOT NULL,
  client_id STRING,
  company_name STRING NOT NULL,
  legal_name STRING,
  owner_source_id STRING,
  owner_member_id STRING,
  owner_user_id STRING,
  lifecycle_stage STRING,
  industry STRING,
  country_code STRING,
  website_url STRING,
  updated_at TIMESTAMP,
  payload_hash STRING,
  is_deleted BOOL NOT NULL,
  sync_run_id STRING,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(synced_at)
CLUSTER BY company_source_id, client_id
OPTIONS(description = "Current-state conformed CRM companies derived from HubSpot");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_conformed.crm_deals` (
  deal_source_id STRING NOT NULL,
  company_source_id STRING,
  client_id STRING,
  module_code STRING,
  module_id STRING,
  pipeline_id STRING,
  stage_id STRING,
  stage_name STRING,
  deal_name STRING NOT NULL,
  amount NUMERIC,
  currency STRING,
  close_date DATE,
  owner_source_id STRING,
  owner_member_id STRING,
  owner_user_id STRING,
  is_closed_won BOOL,
  is_closed_lost BOOL,
  updated_at TIMESTAMP,
  payload_hash STRING,
  is_deleted BOOL NOT NULL,
  sync_run_id STRING,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(synced_at)
CLUSTER BY deal_source_id, company_source_id, client_id
OPTIONS(description = "Current-state conformed CRM deals derived from HubSpot");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_conformed.crm_contacts` (
  contact_source_id STRING NOT NULL,
  company_source_id STRING,
  associated_company_source_ids ARRAY<STRING>,
  client_id STRING,
  linked_user_id STRING,
  linked_identity_profile_id STRING,
  email STRING,
  first_name STRING,
  last_name STRING,
  display_name STRING,
  job_title STRING,
  phone STRING,
  mobile_phone STRING,
  lifecycle_stage STRING,
  lead_status STRING,
  owner_source_id STRING,
  owner_member_id STRING,
  owner_user_id STRING,
  updated_at TIMESTAMP,
  payload_hash STRING,
  is_deleted BOOL NOT NULL,
  sync_run_id STRING,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(synced_at)
CLUSTER BY contact_source_id, company_source_id, client_id
OPTIONS(description = "Current-state conformed CRM contacts derived from HubSpot and reconciled against Greenhouse access identities");

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_projects`
ADD COLUMN IF NOT EXISTS space_id STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_projects`
ADD COLUMN IF NOT EXISTS project_database_source_id STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_projects`
ADD COLUMN IF NOT EXISTS project_summary STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_projects`
ADD COLUMN IF NOT EXISTS completion_label STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_projects`
ADD COLUMN IF NOT EXISTS on_time_pct_source FLOAT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_projects`
ADD COLUMN IF NOT EXISTS avg_rpa_source FLOAT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_projects`
ADD COLUMN IF NOT EXISTS page_url STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS space_id STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS project_database_source_id STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS completion_label STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS delivery_compliance STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS days_late INT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS rescheduled_days INT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS is_rescheduled BOOL;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS performance_indicator_label STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS performance_indicator_code STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS client_change_round_label STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS client_change_round_final INT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS rpa_semaphore_source STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS rpa_value FLOAT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS frame_versions INT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS frame_comments INT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS open_frame_comments INT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS client_review_open BOOL;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS workflow_review_open BOOL;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS blocker_count INT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS last_frame_comment STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS original_due_date DATE;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS execution_time_label STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS changes_time_label STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS review_time_label STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS workflow_change_round INT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS page_url STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_sprints`
ADD COLUMN IF NOT EXISTS space_id STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_sprints`
ADD COLUMN IF NOT EXISTS project_database_source_id STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_sprints`
ADD COLUMN IF NOT EXISTS completed_tasks_count INT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_sprints`
ADD COLUMN IF NOT EXISTS total_tasks_count INT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_sprints`
ADD COLUMN IF NOT EXISTS completion_pct_source FLOAT64;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_sprints`
ADD COLUMN IF NOT EXISTS page_url STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.crm_deals`
ADD COLUMN IF NOT EXISTS module_code STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.crm_deals`
ADD COLUMN IF NOT EXISTS module_id STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.crm_companies`
ADD COLUMN IF NOT EXISTS owner_member_id STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.crm_deals`
ADD COLUMN IF NOT EXISTS owner_member_id STRING;

ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.crm_contacts`
ADD COLUMN IF NOT EXISTS owner_member_id STRING;

-- ETL Pipeline Hardening: cycle_time_days needs task creation timestamp from Notion
ALTER TABLE `__PROJECT_ID__.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
