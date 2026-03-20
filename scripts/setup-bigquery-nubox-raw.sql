-- ============================================================================
-- Nubox Raw Snapshots — Append-only BigQuery tables
-- ============================================================================
-- These tables store the complete Nubox API response as JSON for every sync run.
-- Data is never deleted — each sync appends new snapshots.
-- Enables: audit trail, change detection via payload_hash, full replay.
--
-- Prerequisites: greenhouse_raw dataset must exist
--   (created by setup-bigquery-source-sync.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.nubox_sales_snapshots` (
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
OPTIONS(description = "Append-only raw snapshots of Nubox sales documents (DTEs emitted by Efeonce)");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.nubox_purchases_snapshots` (
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
OPTIONS(description = "Append-only raw snapshots of Nubox purchase documents (supplier invoices received)");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.nubox_expenses_snapshots` (
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
OPTIONS(description = "Append-only raw snapshots of Nubox bank expense records (payments to suppliers)");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_raw.nubox_incomes_snapshots` (
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
OPTIONS(description = "Append-only raw snapshots of Nubox bank income records (collections from clients)");
