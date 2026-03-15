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
  fte_allocation NUMERIC(5,3) NOT NULL DEFAULT 0,
  hours_per_month INTEGER,
  role_title_override TEXT,
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
