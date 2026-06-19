-- Up Migration

-- TASK-1120 — Design Handoff Registry.
--
-- Aggregate separado del linking AXIS-only `design_system_figma_nodes` (TASK-1072).
-- Producto usa un allowlist gobernado propio; AXIS NO entra acá. V1 nace fail-closed:
-- sin filas activas en `design_handoff_allowed_files`, ningún file_key de producto
-- puede registrarse aunque el token Figma tenga acceso.

CREATE TABLE IF NOT EXISTS greenhouse_core.design_handoff_allowed_files (
  file_key       TEXT PRIMARY KEY
    CHECK (file_key <> 'yyMksCoijfMaIoYplXKZaR'),
  file_label     TEXT NOT NULL CHECK (length(trim(file_label)) > 0),
  added_by       TEXT NOT NULL,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at  TIMESTAMPTZ,
  metadata_json  JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_design_handoff_allowed_files_active
  ON greenhouse_core.design_handoff_allowed_files (file_key)
  WHERE superseded_at IS NULL;

CREATE TABLE IF NOT EXISTS greenhouse_core.design_handoff_entries (
  entry_id                 TEXT PRIMARY KEY,
  title                    TEXT NOT NULL CHECK (length(trim(title)) > 0),
  kind                     TEXT NOT NULL CHECK (kind IN ('page', 'component')),
  file_key                 TEXT NOT NULL REFERENCES greenhouse_core.design_handoff_allowed_files(file_key),
  node_id                  TEXT NOT NULL CHECK (node_id ~ '^[0-9]+:[0-9]+$'),
  node_name                TEXT,
  status                   TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'in_implementation', 'implemented', 'archived')),
  implemented_surface_key  TEXT,
  created_by               TEXT NOT NULL,
  updated_by               TEXT NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at              TIMESTAMPTZ,
  CHECK (
    (status = 'implemented' AND implemented_surface_key IS NOT NULL AND length(trim(implemented_surface_key)) > 0)
    OR status <> 'implemented'
  )
);

CREATE INDEX IF NOT EXISTS idx_design_handoff_entries_status_updated
  ON greenhouse_core.design_handoff_entries (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_design_handoff_entries_file_node
  ON greenhouse_core.design_handoff_entries (file_key, node_id);

CREATE TABLE IF NOT EXISTS greenhouse_core.design_handoff_entry_events (
  event_id                 TEXT PRIMARY KEY,
  entry_id                 TEXT NOT NULL REFERENCES greenhouse_core.design_handoff_entries(entry_id) ON DELETE CASCADE,
  event_type               TEXT NOT NULL
    CHECK (event_type IN ('registered', 'transitioned', 'archived')),
  from_status              TEXT,
  to_status                TEXT NOT NULL,
  file_key                 TEXT,
  node_id                  TEXT,
  implemented_surface_key  TEXT,
  actor_user_id            TEXT,
  metadata_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_handoff_entry_events_entry
  ON greenhouse_core.design_handoff_entry_events (entry_id, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_core.touch_design_handoff_entries_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

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

CREATE TRIGGER trg_design_handoff_entries_touch_updated_at
BEFORE UPDATE ON greenhouse_core.design_handoff_entries
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.touch_design_handoff_entries_updated_at();

CREATE TRIGGER trg_design_handoff_entries_transition
BEFORE UPDATE ON greenhouse_core.design_handoff_entries
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.validate_design_handoff_entry_transition();

CREATE OR REPLACE FUNCTION greenhouse_core.design_handoff_entry_events_prevent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'design_handoff_entry_events is append-only; UPDATE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_core.design_handoff_entry_events_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'design_handoff_entry_events is append-only; DELETE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_design_handoff_entry_events_no_update
BEFORE UPDATE ON greenhouse_core.design_handoff_entry_events
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.design_handoff_entry_events_prevent_update();

CREATE TRIGGER trg_design_handoff_entry_events_no_delete
BEFORE DELETE ON greenhouse_core.design_handoff_entry_events
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.design_handoff_entry_events_prevent_delete();

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_allowed_files TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_allowed_files TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_allowed_files TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entries TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entries TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entries TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entry_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entry_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_handoff_entry_events TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_core.touch_design_handoff_entries_updated_at() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_core.validate_design_handoff_entry_transition() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_core.design_handoff_entry_events_prevent_update() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_core.design_handoff_entry_events_prevent_delete() TO greenhouse_runtime;

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, deprecated_at)
VALUES
  ('design_system.handoff.read',
   'design_system',
   ARRAY['read'],
   ARRAY['tenant'],
   'Leer el registro interno de handoffs de diseño de producto para implementación.',
   NULL),
  ('design_system.handoff.create',
   'design_system',
   ARRAY['create'],
   ARRAY['tenant'],
   'Registrar un nodo Figma de producto aprobado como handoff diseño→DEV.',
   NULL),
  ('design_system.handoff.transition',
   'design_system',
   ARRAY['update'],
   ARRAY['tenant'],
   'Transicionar el lifecycle de un handoff de diseño de producto.',
   NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL,
  introduced_at = COALESCE(greenhouse_core.capabilities_registry.introduced_at, NOW());

DO $$
DECLARE has_entries boolean; cap_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'design_handoff_entries'
  ) INTO has_entries;

  IF NOT has_entries THEN
    RAISE EXCEPTION 'TASK-1120 anti pre-up-marker: greenhouse_core.design_handoff_entries was NOT created.';
  END IF;

  SELECT COUNT(*) INTO cap_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'design_system.handoff.read',
    'design_system.handoff.create',
    'design_system.handoff.transition'
  )
  AND module = 'design_system'
  AND deprecated_at IS NULL;

  IF cap_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1120 anti pre-up-marker: expected 3 design_system.handoff capabilities, got %', cap_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'design_system.handoff.read',
  'design_system.handoff.create',
  'design_system.handoff.transition'
);

DROP TRIGGER IF EXISTS trg_design_handoff_entry_events_no_delete ON greenhouse_core.design_handoff_entry_events;
DROP TRIGGER IF EXISTS trg_design_handoff_entry_events_no_update ON greenhouse_core.design_handoff_entry_events;
DROP TRIGGER IF EXISTS trg_design_handoff_entries_transition ON greenhouse_core.design_handoff_entries;
DROP TRIGGER IF EXISTS trg_design_handoff_entries_touch_updated_at ON greenhouse_core.design_handoff_entries;

DROP FUNCTION IF EXISTS greenhouse_core.design_handoff_entry_events_prevent_delete();
DROP FUNCTION IF EXISTS greenhouse_core.design_handoff_entry_events_prevent_update();
DROP FUNCTION IF EXISTS greenhouse_core.validate_design_handoff_entry_transition();
DROP FUNCTION IF EXISTS greenhouse_core.touch_design_handoff_entries_updated_at();

DROP TABLE IF EXISTS greenhouse_core.design_handoff_entry_events;
DROP TABLE IF EXISTS greenhouse_core.design_handoff_entries;
DROP TABLE IF EXISTS greenhouse_core.design_handoff_allowed_files;
