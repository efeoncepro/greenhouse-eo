-- Up Migration
--
-- TASK-974 — Seed `finanzas.contractor_payables` viewCode + role grants (TASK-827 governance).
-- Mirror del seed de finanzas.ordenes_pago (TASK-750). Idempotent (ON CONFLICT preserva
-- admin-edited assignments). Roles: los reales de finanzas + admin (ROLE_CODES canónico).

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('finanzas.contractor_payables',
   'finanzas',
   'Pagos a contractors',
   'Prepara, revisa y autoriza los pagos a contractors antes de la orden de pago (readiness, override, waiver).',
   'finance',
   '/finance/contractor-payments',
   'tabler-users-group',
   56,
   TRUE,
   'migration:TASK-974')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-974';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',  'finanzas.contractor_payables', true, 'migration:TASK-974', NOW(), NOW(), 'migration:TASK-974'),
  ('finance_admin',  'finanzas.contractor_payables', true, 'migration:TASK-974', NOW(), NOW(), 'migration:TASK-974'),
  ('finance_analyst','finanzas.contractor_payables', true, 'migration:TASK-974', NOW(), NOW(), 'migration:TASK-974')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-974';

-- Anti pre-up-marker guard.
DO $$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM greenhouse_core.view_registry WHERE view_code = 'finanzas.contractor_payables';
  IF n < 1 THEN
    RAISE EXCEPTION 'TASK-974 anti pre-up-marker: finanzas.contractor_payables not in view_registry';
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.role_view_assignments
   SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-974:revert'
 WHERE view_code = 'finanzas.contractor_payables'
   AND granted_by = 'migration:TASK-974';

UPDATE greenhouse_core.view_registry
   SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-974:revert'
 WHERE view_code = 'finanzas.contractor_payables'
   AND updated_by = 'migration:TASK-974';