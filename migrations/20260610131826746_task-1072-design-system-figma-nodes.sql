-- Up Migration

-- TASK-1072 Slice 1 — SSOT del vínculo superficie↔nodo AXIS (reemplaza el TS hardcodeado).
--
-- `design_system_figma_nodes` es el registro canónico runtime de qué nodo AXIS abre
-- cada ruta del Design System. Reemplaza como SOURCE OF TRUTH al map TS
-- `src/views/greenhouse/admin/design-system/design-system-figma-nodes.ts`, que queda
-- solo como SEED. Un diseñador (capability `design_system.figma_node.link`, Slice 2)
-- llena/cambia el vínculo desde la UI; el shell lo lee server-side.
--
-- Reglas duras (CLAUDE.md / TASK-1072):
--   - file_key DEBE ser AXIS (allowlist, fail-closed). Ningún Figma externo entra al DS.
--   - re-link = UPDATE in-place del current + evento de audit append-only. NUNCA DELETE.
--   - superseded_at = soft-unlink futuro (NULL = activo). V1 nunca lo setea; el reader lo respeta.
--
-- Audit trio (pattern TASK-790/700/765): tabla current-state + tabla `*_events`
-- append-only con triggers anti-UPDATE/anti-DELETE. Outbox events v1 los emite el
-- command (no la migración). Ownership queda en greenhouse_ops (dueño canónico, corre
-- la migración); GRANT DML a runtime/app/migrator.

CREATE TABLE IF NOT EXISTS greenhouse_core.design_system_figma_nodes (
  surface_key    TEXT PRIMARY KEY
    CHECK (surface_key = '/design-system' OR surface_key LIKE '/design-system/%'),
  file_key       TEXT NOT NULL
    -- Allowlist AXIS (master file). Extensible a futuros files de marca agregando valores.
    CHECK (file_key IN ('yyMksCoijfMaIoYplXKZaR')),
  node_id        TEXT NOT NULL
    -- Canonical API form `NNN:MMM` (la URL usa `-`; el parser normaliza a `:`).
    CHECK (node_id ~ '^[0-9]+:[0-9]+$'),
  node_name      TEXT,
  linked_by      TEXT NOT NULL,
  linked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     TEXT
);

CREATE TABLE IF NOT EXISTS greenhouse_core.design_system_figma_node_events (
  event_id       TEXT PRIMARY KEY,
  surface_key    TEXT NOT NULL
    REFERENCES greenhouse_core.design_system_figma_nodes(surface_key) ON DELETE CASCADE,
  event_type     TEXT NOT NULL
    CHECK (event_type IN ('linked', 'relinked', 'superseded')),
  file_key       TEXT,
  from_node_id   TEXT,
  to_node_id     TEXT,
  actor_user_id  TEXT,
  metadata_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_system_figma_node_events_surface
  ON greenhouse_core.design_system_figma_node_events (surface_key, created_at DESC);

-- Trigger: touch updated_at on the current-state table.
CREATE OR REPLACE FUNCTION greenhouse_core.touch_design_system_figma_nodes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_design_system_figma_nodes_touch_updated_at
BEFORE UPDATE ON greenhouse_core.design_system_figma_nodes
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.touch_design_system_figma_nodes_updated_at();

-- Triggers: append-only enforcement sobre el audit log.
CREATE OR REPLACE FUNCTION greenhouse_core.design_system_figma_node_events_prevent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'design_system_figma_node_events is append-only; UPDATE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_core.design_system_figma_node_events_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'design_system_figma_node_events is append-only; DELETE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_design_system_figma_node_events_no_update
BEFORE UPDATE ON greenhouse_core.design_system_figma_node_events
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.design_system_figma_node_events_prevent_update();

CREATE TRIGGER trg_design_system_figma_node_events_no_delete
BEFORE DELETE ON greenhouse_core.design_system_figma_node_events
FOR EACH ROW
EXECUTE FUNCTION greenhouse_core.design_system_figma_node_events_prevent_delete();

-- Grants (runtime DML; ownership queda en greenhouse_ops, dueño canónico que corre la migración).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_system_figma_nodes TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_system_figma_nodes TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_system_figma_nodes TO greenhouse_migrator_user;

-- El audit log permite INSERT pero los triggers bloquean UPDATE/DELETE.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_system_figma_node_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_system_figma_node_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.design_system_figma_node_events TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_core.touch_design_system_figma_nodes_updated_at() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_core.design_system_figma_node_events_prevent_update() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_core.design_system_figma_node_events_prevent_delete() TO greenhouse_runtime;

-- Seed: las 2 filas del TS hardcodeado actual (paridad exacta con design-system-figma-nodes.ts).
-- El TS queda como seed/fallback; la DB es SSOT runtime.
INSERT INTO greenhouse_core.design_system_figma_nodes
  (surface_key, file_key, node_id, linked_by, updated_by)
VALUES
  ('/design-system/breadcrumbs', 'yyMksCoijfMaIoYplXKZaR', '205:234905', 'migration:TASK-1072', 'migration:TASK-1072'),
  ('/design-system/colors',      'yyMksCoijfMaIoYplXKZaR', '11205:5341', 'migration:TASK-1072', 'migration:TASK-1072')
ON CONFLICT (surface_key) DO NOTHING;

INSERT INTO greenhouse_core.design_system_figma_node_events
  (event_id, surface_key, event_type, file_key, from_node_id, to_node_id, actor_user_id, metadata_json)
VALUES
  ('dsfn-evt-seed-breadcrumbs', '/design-system/breadcrumbs', 'linked', 'yyMksCoijfMaIoYplXKZaR', NULL, '205:234905', 'migration:TASK-1072', '{"source":"seed"}'::jsonb),
  ('dsfn-evt-seed-colors',      '/design-system/colors',      'linked', 'yyMksCoijfMaIoYplXKZaR', NULL, '11205:5341', 'migration:TASK-1072', '{"source":"seed"}'::jsonb)
ON CONFLICT (event_id) DO NOTHING;

-- Anti pre-up-marker guard (CLAUDE.md migration markers rule).
DO $$
DECLARE has_table boolean; has_events boolean; seed_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'design_system_figma_nodes'
  ) INTO has_table;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'design_system_figma_node_events'
  ) INTO has_events;

  IF NOT has_table THEN
    RAISE EXCEPTION 'TASK-1072 anti pre-up-marker: greenhouse_core.design_system_figma_nodes was NOT created. Markers may be inverted.';
  END IF;
  IF NOT has_events THEN
    RAISE EXCEPTION 'TASK-1072 anti pre-up-marker: greenhouse_core.design_system_figma_node_events was NOT created.';
  END IF;

  SELECT COUNT(*) INTO seed_count FROM greenhouse_core.design_system_figma_nodes;
  IF seed_count < 2 THEN
    RAISE EXCEPTION 'TASK-1072 anti pre-up-marker: expected >=2 seeded figma node rows, got %', seed_count;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_design_system_figma_node_events_no_delete ON greenhouse_core.design_system_figma_node_events;
DROP TRIGGER IF EXISTS trg_design_system_figma_node_events_no_update ON greenhouse_core.design_system_figma_node_events;
DROP TRIGGER IF EXISTS trg_design_system_figma_nodes_touch_updated_at ON greenhouse_core.design_system_figma_nodes;

DROP FUNCTION IF EXISTS greenhouse_core.design_system_figma_node_events_prevent_delete();
DROP FUNCTION IF EXISTS greenhouse_core.design_system_figma_node_events_prevent_update();
DROP FUNCTION IF EXISTS greenhouse_core.touch_design_system_figma_nodes_updated_at();

DROP TABLE IF EXISTS greenhouse_core.design_system_figma_node_events;
DROP TABLE IF EXISTS greenhouse_core.design_system_figma_nodes;
