-- Up Migration
-- TASK-263 fix: view_access_log.view_code has FK to view_registry,
-- but permission set audit actions use set_id which is not in view_registry.
-- Add nullable target_set column for set-related actions and make view_code nullable.

ALTER TABLE greenhouse_core.view_access_log
  ADD COLUMN IF NOT EXISTS target_set TEXT;

ALTER TABLE greenhouse_core.view_access_log
  ALTER COLUMN view_code DROP NOT NULL;

ALTER TABLE greenhouse_core.view_access_log
  DROP CONSTRAINT IF EXISTS view_access_log_view_code_fkey;

ALTER TABLE greenhouse_core.view_access_log
  ADD CONSTRAINT view_access_log_view_code_fkey
  FOREIGN KEY (view_code) REFERENCES greenhouse_core.view_registry(view_code)
  ON DELETE SET NULL;

-- Down Migration

ALTER TABLE greenhouse_core.view_access_log
  DROP CONSTRAINT IF EXISTS view_access_log_view_code_fkey;

ALTER TABLE greenhouse_core.view_access_log
  ADD CONSTRAINT view_access_log_view_code_fkey
  FOREIGN KEY (view_code) REFERENCES greenhouse_core.view_registry(view_code);

ALTER TABLE greenhouse_core.view_access_log
  ALTER COLUMN view_code SET NOT NULL;

ALTER TABLE greenhouse_core.view_access_log
  DROP COLUMN IF EXISTS target_set;
