-- Up Migration

-- TASK-1021 — Admin Viewer runtime del Workforce Contracting Studio.
-- Seedea el viewCode canónico + grants por rol (View Registry Governance Pattern,
-- espejo TASK-974/796). El runtime /hr/workforce/contracts lo consume para nav + page guard.
-- Grant = read grant de la foundation TASK-1019: HR ∪ EFEONCE_ADMIN ∪ FINANCE_ADMIN.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('equipo.workforce_contracting',
   'equipo',
   'Contratos laborales',
   'Prepara cartas oferta y contratos laborales bilingües: cola de casos, riesgo legal, paridad ES+EN, validación y próxima acción.',
   'hr',
   '/hr/workforce/contracts',
   'tabler-file-certificate',
   57,
   TRUE,
   'migration:TASK-1021')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1021';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin', 'equipo.workforce_contracting', true, 'migration:TASK-1021', NOW(), NOW(), 'migration:TASK-1021'),
  ('finance_admin', 'equipo.workforce_contracting', true, 'migration:TASK-1021', NOW(), NOW(), 'migration:TASK-1021'),
  ('hr_manager',    'equipo.workforce_contracting', true, 'migration:TASK-1021', NOW(), NOW(), 'migration:TASK-1021'),
  ('hr_payroll',    'equipo.workforce_contracting', true, 'migration:TASK-1021', NOW(), NOW(), 'migration:TASK-1021')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1021';

-- Anti pre-up-marker guard (CLAUDE.md migration markers rule): aborta si no quedó seedeado.
DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'equipo.workforce_contracting';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1021 anti pre-up-marker: equipo.workforce_contracting NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'equipo.workforce_contracting' AND granted = TRUE;
  IF granted_count < 4 THEN
    RAISE EXCEPTION 'TASK-1021 anti pre-up-marker: expected 4 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

-- Append-only governance: revoca (granted=FALSE) preservando audit trail, NO borra filas.
UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1021:revert'
WHERE view_code = 'equipo.workforce_contracting';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1021:revert'
WHERE view_code = 'equipo.workforce_contracting';
