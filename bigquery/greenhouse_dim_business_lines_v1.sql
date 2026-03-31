-- ────────────────────────────────────────────────────────────────────────
-- BigQuery DDL: greenhouse_conformed.dim_business_lines
-- Task: TASK-016 (Business Units Canonical v2, Fase 2)
-- Source: PostgreSQL greenhouse_core.business_line_metadata
-- Purpose: Conformed dimension for analytics by business line.
--          All downstream views (Finance, ICO, delivery) JOIN against
--          this table for label, color, loop_phase enrichment.
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse_conformed.dim_business_lines` (
  module_code STRING NOT NULL,
  label STRING NOT NULL,
  label_full STRING,
  claim STRING,
  loop_phase STRING,
  loop_phase_label STRING,
  lead_name STRING,
  color_hex STRING NOT NULL,
  color_bg STRING,
  icon_name STRING,
  hubspot_enum_value STRING NOT NULL,
  notion_label STRING,
  is_active BOOL NOT NULL,
  sort_order INT64 NOT NULL,
  description STRING,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
