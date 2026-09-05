import { expect, it } from 'vitest'

import { can } from '@/lib/entitlements/runtime'
import { ROLE_CODES } from '@/config/role-codes'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

const subject = (role: string): TenantEntitlementSubject => ({
  userId: 'operator',
  tenantType: 'efeonce_internal',
  roleCodes: [role],
  primaryRoleCode: role,
  routeGroups: [],
  authorizedViews: []
})

it('internal access authorities require the legitimate operator role', () => {
  for (const capability of [
    'identity.internal_access.enroll',
    'identity.internal_access.revoke',
    'identity.internal_access.grant'
  ] as const) {
    expect(can(subject(ROLE_CODES.EFEONCE_ADMIN), capability, 'execute', 'tenant')).toBe(true)
    expect(can(subject('COLLABORATOR'), capability, 'execute', 'tenant')).toBe(false)
  }
})
