-- Up Migration
-- TASK-285: Seed client role visibility matrix
-- Differentiates client_specialist from client_executive / client_manager.
-- client_executive and client_manager see all 11 client views (identical for now).
-- client_specialist loses: cliente.analytics, cliente.campanas, cliente.equipo.
-- Ref: GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md §12.5

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  -- client_executive: all 11 views granted
  ('client_executive', 'cliente.pulse',            true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_executive', 'cliente.proyectos',        true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_executive', 'cliente.ciclos',           true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_executive', 'cliente.equipo',           true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_executive', 'cliente.revisiones',       true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_executive', 'cliente.analytics',        true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_executive', 'cliente.campanas',         true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_executive', 'cliente.modulos',          true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_executive', 'cliente.actualizaciones',  true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_executive', 'cliente.configuracion',    true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_executive', 'cliente.notificaciones',   true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),

  -- client_manager: all 11 views granted
  ('client_manager', 'cliente.pulse',              true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_manager', 'cliente.proyectos',          true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_manager', 'cliente.ciclos',             true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_manager', 'cliente.equipo',             true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_manager', 'cliente.revisiones',         true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_manager', 'cliente.analytics',          true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_manager', 'cliente.campanas',           true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_manager', 'cliente.modulos',            true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_manager', 'cliente.actualizaciones',    true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_manager', 'cliente.configuracion',      true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_manager', 'cliente.notificaciones',     true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),

  -- client_specialist: 8 granted, 3 denied (AC #2: NO analytics, campanas, equipo)
  ('client_specialist', 'cliente.pulse',           true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_specialist', 'cliente.proyectos',       true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_specialist', 'cliente.ciclos',          true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_specialist', 'cliente.equipo',          false, 'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_specialist', 'cliente.revisiones',      true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_specialist', 'cliente.analytics',       false, 'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_specialist', 'cliente.campanas',        false, 'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_specialist', 'cliente.modulos',         true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_specialist', 'cliente.actualizaciones', true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_specialist', 'cliente.configuracion',   true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285'),
  ('client_specialist', 'cliente.notificaciones',  true,  'migration:TASK-285', NOW(), NOW(), 'migration:TASK-285')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted    = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-285';

-- Audit log: record every assignment for governance trail
INSERT INTO greenhouse_core.view_access_log
  (action, target_role, view_code, performed_by, reason, created_at)
SELECT
  CASE WHEN rva.granted THEN 'grant_role' ELSE 'revoke_role' END,
  rva.role_code,
  rva.view_code,
  'migration:TASK-285',
  'TASK-285: Initial client role visibility matrix — differentiate client_specialist from client_executive and client_manager',
  NOW()
FROM greenhouse_core.role_view_assignments rva
WHERE rva.role_code IN ('client_executive', 'client_manager', 'client_specialist')
  AND rva.updated_by = 'migration:TASK-285';

-- Down Migration
-- Revert: remove all client role view assignments seeded by this migration
-- (restores original state: empty table, fallback-driven access for all 3 roles)
DELETE FROM greenhouse_core.role_view_assignments
WHERE role_code IN ('client_executive', 'client_manager', 'client_specialist')
  AND updated_by = 'migration:TASK-285';

DELETE FROM greenhouse_core.view_access_log
WHERE performed_by = 'migration:TASK-285';
