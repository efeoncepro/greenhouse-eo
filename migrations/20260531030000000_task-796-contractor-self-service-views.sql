-- Up Migration

-- TASK-796 — Contractor Self-Service Hub: governance seed for the two production
-- viewCodes + role grants + the 2 self-service capabilities (parity with the TS
-- entitlements-catalog). Canonical pattern: View Registry Governance (TASK-827).
--
-- viewCodes:
--   mi_ficha.mi_contratacion  → /my/contractor  (self-service; granted to collaborator;
--                               menu visibility is dynamic via JWT flag hasActiveContractorEngagement)
--   equipo.contratistas       → /hr/contractors (HR workbench; granted to HR + Finance + Admin)

-- 1. view_registry
INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('mi_ficha.mi_contratacion', 'mi_ficha', 'Mis Servicios Contractor',
   'Soporte, revisión y estado de pago de tus servicios contractor.', 'my', '/my/contractor',
   'tabler-briefcase', 60, TRUE, 'migration:TASK-796'),
  ('equipo.contratistas', 'equipo', 'Contratistas',
   'Workbench HR de engagements contractor: envíos, revisión y paso a Finance.', 'hr', '/hr/contractors',
   'tabler-briefcase', 55, TRUE, 'migration:TASK-796')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon, active = TRUE, updated_at = NOW(), updated_by = 'migration:TASK-796';

-- 2. role_view_assignments
--    mi_ficha.mi_contratacion → collaborator (self-service page-guard authorization)
--    equipo.contratistas      → hr_manager, hr_payroll, efeonce_admin, finance_admin (HR+Finance+Admin)
INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('collaborator', 'mi_ficha.mi_contratacion', TRUE, 'migration:TASK-796', NOW(), NOW(), 'migration:TASK-796'),
  ('hr_manager', 'equipo.contratistas', TRUE, 'migration:TASK-796', NOW(), NOW(), 'migration:TASK-796'),
  ('hr_payroll', 'equipo.contratistas', TRUE, 'migration:TASK-796', NOW(), NOW(), 'migration:TASK-796'),
  ('efeonce_admin', 'equipo.contratistas', TRUE, 'migration:TASK-796', NOW(), NOW(), 'migration:TASK-796'),
  ('finance_admin', 'equipo.contratistas', TRUE, 'migration:TASK-796', NOW(), NOW(), 'migration:TASK-796')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted, updated_at = NOW(), updated_by = 'migration:TASK-796';

-- 3. capabilities_registry (parity with src/config/entitlements-catalog.ts)
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES
  ('personal_workspace.contractor.read_self', 'my_workspace', ARRAY['read'], ARRAY['own'],
   'TASK-796 — Self-service: el contractor lee su propio engagement/envíos/estado de pago (Finance-only data filtrada). Scope own.'),
  ('personal_workspace.contractor.submit_self', 'my_workspace', ARRAY['create'], ARRAY['own'],
   'TASK-796 — Self-service: el contractor crea/envía su propia work submission + adjunta boleta/evidencia. Aprobación es surface HR. Scope own.')
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module, allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes, description = EXCLUDED.description;

-- 4. Anti pre-up-marker bug guard (TASK-838 pattern) — abort if the seed did not land.
DO $$
DECLARE view_count INTEGER; assignment_count INTEGER; capability_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO view_count FROM greenhouse_core.view_registry
    WHERE view_code IN ('mi_ficha.mi_contratacion', 'equipo.contratistas');
  IF view_count < 2 THEN
    RAISE EXCEPTION 'TASK-796 anti pre-up-marker: expected 2 view_registry rows, got %', view_count;
  END IF;

  SELECT COUNT(*) INTO assignment_count FROM greenhouse_core.role_view_assignments
    WHERE updated_by = 'migration:TASK-796' AND granted = TRUE;
  IF assignment_count < 5 THEN
    RAISE EXCEPTION 'TASK-796 anti pre-up-marker: expected 5 role_view_assignments, got %', assignment_count;
  END IF;

  SELECT COUNT(*) INTO capability_count FROM greenhouse_core.capabilities_registry
    WHERE capability_key IN ('personal_workspace.contractor.read_self', 'personal_workspace.contractor.submit_self');
  IF capability_count < 2 THEN
    RAISE EXCEPTION 'TASK-796 anti pre-up-marker: expected 2 capabilities_registry rows, got %', capability_count;
  END IF;
END
$$;

-- Down Migration

-- Idempotent revert: mark view assignments not-granted (append-only audit preserved).
-- view_registry rows + capabilities_registry rows are NOT deleted (governance is append-only;
-- deactivate the views instead).
UPDATE greenhouse_core.role_view_assignments
  SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-796:revert'
  WHERE updated_by = 'migration:TASK-796';

UPDATE greenhouse_core.view_registry
  SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-796:revert'
  WHERE view_code IN ('mi_ficha.mi_contratacion', 'equipo.contratistas');
