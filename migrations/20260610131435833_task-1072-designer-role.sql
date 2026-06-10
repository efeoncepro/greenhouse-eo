-- Up Migration

-- TASK-1072 Slice 0 — Rol `designer` foundation (catálogo DB, plano 1 + 4).
--
-- El rol `designer` distingue quién OPERA el Design System (vincula nodos AXIS,
-- futuras capabilities de tokens/specimens) de quién solo lo CONSUME. Su primera
-- capability real es `design_system.figma_node.link` (Slice 2). El rol vive en los
-- 4 planos canónicos; esta migración cubre el plano DB (FK source para
-- role_view_assignments + role_entitlement_defaults) y el grant de la view.
--
-- route_group_scope = {internal, my} — DEBE igualar ROLE_ROUTE_GROUPS[designer]
-- en src/lib/tenant/role-route-mapping.ts (parity TS↔DB, invariante TASK-987).
-- is_internal=TRUE, is_admin=FALSE, tenant_type='efeonce_internal', role_family
-- 'domain_operator' (mismo family que hr_manager/people_viewer — operador de dominio).

INSERT INTO greenhouse_core.roles
  (role_code, role_name, role_family, description, tenant_type, is_admin, is_internal, route_group_scope)
VALUES
  ('designer',
   'Diseñador',
   'domain_operator',
   'Opera el Design System interno (AXIS): vincula nodos Figma a las superficies del DS y, a futuro, gobierna tokens/specimens. Ver el Design System es acceso de view abierto a todo interno; vincular es exclusivo de este rol.',
   'efeonce_internal',
   FALSE,
   TRUE,
   ARRAY['internal','my']::TEXT[])
ON CONFLICT (role_code) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  role_family = EXCLUDED.role_family,
  description = EXCLUDED.description,
  tenant_type = EXCLUDED.tenant_type,
  is_admin = EXCLUDED.is_admin,
  is_internal = EXCLUDED.is_internal,
  route_group_scope = EXCLUDED.route_group_scope,
  updated_at = CURRENT_TIMESTAMP;

-- Plano 4 (views): grant explícito de `plataforma.design_system` a designer
-- (append-only, ON CONFLICT). Ver el DS sigue abierto a todo interno (TASK-1070);
-- este grant solo hace explícito que el designer también lo ve. Restringir a
-- collaborator (revocar) es decisión separada del operador (open question 4: NO en V1).
INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('designer', 'plataforma.design_system', true, 'migration:TASK-1072', NOW(), NOW(), 'migration:TASK-1072')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1072';

-- Anti pre-up-marker guard (CLAUDE.md migration markers rule).
DO $$
DECLARE has_role boolean; has_grant boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM greenhouse_core.roles
     WHERE role_code = 'designer'
       AND route_group_scope @> ARRAY['internal','my']::TEXT[]
       AND route_group_scope <@ ARRAY['internal','my']::TEXT[]
  ) INTO has_role;

  IF NOT has_role THEN
    RAISE EXCEPTION 'TASK-1072 anti pre-up-marker: role `designer` was NOT seeded with route_group_scope {internal,my}. Markers may be inverted.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM greenhouse_core.role_view_assignments
     WHERE role_code = 'designer' AND view_code = 'plataforma.design_system' AND granted = TRUE
  ) INTO has_grant;

  IF NOT has_grant THEN
    RAISE EXCEPTION 'TASK-1072 anti pre-up-marker: designer view grant for plataforma.design_system was NOT created.';
  END IF;
END
$$;

-- Down Migration

-- Revoke the view grant (append-only, NO row delete). The role row stays — other
-- migrations (capabilities, user assignments) FK to it; dropping it would orphan them.
-- A full role retirement is a separate, deliberate operation.
UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1072:revert'
WHERE role_code = 'designer' AND view_code = 'plataforma.design_system';
