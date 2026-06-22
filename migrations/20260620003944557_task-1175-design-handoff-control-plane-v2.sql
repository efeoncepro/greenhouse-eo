-- Up Migration

-- TASK-1175 — Design Handoff Control Plane V2.
--
-- Additive hardening over TASK-1120:
-- - planning/ownership fields on the entry aggregate;
-- - in_review lifecycle state;
-- - typed links, evidence and Figma verification snapshots;
-- - DB-level implemented evidence guard;
-- - fine-grained capabilities for API-parity commands.

ALTER TABLE greenhouse_core.design_handoff_entries
  ADD COLUMN IF NOT EXISTS designer_owner_member_id TEXT,
  ADD COLUMN IF NOT EXISTS dev_owner_member_id TEXT,
  ADD COLUMN IF NOT EXISTS review_owner_member_id TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS target_surface_key TEXT,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

ALTER TABLE greenhouse_core.design_handoff_entries
  DROP CONSTRAINT IF EXISTS design_handoff_entries_status_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_priority_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_implemented_surface_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_target_surface_check;

ALTER TABLE greenhouse_core.design_handoff_entries
  ADD CONSTRAINT design_handoff_entries_status_check
    CHECK (status IN ('proposed', 'in_implementation', 'in_review', 'implemented', 'archived')),
  ADD CONSTRAINT design_handoff_entries_priority_check
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD CONSTRAINT design_handoff_entries_implemented_surface_check
    CHECK (
      (status = 'implemented' AND implemented_surface_key IS NOT NULL AND length(trim(implemented_surface_key)) > 0)
      OR status <> 'implemented'
    ),
  ADD CONSTRAINT design_handoff_entries_target_surface_check
    CHECK (
      target_surface_key IS NULL
      OR (
        target_surface_key LIKE '/%'
        AND target_surface_key NOT LIKE '%://%'
      )
    );

CREATE INDEX IF NOT EXISTS idx_design_handoff_entries_owner_status
  ON greenhouse_core.design_handoff_entries (designer_owner_member_id, dev_owner_member_id, review_owner_member_id, status);

CREATE INDEX IF NOT EXISTS idx_design_handoff_entries_target_surface
  ON greenhouse_core.design_handoff_entries (target_surface_key)
  WHERE target_surface_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS greenhouse_core.design_handoff_entry_links (
  link_id        TEXT PRIMARY KEY,
  entry_id       TEXT NOT NULL REFERENCES greenhouse_core.design_handoff_entries(entry_id) ON DELETE CASCADE,
  link_type      TEXT NOT NULL
    CONSTRAINT design_handoff_entry_links_type_check
    CHECK (link_type IN ('task', 'pull_request', 'commit', 'deployment', 'route', 'figma_comment', 'external')),
  label          TEXT CHECK (label IS NULL OR length(trim(label)) > 0),
  ref            TEXT NOT NULL CHECK (length(trim(ref)) > 0),
  created_by     TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json  JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_design_handoff_entry_links_unique_ref
  ON greenhouse_core.design_handoff_entry_links (entry_id, link_type, ref);

CREATE INDEX IF NOT EXISTS idx_design_handoff_entry_links_entry
  ON greenhouse_core.design_handoff_entry_links (entry_id, created_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_core.design_handoff_entry_evidence (
  evidence_id    TEXT PRIMARY KEY,
  entry_id       TEXT NOT NULL REFERENCES greenhouse_core.design_handoff_entries(entry_id) ON DELETE CASCADE,
  evidence_type  TEXT NOT NULL
    CONSTRAINT design_handoff_entry_evidence_type_check
    CHECK (evidence_type IN ('gvc_capture', 'runtime_route', 'visual_review', 'accessibility_review', 'manual_exception')),
  label          TEXT CHECK (label IS NULL OR length(trim(label)) > 0),
  ref            TEXT NOT NULL CHECK (length(trim(ref)) > 0),
  created_by     TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json  JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_design_handoff_entry_evidence_unique_ref
  ON greenhouse_core.design_handoff_entry_evidence (entry_id, evidence_type, ref);

CREATE INDEX IF NOT EXISTS idx_design_handoff_entry_evidence_entry
  ON greenhouse_core.design_handoff_entry_evidence (entry_id, created_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_core.design_handoff_node_snapshots (
  snapshot_id      TEXT PRIMARY KEY,
  entry_id         TEXT NOT NULL REFERENCES greenhouse_core.design_handoff_entries(entry_id) ON DELETE CASCADE,
  file_key         TEXT NOT NULL,
  node_id          TEXT NOT NULL CHECK (node_id ~ '^[0-9]+:[0-9]+$'),
  expected_name    TEXT,
  observed_name    TEXT,
  node_status      TEXT NOT NULL
    CONSTRAINT design_handoff_node_snapshots_status_check
    CHECK (node_status IN ('reachable', 'renamed', 'deleted', 'unavailable', 'stale', 'unknown')),
  render_url       TEXT,
  render_hash      TEXT,
  provider_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json    JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_design_handoff_node_snapshots_entry
  ON greenhouse_core.design_handoff_node_snapshots (entry_id, provider_checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_design_handoff_node_snapshots_status
  ON greenhouse_core.design_handoff_node_snapshots (node_status, provider_checked_at DESC);

ALTER TABLE greenhouse_core.design_handoff_entry_events
  DROP CONSTRAINT IF EXISTS design_handoff_entry_events_event_type_check;

ALTER TABLE greenhouse_core.design_handoff_entry_events
  ADD CONSTRAINT design_handoff_entry_events_event_type_check
    CHECK (
      event_type IN (
        'registered',
        'transitioned',
        'archived',
        'allowlist_upserted',
        'allowlist_deprecated',
        'owner_assigned',
        'planning_updated',
        'work_item_linked',
        'evidence_attached',
        'figma_node_verified'
      )
    );

CREATE OR REPLACE FUNCTION greenhouse_core.validate_design_handoff_entry_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  has_implementation_evidence boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'archived' THEN
    RAISE EXCEPTION 'design_handoff_entries status archived is terminal'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.status = 'archived' THEN
    NEW.archived_at := COALESCE(NEW.archived_at, NOW());
    RETURN NEW;
  END IF;

  IF OLD.status = 'proposed' AND NEW.status = 'in_implementation' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'in_implementation' AND NEW.status = 'in_review' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'in_review' AND NEW.status = 'implemented' THEN
    SELECT EXISTS (
      SELECT 1
      FROM greenhouse_core.design_handoff_entry_evidence evidence
      WHERE evidence.entry_id = NEW.entry_id
        AND evidence.evidence_type IN ('gvc_capture', 'runtime_route', 'manual_exception')
    ) INTO has_implementation_evidence;

    IF NOT has_implementation_evidence THEN
      RAISE EXCEPTION 'design_handoff_entries implemented requires runtime evidence'
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid design_handoff_entries transition: % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_core.design_handoff_append_only_prevent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'design handoff append-only table does not allow UPDATE'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_core.design_handoff_append_only_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'design handoff append-only table does not allow DELETE'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_design_handoff_entry_links_no_update
BEFORE UPDATE ON greenhouse_core.design_handoff_entry_links
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.design_handoff_append_only_prevent_update();

CREATE TRIGGER trg_design_handoff_entry_links_no_delete
BEFORE DELETE ON greenhouse_core.design_handoff_entry_links
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.design_handoff_append_only_prevent_delete();

CREATE TRIGGER trg_design_handoff_entry_evidence_no_update
BEFORE UPDATE ON greenhouse_core.design_handoff_entry_evidence
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.design_handoff_append_only_prevent_update();

CREATE TRIGGER trg_design_handoff_entry_evidence_no_delete
BEFORE DELETE ON greenhouse_core.design_handoff_entry_evidence
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.design_handoff_append_only_prevent_delete();

CREATE TRIGGER trg_design_handoff_node_snapshots_no_update
BEFORE UPDATE ON greenhouse_core.design_handoff_node_snapshots
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.design_handoff_append_only_prevent_update();

CREATE TRIGGER trg_design_handoff_node_snapshots_no_delete
BEFORE DELETE ON greenhouse_core.design_handoff_node_snapshots
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.design_handoff_append_only_prevent_delete();

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entry_links TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entry_links TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entry_links TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entry_evidence TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entry_evidence TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entry_evidence TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_node_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_node_snapshots TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_node_snapshots TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_core.validate_design_handoff_entry_transition() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_core.design_handoff_append_only_prevent_update() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_core.design_handoff_append_only_prevent_delete() TO greenhouse_runtime;

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, deprecated_at)
VALUES
  ('design_system.handoff.allowlist.manage',
   'design_system',
   ARRAY['create', 'update'],
   ARRAY['tenant'],
   'Administrar el allowlist de archivos Figma autorizados para handoff de producto.',
   NULL),
  ('design_system.handoff.owner.assign',
   'design_system',
   ARRAY['update'],
   ARRAY['tenant'],
   'Asignar responsables de diseño o desarrollo a un handoff de producto.',
   NULL),
  ('design_system.handoff.planning.update',
   'design_system',
   ARRAY['update'],
   ARRAY['tenant'],
   'Actualizar prioridad, target surface, fechas y bloqueo operativo de un handoff de producto.',
   NULL),
  ('design_system.handoff.link',
   'design_system',
   ARRAY['create'],
   ARRAY['tenant'],
   'Vincular work items, PRs, commits, deploys y rutas a un handoff de producto.',
   NULL),
  ('design_system.handoff.evidence.attach',
   'design_system',
   ARRAY['create'],
   ARRAY['tenant'],
   'Adjuntar evidencia de runtime, GVC, review o excepción gobernada a un handoff.',
   NULL),
  ('design_system.handoff.verify',
   'design_system',
   ARRAY['update'],
   ARRAY['tenant'],
   'Verificar el estado del nodo Figma asociado a un handoff de producto.',
   NULL),
  ('design_system.handoff.drift.read',
   'design_system',
   ARRAY['read'],
   ARRAY['tenant'],
   'Leer drift y señales operativas del control plane de handoff de diseño.',
   NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL,
  introduced_at = COALESCE(greenhouse_core.capabilities_registry.introduced_at, NOW());

DO $$
DECLARE
  has_links boolean;
  has_evidence boolean;
  has_snapshots boolean;
  cap_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'design_handoff_entry_links'
  ) INTO has_links;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'design_handoff_entry_evidence'
  ) INTO has_evidence;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'design_handoff_node_snapshots'
  ) INTO has_snapshots;

  IF NOT has_links OR NOT has_evidence OR NOT has_snapshots THEN
    RAISE EXCEPTION 'TASK-1175 anti pre-up-marker: expected handoff V2 tables were not created.';
  END IF;

  SELECT COUNT(*) INTO cap_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'design_system.handoff.allowlist.manage',
    'design_system.handoff.owner.assign',
    'design_system.handoff.planning.update',
    'design_system.handoff.link',
    'design_system.handoff.evidence.attach',
    'design_system.handoff.verify',
    'design_system.handoff.drift.read'
  )
  AND module = 'design_system'
  AND deprecated_at IS NULL;

  IF cap_count <> 7 THEN
    RAISE EXCEPTION 'TASK-1175 anti pre-up-marker: expected 7 design_system.handoff V2 capabilities, got %', cap_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'design_system.handoff.allowlist.manage',
  'design_system.handoff.owner.assign',
  'design_system.handoff.planning.update',
  'design_system.handoff.link',
  'design_system.handoff.evidence.attach',
  'design_system.handoff.verify',
  'design_system.handoff.drift.read'
);

DROP TRIGGER IF EXISTS trg_design_handoff_node_snapshots_no_delete ON greenhouse_core.design_handoff_node_snapshots;
DROP TRIGGER IF EXISTS trg_design_handoff_node_snapshots_no_update ON greenhouse_core.design_handoff_node_snapshots;
DROP TRIGGER IF EXISTS trg_design_handoff_entry_evidence_no_delete ON greenhouse_core.design_handoff_entry_evidence;
DROP TRIGGER IF EXISTS trg_design_handoff_entry_evidence_no_update ON greenhouse_core.design_handoff_entry_evidence;
DROP TRIGGER IF EXISTS trg_design_handoff_entry_links_no_delete ON greenhouse_core.design_handoff_entry_links;
DROP TRIGGER IF EXISTS trg_design_handoff_entry_links_no_update ON greenhouse_core.design_handoff_entry_links;

DROP FUNCTION IF EXISTS greenhouse_core.design_handoff_append_only_prevent_delete();
DROP FUNCTION IF EXISTS greenhouse_core.design_handoff_append_only_prevent_update();

DROP TABLE IF EXISTS greenhouse_core.design_handoff_node_snapshots;
DROP TABLE IF EXISTS greenhouse_core.design_handoff_entry_evidence;
DROP TABLE IF EXISTS greenhouse_core.design_handoff_entry_links;

ALTER TABLE greenhouse_core.design_handoff_entry_events
  DROP CONSTRAINT IF EXISTS design_handoff_entry_events_event_type_check;

ALTER TABLE greenhouse_core.design_handoff_entry_events
  ADD CONSTRAINT design_handoff_entry_events_event_type_check
    CHECK (event_type IN ('registered', 'transitioned', 'archived'));

CREATE OR REPLACE FUNCTION greenhouse_core.validate_design_handoff_entry_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'archived' THEN
    RAISE EXCEPTION 'design_handoff_entries status archived is terminal'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.status = 'archived' THEN
    NEW.archived_at := COALESCE(NEW.archived_at, NOW());
    RETURN NEW;
  END IF;

  IF OLD.status = 'proposed' AND NEW.status = 'in_implementation' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'in_implementation' AND NEW.status = 'implemented' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid design_handoff_entries transition: % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;

ALTER TABLE greenhouse_core.design_handoff_entries
  DROP CONSTRAINT IF EXISTS design_handoff_entries_target_surface_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_implemented_surface_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_priority_check,
  DROP CONSTRAINT IF EXISTS design_handoff_entries_status_check;

UPDATE greenhouse_core.design_handoff_entries
SET status = 'in_implementation'
WHERE status = 'in_review';

ALTER TABLE greenhouse_core.design_handoff_entries
  ADD CONSTRAINT design_handoff_entries_status_check
    CHECK (status IN ('proposed', 'in_implementation', 'implemented', 'archived')),
  ADD CONSTRAINT design_handoff_entries_implemented_surface_check
    CHECK (
      (status = 'implemented' AND implemented_surface_key IS NOT NULL AND length(trim(implemented_surface_key)) > 0)
      OR status <> 'implemented'
    );

DROP INDEX IF EXISTS greenhouse_core.idx_design_handoff_entries_target_surface;
DROP INDEX IF EXISTS greenhouse_core.idx_design_handoff_entries_owner_status;

ALTER TABLE greenhouse_core.design_handoff_entries
  DROP COLUMN IF EXISTS blocked_reason,
  DROP COLUMN IF EXISTS due_at,
  DROP COLUMN IF EXISTS target_surface_key,
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS review_owner_member_id,
  DROP COLUMN IF EXISTS dev_owner_member_id,
  DROP COLUMN IF EXISTS designer_owner_member_id;
