-- Up Migration

-- ════════════════════════════════════════════════════════════════════════════
-- TASK-910 — Notion Demo Teamspace Migration Sandbox Foundation
-- ════════════════════════════════════════════════════════════════════════════
--
-- Setup canonical Greenhouse-side para el demo teamspace `Demo Greenhouse`
-- (Notion ID 36339c2f-efe7-814c-a0f5-0042863dbb5a) ya creado live 2026-05-17
-- por operador. Esta migration NO crea el teamspace Notion — registra
-- Greenhouse-side el binding canonical:
--
-- 1. Tabla append-only `greenhouse_delivery.task_status_transitions_demo`
--    (mismo schema que productivo TASK-908 + columna demo_metadata JSONB).
--    Defense-in-depth: tablas FÍSICAMENTE SEPARADAS para evitar contaminación
--    cross-tenant si reactive consumer filter falla.
--
-- 2. Discriminator canonical `greenhouse_core.members.is_demo BOOLEAN`
--    DEFAULT FALSE. Single discriminator simple (vs tenant_type que NO existe
--    en members — vive en client_users/clients). Members con is_demo=TRUE son
--    sintéticos, NUNCA tocan payroll real (defense in depth en Slice 5 helpers).
--
-- 3. `space_notion_sources` row linkeando el space existente `Greenhouse Demo`
--    (spc-8641519f-12a0-456f-b03a-e94522d35e3a) con los 3 DB IDs del demo
--    teamspace Notion. `sync_enabled=FALSE` defensivo — el sync legacy
--    notion-bq-sync NO procesa demo (evita contaminar greenhouse_conformed
--    + metrics_by_* productivos).
--
-- 4. `webhook_endpoints` row para endpoint dedicado `/api/webhooks/notion-tasks-demo`
--    con `secret_ref='NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF'` (GCP Secret
--    Manager separado del productivo).
--
-- 5. Capabilities granulares 2 nuevas (`notion.metrics.demo.execute` +
--    `notion.metrics.demo.read`) — least-privilege canonical.
--
-- 6. Anti pre-up-marker DO block (canonical pattern TASK-768/ISSUE-068).
--
-- Spec canónica: docs/tasks/in-progress/TASK-910-notion-demo-teamspace-migration-sandbox.md
-- Pattern fuente: TASK-908 task_status_transitions foundation + TASK-872
-- capabilities seed + TASK-706 webhook_endpoints seed.
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Tabla canonical task_status_transitions_demo
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_delivery.task_status_transitions_demo (
  transition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  task_source_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT 'demo' CHECK (workspace_id = 'demo'),

  from_status TEXT NOT NULL CHECK (from_status IN (
    'Sin empezar',
    'Brief listo',
    'Pendiente aprobación interna',
    'En pausa',
    'Bloqueado',
    'En curso',
    'Listo para revisión',
    'Cambios solicitados',
    'Aprobado',
    'Cancelado',
    'Archivado'
  )),
  to_status TEXT NOT NULL CHECK (to_status IN (
    'Sin empezar',
    'Brief listo',
    'Pendiente aprobación interna',
    'En pausa',
    'Bloqueado',
    'En curso',
    'Listo para revisión',
    'Cambios solicitados',
    'Aprobado',
    'Cancelado',
    'Archivado'
  )),

  transitioned_at TIMESTAMPTZ NOT NULL,
  transitioned_by TEXT NULL,

  source_event_id TEXT NULL,
  source_quality TEXT NOT NULL DEFAULT 'canonical' CHECK (source_quality IN (
    'canonical',
    'proxy',
    'backfilled'
  )),

  -- TASK-910 canonical extra: demo_metadata JSONB para tracking experimento
  -- + flags adicionales (e.g. test scenario ID, expected outcome) sin
  -- contaminar el schema productivo TASK-908.
  demo_metadata JSONB NULL,

  assignee_member_id TEXT NULL,
  space_id TEXT NULL,

  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_delivery.task_status_transitions_demo IS
  'TASK-910 — Append-only audit log de status transitions para Demo Greenhouse teamspace (Notion 36339c2f-efe7-814c-a0f5-0042863dbb5a). Mirror schema TASK-908 productivo + demo_metadata JSONB. Tabla FÍSICAMENTE SEPARADA del productivo (defense in depth — reactive consumer filtra metadata.demo_mode=true). Members con members.is_demo=TRUE NUNCA tocan payroll real.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Indexes canonical (mirror productivo)
-- ────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS task_status_transitions_demo_source_event_id_unique_idx
  ON greenhouse_delivery.task_status_transitions_demo (source_event_id)
  WHERE source_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS task_status_transitions_demo_task_lookup_idx
  ON greenhouse_delivery.task_status_transitions_demo (task_source_id, transitioned_at DESC);

CREATE INDEX IF NOT EXISTS task_status_transitions_demo_correction_event_idx
  ON greenhouse_delivery.task_status_transitions_demo (task_source_id, transitioned_at DESC)
  WHERE from_status = 'Listo para revisión' AND to_status = 'Cambios solicitados';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Triggers anti-UPDATE / anti-DELETE (append-only audit)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_status_transitions_demo_guard_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.transition_id <> NEW.transition_id THEN
    RAISE EXCEPTION 'task_status_transitions_demo: transition_id is immutable';
  END IF;
  IF OLD.task_source_id <> NEW.task_source_id THEN
    RAISE EXCEPTION 'task_status_transitions_demo: task_source_id is immutable';
  END IF;
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'task_status_transitions_demo: workspace_id is immutable';
  END IF;
  IF OLD.from_status <> NEW.from_status OR OLD.to_status <> NEW.to_status THEN
    RAISE EXCEPTION 'task_status_transitions_demo: from_status/to_status are immutable (audit append-only)';
  END IF;
  IF OLD.transitioned_at <> NEW.transitioned_at THEN
    RAISE EXCEPTION 'task_status_transitions_demo: transitioned_at is immutable';
  END IF;
  IF COALESCE(OLD.source_event_id, '') <> COALESCE(NEW.source_event_id, '') THEN
    RAISE EXCEPTION 'task_status_transitions_demo: source_event_id is immutable';
  END IF;
  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'task_status_transitions_demo: created_at is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_status_transitions_demo_guard_update_trigger
  ON greenhouse_delivery.task_status_transitions_demo;

CREATE TRIGGER task_status_transitions_demo_guard_update_trigger
  BEFORE UPDATE ON greenhouse_delivery.task_status_transitions_demo
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_delivery.task_status_transitions_demo_guard_update();

CREATE OR REPLACE FUNCTION greenhouse_delivery.task_status_transitions_demo_guard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'task_status_transitions_demo: rows are append-only; DELETE rejected (transition_id=%)', OLD.transition_id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_status_transitions_demo_guard_delete_trigger
  ON greenhouse_delivery.task_status_transitions_demo;

CREATE TRIGGER task_status_transitions_demo_guard_delete_trigger
  BEFORE DELETE ON greenhouse_delivery.task_status_transitions_demo
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_delivery.task_status_transitions_demo_guard_delete();

ALTER TABLE greenhouse_delivery.task_status_transitions_demo OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_delivery.task_status_transitions_demo
  TO greenhouse_runtime;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. members.is_demo discriminator canonical
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_core.members
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN greenhouse_core.members.is_demo IS
  'TASK-910 — TRUE indica member sintético del demo teamspace Notion (Demo Greenhouse). Defense in depth: bonus calculation NUNCA procesa demo members (filter en fetchKpisForPeriod + pre-check en calculateRpaBonus/calculateOtdBonus). FALSE para todos los members reales (Efeonce internos + clientes Sky/etc.).';

CREATE INDEX IF NOT EXISTS members_is_demo_idx
  ON greenhouse_core.members (is_demo)
  WHERE is_demo = TRUE;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. space_notion_sources row demo (binding canonical) — sync_enabled=FALSE
-- ────────────────────────────────────────────────────────────────────────────
--
-- Linkea el space existente "Greenhouse Demo" (spc-8641519f-...) con los 3
-- Data Source IDs del teamspace Notion demo. sync_enabled=FALSE defensivo —
-- el sync legacy notion-bq-sync NO procesa este source (evita contaminar
-- greenhouse_conformed.delivery_* + metrics_by_* productivos).
--
-- IDs canonical verified via Notion MCP 2026-05-17 (sin guiones, alineado
-- con productivos en sample rows space_notion_sources):
--   Tareas DS:    36339c2fefe781a6980c000b0056bba8
--   Proyectos DS: 36339c2fefe781168c15000be81c5538
--   Sprints DS:   36339c2fefe781cc8f2f000b112ee87c
--   Teamspace:    36339c2fefe7814ca0f50042863dbb5a

INSERT INTO greenhouse_core.space_notion_sources (
  source_id, space_id,
  notion_db_proyectos, notion_db_tareas, notion_db_sprints,
  notion_db_revisiones, notion_workspace_id,
  sync_enabled, sync_frequency,
  created_by, created_at, updated_at
) VALUES (
  'sns-task-910-demo-greenhouse',
  'spc-8641519f-12a0-456f-b03a-e94522d35e3a',
  '36339c2fefe781168c15000be81c5538',
  '36339c2fefe781a6980c000b0056bba8',
  '36339c2fefe781cc8f2f000b112ee87c',
  NULL,
  '36339c2fefe7814ca0f50042863dbb5a',
  FALSE,
  'manual',
  'migration:TASK-910',
  NOW(),
  NOW()
)
ON CONFLICT (source_id) DO UPDATE SET
  notion_db_proyectos = EXCLUDED.notion_db_proyectos,
  notion_db_tareas = EXCLUDED.notion_db_tareas,
  notion_db_sprints = EXCLUDED.notion_db_sprints,
  notion_workspace_id = EXCLUDED.notion_workspace_id,
  sync_enabled = EXCLUDED.sync_enabled,
  sync_frequency = EXCLUDED.sync_frequency,
  updated_at = NOW();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. webhook_endpoints row demo (dedicated endpoint + separate secret ref)
-- ────────────────────────────────────────────────────────────────────────────
--
-- Endpoint canónico que recibe webhooks Notion del demo teamspace. Handler
-- 'notion-tasks-demo' valida HMAC internamente con secret separado del
-- productivo (defense in depth — leak en un secret NO compromete el otro).
--
-- Auth mode 'provider_native' — el handler valida la firma internamente
-- usando HMAC-SHA256 sobre raw body.
--
-- secret_ref apunta al env var name `NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF`
-- que a su vez referencia GCP Secret `notion-webhook-signing-secret-demo`
-- (resolveSecretByRef pattern canonical TASK-870).

INSERT INTO greenhouse_sync.webhook_endpoints (
  webhook_endpoint_id, endpoint_key, provider_code, handler_code,
  auth_mode, secret_ref, active, created_at, updated_at
) VALUES (
  'webhook-notion-tasks-demo',
  'notion-tasks-demo',
  'notion',
  'notion-tasks-demo',
  'provider_native',
  'NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (endpoint_key) DO UPDATE SET
  provider_code = EXCLUDED.provider_code,
  handler_code = EXCLUDED.handler_code,
  auth_mode = EXCLUDED.auth_mode,
  secret_ref = EXCLUDED.secret_ref,
  active = TRUE,
  updated_at = NOW();

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Capabilities canonical V1.0 (granular least-privilege)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'notion.metrics.demo.execute',
    'admin',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-910 — Ejecutar operaciones en el demo teamspace Notion (trigger manual recompute, backfill, smoke tests). Demo NUNCA toca payroll real. EFEONCE_ADMIN + DEVOPS_OPERATOR.',
    NOW(),
    NULL
  ),
  (
    'notion.metrics.demo.read',
    'admin',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-910 — Lectura de estado del demo teamspace (paridad signals, audit transitions, governance health). Visibility extendida a HR + DELIVERY para observation. EFEONCE_ADMIN + DEVOPS_OPERATOR + HR_MANAGER + DELIVERY_LEAD.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Anti pre-up-marker guard (TASK-768 / ISSUE-068 canonical pattern)
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  demo_table_exists BOOLEAN;
  is_demo_column_exists BOOLEAN;
  source_event_idx_exists BOOLEAN;
  task_lookup_idx_exists BOOLEAN;
  correction_idx_exists BOOLEAN;
  is_demo_idx_exists BOOLEAN;
  update_trigger_exists BOOLEAN;
  delete_trigger_exists BOOLEAN;
  source_count INTEGER;
  webhook_count INTEGER;
  capability_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_delivery'
      AND table_name = 'task_status_transitions_demo'
  ) INTO demo_table_exists;
  IF NOT demo_table_exists THEN
    RAISE EXCEPTION 'TASK-910 anti pre-up-marker: greenhouse_delivery.task_status_transitions_demo NOT created.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core' AND table_name = 'members' AND column_name = 'is_demo'
  ) INTO is_demo_column_exists;
  IF NOT is_demo_column_exists THEN
    RAISE EXCEPTION 'TASK-910 anti pre-up-marker: greenhouse_core.members.is_demo column NOT created.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_status_transitions_demo_source_event_id_unique_idx') INTO source_event_idx_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_status_transitions_demo_task_lookup_idx') INTO task_lookup_idx_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_delivery' AND indexname='task_status_transitions_demo_correction_event_idx') INTO correction_idx_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='greenhouse_core' AND indexname='members_is_demo_idx') INTO is_demo_idx_exists;
  IF NOT (source_event_idx_exists AND task_lookup_idx_exists AND correction_idx_exists AND is_demo_idx_exists) THEN
    RAISE EXCEPTION 'TASK-910 anti pre-up-marker: indexes NOT all created (source_event=%, task_lookup=%, correction=%, is_demo=%).',
      source_event_idx_exists, task_lookup_idx_exists, correction_idx_exists, is_demo_idx_exists;
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='task_status_transitions_demo_guard_update_trigger' AND NOT tgisinternal) INTO update_trigger_exists;
  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='task_status_transitions_demo_guard_delete_trigger' AND NOT tgisinternal) INTO delete_trigger_exists;
  IF NOT (update_trigger_exists AND delete_trigger_exists) THEN
    RAISE EXCEPTION 'TASK-910 anti pre-up-marker: triggers NOT created (update=%, delete=%).', update_trigger_exists, delete_trigger_exists;
  END IF;

  SELECT COUNT(*) INTO source_count
  FROM greenhouse_core.space_notion_sources
  WHERE source_id = 'sns-task-910-demo-greenhouse';
  IF source_count <> 1 THEN
    RAISE EXCEPTION 'TASK-910 anti pre-up-marker: space_notion_sources row NOT seeded (count=%).', source_count;
  END IF;

  SELECT COUNT(*) INTO webhook_count
  FROM greenhouse_sync.webhook_endpoints
  WHERE endpoint_key = 'notion-tasks-demo' AND active = TRUE;
  IF webhook_count <> 1 THEN
    RAISE EXCEPTION 'TASK-910 anti pre-up-marker: webhook_endpoints notion-tasks-demo NOT seeded (count=%).', webhook_count;
  END IF;

  SELECT COUNT(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('notion.metrics.demo.execute', 'notion.metrics.demo.read')
    AND deprecated_at IS NULL;
  IF capability_count <> 2 THEN
    RAISE EXCEPTION 'TASK-910 anti pre-up-marker: capabilities NOT seeded (count=%, expected=2).', capability_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN ('notion.metrics.demo.execute', 'notion.metrics.demo.read');

DELETE FROM greenhouse_sync.webhook_endpoints WHERE endpoint_key = 'notion-tasks-demo';
DELETE FROM greenhouse_core.space_notion_sources WHERE source_id = 'sns-task-910-demo-greenhouse';

ALTER TABLE greenhouse_core.members DROP COLUMN IF EXISTS is_demo;

DROP TRIGGER IF EXISTS task_status_transitions_demo_guard_update_trigger ON greenhouse_delivery.task_status_transitions_demo;
DROP TRIGGER IF EXISTS task_status_transitions_demo_guard_delete_trigger ON greenhouse_delivery.task_status_transitions_demo;
DROP FUNCTION IF EXISTS greenhouse_delivery.task_status_transitions_demo_guard_update();
DROP FUNCTION IF EXISTS greenhouse_delivery.task_status_transitions_demo_guard_delete();
DROP TABLE IF EXISTS greenhouse_delivery.task_status_transitions_demo;
