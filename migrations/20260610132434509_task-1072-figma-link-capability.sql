-- Up Migration

-- TASK-1072 Slice 2 — capability `design_system.figma_node.link` (governance reflection).
--
-- Seed en greenhouse_core.capabilities_registry para que el catálogo TS
-- (src/config/entitlements-catalog.ts) y el registry DB queden en paridad
-- (parity.live.test.ts, TASK-611: catalog ⇆ registry; falla CI si divergen
-- module o allowed_actions). El GRANT runtime vive en runtime.ts (DESIGNER ∪
-- EFEONCE_ADMIN), mismo PR — invariant TASK-873/935.
--
-- role_entitlement_defaults NO se siembra: la tabla está vacía en todo el sistema
-- (0 filas) y runtime.ts es la autoridad de grants (guardada por
-- capability-grant-coverage.test.ts). Sembrar la única fila implicaría un consumer
-- de governance que no existe — decisión documentada (anti-bandaid).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, deprecated_at)
VALUES
  ('design_system.figma_node.link',
   'design_system',
   ARRAY['update'],
   ARRAY['tenant'],
   'Vincular o cambiar el nodo AXIS de una superficie del Design System. Primera capability del rol designer; ver el DS es plano views, vincular es este entitlement.',
   NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL,
  introduced_at = COALESCE(greenhouse_core.capabilities_registry.introduced_at, NOW());

-- Anti pre-up-marker guard (CLAUDE.md migration markers rule).
DO $$
DECLARE has_cap boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM greenhouse_core.capabilities_registry
     WHERE capability_key = 'design_system.figma_node.link'
       AND module = 'design_system'
       AND deprecated_at IS NULL
  ) INTO has_cap;

  IF NOT has_cap THEN
    RAISE EXCEPTION 'TASK-1072 anti pre-up-marker: design_system.figma_node.link was NOT seeded into capabilities_registry. Markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

-- Append-only governance: deprecate (no delete) so audit/parity history survives.
UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'design_system.figma_node.link';
