-- ════════════════════════════════════════════════════════════════════════════
-- Account 360 Object Model — M0: Schema Foundation
-- ════════════════════════════════════════════════════════════════════════════
--
-- This migration:
--   1. Renames greenhouse_core.spaces → notion_workspaces (Notion workspace semantics)
--   2. Renames greenhouse_core.space_source_bindings → notion_workspace_source_bindings
--   3. Creates greenhouse_core.organizations (new B2B entity)
--   4. Creates greenhouse_core.spaces (new — tenant operativo, hijo de Organization)
--   5. Creates greenhouse_core.person_memberships (contextual relationships)
--   6. Renames greenhouse_serving.space_360 → notion_workspace_360
--   7. Creates DB sequences for EO-ID generation
--
-- Safe to run multiple times (all operations are idempotent).
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- Step 1: Rename spaces → notion_workspaces
-- ──────────────────────────────────────────────────────────────────────────
-- PostgreSQL ALTER TABLE ... RENAME TO is transactional and instant.
-- We use DO blocks to make each rename idempotent.

DO $$
BEGIN
  -- Rename the table only if the old name exists and the new name does not
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'spaces'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'notion_workspaces'
  ) THEN
    ALTER TABLE greenhouse_core.spaces RENAME TO notion_workspaces;
    RAISE NOTICE 'Renamed greenhouse_core.spaces → notion_workspaces';
  ELSE
    RAISE NOTICE 'Skipped spaces rename (already done or source missing)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'space_source_bindings'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'notion_workspace_source_bindings'
  ) THEN
    ALTER TABLE greenhouse_core.space_source_bindings RENAME TO notion_workspace_source_bindings;
    RAISE NOTICE 'Renamed greenhouse_core.space_source_bindings → notion_workspace_source_bindings';
  ELSE
    RAISE NOTICE 'Skipped space_source_bindings rename (already done or source missing)';
  END IF;
END $$;

-- Rename the constraint on the bindings table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'space_source_bindings_unique'
      AND table_schema = 'greenhouse_core'
  ) THEN
    ALTER TABLE greenhouse_core.notion_workspace_source_bindings
      RENAME CONSTRAINT space_source_bindings_unique TO notion_workspace_source_bindings_unique;
    RAISE NOTICE 'Renamed constraint → notion_workspace_source_bindings_unique';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- Step 2: Drop and recreate the serving view with the new name
-- ──────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS greenhouse_serving.space_360;

CREATE OR REPLACE VIEW greenhouse_serving.notion_workspace_360 AS
SELECT
  nw.space_id       AS notion_workspace_id,
  nw.public_id,
  nw.space_name     AS notion_workspace_name,
  nw.space_type,
  nw.client_id,
  c.client_name,
  c.public_id       AS client_public_id,
  c.tenant_type,
  nw.primary_project_database_source_id,
  COALESCE(
    MAX(nwsb.source_object_id) FILTER (
      WHERE nwsb.active
        AND nwsb.binding_role = 'delivery_workspace'
        AND nwsb.source_system = 'notion'
        AND nwsb.source_object_type = 'project_database'
    ),
    nw.primary_project_database_source_id
  ) AS resolved_project_database_source_id,
  COUNT(DISTINCT nwsb.binding_id) FILTER (WHERE nwsb.active) AS source_binding_count,
  COUNT(DISTINCT cu.user_id) FILTER (WHERE cu.active) AS linked_user_count,
  nw.status,
  nw.active,
  nw.notes,
  nw.created_at,
  nw.updated_at
FROM greenhouse_core.notion_workspaces AS nw
LEFT JOIN greenhouse_core.clients AS c
  ON c.client_id = nw.client_id
LEFT JOIN greenhouse_core.notion_workspace_source_bindings AS nwsb
  ON nwsb.space_id = nw.space_id
LEFT JOIN greenhouse_core.client_users AS cu
  ON cu.client_id = nw.client_id
GROUP BY
  nw.space_id,
  nw.public_id,
  nw.space_name,
  nw.space_type,
  nw.client_id,
  c.client_name,
  c.public_id,
  c.tenant_type,
  nw.primary_project_database_source_id,
  nw.status,
  nw.active,
  nw.notes,
  nw.created_at,
  nw.updated_at;

-- ──────────────────────────────────────────────────────────────────────────
-- Step 3: CREATE TABLE organizations
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.organizations (
  organization_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  organization_name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  tax_id_type TEXT,
  industry TEXT,
  country TEXT DEFAULT 'CL',
  hubspot_company_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS organizations_hubspot_idx
  ON greenhouse_core.organizations (hubspot_company_id);

CREATE INDEX IF NOT EXISTS organizations_public_id_idx
  ON greenhouse_core.organizations (public_id);

CREATE INDEX IF NOT EXISTS organizations_status_idx
  ON greenhouse_core.organizations (status) WHERE active = TRUE;

-- ──────────────────────────────────────────────────────────────────────────
-- Step 4: CREATE TABLE spaces (new — tenant operativo)
-- ──────────────────────────────────────────────────────────────────────────
-- This is a NEW table, not the renamed one. It represents the operational
-- tenant concept (child of Organization), replacing the role of clients.

CREATE TABLE IF NOT EXISTS greenhouse_core.spaces (
  space_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  organization_id TEXT REFERENCES greenhouse_core.organizations(organization_id),
  client_id TEXT REFERENCES greenhouse_core.clients(client_id),
  space_name TEXT NOT NULL,
  space_type TEXT NOT NULL DEFAULT 'client_space'
    CHECK (space_type IN ('client_space', 'internal_space')),
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS spaces_organization_idx
  ON greenhouse_core.spaces (organization_id);

CREATE INDEX IF NOT EXISTS spaces_client_bridge_idx
  ON greenhouse_core.spaces (client_id);

CREATE INDEX IF NOT EXISTS spaces_status_idx
  ON greenhouse_core.spaces (status) WHERE active = TRUE;

-- ──────────────────────────────────────────────────────────────────────────
-- Step 5: CREATE TABLE person_memberships
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.person_memberships (
  membership_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  profile_id TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id),
  organization_id TEXT REFERENCES greenhouse_core.organizations(organization_id),
  space_id TEXT REFERENCES greenhouse_core.spaces(space_id),
  membership_type TEXT NOT NULL DEFAULT 'team_member'
    CHECK (membership_type IN ('team_member', 'client_contact', 'contractor', 'partner', 'advisor')),
  role_label TEXT,
  department TEXT,
  start_date DATE,
  end_date DATE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS person_memberships_profile_idx
  ON greenhouse_core.person_memberships (profile_id);

CREATE INDEX IF NOT EXISTS person_memberships_organization_idx
  ON greenhouse_core.person_memberships (organization_id);

CREATE INDEX IF NOT EXISTS person_memberships_space_idx
  ON greenhouse_core.person_memberships (space_id);

CREATE INDEX IF NOT EXISTS person_memberships_type_idx
  ON greenhouse_core.person_memberships (membership_type) WHERE active = TRUE;

-- ──────────────────────────────────────────────────────────────────────────
-- Step 6: DB sequences for EO-ID public IDs
-- ──────────────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS greenhouse_core.seq_organization_public_id START 1;
CREATE SEQUENCE IF NOT EXISTS greenhouse_core.seq_space_public_id START 1;
CREATE SEQUENCE IF NOT EXISTS greenhouse_core.seq_membership_public_id START 1;

-- ──────────────────────────────────────────────────────────────────────────
-- Step 7: Grants for new tables
-- ──────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_core.organizations,
     greenhouse_core.spaces,
     greenhouse_core.person_memberships
  TO greenhouse_app;

GRANT SELECT, REFERENCES
  ON greenhouse_core.organizations,
     greenhouse_core.spaces,
     greenhouse_core.person_memberships
  TO greenhouse_runtime;

GRANT SELECT, REFERENCES
  ON greenhouse_core.organizations,
     greenhouse_core.spaces,
     greenhouse_core.person_memberships
  TO greenhouse_migrator;

GRANT SELECT
  ON greenhouse_serving.notion_workspace_360
  TO greenhouse_app, greenhouse_runtime;

GRANT USAGE ON SEQUENCE
  greenhouse_core.seq_organization_public_id,
  greenhouse_core.seq_space_public_id,
  greenhouse_core.seq_membership_public_id
  TO greenhouse_app, greenhouse_runtime, greenhouse_migrator;
