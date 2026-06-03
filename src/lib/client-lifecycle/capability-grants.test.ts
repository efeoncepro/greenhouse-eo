import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

// TASK-992 — verify the client.lifecycle.case.* capabilities resolve to real
// ROLE_CODES (anti-ghost-role TASK-935). The generic grant-coverage test only
// discovers string-literal can() calls; the lifecycle API checks pass the
// capability as a variable, so this focused test provides the real coverage.

const baseSubject = (overrides: Partial<TenantEntitlementSubject>): TenantEntitlementSubject => ({
  userId: 'lifecycle-grant-probe',
  tenantType: 'efeonce_internal',
  roleCodes: [],
  primaryRoleCode: ROLE_CODES.EFEONCE_ADMIN,
  routeGroups: [],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/home',
  ...overrides
})

const efeonceAdmin = baseSubject({ roleCodes: [ROLE_CODES.EFEONCE_ADMIN] })
const financeAdmin = baseSubject({ roleCodes: [ROLE_CODES.FINANCE_ADMIN], primaryRoleCode: ROLE_CODES.FINANCE_ADMIN })
const commercialRouteGroup = baseSubject({ roleCodes: [ROLE_CODES.EFEONCE_ACCOUNT], routeGroups: ['commercial'], primaryRoleCode: ROLE_CODES.EFEONCE_ACCOUNT })
const collaboratorOnly = baseSubject({ roleCodes: [ROLE_CODES.COLLABORATOR], routeGroups: ['my'], primaryRoleCode: ROLE_CODES.COLLABORATOR })

describe('client lifecycle capability grants', () => {
  it('grants open + resolve to EFEONCE_ADMIN and FINANCE_ADMIN', () => {
    for (const subject of [efeonceAdmin, financeAdmin]) {
      expect(can(subject, 'client.lifecycle.case.open', 'create', 'tenant')).toBe(true)
      expect(can(subject, 'client.lifecycle.case.resolve', 'approve', 'tenant')).toBe(true)
    }
  })

  it('restricts override_blocker to EFEONCE_ADMIN', () => {
    expect(can(efeonceAdmin, 'client.lifecycle.case.override_blocker', 'override', 'tenant')).toBe(true)
    expect(can(financeAdmin, 'client.lifecycle.case.override_blocker', 'override', 'tenant')).toBe(false)
  })

  it('grants read + advance via the commercial route group', () => {
    expect(can(commercialRouteGroup, 'client.lifecycle.case.read', 'read', 'tenant')).toBe(true)
    expect(can(commercialRouteGroup, 'client.lifecycle.case.advance', 'update', 'tenant')).toBe(true)
  })

  it('denies all lifecycle capabilities to a plain collaborator', () => {
    expect(can(collaboratorOnly, 'client.lifecycle.case.read', 'read', 'tenant')).toBe(false)
    expect(can(collaboratorOnly, 'client.lifecycle.case.open', 'create', 'tenant')).toBe(false)
    expect(can(collaboratorOnly, 'client.lifecycle.case.override_blocker', 'override', 'tenant')).toBe(false)
  })
})
