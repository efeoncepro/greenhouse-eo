-- ============================================================
-- Baseline migration: marks existing schema as migrated.
-- ============================================================
-- All tables in greenhouse_core, greenhouse_hr, greenhouse_payroll,
-- greenhouse_finance, greenhouse_delivery, greenhouse_crm,
-- greenhouse_serving, greenhouse_sync, greenhouse_ai
-- were created before node-pg-migrate adoption.
--
-- This migration intentionally does nothing.
-- It establishes the tracking baseline so that future migrations
-- have a known starting point.
-- ============================================================

SELECT 1;
