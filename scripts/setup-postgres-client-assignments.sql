-- Client Team Assignments — Postgres Migration
-- =====================================================
-- Mirrors BigQuery greenhouse.client_team_assignments
-- Tracks member-to-client capacity allocation (FTE, hours, role overrides)
--
-- This script is idempotent. Safe to re-run.
-- =====================================================

CREATE TABLE IF NOT EXISTS greenhouse_core.client_team_assignments (
  assignment_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES greenhouse_core.clients(client_id),
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  assignment_type TEXT NOT NULL DEFAULT 'internal'
    CHECK (assignment_type IN ('internal', 'staff_augmentation')),
  fte_allocation NUMERIC(5,3) NOT NULL DEFAULT 0,
  hours_per_month INTEGER,
  contracted_hours_month INTEGER,
  role_title_override TEXT,
  relevance_note_override TEXT,
  contact_channel_override TEXT,
  contact_handle_override TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS client_assignments_member_idx
  ON greenhouse_core.client_team_assignments (member_id) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS client_assignments_client_idx
  ON greenhouse_core.client_team_assignments (client_id) WHERE active = TRUE;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_team_assignments TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_core.client_team_assignments TO greenhouse_migrator;

-- Additive migration: add override columns if table already exists
DO $$
BEGIN
  ALTER TABLE greenhouse_core.client_team_assignments
    ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'internal';
  ALTER TABLE greenhouse_core.client_team_assignments
    ADD COLUMN IF NOT EXISTS contracted_hours_month INTEGER;
  ALTER TABLE greenhouse_core.client_team_assignments
    ADD COLUMN IF NOT EXISTS relevance_note_override TEXT;
  ALTER TABLE greenhouse_core.client_team_assignments
    ADD COLUMN IF NOT EXISTS contact_channel_override TEXT;
  ALTER TABLE greenhouse_core.client_team_assignments
    ADD COLUMN IF NOT EXISTS contact_handle_override TEXT;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_team_assignments_assignment_type_check'
  ) THEN
    ALTER TABLE greenhouse_core.client_team_assignments
      ADD CONSTRAINT client_team_assignments_assignment_type_check
      CHECK (assignment_type IN ('internal', 'staff_augmentation'));
  END IF;
END $$;
