-- ============================================================
-- Greenhouse Campaigns — PostgreSQL Canonical Setup
-- ============================================================
-- Ref:
--   - docs/tasks/complete/TASK-017-campaign-360.md
--   - docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md
-- Run:
--   - pnpm setup:postgres:campaigns
-- ============================================================

CREATE TABLE IF NOT EXISTS greenhouse_core.campaigns (
  campaign_id TEXT PRIMARY KEY,
  eo_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),
  display_name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'campaign'
    CHECK (campaign_type IN ('campaign', 'launch', 'seasonal', 'sprint_group', 'always_on')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'planning', 'active', 'paused', 'completed', 'archived')),
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  planned_launch_date DATE,
  actual_launch_date DATE,
  owner_user_id TEXT,
  created_by_user_id TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  channels TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  budget_clp NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'CLP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE greenhouse_core.campaigns
  ADD COLUMN IF NOT EXISTS budget_clp NUMERIC(14, 2);

ALTER TABLE greenhouse_core.campaigns
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CLP';

CREATE INDEX IF NOT EXISTS idx_campaigns_space_id
  ON greenhouse_core.campaigns (space_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_status
  ON greenhouse_core.campaigns (status);

CREATE INDEX IF NOT EXISTS idx_campaigns_owner_user_id
  ON greenhouse_core.campaigns (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_type
  ON greenhouse_core.campaigns (campaign_type);

CREATE TABLE IF NOT EXISTS greenhouse_core.campaign_project_links (
  campaign_project_link_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES greenhouse_core.campaigns(campaign_id) ON DELETE CASCADE,
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),
  project_source_system TEXT NOT NULL DEFAULT 'notion',
  project_source_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_campaign_project_space UNIQUE (space_id, project_source_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_project_links_campaign_id
  ON greenhouse_core.campaign_project_links (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_project_links_space_project
  ON greenhouse_core.campaign_project_links (space_id, project_source_id);

CREATE SEQUENCE IF NOT EXISTS greenhouse_core.campaigns_eo_id_seq START WITH 1;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.campaigns TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_core.campaigns TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.campaign_project_links TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_core.campaign_project_links TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_core.campaigns_eo_id_seq TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_core.campaigns_eo_id_seq TO greenhouse_migrator;

INSERT INTO greenhouse_sync.schema_migrations (
  migration_id,
  migration_group,
  applied_by,
  notes
)
VALUES (
  'campaign-360-v1',
  'campaigns',
  CURRENT_USER,
  'Campaign 360 canonical schema: campaigns, campaign_project_links, EO-ID sequence, budget columns, runtime/migrator grants.'
)
ON CONFLICT (migration_id) DO UPDATE
SET
  migration_group = EXCLUDED.migration_group,
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes,
  applied_at = CURRENT_TIMESTAMP;
