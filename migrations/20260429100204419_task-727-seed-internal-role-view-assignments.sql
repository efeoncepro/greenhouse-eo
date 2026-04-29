-- Up Migration
-- TASK-727: Seed internal role × view matrix to close authorization gaps detected with Daniela Ferreira (Creative Lead).
--
-- Replicates the TASK-285 pattern (seed-client-role-view-assignments) for the 12 internal roles
-- that were left empty in greenhouse_core.role_view_assignments and were therefore falling through
-- to the heuristic fallback `roleCanAccessViewFallback`. The fallback granted ALL views with
-- `routeGroup = 'internal'` to any role with `route_group_scope = ['internal']`, leaking
-- `gestion.economia` (financial) to roles like `efeonce_operations` (operations-only).
--
-- Coverage post-migration:
--   - 3 client roles already seeded by TASK-285 (untouched here): client_executive, client_manager, client_specialist
--   - 12 internal roles seeded here:
--       efeonce_admin, efeonce_operations, efeonce_account, collaborator, employee,
--       finance_admin, finance_analyst, finance_manager,
--       hr_payroll, hr_manager, people_viewer, ai_tooling_admin
--
-- Idempotent: ON CONFLICT (role_code, view_code) DO UPDATE preserves audit metadata. Down migration
-- only deletes rows authored by `migration:TASK-727` so admin-edited assignments are preserved.

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  -- ─────────────────────────────────────────────────────────────────────────────
  -- efeonce_admin: full visibility (todas las 60 vistas relevantes)
  -- ─────────────────────────────────────────────────────────────────────────────
  ('efeonce_admin', 'gestion.agencia',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'gestion.organizaciones',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'gestion.servicios',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'gestion.staff_augmentation',        true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'gestion.spaces',                    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'gestion.economia',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'gestion.equipo',                    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'gestion.delivery',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'gestion.campanas',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'gestion.operaciones',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'gestion.capacidad',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'equipo.personas',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'equipo.nomina',                     true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'equipo.nomina_proyectada',          true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'equipo.permisos',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'equipo.jerarquia',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'equipo.organigrama',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'equipo.departamentos',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'equipo.asistencia',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'equipo.objetivos',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'equipo.evaluaciones',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.resumen',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.ingresos',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.egresos',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.conciliacion',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.banco',                    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.cuenta_corriente_accionista', true, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.clientes',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.proveedores',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.inteligencia',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.asignaciones_costos',      true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.cotizaciones',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.ordenes_compra',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'finanzas.hes',                      true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'ia.herramientas',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.admin_center',       true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.cuentas',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  -- NOTE: administracion.commercial_parties, product_sync_conflicts, product_catalog existen
  -- en VIEW_REGISTRY (código) pero NO en greenhouse_core.view_registry (DB) aún. Se omiten del
  -- seed para no violar FK. efeonce_admin igual los ve via fallback (is_admin=true).
  ('efeonce_admin', 'administracion.instrumentos_pago',  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.spaces',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.usuarios',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.roles',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.vistas',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.ops_health',         true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.cloud_integrations', true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.email_delivery',     true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.notifications',      true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.calendario_operativo', true, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'administracion.equipo',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'mi_ficha.mi_perfil',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'mi_ficha.mi_nomina',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'mi_ficha.mi_inicio',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'mi_ficha.mis_asignaciones',         true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'mi_ficha.mi_desempeno',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'mi_ficha.mi_delivery',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'mi_ficha.mis_permisos',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'mi_ficha.mis_objetivos',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'mi_ficha.mis_evaluaciones',         true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_admin', 'mi_ficha.mi_organizacion',          true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- efeonce_operations: visibilidad operativa cross-tenant (delivery, capacity, ops, organigrama)
  -- SIN economía ni staff_augmentation (denials explícitos: financiero, no operativo).
  -- ─────────────────────────────────────────────────────────────────────────────
  ('efeonce_operations', 'gestion.agencia',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'gestion.organizaciones',       true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'gestion.servicios',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'gestion.spaces',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'gestion.equipo',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'gestion.delivery',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'gestion.campanas',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'gestion.operaciones',          true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'gestion.capacidad',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'gestion.economia',             false, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'gestion.staff_augmentation',   false, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'equipo.personas',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'equipo.organigrama',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  -- DENIAL EXPLÍCITO: cross-team payroll es sensible, solo HR/admin debe verlo.
  -- Daniela (Creative Lead) ve su propia liquidación via mi_ficha.mi_nomina, NO el cross-team.
  ('efeonce_operations', 'equipo.nomina',                false, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'equipo.nomina_proyectada',     false, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'mi_ficha.mi_perfil',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'mi_ficha.mi_nomina',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'mi_ficha.mi_inicio',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'mi_ficha.mis_asignaciones',    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'mi_ficha.mi_desempeno',        true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'mi_ficha.mi_delivery',         true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'mi_ficha.mis_permisos',        true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'mi_ficha.mis_objetivos',       true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'mi_ficha.mis_evaluaciones',    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_operations', 'mi_ficha.mi_organizacion',     true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- efeonce_account: account management (organizaciones, campañas, delivery context, equipo).
  -- SIN economía ni staff augmentation ni operations internas.
  -- ─────────────────────────────────────────────────────────────────────────────
  ('efeonce_account', 'gestion.agencia',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'gestion.organizaciones',          true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'gestion.servicios',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'gestion.spaces',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'gestion.equipo',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'gestion.delivery',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'gestion.campanas',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'gestion.economia',                false, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'gestion.staff_augmentation',      false, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'gestion.operaciones',             false, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'gestion.capacidad',               false, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  -- DENIAL EXPLÍCITO: cross-team payroll es sensible (mismo principio que efeonce_operations).
  ('efeonce_account', 'equipo.nomina',                   false, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'equipo.nomina_proyectada',        false, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'mi_ficha.mi_perfil',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'mi_ficha.mi_nomina',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'mi_ficha.mi_inicio',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'mi_ficha.mis_asignaciones',       true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'mi_ficha.mi_desempeno',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'mi_ficha.mi_delivery',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'mi_ficha.mis_permisos',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'mi_ficha.mis_objetivos',          true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'mi_ficha.mis_evaluaciones',       true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('efeonce_account', 'mi_ficha.mi_organizacion',        true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- collaborator: solo personal self-service (mi_ficha.*). Rol base de cualquier interno.
  -- ─────────────────────────────────────────────────────────────────────────────
  ('collaborator', 'mi_ficha.mi_perfil',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('collaborator', 'mi_ficha.mi_nomina',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('collaborator', 'mi_ficha.mi_inicio',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('collaborator', 'mi_ficha.mis_asignaciones',          true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('collaborator', 'mi_ficha.mi_desempeno',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('collaborator', 'mi_ficha.mi_delivery',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('collaborator', 'mi_ficha.mis_permisos',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('collaborator', 'mi_ficha.mis_objetivos',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('collaborator', 'mi_ficha.mis_evaluaciones',          true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('collaborator', 'mi_ficha.mi_organizacion',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- employee: idéntico a collaborator hoy. Documentar follow-up con producto si difiere.
  -- ─────────────────────────────────────────────────────────────────────────────
  ('employee', 'mi_ficha.mi_perfil',                     true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('employee', 'mi_ficha.mi_nomina',                     true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('employee', 'mi_ficha.mi_inicio',                     true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('employee', 'mi_ficha.mis_asignaciones',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('employee', 'mi_ficha.mi_desempeno',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('employee', 'mi_ficha.mi_delivery',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('employee', 'mi_ficha.mis_permisos',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('employee', 'mi_ficha.mis_objetivos',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('employee', 'mi_ficha.mis_evaluaciones',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('employee', 'mi_ficha.mi_organizacion',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- finance_admin: full finance + economia + staff_augmentation + payment instruments.
  -- ─────────────────────────────────────────────────────────────────────────────
  ('finance_admin', 'finanzas.resumen',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.ingresos',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.egresos',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.conciliacion',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.banco',                    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.cuenta_corriente_accionista', true, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.clientes',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.proveedores',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.inteligencia',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.asignaciones_costos',      true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.cotizaciones',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.ordenes_compra',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'finanzas.hes',                      true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'gestion.economia',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'gestion.staff_augmentation',        true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'administracion.instrumentos_pago',  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'mi_ficha.mi_perfil',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'mi_ficha.mi_nomina',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'mi_ficha.mi_inicio',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'mi_ficha.mis_asignaciones',         true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'mi_ficha.mi_desempeno',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'mi_ficha.mi_delivery',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'mi_ficha.mis_permisos',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'mi_ficha.mis_objetivos',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'mi_ficha.mis_evaluaciones',         true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_admin', 'mi_ficha.mi_organizacion',          true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- finance_analyst: read-only finance + economia. Write enforcement vive en capabilities.
  -- ─────────────────────────────────────────────────────────────────────────────
  ('finance_analyst', 'finanzas.resumen',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.ingresos',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.egresos',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.conciliacion',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.banco',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.cuenta_corriente_accionista', true, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.clientes',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.proveedores',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.inteligencia',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.asignaciones_costos',    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.cotizaciones',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.ordenes_compra',         true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'finanzas.hes',                    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'gestion.economia',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'mi_ficha.mi_perfil',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'mi_ficha.mi_nomina',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'mi_ficha.mi_inicio',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'mi_ficha.mis_asignaciones',       true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'mi_ficha.mi_desempeno',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'mi_ficha.mi_delivery',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'mi_ficha.mis_permisos',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'mi_ficha.mis_objetivos',          true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'mi_ficha.mis_evaluaciones',       true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_analyst', 'mi_ficha.mi_organizacion',        true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- finance_manager: ejecutivo finance + cross-context (delivery/capacidad para forecasting).
  -- ─────────────────────────────────────────────────────────────────────────────
  ('finance_manager', 'finanzas.resumen',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.ingresos',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.egresos',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.conciliacion',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.banco',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.cuenta_corriente_accionista', true, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.clientes',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.proveedores',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.inteligencia',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.asignaciones_costos',    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.cotizaciones',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.ordenes_compra',         true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'finanzas.hes',                    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'gestion.economia',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'gestion.staff_augmentation',      true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'gestion.delivery',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'gestion.capacidad',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'administracion.instrumentos_pago', true, 'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'mi_ficha.mi_perfil',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'mi_ficha.mi_nomina',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'mi_ficha.mi_inicio',              true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'mi_ficha.mis_asignaciones',       true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'mi_ficha.mi_desempeno',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'mi_ficha.mi_delivery',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'mi_ficha.mis_permisos',           true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'mi_ficha.mis_objetivos',          true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'mi_ficha.mis_evaluaciones',       true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('finance_manager', 'mi_ficha.mi_organizacion',        true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- hr_payroll: nómina + permisos + organigrama + departamentos. Sin objetivos/evaluaciones.
  -- ─────────────────────────────────────────────────────────────────────────────
  ('hr_payroll', 'equipo.personas',                      true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'equipo.nomina',                        true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'equipo.nomina_proyectada',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'equipo.permisos',                      true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'equipo.jerarquia',                     true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'equipo.organigrama',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'equipo.departamentos',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'equipo.asistencia',                    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'mi_ficha.mi_perfil',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'mi_ficha.mi_nomina',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'mi_ficha.mi_inicio',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'mi_ficha.mis_asignaciones',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'mi_ficha.mi_desempeno',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'mi_ficha.mi_delivery',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'mi_ficha.mis_permisos',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'mi_ficha.mis_objetivos',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'mi_ficha.mis_evaluaciones',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_payroll', 'mi_ficha.mi_organizacion',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- hr_manager: full HR (incluye objetivos, evaluaciones).
  -- ─────────────────────────────────────────────────────────────────────────────
  ('hr_manager', 'equipo.personas',                      true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'equipo.nomina',                        true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'equipo.nomina_proyectada',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'equipo.permisos',                      true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'equipo.jerarquia',                     true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'equipo.organigrama',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'equipo.departamentos',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'equipo.asistencia',                    true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'equipo.objetivos',                     true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'equipo.evaluaciones',                  true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'mi_ficha.mi_perfil',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'mi_ficha.mi_nomina',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'mi_ficha.mi_inicio',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'mi_ficha.mis_asignaciones',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'mi_ficha.mi_desempeno',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'mi_ficha.mi_delivery',                 true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'mi_ficha.mis_permisos',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'mi_ficha.mis_objetivos',               true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'mi_ficha.mis_evaluaciones',            true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('hr_manager', 'mi_ficha.mi_organizacion',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- people_viewer: solo personas + organigrama.
  -- ─────────────────────────────────────────────────────────────────────────────
  ('people_viewer', 'equipo.personas',                   true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('people_viewer', 'equipo.organigrama',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),

  -- ─────────────────────────────────────────────────────────────────────────────
  -- ai_tooling_admin: solo herramientas IA + mi_ficha mínimo.
  -- ─────────────────────────────────────────────────────────────────────────────
  ('ai_tooling_admin', 'ia.herramientas',                true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('ai_tooling_admin', 'mi_ficha.mi_perfil',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('ai_tooling_admin', 'mi_ficha.mi_inicio',             true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727'),
  ('ai_tooling_admin', 'mi_ficha.mi_organizacion',       true,  'migration:TASK-727', NOW(), NOW(), 'migration:TASK-727')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted    = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-727';

-- Audit log: registro estructurado para gobernanza
INSERT INTO greenhouse_core.view_access_log
  (action, target_role, view_code, performed_by, reason, created_at)
SELECT
  CASE WHEN rva.granted THEN 'grant_role' ELSE 'revoke_role' END,
  rva.role_code,
  rva.view_code,
  'migration:TASK-727',
  'TASK-727: Seed canonical role × view matrix for 12 internal roles. Closes Daniela Ferreira leak: efeonce_operations no longer sees gestion.economia (denial explícito). Replicates TASK-285 pattern.',
  NOW()
FROM greenhouse_core.role_view_assignments rva
WHERE rva.role_code IN (
    'efeonce_admin', 'efeonce_operations', 'efeonce_account', 'collaborator', 'employee',
    'finance_admin', 'finance_analyst', 'finance_manager',
    'hr_payroll', 'hr_manager', 'people_viewer', 'ai_tooling_admin'
  )
  AND rva.updated_by = 'migration:TASK-727';

-- Down Migration
-- Revert: solo borra las filas seeded por esta migración. Preserva ediciones manuales del admin
-- que hayan cambiado el `updated_by` posterior a la aplicación.
DELETE FROM greenhouse_core.role_view_assignments
WHERE updated_by = 'migration:TASK-727';

DELETE FROM greenhouse_core.view_access_log
WHERE performed_by = 'migration:TASK-727';
