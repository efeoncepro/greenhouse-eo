-- Up Migration
--
-- TASK-1152 — Roadmap work item index reader (Markdown SSOT).
--
-- Seed de la capability `roadmap.work_items.read` en el registry de gobernanza,
-- en paridad con el TS catalog (`src/config/entitlements-catalog.ts`) + el grant
-- en `src/lib/entitlements/runtime.ts`. Sin este seed, la live parity
-- (`src/lib/capabilities-registry/parity.live.test.ts`) reportaría
-- `inCatalogNotInRegistry`. Patrón canónico TASK-873/827/611.
--
-- La capability gatea `GET /api/roadmap/work-items` (read-only). Grant runtime:
-- internal route_group ∪ admin. NO confiere writes (V1 read-only; el reader nunca
-- muta archivos/lifecycle/Markdown).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'roadmap.work_items.read',
    'roadmap',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-1152 — Lectura del índice derivado del backlog Markdown (epics/tasks/mini-tasks/issues) vía GET /api/roadmap/work-items. Read-only. Grant: internal route_group ∪ admin.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker guard (TASK-768 / ISSUE-068 canonical pattern).
DO $$
DECLARE
  capability_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'roadmap.work_items.read'
    AND deprecated_at IS NULL;

  IF capability_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1152 anti pre-up-marker: expected 1 capability roadmap.work_items.read, got %.', capability_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'roadmap.work_items.read'
  AND deprecated_at IS NULL;
