-- ============================================================
-- TASK-263: Permission Sets — tables, indexes, seed, constraint
-- ============================================================

-- Up Migration

-- 1. Permission Sets table
CREATE TABLE greenhouse_core.permission_sets (
  set_id          TEXT PRIMARY KEY,
  set_name        TEXT NOT NULL,
  description     TEXT,
  section         TEXT,
  view_codes      TEXT[] NOT NULL DEFAULT '{}',
  is_system       BOOLEAN NOT NULL DEFAULT false,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      TEXT
);

CREATE INDEX idx_permission_sets_active ON greenhouse_core.permission_sets (active, section);

-- 2. User ↔ Permission Set assignments
CREATE TABLE greenhouse_core.user_permission_set_assignments (
  assignment_id       TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id),
  set_id              TEXT NOT NULL REFERENCES greenhouse_core.permission_sets(set_id),
  active              BOOLEAN NOT NULL DEFAULT true,
  expires_at          TIMESTAMPTZ,
  reason              TEXT,
  assigned_by_user_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, set_id)
);

CREATE INDEX idx_upsa_user ON greenhouse_core.user_permission_set_assignments (user_id, active);
CREATE INDEX idx_upsa_set ON greenhouse_core.user_permission_set_assignments (set_id, active);

-- 3. Extend view_access_log CHECK constraint for permission set actions
ALTER TABLE greenhouse_core.view_access_log
  DROP CONSTRAINT IF EXISTS view_access_log_action_check;

ALTER TABLE greenhouse_core.view_access_log
  ADD CONSTRAINT view_access_log_action_check
  CHECK (action IN (
    'grant_role', 'revoke_role',
    'grant_user', 'revoke_user', 'expire_user',
    'grant_set', 'revoke_set', 'create_set', 'update_set', 'delete_set'
  ));

-- 4. Grant permissions to runtime user
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.permission_sets TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_permission_set_assignments TO greenhouse_runtime;

-- 5. Seed 6 system Permission Sets
INSERT INTO greenhouse_core.permission_sets (set_id, set_name, description, section, view_codes, is_system, active, created_by, created_at, updated_at)
VALUES
  (
    'pset-gestion-financiera',
    'Gestión Financiera',
    'Acceso completo al módulo de finanzas: resumen, ingresos, egresos, conciliación, proveedores, clientes, inteligencia, asignaciones, cotizaciones, órdenes de compra y HES.',
    'finanzas',
    ARRAY['finanzas.resumen','finanzas.ingresos','finanzas.egresos','finanzas.conciliacion','finanzas.clientes','finanzas.proveedores','finanzas.inteligencia','finanzas.asignaciones_costos','finanzas.cotizaciones','finanzas.ordenes_compra','finanzas.hes'],
    true, true, 'system', NOW(), NOW()
  ),
  (
    'pset-nomina-completa',
    'Nómina Completa',
    'Acceso a nómina mensual, nómina proyectada y gestión de permisos laborales.',
    'equipo',
    ARRAY['equipo.nomina','equipo.nomina_proyectada','equipo.permisos'],
    true, true, 'system', NOW(), NOW()
  ),
  (
    'pset-agencia-ops',
    'Agencia Operaciones',
    'Vistas cross-tenant de operaciones de agencia: command center, spaces, equipo, delivery y campañas.',
    'gestion',
    ARRAY['gestion.agencia','gestion.spaces','gestion.equipo','gestion.delivery','gestion.campanas'],
    true, true, 'system', NOW(), NOW()
  ),
  (
    'pset-solo-lectura-agencia',
    'Solo Lectura Agencia',
    'Acceso de solo lectura a vistas de agencia: command center, spaces y delivery.',
    'gestion',
    ARRAY['gestion.agencia','gestion.spaces','gestion.delivery'],
    true, true, 'system', NOW(), NOW()
  ),
  (
    'pset-admin-plataforma',
    'Admin Plataforma',
    'Acceso completo al módulo de administración: Admin Center, cuentas, spaces, usuarios, roles, vistas, ops health, integraciones, email delivery, notificaciones, calendario operativo y equipo.',
    'administracion',
    ARRAY['administracion.admin_center','administracion.cuentas','administracion.spaces','administracion.usuarios','administracion.roles','administracion.vistas','administracion.ops_health','administracion.cloud_integrations','administracion.email_delivery','administracion.notifications','administracion.calendario_operativo','administracion.equipo'],
    true, true, 'system', NOW(), NOW()
  ),
  (
    'pset-mi-ficha-completa',
    'Mi Ficha Completa',
    'Acceso completo a la ficha personal del colaborador: perfil, nómina, inicio, asignaciones, desempeño, delivery, permisos y organización.',
    'mi_ficha',
    ARRAY['mi_ficha.mi_perfil','mi_ficha.mi_nomina','mi_ficha.mi_inicio','mi_ficha.mis_asignaciones','mi_ficha.mi_desempeno','mi_ficha.mi_delivery','mi_ficha.mis_permisos','mi_ficha.mi_organizacion'],
    true, true, 'system', NOW(), NOW()
  )
ON CONFLICT (set_id) DO NOTHING;


-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.user_permission_set_assignments;
DROP TABLE IF EXISTS greenhouse_core.permission_sets;

-- Restore original CHECK constraint
ALTER TABLE greenhouse_core.view_access_log
  DROP CONSTRAINT IF EXISTS view_access_log_action_check;

ALTER TABLE greenhouse_core.view_access_log
  ADD CONSTRAINT view_access_log_action_check
  CHECK (action IN ('grant_role', 'revoke_role', 'grant_user', 'revoke_user', 'expire_user'));
