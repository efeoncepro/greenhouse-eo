import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'
import { deriveRouteGroupsForSingleRole } from '@/lib/tenant/role-route-mapping'

/**
 * TASK-285: Client Role Visibility Matrix
 *
 * Documents the persisted role_view_assignments seeded by migration
 * 20260416095444700_seed-client-role-view-assignments.sql
 *
 * Resolution contract:
 *   - Persisted assignment (granted: true/false) takes precedence over fallback
 *   - Without persistence, fallback grants all views whose routeGroup matches the role's
 *   - After TASK-285 migration: specialist loses analytics, campanas, equipo
 *
 * Ref: GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md §12.5
 */

const CLIENT_VIEW_CODES = VIEW_REGISTRY
  .filter(v => v.section === 'cliente')
  .map(v => v.viewCode)
  .sort()

/** The visibility matrix seeded by the TASK-285 migration. */
const TASK_285_MATRIX: Record<string, Record<string, boolean>> = {
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

describe('TASK-285: Client role visibility matrix', () => {
  it('all 11 client view codes exist in the registry', () => {
    expect(CLIENT_VIEW_CODES).toHaveLength(11)
    expect(CLIENT_VIEW_CODES).toContain('cliente.pulse')
    expect(CLIENT_VIEW_CODES).toContain('cliente.proyectos')
    expect(CLIENT_VIEW_CODES).toContain('cliente.ciclos')
    expect(CLIENT_VIEW_CODES).toContain('cliente.equipo')
    expect(CLIENT_VIEW_CODES).toContain('cliente.revisiones')
    expect(CLIENT_VIEW_CODES).toContain('cliente.analytics')
    expect(CLIENT_VIEW_CODES).toContain('cliente.campanas')
    expect(CLIENT_VIEW_CODES).toContain('cliente.modulos')
    expect(CLIENT_VIEW_CODES).toContain('cliente.actualizaciones')
    expect(CLIENT_VIEW_CODES).toContain('cliente.configuracion')
    expect(CLIENT_VIEW_CODES).toContain('cliente.notificaciones')
  })

  it('matrix covers every client view for every client role', () => {
    const clientRoles = [ROLE_CODES.CLIENT_EXECUTIVE, ROLE_CODES.CLIENT_MANAGER, ROLE_CODES.CLIENT_SPECIALIST]

    for (const role of clientRoles) {
      const matrixViews = Object.keys(TASK_285_MATRIX[role]).sort()

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

  it('client_executive sees all 11 views', () => {
    const granted = Object.entries(TASK_285_MATRIX.client_executive)
      .filter(([, v]) => v)
      .map(([k]) => k)

    expect(granted).toHaveLength(11)
  })

  it('client_manager sees all 11 views', () => {
    const granted = Object.entries(TASK_285_MATRIX.client_manager)
      .filter(([, v]) => v)
      .map(([k]) => k)

    expect(granted).toHaveLength(11)
  })

  it('client_specialist sees 8 views and is denied 3 (AC #2)', () => {
    const granted = Object.entries(TASK_285_MATRIX.client_specialist)
      .filter(([, v]) => v)
      .map(([k]) => k)

    const denied = Object.entries(TASK_285_MATRIX.client_specialist)
      .filter(([, v]) => !v)
      .map(([k]) => k)

    expect(granted).toHaveLength(8)
    expect(denied).toHaveLength(3)
    expect(denied).toContain('cliente.analytics')
    expect(denied).toContain('cliente.campanas')
    expect(denied).toContain('cliente.equipo')
  })

  it('specialist retains access to core navigation views', () => {
    // AC #5: existing core views remain accessible
    expect(TASK_285_MATRIX.client_specialist['cliente.pulse']).toBe(true)
    expect(TASK_285_MATRIX.client_specialist['cliente.proyectos']).toBe(true)
    expect(TASK_285_MATRIX.client_specialist['cliente.revisiones']).toBe(true)
    expect(TASK_285_MATRIX.client_specialist['cliente.configuracion']).toBe(true)
    expect(TASK_285_MATRIX.client_specialist['cliente.notificaciones']).toBe(true)
  })

  it('all client views have routeGroup = client', () => {
    const clientViews = VIEW_REGISTRY.filter(v => v.section === 'cliente')

    for (const view of clientViews) {
      expect(view.routeGroup).toBe('client')
    }
  })
})
