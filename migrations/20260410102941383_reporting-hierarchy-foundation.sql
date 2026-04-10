-- Up Migration

SET search_path = greenhouse_core, public;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS greenhouse_core.reporting_lines (
  reporting_line_id    TEXT PRIMARY KEY,
  member_id            TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  supervisor_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  effective_from       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_to         TIMESTAMPTZ,
  source_system        TEXT NOT NULL DEFAULT 'greenhouse_manual',
  source_metadata      JSONB NOT NULL DEFAULT '{}'::JSONB,
  change_reason        TEXT NOT NULL DEFAULT 'unspecified',
  changed_by_user_id   TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reporting_lines_no_self_reference_check CHECK (
    supervisor_member_id IS NULL OR member_id <> supervisor_member_id
  ),
  CONSTRAINT reporting_lines_effective_window_check CHECK (
    effective_to IS NULL OR effective_to > effective_from
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reporting_lines_current_member
  ON greenhouse_core.reporting_lines (member_id)
  WHERE effective_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_reporting_lines_current_supervisor
  ON greenhouse_core.reporting_lines (supervisor_member_id, member_id)
  WHERE effective_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_reporting_lines_member_history
  ON greenhouse_core.reporting_lines (member_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_reporting_lines_supervisor_history
  ON greenhouse_core.reporting_lines (supervisor_member_id, effective_from DESC);

ALTER TABLE greenhouse_core.reporting_lines
  DROP CONSTRAINT IF EXISTS reporting_lines_no_overlap;

ALTER TABLE greenhouse_core.reporting_lines
  ADD CONSTRAINT reporting_lines_no_overlap
  EXCLUDE USING gist (
    member_id WITH =,
    tstzrange(effective_from, COALESCE(effective_to, 'infinity'::timestamptz), '[)') WITH &&
  );

ALTER TABLE greenhouse_core.operational_responsibilities
  DROP CONSTRAINT IF EXISTS operational_responsibilities_scope_type_check;

ALTER TABLE greenhouse_core.operational_responsibilities
  ADD CONSTRAINT operational_responsibilities_scope_type_check CHECK (
    scope_type = ANY (ARRAY[
      'organization'::TEXT,
      'space'::TEXT,
      'project'::TEXT,
      'department'::TEXT,
      'member'::TEXT
    ])
  );

INSERT INTO greenhouse_core.reporting_lines (
  reporting_line_id,
  member_id,
  supervisor_member_id,
  effective_from,
  source_system,
  source_metadata,
  change_reason,
  changed_by_user_id
)
SELECT
  'rpt-' || gen_random_uuid()::TEXT,
  m.member_id,
  m.reports_to_member_id,
  COALESCE(m.updated_at, m.created_at, CURRENT_TIMESTAMP),
  'members_snapshot_backfill',
  jsonb_build_object(
    'backfill', TRUE,
    'source_column', 'greenhouse_core.members.reports_to_member_id'
  ),
  'backfill_from_members_reports_to_member_id',
  NULL
FROM greenhouse_core.members AS m
WHERE NOT EXISTS (
  SELECT 1
  FROM greenhouse_core.reporting_lines AS rl
  WHERE rl.member_id = m.member_id
    AND rl.effective_to IS NULL
);

CREATE OR REPLACE FUNCTION greenhouse_core.touch_reporting_lines_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_core.sync_current_reports_to_snapshot(target_member_id TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_supervisor_member_id TEXT;
BEGIN
  SELECT rl.supervisor_member_id
  INTO resolved_supervisor_member_id
  FROM greenhouse_core.reporting_lines AS rl
  WHERE rl.member_id = target_member_id
    AND rl.effective_from <= CURRENT_TIMESTAMP
    AND (rl.effective_to IS NULL OR rl.effective_to > CURRENT_TIMESTAMP)
  ORDER BY rl.effective_from DESC, rl.created_at DESC
  LIMIT 1;

  UPDATE greenhouse_core.members
  SET
    reports_to_member_id = resolved_supervisor_member_id,
    updated_at = CURRENT_TIMESTAMP
  WHERE member_id = target_member_id
    AND reports_to_member_id IS DISTINCT FROM resolved_supervisor_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_core.reporting_lines_sync_snapshot_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM greenhouse_core.sync_current_reports_to_snapshot(OLD.member_id);
    RETURN OLD;
  END IF;

  PERFORM greenhouse_core.sync_current_reports_to_snapshot(NEW.member_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reporting_lines_touch_updated_at ON greenhouse_core.reporting_lines;
CREATE TRIGGER trg_reporting_lines_touch_updated_at
  BEFORE UPDATE ON greenhouse_core.reporting_lines
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_core.touch_reporting_lines_updated_at();

DROP TRIGGER IF EXISTS trg_reporting_lines_sync_snapshot ON greenhouse_core.reporting_lines;
CREATE TRIGGER trg_reporting_lines_sync_snapshot
  AFTER INSERT OR UPDATE OR DELETE ON greenhouse_core.reporting_lines
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_core.reporting_lines_sync_snapshot_trigger();

-- Down Migration

DROP TRIGGER IF EXISTS trg_reporting_lines_sync_snapshot ON greenhouse_core.reporting_lines;
DROP TRIGGER IF EXISTS trg_reporting_lines_touch_updated_at ON greenhouse_core.reporting_lines;

DROP FUNCTION IF EXISTS greenhouse_core.reporting_lines_sync_snapshot_trigger();
DROP FUNCTION IF EXISTS greenhouse_core.sync_current_reports_to_snapshot(TEXT);
DROP FUNCTION IF EXISTS greenhouse_core.touch_reporting_lines_updated_at();

ALTER TABLE greenhouse_core.operational_responsibilities
  DROP CONSTRAINT IF EXISTS operational_responsibilities_scope_type_check;

ALTER TABLE greenhouse_core.operational_responsibilities
  ADD CONSTRAINT operational_responsibilities_scope_type_check CHECK (
    scope_type = ANY (ARRAY[
      'organization'::TEXT,
      'space'::TEXT,
      'project'::TEXT,
      'department'::TEXT
    ])
  );

DROP INDEX IF EXISTS greenhouse_core.idx_reporting_lines_supervisor_history;
DROP INDEX IF EXISTS greenhouse_core.idx_reporting_lines_member_history;
DROP INDEX IF EXISTS greenhouse_core.idx_reporting_lines_current_supervisor;
DROP INDEX IF EXISTS greenhouse_core.idx_reporting_lines_current_member;

DROP TABLE IF EXISTS greenhouse_core.reporting_lines;
