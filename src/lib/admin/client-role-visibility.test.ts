import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'
import { deriveRouteGroupsForSingleRole } from '@/lib/tenant/role-route-mapping'

/**
 * Client Role Visibility Matrix — TASK-285 (V1.0) + TASK-827 (V1.4 forward-looking)
 *
 * Documents the persisted `role_view_assignments` seeded by two canonical migrations:
 *   - TASK-285 (20260416095444700) — 11 viewCodes V1.0 con contract específico de specialist
 *     (specialist NO ve `analytics`, `campanas`, `equipo`)
 *   - TASK-827 (20260513134828199) — 11 viewCodes V1.4 forward-looking nuevos
 *     (todos los 3 client roles tienen grant=TRUE para todos los nuevos)
 *
 * Resolution contract:
 *   - Persisted assignment (granted: true/false) takes precedence over fallback
 *   - Without persistence, fallback grants all views whose routeGroup matches the role's
 *   - After TASK-285 migration: specialist loses analytics, campanas, equipo
 *   - After TASK-827 migration: 11 viewCodes forward-looking grant=TRUE para los 3 client roles
 *
 * Refs:
 *   - GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md §12.5
 *   - GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md §Delta 2026-05-13 (TASK-827)
 *   - CLAUDE.md "View Registry Governance Pattern (TASK-827)"
 */

/** 11 viewCodes V1.0 originales (TASK-285). Contract pin-ea specialist denials. */
const CLIENT_VIEW_CODES_V1_0_LEGACY = [
  'cliente.actualizaciones',
  'cliente.analytics',
  'cliente.campanas',
  'cliente.ciclos',
  'cliente.configuracion',
  'cliente.equipo',
  'cliente.modulos',
  'cliente.notificaciones',
  'cliente.proyectos',
  'cliente.pulse',
  'cliente.revisiones'
].sort()

/** 11 viewCodes V1.4 forward-looking (TASK-827 Slice 0). Todos los 3 client roles grant=TRUE. */
const CLIENT_VIEW_CODES_V1_4_FORWARD_LOOKING = [
  'cliente.brand_intelligence',
  'cliente.creative_hub',
  'cliente.crm_command',
  'cliente.csc_pipeline',
  'cliente.cvr_quarterly',
  'cliente.exports',
  'cliente.home',
  'cliente.reviews',
  'cliente.roi_reports',
  'cliente.staff_aug',
  'cliente.web_delivery'
].sort()

/** All client viewCodes en el registry (V1.0 legacy + V1.4 forward-looking = 22 total). */
const CLIENT_VIEW_CODES = VIEW_REGISTRY
  .filter(v => v.section === 'cliente')
  .map(v => v.viewCode)
  .sort()

/**
 * The visibility matrix seeded by TASK-285 + TASK-827 migrations.
 *
 * V1.0 (TASK-285): pin-ea contract específico para specialist denials.
 * V1.4 (TASK-827): forward-looking viewCodes grant=TRUE para los 3 client roles
 * (migration 20260513134828199 seedea 44 filas = 4 roles × 11 viewCodes).
 */
const TASK_285_LEGACY_MATRIX_V1_0: Record<string, Record<string, boolean>> = {
  client_executive: {
    'cliente.pulse': true,
    'cliente.proyectos': true,
    'cliente.ciclos': true,
    'cliente.equipo': true,
    'cliente.revisiones': true,
    'cliente.analytics': true,
    'cliente.campanas': true,
    'cliente.modulos': true,
    'cliente.actualizaciones': true,
    'cliente.configuracion': true,
    'cliente.notificaciones': true
  },
  client_manager: {
    'cliente.pulse': true,
    'cliente.proyectos': true,
    'cliente.ciclos': true,
    'cliente.equipo': true,
    'cliente.revisiones': true,
    'cliente.analytics': true,
    'cliente.campanas': true,
    'cliente.modulos': true,
    'cliente.actualizaciones': true,
    'cliente.configuracion': true,
    'cliente.notificaciones': true
  },
  client_specialist: {
    'cliente.pulse': true,
    'cliente.proyectos': true,
    'cliente.ciclos': true,
    'cliente.equipo': false,
    'cliente.revisiones': true,
    'cliente.analytics': false,
    'cliente.campanas': false,
    'cliente.modulos': true,
    'cliente.actualizaciones': true,
    'cliente.configuracion': true,
    'cliente.notificaciones': true
  }
}

/**
 * Matrix forward-looking V1.4 (TASK-827 Slice 0): los 11 nuevos viewCodes
 * grant=TRUE para los 3 client roles. Si emerge requerimiento de denials
 * per-role para algún viewCode forward-looking, se decide en task derivada
 * y se actualiza ESTA matriz + la migration acompañante (NUNCA solo una).
 */
const TASK_827_FORWARD_LOOKING_MATRIX_V1_4: Record<string, Record<string, boolean>> =
  Object.fromEntries(
    [ROLE_CODES.CLIENT_EXECUTIVE, ROLE_CODES.CLIENT_MANAGER, ROLE_CODES.CLIENT_SPECIALIST].map(role => [
      role,
      Object.fromEntries(CLIENT_VIEW_CODES_V1_4_FORWARD_LOOKING.map(viewCode => [viewCode, true]))
    ])
  )

/** Composed matrix V1.0 legacy + V1.4 forward-looking = single source of truth para tests. */
const CLIENT_VISIBILITY_MATRIX: Record<string, Record<string, boolean>> = {
  client_executive: {
    ...TASK_285_LEGACY_MATRIX_V1_0.client_executive,
    ...TASK_827_FORWARD_LOOKING_MATRIX_V1_4.client_executive
  },
  client_manager: {
    ...TASK_285_LEGACY_MATRIX_V1_0.client_manager,
    ...TASK_827_FORWARD_LOOKING_MATRIX_V1_4.client_manager
  },
  client_specialist: {
    ...TASK_285_LEGACY_MATRIX_V1_0.client_specialist,
    ...TASK_827_FORWARD_LOOKING_MATRIX_V1_4.client_specialist
  }
}

describe('Client role visibility matrix (TASK-285 V1.0 + TASK-827 V1.4)', () => {
  it('VIEW_REGISTRY contains 11 V1.0 legacy viewCodes (TASK-285 contract)', () => {
    for (const viewCode of CLIENT_VIEW_CODES_V1_0_LEGACY) {
      expect(CLIENT_VIEW_CODES).toContain(viewCode)
    }

    expect(CLIENT_VIEW_CODES_V1_0_LEGACY).toHaveLength(11)
  })

  it('VIEW_REGISTRY contains 11 V1.4 forward-looking viewCodes (TASK-827 Slice 0)', () => {
    for (const viewCode of CLIENT_VIEW_CODES_V1_4_FORWARD_LOOKING) {
      expect(CLIENT_VIEW_CODES).toContain(viewCode)
    }

    expect(CLIENT_VIEW_CODES_V1_4_FORWARD_LOOKING).toHaveLength(11)
  })

  it('VIEW_REGISTRY exposes exactly the union of V1.0 + V1.4 viewCodes (parity TS↔seed)', () => {
    const expectedUnion = [
      ...CLIENT_VIEW_CODES_V1_0_LEGACY,
      ...CLIENT_VIEW_CODES_V1_4_FORWARD_LOOKING
    ].sort()

    expect(CLIENT_VIEW_CODES).toEqual(expectedUnion)
    expect(CLIENT_VIEW_CODES).toHaveLength(22)
  })

  it('matrix covers every client view for every client role', () => {
    const clientRoles = [ROLE_CODES.CLIENT_EXECUTIVE, ROLE_CODES.CLIENT_MANAGER, ROLE_CODES.CLIENT_SPECIALIST]

    for (const role of clientRoles) {
      const matrixViews = Object.keys(CLIENT_VISIBILITY_MATRIX[role]).sort()

      expect(matrixViews).toEqual(CLIENT_VIEW_CODES)
    }
  })

  it('all 3 client roles share the same route group (client)', () => {
    const execGroups = deriveRouteGroupsForSingleRole(ROLE_CODES.CLIENT_EXECUTIVE, 'client')
    const mgrGroups = deriveRouteGroupsForSingleRole(ROLE_CODES.CLIENT_MANAGER, 'client')
    const specGroups = deriveRouteGroupsForSingleRole(ROLE_CODES.CLIENT_SPECIALIST, 'client')

    expect(execGroups).toEqual(['client'])
    expect(mgrGroups).toEqual(['client'])
    expect(specGroups).toEqual(['client'])
  })

  it('client_executive sees all 22 views (V1.0 + V1.4)', () => {
    const granted = Object.entries(CLIENT_VISIBILITY_MATRIX.client_executive)
      .filter(([, v]) => v)
      .map(([k]) => k)

    expect(granted).toHaveLength(22)
  })

  it('client_manager sees all 22 views (V1.0 + V1.4)', () => {
    const granted = Object.entries(CLIENT_VISIBILITY_MATRIX.client_manager)
      .filter(([, v]) => v)
      .map(([k]) => k)

    expect(granted).toHaveLength(22)
  })

  it('client_specialist sees 19 views and is denied 3 (TASK-285 AC #2 preserved post-TASK-827)', () => {
    const granted = Object.entries(CLIENT_VISIBILITY_MATRIX.client_specialist)
      .filter(([, v]) => v)
      .map(([k]) => k)

    const denied = Object.entries(CLIENT_VISIBILITY_MATRIX.client_specialist)
      .filter(([, v]) => !v)
      .map(([k]) => k)

    // 22 total - 3 V1.0 legacy denials (analytics, campanas, equipo) = 19 granted
    expect(granted).toHaveLength(19)
    expect(denied).toHaveLength(3)
    expect(denied).toContain('cliente.analytics')
    expect(denied).toContain('cliente.campanas')
    expect(denied).toContain('cliente.equipo')
  })

  it('specialist retains access to core navigation views (TASK-285 AC #5)', () => {
    expect(CLIENT_VISIBILITY_MATRIX.client_specialist['cliente.pulse']).toBe(true)
    expect(CLIENT_VISIBILITY_MATRIX.client_specialist['cliente.proyectos']).toBe(true)
    expect(CLIENT_VISIBILITY_MATRIX.client_specialist['cliente.revisiones']).toBe(true)
    expect(CLIENT_VISIBILITY_MATRIX.client_specialist['cliente.configuracion']).toBe(true)
    expect(CLIENT_VISIBILITY_MATRIX.client_specialist['cliente.notificaciones']).toBe(true)
  })

  it('specialist has grant=TRUE for all 11 V1.4 forward-looking viewCodes (TASK-827 seed)', () => {
    for (const viewCode of CLIENT_VIEW_CODES_V1_4_FORWARD_LOOKING) {
      expect(CLIENT_VISIBILITY_MATRIX.client_specialist[viewCode]).toBe(true)
    }
  })

  it('all client views have routeGroup = client', () => {
    const clientViews = VIEW_REGISTRY.filter(v => v.section === 'cliente')

    for (const view of clientViews) {
      expect(view.routeGroup).toBe('client')
    }
  })
})
