import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { ROLE_ROUTE_GROUPS, deriveRouteGroupsForSingleRole } from './role-route-mapping'

/**
 * TASK-1072 — `designer` role invariants.
 *
 * - route_group parity: ROLE_ROUTE_GROUPS[designer] MUST equal the DB seed
 *   roles.route_group_scope = {internal, my} (invariant TASK-987). The migration
 *   and this TS map are the two halves that must never diverge.
 * - capability gate: `design_system.figma_node.link` is granted to designer ∪
 *   efeonce_admin only — seeing the Design System (view) ≠ linking a node.
 */

const subject = (roleCodes: string[], routeGroups: string[]): TenantEntitlementSubject => ({
  userId: 'designer-test',
  tenantType: 'efeonce_internal',
  roleCodes,
  primaryRoleCode: roleCodes[0] ?? 'collaborator',
  routeGroups,
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/home'
})

describe('TASK-1072 — designer role route groups', () => {
  it('maps designer to {internal, my} (parity with roles.route_group_scope DB seed)', () => {
    expect(ROLE_ROUTE_GROUPS[ROLE_CODES.DESIGNER]).toEqual(['internal', 'my'])
  })

  it('derives the same route groups for a single designer role', () => {
    expect(deriveRouteGroupsForSingleRole(ROLE_CODES.DESIGNER, 'efeonce_internal')).toEqual(['internal', 'my'])
  })
})

describe('TASK-1072 — design_system.figma_node.link capability gate', () => {
  it('grants link to a designer', () => {
    const s = subject([ROLE_CODES.DESIGNER, ROLE_CODES.COLLABORATOR], ['internal', 'my'])

    expect(can(s, 'design_system.figma_node.link', 'update', 'tenant')).toBe(true)
  })

  it('grants link to efeonce_admin', () => {
    const s = subject([ROLE_CODES.EFEONCE_ADMIN], ['internal', 'admin', 'my'])

    expect(can(s, 'design_system.figma_node.link', 'update', 'tenant')).toBe(true)
  })

  it('denies link to a plain internal collaborator (sees DS, cannot link)', () => {
    const s = subject([ROLE_CODES.COLLABORATOR], ['internal', 'my'])

    expect(can(s, 'design_system.figma_node.link', 'update', 'tenant')).toBe(false)
  })

  it('denies link to a client', () => {
    const s = { ...subject([ROLE_CODES.CLIENT_EXECUTIVE], ['client']), tenantType: 'client' as const }

    expect(can(s, 'design_system.figma_node.link', 'update', 'tenant')).toBe(false)
  })
})
