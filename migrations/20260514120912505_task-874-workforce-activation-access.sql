-- Up Migration

-- TASK-874 — Workforce Activation primary HR surface + readiness capabilities.
--
-- Materializa el contrato aprobado: la experiencia primaria vive bajo
-- `Personas y HR` (`equipo.workforce_activation`, routeGroup `hr`,
-- route `/hr/workforce/activation`). El surface admin de TASK-873 queda como
-- governance/transitional y no se modifica aquí.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'workforce.member.activation_readiness.read',
    'workforce',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-874 — Lectura del readiness de habilitación laboral por member; no revela PII sensible.',
    NOW(),
    NULL
  ),
  (
    'workforce.member.activation_readiness.override',
    'workforce',
    ARRAY['override'],
    ARRAY['tenant'],
    'TASK-874 — Override auditado del guard de readiness antes de completar ficha; reservado a EFEONCE_ADMIN.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  (
    'equipo.workforce_activation',
    'equipo',
    'Workforce Activation',
    'Workspace HR para habilitar colaboradores con blockers de relación, cargo, compensación, pago y onboarding antes de cerrar intake.',
    'hr',
    '/hr/workforce/activation',
    'tabler-user-check',
    22,
    TRUE,
    'migration:TASK-874'
  )
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-874';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin', 'equipo.workforce_activation', TRUE, 'migration:TASK-874', NOW(), NOW(), 'migration:TASK-874'),
  ('hr_payroll',    'equipo.workforce_activation', TRUE, 'migration:TASK-874', NOW(), NOW(), 'migration:TASK-874'),
  ('hr_manager',    'equipo.workforce_activation', TRUE, 'migration:TASK-874', NOW(), NOW(), 'migration:TASK-874')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-874';

DO $$
DECLARE
  capability_count INTEGER;
  registered_count INTEGER;
  granted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'workforce.member.activation_readiness.read',
    'workforce.member.activation_readiness.override'
  )
    AND deprecated_at IS NULL;

  IF capability_count < 2 THEN
    RAISE EXCEPTION 'TASK-874 anti pre-up-marker check: expected 2 active capabilities, got %', capability_count;
  END IF;

  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.view_registry
  WHERE view_code = 'equipo.workforce_activation'
    AND route_group = 'hr'
    AND route_path = '/hr/workforce/activation'
    AND active = TRUE;

  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-874 anti pre-up-marker check: expected active equipo.workforce_activation view registry row, got %', registered_count;
  END IF;

  SELECT COUNT(*) INTO granted_count
  FROM greenhouse_core.role_view_assignments
  WHERE view_code = 'equipo.workforce_activation'
    AND updated_by = 'migration:TASK-874'
    AND granted = TRUE;

  IF granted_count < 3 THEN
    RAISE EXCEPTION 'TASK-874 anti pre-up-marker check: expected 3 HR primary role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE,
    updated_at = NOW(),
    updated_by = 'migration:TASK-874:revert'
WHERE updated_by = 'migration:TASK-874'
  AND view_code = 'equipo.workforce_activation';

UPDATE greenhouse_core.view_registry
SET active = FALSE,
    updated_at = NOW(),
    updated_by = 'migration:TASK-874:revert'
WHERE view_code = 'equipo.workforce_activation'
  AND updated_by = 'migration:TASK-874';

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'workforce.member.activation_readiness.read',
  'workforce.member.activation_readiness.override'
);
