-- ══════════════════════════════════════════════════════
-- Campaign 360 — Canonical Campaign Object
-- Ref: TASK-017-campaign-360.md
-- Run: psql $DATABASE_URL -f scripts/setup-postgres-campaigns.sql
-- ══════════════════════════════════════════════════════

-- ── 1. Campaigns table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.campaigns (
  campaign_id           TEXT PRIMARY KEY,
  eo_id                 TEXT NOT NULL UNIQUE,
  slug                  TEXT NOT NULL UNIQUE,

  space_id              TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),

  display_name          TEXT NOT NULL,
  description           TEXT,
  campaign_type         TEXT NOT NULL DEFAULT 'campaign'
    CHECK (campaign_type IN ('campaign', 'launch', 'seasonal', 'sprint_group', 'always_on')),
  status                TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'planning', 'active', 'paused', 'completed', 'archived')),

  planned_start_date    DATE,
  planned_end_date      DATE,
  actual_start_date     DATE,
  actual_end_date       DATE,
  planned_launch_date   DATE,
  actual_launch_date    DATE,

  owner_user_id         TEXT,
  created_by_user_id    TEXT,

  tags                  TEXT[] NOT NULL DEFAULT '{}',
  channels              TEXT[] NOT NULL DEFAULT '{}',
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_space_id ON greenhouse_core.campaigns(space_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON greenhouse_core.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON greenhouse_core.campaigns(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON greenhouse_core.campaigns(campaign_type);

-- ── 2. Campaign ↔ Project links ──────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.campaign_project_links (
  campaign_project_link_id TEXT PRIMARY KEY,
  campaign_id              TEXT NOT NULL REFERENCES greenhouse_core.campaigns(campaign_id),
  space_id                 TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),

  -- project_source_id = notion_page_id from delivery_projects
  project_source_system    TEXT NOT NULL DEFAULT 'notion',
  project_source_id        TEXT NOT NULL,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A project can belong to at most 1 active campaign per space
  CONSTRAINT uq_campaign_project_space UNIQUE (space_id, project_source_id)
);

CREATE INDEX IF NOT EXISTS idx_cpl_campaign_id ON greenhouse_core.campaign_project_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cpl_space_project ON greenhouse_core.campaign_project_links(space_id, project_source_id);

-- ── 3. EO-ID sequence ────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS greenhouse_core.campaigns_eo_id_seq START WITH 1;

-- ── 4. Grants ────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.campaigns TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.campaigns TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.campaign_project_links TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.campaign_project_links TO greenhouse_ops;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_core.campaigns_eo_id_seq TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_core.campaigns_eo_id_seq TO greenhouse_ops;
