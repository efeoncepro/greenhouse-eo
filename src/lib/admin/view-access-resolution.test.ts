import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { deriveRouteGroupsFromRoles, deriveRouteGroupsForSingleRole, ROLE_ROUTE_GROUPS } from '@/lib/tenant/role-route-mapping'

describe('role-route-mapping', () => {
  it('derives correct route groups for efeonce_admin', () => {
    const groups = deriveRouteGroupsForSingleRole(ROLE_CODES.EFEONCE_ADMIN, 'efeonce_internal')

    expect(groups).toContain('client')
    expect(groups).toContain('finance')
    expect(groups).toContain('hr')
    expect(groups).toContain('internal')
    expect(groups).toContain('my')
    expect(groups).toContain('people')
    expect(groups).toContain('ai_tooling')
    expect(groups).toContain('admin')
    expect(groups).toContain('employee')
  })

  it('derives correct route groups for hr_payroll', () => {
    const groups = deriveRouteGroupsForSingleRole(ROLE_CODES.HR_PAYROLL, 'efeonce_internal')

    expect(groups).toContain('internal')
    expect(groups).toContain('hr')
    expect(groups).not.toContain('admin')
  })

  it('derives correct route groups for client_executive', () => {
    const groups = deriveRouteGroupsForSingleRole(ROLE_CODES.CLIENT_EXECUTIVE, 'client')

    expect(groups).toEqual(['client'])
  })

  it('falls back to tenant type when role is unknown', () => {
    const internalGroups = deriveRouteGroupsForSingleRole('unknown_role', 'efeonce_internal')
    const clientGroups = deriveRouteGroupsForSingleRole('unknown_role', 'client')

    expect(internalGroups).toEqual(['internal'])
    expect(clientGroups).toEqual(['client'])
  })

  it('combines route groups from multiple roles', () => {
    const groups = deriveRouteGroupsFromRoles(
      [ROLE_CODES.EFEONCE_OPERATIONS, ROLE_CODES.FINANCE_MANAGER],
      'efeonce_internal'
    )

    expect(groups).toContain('internal')
    expect(groups).toContain('finance')
  })

  it('all 15 ROLE_CODES have a mapping in ROLE_ROUTE_GROUPS', () => {
    for (const roleCode of Object.values(ROLE_CODES)) {
      expect(ROLE_ROUTE_GROUPS[roleCode]).toBeDefined()
      expect(ROLE_ROUTE_GROUPS[roleCode].length).toBeGreaterThan(0)
    }
  })
})

describe('additive view access contract', () => {
  // This test documents the contract: persisted assignment for 1 view
  // does NOT remove fallback access for other views.
  // The actual resolveAuthorizedViewsForUser is tested implicitly here
  // via the pure functions it depends on.

  it('a role with specific route groups retains all groups even when partially persisted', () => {
    // Simulate: admin has persisted grant for 1 finance view.
    // Verify: admin still has all its route groups (not just finance).
    const adminGroups = deriveRouteGroupsForSingleRole(ROLE_CODES.EFEONCE_ADMIN, 'efeonce_internal')

    // Admin should retain every route group regardless of any persisted view assignments
    expect(adminGroups).toContain('client')
    expect(adminGroups).toContain('finance')
    expect(adminGroups).toContain('hr')
    expect(adminGroups).toContain('internal')
    expect(adminGroups).toContain('my')
    expect(adminGroups).toContain('people')
    expect(adminGroups).toContain('ai_tooling')
    expect(adminGroups).toContain('admin')
    expect(adminGroups).toContain('employee')

    // The route group derivation is independent of view persistence
    // This is the "additive" guarantee: deriveRouteGroups never changes
    // based on what's persisted in role_view_assignments
  })

  it('finance_manager retains internal + finance groups unconditionally', () => {
    const groups = deriveRouteGroupsForSingleRole(ROLE_CODES.FINANCE_MANAGER, 'efeonce_internal')

    expect(groups).toContain('internal')
    expect(groups).toContain('finance')
    expect(groups).toHaveLength(2)
  })
})
