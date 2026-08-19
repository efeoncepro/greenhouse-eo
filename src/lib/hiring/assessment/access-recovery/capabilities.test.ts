import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { can, getTenantEntitlements } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

const subject = (roleCode: string, routeGroups: string[] = ['internal']): TenantEntitlementSubject => ({
  userId: `user-${roleCode}`,
  tenantType: 'efeonce_internal',
  roleCodes: [roleCode],
  primaryRoleCode: roleCode,
  routeGroups,
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/home',
})

const hasEmailRecovery = (roleCode: string) =>
  can(getTenantEntitlements(subject(roleCode)), 'hiring.assessment.recover_access_email', 'execute', 'tenant')

const hasLinkReveal = (roleCode: string) =>
  can(getTenantEntitlements(subject(roleCode)), 'hiring.assessment.reveal_access_link', 'execute', 'tenant')

describe('TASK-1746 recovery capability grants', () => {
  it.each([ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.HR_MANAGER, ROLE_CODES.EFEONCE_OPERATIONS])(
    'grants both recovery actions to the role-only Hiring governance tier: %s',
    roleCode => {
      expect(hasEmailRecovery(roleCode)).toBe(true)
      expect(hasLinkReveal(roleCode)).toBe(true)
    },
  )

  it.each([ROLE_CODES.COLLABORATOR, ROLE_CODES.EFEONCE_ACCOUNT, ROLE_CODES.DESIGNER])(
    'does not inherit recovery from internal route-group membership: %s',
    roleCode => {
      expect(hasEmailRecovery(roleCode)).toBe(false)
      expect(hasLinkReveal(roleCode)).toBe(false)
    },
  )
})
