import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'
import { deriveRouteGroupsForSingleRole } from '@/lib/tenant/role-route-mapping'

/**
 * TASK-727: Internal Role × View Matrix
 *
 * Documents the persisted role_view_assignments seeded by migration
 * 20260429100204419_task-727-seed-internal-role-view-assignments.sql
 *
 * Resolution contract (idéntico a TASK-285):
 *   - Persisted assignment (granted: true/false) takes precedence over fallback
 *   - Without persistence, fallback grants all views whose routeGroup matches the role's
 *
 * Closes the leak detected on Daniela Ferreira (Creative Lead, role efeonce_operations):
 *   - efeonce_operations YA NO ve `gestion.economia` (denial explícito post-seed)
 *   - efeonce_operations YA NO ve `gestion.staff_augmentation` (denial explícito)
 *
 * Ref: docs/tasks/in-progress/TASK-727-internal-role-view-seed-and-supervisor-jwt.md
 */

const VIEW_CODES_BY_SECTION = (section: string) =>
  VIEW_REGISTRY.filter(v => v.section === section).map(v => v.viewCode).sort()

const ALL_INTERNAL_VIEW_CODES = VIEW_REGISTRY
  .filter(v => v.section !== 'cliente')
  .map(v => v.viewCode)
  .sort()

const MI_FICHA_VIEW_CODES = VIEW_CODES_BY_SECTION('mi_ficha')
const FINANZAS_VIEW_CODES = VIEW_CODES_BY_SECTION('finanzas')
const EQUIPO_VIEW_CODES = VIEW_CODES_BY_SECTION('equipo')

/**
 * The visibility matrix seeded by the TASK-727 migration.
 * Solo registramos vistas con grant=true. Para denials explícitos (granted=false),
 * usamos el set DENIED_VIEWS para verificar que la fila existe pero no concede acceso.
 */
const TASK_727_GRANTS: Record<string, string[]> = {
  efeonce_admin: [
    'gestion.agencia', 'gestion.organizaciones', 'gestion.servicios', 'gestion.staff_augmentation',
    'gestion.spaces', 'gestion.economia', 'gestion.equipo', 'gestion.delivery', 'gestion.campanas',
    'gestion.operaciones', 'gestion.capacidad',
    'equipo.personas', 'equipo.nomina', 'equipo.nomina_proyectada', 'equipo.permisos',
    'equipo.jerarquia', 'equipo.organigrama', 'equipo.departamentos', 'equipo.asistencia',
    'equipo.objetivos', 'equipo.evaluaciones',
    'finanzas.resumen', 'finanzas.ingresos', 'finanzas.egresos', 'finanzas.conciliacion',
    'finanzas.ordenes_pago',
    'finanzas.banco', 'finanzas.cuenta_corriente_accionista', 'finanzas.clientes',
    'finanzas.proveedores', 'finanzas.inteligencia', 'finanzas.asignaciones_costos',
    'finanzas.cotizaciones', 'finanzas.ordenes_compra', 'finanzas.hes',
    'ia.herramientas',
    // commercial_parties/product_sync_conflicts/product_catalog viven en VIEW_REGISTRY
    // pero aun NO estan en la DB view_registry; efeonce_admin los ve via is_admin fallback.
    'administracion.admin_center', 'administracion.cuentas',
    'administracion.instrumentos_pago', 'administracion.spaces', 'administracion.usuarios',
    'administracion.roles', 'administracion.vistas', 'administracion.ops_health',
    'administracion.cloud_integrations', 'administracion.email_delivery',
    'administracion.notifications', 'administracion.calendario_operativo', 'administracion.equipo',
    ...MI_FICHA_VIEW_CODES
  ].sort(),

  efeonce_operations: [
    'gestion.agencia', 'gestion.organizaciones', 'gestion.servicios', 'gestion.spaces',
    'gestion.equipo', 'gestion.delivery', 'gestion.campanas', 'gestion.operaciones',
    'gestion.capacidad',
    'equipo.personas', 'equipo.organigrama',
    ...MI_FICHA_VIEW_CODES
  ].sort(),

  efeonce_account: [
    'gestion.agencia', 'gestion.organizaciones', 'gestion.servicios', 'gestion.spaces',
    'gestion.equipo', 'gestion.delivery', 'gestion.campanas',
    ...MI_FICHA_VIEW_CODES
  ].sort(),

  collaborator: [...MI_FICHA_VIEW_CODES].sort(),

  employee: [...MI_FICHA_VIEW_CODES].sort(),

  finance_admin: [
    ...FINANZAS_VIEW_CODES,
    'gestion.economia', 'gestion.staff_augmentation', 'administracion.instrumentos_pago',
    ...MI_FICHA_VIEW_CODES
  ].sort(),

  finance_analyst: [
    ...FINANZAS_VIEW_CODES,
    'gestion.economia',
    ...MI_FICHA_VIEW_CODES
  ].sort(),

  finance_manager: [
    ...FINANZAS_VIEW_CODES,
    'gestion.economia', 'gestion.staff_augmentation', 'gestion.delivery', 'gestion.capacidad',
    'administracion.instrumentos_pago',
    ...MI_FICHA_VIEW_CODES
  ].sort(),

  hr_payroll: [
    'equipo.personas', 'equipo.nomina', 'equipo.nomina_proyectada', 'equipo.permisos',
    'equipo.jerarquia', 'equipo.organigrama', 'equipo.departamentos', 'equipo.asistencia',
    ...MI_FICHA_VIEW_CODES
  ].sort(),

  hr_manager: [
    ...EQUIPO_VIEW_CODES,
    ...MI_FICHA_VIEW_CODES
  ].sort(),

  people_viewer: ['equipo.personas', 'equipo.organigrama'].sort(),

  ai_tooling_admin: ['ia.herramientas', 'mi_ficha.mi_perfil', 'mi_ficha.mi_inicio', 'mi_ficha.mi_organizacion'].sort()
}

/** Denials explícitos (granted=false en DB). Usados para verificar la columna de denials. */
const TASK_727_DENIALS: Record<string, string[]> = {
  efeonce_operations: [
    'gestion.economia',
    'gestion.staff_augmentation',
    'equipo.nomina',
    'equipo.nomina_proyectada'
  ],
  efeonce_account: [
    'gestion.economia',
    'gestion.staff_augmentation',
    'gestion.operaciones',
    'gestion.capacidad',
    'equipo.nomina',
    'equipo.nomina_proyectada'
  ]
}

describe('TASK-727: Internal role × view matrix', () => {
  it('view registry has at least 60 internal views (sanity check)', () => {
    expect(ALL_INTERNAL_VIEW_CODES.length).toBeGreaterThanOrEqual(60)
  })

  it('mi_ficha has 10 views', () => {
    expect(MI_FICHA_VIEW_CODES).toHaveLength(10)
  })

  it('finanzas has 14 views', () => {
    expect(FINANZAS_VIEW_CODES).toHaveLength(14)
  })

  it('equipo has 11 views (incluye offboarding y nomina_proyectada)', () => {
    expect(EQUIPO_VIEW_CODES).toHaveLength(11)
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Daniela Ferreira regression suite — efeonce_operations no debe ver financiero
  // ─────────────────────────────────────────────────────────────────────────────

  it('efeonce_operations DOES NOT see gestion.economia (Daniela leak fix)', () => {
    expect(TASK_727_GRANTS.efeonce_operations).not.toContain('gestion.economia')
    expect(TASK_727_DENIALS.efeonce_operations).toContain('gestion.economia')
  })

  it('efeonce_operations DOES NOT see gestion.staff_augmentation (Daniela leak fix)', () => {
    expect(TASK_727_GRANTS.efeonce_operations).not.toContain('gestion.staff_augmentation')
    expect(TASK_727_DENIALS.efeonce_operations).toContain('gestion.staff_augmentation')
  })

  it('efeonce_operations DOES NOT see cross-team payroll (sensitive — only HR/admin)', () => {
    expect(TASK_727_GRANTS.efeonce_operations).not.toContain('equipo.nomina')
    expect(TASK_727_GRANTS.efeonce_operations).not.toContain('equipo.nomina_proyectada')
    expect(TASK_727_DENIALS.efeonce_operations).toContain('equipo.nomina')
    expect(TASK_727_DENIALS.efeonce_operations).toContain('equipo.nomina_proyectada')
  })

  it('efeonce_operations DOES see her own personal payroll (mi_ficha.mi_nomina)', () => {
    // Daniela puede ver SU PROPIA liquidación; no la del equipo (audit-critical distinction)
    expect(TASK_727_GRANTS.efeonce_operations).toContain('mi_ficha.mi_nomina')
  })

  it('efeonce_account DOES NOT see cross-team payroll either', () => {
    expect(TASK_727_GRANTS.efeonce_account).not.toContain('equipo.nomina')
    expect(TASK_727_GRANTS.efeonce_account).not.toContain('equipo.nomina_proyectada')
    expect(TASK_727_DENIALS.efeonce_account).toContain('equipo.nomina')
    expect(TASK_727_DENIALS.efeonce_account).toContain('equipo.nomina_proyectada')
  })

  it('efeonce_operations sees all operativas: delivery, capacidad, operaciones, agencia', () => {
    expect(TASK_727_GRANTS.efeonce_operations).toContain('gestion.delivery')
    expect(TASK_727_GRANTS.efeonce_operations).toContain('gestion.capacidad')
    expect(TASK_727_GRANTS.efeonce_operations).toContain('gestion.operaciones')
    expect(TASK_727_GRANTS.efeonce_operations).toContain('gestion.agencia')
  })

  it('efeonce_operations sees equipo.personas + equipo.organigrama (coordinación)', () => {
    expect(TASK_727_GRANTS.efeonce_operations).toContain('equipo.personas')
    expect(TASK_727_GRANTS.efeonce_operations).toContain('equipo.organigrama')
  })

  it('efeonce_operations sees all mi_ficha (es colaborador interno)', () => {
    for (const view of MI_FICHA_VIEW_CODES) {
      expect(TASK_727_GRANTS.efeonce_operations).toContain(view)
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Finance roles — siguen viendo economia y full finance
  // ─────────────────────────────────────────────────────────────────────────────

  it('finance_admin sees gestion.economia + all finanzas.*', () => {
    expect(TASK_727_GRANTS.finance_admin).toContain('gestion.economia')

    for (const view of FINANZAS_VIEW_CODES) {
      expect(TASK_727_GRANTS.finance_admin).toContain(view)
    }
  })

  it('finance_analyst sees gestion.economia (read context)', () => {
    expect(TASK_727_GRANTS.finance_analyst).toContain('gestion.economia')
  })

  it('finance_manager sees economia + cross-context (delivery, capacidad)', () => {
    expect(TASK_727_GRANTS.finance_manager).toContain('gestion.economia')
    expect(TASK_727_GRANTS.finance_manager).toContain('gestion.delivery')
    expect(TASK_727_GRANTS.finance_manager).toContain('gestion.capacidad')
    expect(TASK_727_GRANTS.finance_manager).toContain('administracion.instrumentos_pago')
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin retiene full visibility (Julio no se ve afectado)
  // ─────────────────────────────────────────────────────────────────────────────

  it('efeonce_admin sees gestion.economia + all financial + admin views', () => {
    expect(TASK_727_GRANTS.efeonce_admin).toContain('gestion.economia')

    for (const view of FINANZAS_VIEW_CODES) {
      expect(TASK_727_GRANTS.efeonce_admin).toContain(view)
    }

    expect(TASK_727_GRANTS.efeonce_admin).toContain('administracion.admin_center')
    expect(TASK_727_GRANTS.efeonce_admin).toContain('administracion.spaces')
    expect(TASK_727_GRANTS.efeonce_admin).toContain('administracion.usuarios')
  })

  it('efeonce_admin coverage spans every section (gestion, equipo, finanzas, ia, administracion, mi_ficha)', () => {
    const sections = new Set<string>()

    for (const view of TASK_727_GRANTS.efeonce_admin) {
      const entry = VIEW_REGISTRY.find(v => v.viewCode === view)

      if (entry) sections.add(entry.section)
    }

    expect(sections).toContain('gestion')
    expect(sections).toContain('equipo')
    expect(sections).toContain('finanzas')
    expect(sections).toContain('ia')
    expect(sections).toContain('administracion')
    expect(sections).toContain('mi_ficha')
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Collaborator / employee — solo personal
  // ─────────────────────────────────────────────────────────────────────────────

  it('collaborator only sees mi_ficha.* (no gestion, no equipo, no finanzas)', () => {
    expect(TASK_727_GRANTS.collaborator).toEqual([...MI_FICHA_VIEW_CODES].sort())

    for (const view of TASK_727_GRANTS.collaborator) {
      const entry = VIEW_REGISTRY.find(v => v.viewCode === view)

      expect(entry?.section).toBe('mi_ficha')
    }
  })

  it('employee matches collaborator (same set today)', () => {
    expect(TASK_727_GRANTS.employee).toEqual(TASK_727_GRANTS.collaborator)
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // HR roles
  // ─────────────────────────────────────────────────────────────────────────────

  it('hr_manager sees all equipo.* views (full HR)', () => {
    for (const view of EQUIPO_VIEW_CODES) {
      expect(TASK_727_GRANTS.hr_manager).toContain(view)
    }
  })

  it('hr_payroll sees equipo.* except objetivos/evaluaciones', () => {
    expect(TASK_727_GRANTS.hr_payroll).toContain('equipo.permisos')
    expect(TASK_727_GRANTS.hr_payroll).toContain('equipo.nomina')
    expect(TASK_727_GRANTS.hr_payroll).not.toContain('equipo.objetivos')
    expect(TASK_727_GRANTS.hr_payroll).not.toContain('equipo.evaluaciones')
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Tight roles
  // ─────────────────────────────────────────────────────────────────────────────

  it('people_viewer is tightly scoped (2 views)', () => {
    expect(TASK_727_GRANTS.people_viewer).toEqual(['equipo.organigrama', 'equipo.personas'])
  })

  it('ai_tooling_admin sees ia.herramientas + minimal mi_ficha', () => {
    expect(TASK_727_GRANTS.ai_tooling_admin).toContain('ia.herramientas')
    expect(TASK_727_GRANTS.ai_tooling_admin).toContain('mi_ficha.mi_perfil')
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Route group invariants
  // ─────────────────────────────────────────────────────────────────────────────

  it('route group scope for internal roles preserved (no role_route mapping changes)', () => {
    expect(deriveRouteGroupsForSingleRole(ROLE_CODES.EFEONCE_ADMIN, 'efeonce_internal')).toContain('admin')
    expect(deriveRouteGroupsForSingleRole(ROLE_CODES.EFEONCE_OPERATIONS, 'efeonce_internal')).toContain('internal')
    expect(deriveRouteGroupsForSingleRole(ROLE_CODES.FINANCE_ADMIN, 'efeonce_internal')).toContain('finance')
    expect(deriveRouteGroupsForSingleRole(ROLE_CODES.HR_PAYROLL, 'efeonce_internal')).toContain('hr')
  })

  it('every viewCode in TASK_727_GRANTS exists in VIEW_REGISTRY', () => {
    const registryCodes = new Set(VIEW_REGISTRY.map(v => v.viewCode))

    for (const role of Object.keys(TASK_727_GRANTS)) {
      for (const view of TASK_727_GRANTS[role]) {
        expect(registryCodes.has(view)).toBe(true)
      }
    }
  })

  it('every viewCode in TASK_727_DENIALS exists in VIEW_REGISTRY', () => {
    const registryCodes = new Set(VIEW_REGISTRY.map(v => v.viewCode))

    for (const role of Object.keys(TASK_727_DENIALS)) {
      for (const view of TASK_727_DENIALS[role]) {
        expect(registryCodes.has(view)).toBe(true)
      }
    }
  })

  it('coverage: 12 internal roles seeded', () => {
    const expected = [
      'efeonce_admin', 'efeonce_operations', 'efeonce_account',
      'collaborator', 'employee',
      'finance_admin', 'finance_analyst', 'finance_manager',
      'hr_payroll', 'hr_manager', 'people_viewer', 'ai_tooling_admin'
    ].sort()

    expect(Object.keys(TASK_727_GRANTS).sort()).toEqual(expected)
  })
})
