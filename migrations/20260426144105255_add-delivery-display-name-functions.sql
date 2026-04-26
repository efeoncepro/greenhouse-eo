-- Up Migration
--
-- Display-name fallback functions for greenhouse_delivery
-- =========================================================
--
-- TASK-588 established that NULL = "título desconocido" in Postgres
-- `greenhouse_delivery.{projects,tasks,sprints}.{project_name,task_name,sprint_name}`
-- and prohibited sentinel placeholders (`'sin nombre'`, `'untitled'`, ...) via CHECK
-- constraints. That keeps the data layer pure but pushes the burden onto every
-- consumer (UIs, ICO, agency views, exports, MCP tools, mobile app, ...) to handle
-- nulls gracefully — which historically led to inconsistent labels like "Sin
-- nombre", empty strings, "—", etc.
--
-- These IMMUTABLE functions are the **single source of truth** for the
-- user-visible display name when the canonical title is null. They produce a
-- data-derived fallback (NOT a sentinel — it is unique per page and contains
-- the page's own source ID) so:
--
--   * The result is grep-able and traceable back to the Notion page.
--   * It does NOT violate the anti-sentinel CHECK constraints (those guard
--     `*_name` columns; these functions return a *derived* display value).
--   * Re-running the function with the same input produces the same output
--     (IMMUTABLE), so it's safe to use in indexes, generated columns, or
--     deduplication.
--
-- ⚠️ FOR AGENTS / FUTURE DEVS:
--   - The TypeScript helper in `src/lib/delivery/task-display.ts` MUST mirror
--     these functions bit-for-bit. Parity is regression-tested.
--   - Do NOT inline `COALESCE(task_name, 'Sin nombre')` anywhere — use these
--     functions or the TS helper. Sentinels were explicitly prohibited by
--     TASK-588.
--   - When the fallback format changes (e.g. include space name), update BOTH
--     this migration AND the TS helper AND bump the parity test.
--   - The BigQuery equivalents are runtime-created by
--     `ensureDeliveryDisplayNameUdfs()` in `src/lib/sync/sync-notion-conformed.ts`
--     so the same fallback flows through to BQ-side reports too.
--
-- The fallback format is intentionally short and Spanish-localized to match
-- the rest of the portal. The trailing 8-char short form of the source ID
-- gives users enough disambiguation when several untitled pages exist in a
-- single space.

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_display_name(
  task_name text,
  task_source_id text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(task_name), ''),
    'Tarea sin título · ' || LOWER(SUBSTRING(COALESCE(task_source_id, ''), 1, 8))
  )
$$;

COMMENT ON FUNCTION greenhouse_delivery.task_display_name(text, text) IS
'Canonical user-facing fallback for `greenhouse_delivery.tasks.task_name` when null. '
'TS mirror: src/lib/delivery/task-display.ts displayTaskName(). Parity is regression-tested. '
'Returns the trimmed task_name when present, else a deterministic data-derived label. '
'Does NOT violate the anti-sentinel CHECK constraints from TASK-588 — those guard '
'the canonical column, this function produces a derived display value.';

CREATE OR REPLACE FUNCTION greenhouse_delivery.project_display_name(
  project_name text,
  project_source_id text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(project_name), ''),
    'Proyecto sin título · ' || LOWER(SUBSTRING(COALESCE(project_source_id, ''), 1, 8))
  )
$$;

COMMENT ON FUNCTION greenhouse_delivery.project_display_name(text, text) IS
'Canonical user-facing fallback for `greenhouse_delivery.projects.project_name` when null. '
'TS mirror: src/lib/delivery/task-display.ts displayProjectName(). Parity is regression-tested.';

CREATE OR REPLACE FUNCTION greenhouse_delivery.sprint_display_name(
  sprint_name text,
  sprint_source_id text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(sprint_name), ''),
    'Sprint sin título · ' || LOWER(SUBSTRING(COALESCE(sprint_source_id, ''), 1, 8))
  )
$$;

COMMENT ON FUNCTION greenhouse_delivery.sprint_display_name(text, text) IS
'Canonical user-facing fallback for `greenhouse_delivery.sprints.sprint_name` when null. '
'TS mirror: src/lib/delivery/task-display.ts displaySprintName(). Parity is regression-tested.';

-- Down Migration

DROP FUNCTION IF EXISTS greenhouse_delivery.task_display_name(text, text);
DROP FUNCTION IF EXISTS greenhouse_delivery.project_display_name(text, text);
DROP FUNCTION IF EXISTS greenhouse_delivery.sprint_display_name(text, text);
