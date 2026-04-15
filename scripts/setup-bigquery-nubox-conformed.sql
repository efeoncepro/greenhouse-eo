-- ============================================================================
-- Nubox Conformed Tables — Append-only BigQuery snapshot tables
-- ============================================================================
-- These tables hold transformed, identity-resolved Nubox snapshots.
-- Writers append a new snapshot per sync run; readers must resolve latest row per Nubox ID.
-- Enables: DTE analytics, supplier spend, cash flow timing, tax reporting.
--
-- Prerequisites: greenhouse_conformed dataset must exist
--   (created by setup-bigquery-source-sync.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_conformed.nubox_sales` (
  nubox_sale_id STRING NOT NULL,
  folio STRING,
  dte_type_code STRING,
  dte_type_abbreviation STRING,
  dte_type_name STRING,
  net_amount NUMERIC,
  exempt_amount NUMERIC,
  tax_vat_amount NUMERIC,
  total_amount NUMERIC,
  balance NUMERIC,
  emission_date DATE,
  due_date DATE,
  period_year INT64,
  period_month INT64,
  payment_form_code STRING,
  payment_form_name STRING,
  sii_track_id STRING,
  is_annulled BOOL,
  emission_status_id INT64,
  emission_status_name STRING,
  origin_name STRING,
  client_rut STRING,
  client_trade_name STRING,
  -- Identity resolution
  organization_id STRING,
  client_id STRING,
  income_id STRING,
  -- Audit
  payload_hash STRING,
  sync_run_id STRING NOT NULL,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(synced_at)
CLUSTER BY nubox_sale_id, client_rut
OPTIONS(description = "Append-only Nubox sales snapshots with identity resolution to Greenhouse organizations and income records");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_conformed.nubox_purchases` (
  nubox_purchase_id STRING NOT NULL,
  folio STRING,
  dte_type_code STRING,
  dte_type_abbreviation STRING,
  dte_type_name STRING,
  net_amount NUMERIC,
  exempt_amount NUMERIC,
  tax_vat_amount NUMERIC,
  total_amount NUMERIC,
  total_other_taxes_amount NUMERIC,
  total_withholding_amount NUMERIC,
  balance NUMERIC,
  emission_date DATE,
  due_date DATE,
  period_year INT64,
  period_month INT64,
  document_status_id INT64,
  document_status_name STRING,
  purchase_type_code STRING,
  purchase_type_name STRING,
  origin_name STRING,
  supplier_rut STRING,
  supplier_trade_name STRING,
  -- Identity resolution
  supplier_id STRING,
  expense_id STRING,
  -- Audit
  payload_hash STRING,
  sync_run_id STRING NOT NULL,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(synced_at)
CLUSTER BY nubox_purchase_id, supplier_rut
OPTIONS(description = "Append-only Nubox purchases snapshots with identity resolution to Greenhouse suppliers and expense records");

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.greenhouse_conformed.nubox_bank_movements` (
  nubox_movement_id STRING NOT NULL,
  movement_direction STRING NOT NULL,
  nubox_folio STRING,
  movement_type_id INT64,
  movement_type_description STRING,
  bank_id INT64,
  bank_description STRING,
  payment_method_id INT64,
  payment_method_description STRING,
  counterpart_rut STRING,
  counterpart_trade_name STRING,
  total_amount NUMERIC,
  payment_date DATE,
  period_year INT64,
  period_month INT64,
  linked_sale_id STRING,
  linked_purchase_id STRING,
  -- Audit
  payload_hash STRING,
  sync_run_id STRING NOT NULL,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(synced_at)
CLUSTER BY nubox_movement_id, movement_direction
OPTIONS(description = "Unified Nubox bank movements — expenses (debit) and incomes (credit) for cash flow analysis");
