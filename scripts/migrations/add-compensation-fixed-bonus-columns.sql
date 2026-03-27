-- Migration: Add fixed bonus columns to compensation_versions
-- Part of TASK-062 (Payroll Recurring Fixed Bonus Support)
-- These columns were added to the TypeScript types but not migrated to the DB.

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD COLUMN IF NOT EXISTS fixed_bonus_label TEXT;

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD COLUMN IF NOT EXISTS fixed_bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
