-- ════════════════════════════════════════════════════════════════════════════
-- Space → Notion Database Mapping — PostgreSQL DDL
-- ════════════════════════════════════════════════════════════════════════════
--
-- This migration:
--   1. Creates greenhouse_core.space_notion_sources (Space → Notion DB IDs)
--   2. Seeds Efeonce's mapping with the 4 known database IDs
--   3. Grants RBAC permissions
--   4. Logs migration
--
-- Prerequisite: Account 360 M0 (greenhouse_core.spaces must exist)
-- Safe to run multiple times (all operations are idempotent).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Core table: space_notion_sources ──────────────────────────────────
-- Maps each Space (Account 360 tenant) to its Notion database IDs.
-- The pipeline (notion-bigquery) iterates over this table to know which
-- databases to sync and which space_id to stamp on each row.
--
-- Complementary to notion_workspace_source_bindings (legacy, FK to
-- notion_workspaces). This table FK's to the new Account 360 spaces table.

CREATE TABLE IF NOT EXISTS greenhouse_core.space_notion_sources (
  source_id             TEXT PRIMARY KEY,    -- format: sns-{uuid}
  space_id              TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),

  -- Notion database IDs (32-char hex, no dashes)
  -- notion_db_proyectos is the conceptual root — all projects for the Space
  -- live here. Tasks, sprints, and reviews hang from projects via relations.
  notion_db_proyectos   VARCHAR(32) NOT NULL,
  notion_db_tareas      VARCHAR(32) NOT NULL,
  notion_db_sprints     VARCHAR(32),            -- nullable: not all clients use sprints
  notion_db_revisiones  VARCHAR(32),            -- nullable: not all clients have a reviews DB

  -- Metadata
  notion_workspace_id   VARCHAR(36),            -- Notion workspace UUID (informational)
  sync_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  sync_frequency        VARCHAR(20) NOT NULL DEFAULT 'daily',
  last_synced_at        TIMESTAMPTZ,

  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by            VARCHAR(100),

  -- One Space = one set of Notion databases
  CONSTRAINT space_notion_sources_space_unique UNIQUE(space_id)
);

-- Index for the pipeline query: WHERE sync_enabled = true
CREATE INDEX IF NOT EXISTS idx_space_notion_active
  ON greenhouse_core.space_notion_sources(sync_enabled)
  WHERE sync_enabled = TRUE;

COMMENT ON TABLE greenhouse_core.space_notion_sources IS
  'Maps Space (Account 360 tenant) → Notion database IDs. The notion-bigquery pipeline iterates over this table to sync each Space''s databases. Complementary to notion_workspace_source_bindings (legacy FK to notion_workspaces).';

COMMENT ON COLUMN greenhouse_core.space_notion_sources.notion_db_proyectos IS
  'Database ID of the client''s Proyectos base in Notion. Conceptual root — tasks, sprints, and reviews derive from projects via Notion relations.';

COMMENT ON COLUMN greenhouse_core.space_notion_sources.space_id IS
  'FK to greenhouse_core.spaces(space_id). One Space = one tenant boundary = one set of Notion databases.';

-- ── 2. Seed data: Efeonce ────────────────────────────────────────────────
-- Efeonce is treated as its own client — the first Space configured.
-- Database IDs match notion-bigquery/.env.yaml and notion-frame-io config.

INSERT INTO greenhouse_core.space_notion_sources (
  source_id, space_id,
  notion_db_proyectos, notion_db_tareas, notion_db_sprints, notion_db_revisiones,
  sync_enabled, created_by
)
SELECT
  'sns-' || gen_random_uuid(),
  s.space_id,
  '15288d9b145940529acc75439bbd5470',   -- Proyectos (NOTION_DB_PROYECTOS)
  '3a54f0904be14158833533ba96557a73',   -- Tareas    (NOTION_DB_TAREAS)
  '0c40f928047a4879ae702bfd0183520d',   -- Sprints   (NOTION_DB_SPRINTS)
  'f791ecc4f84c4cfc9d19fe0d42ec9a7f',   -- Revisiones(NOTION_DB_REVISIONES)
  TRUE,
  'julio-admin'
FROM greenhouse_core.spaces s
WHERE s.client_id = 'space-efeonce'
  AND NOT EXISTS (
    SELECT 1 FROM greenhouse_core.space_notion_sources sns
    WHERE sns.space_id = s.space_id
  );

-- ── 3. RBAC grants ───────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.space_notion_sources TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_core.space_notion_sources TO greenhouse_migrator;

-- ── 4. Migration log ─────────────────────────────────────────────────────

INSERT INTO greenhouse_sync.schema_migrations (
  migration_id,
  migration_group,
  applied_by,
  notes
)
VALUES (
  'space-notion-sources-v1',
  'notion-mapping',
  CURRENT_USER,
  'Space → Notion Database Mapping v1: space_notion_sources table + Efeonce seed. Prerequisite for multi-tenant notion-bigquery pipeline and ICO Engine.'
)
ON CONFLICT (migration_id) DO UPDATE
SET
  migration_group = EXCLUDED.migration_group,
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes,
  applied_at = CURRENT_TIMESTAMP;
