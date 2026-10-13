import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

const catalogCapability = 'marketing_studio.catalog.manage' as const

const subjectFor = (roleCodes: string[]): TenantEntitlementSubject => ({
  userId: 'catalog-governance-test',
  tenantType: 'efeonce_internal',
  roleCodes,
  primaryRoleCode: roleCodes[0] ?? ROLE_CODES.COLLABORATOR,
  routeGroups: ['internal', 'admin', 'commercial'],
  authorizedViews: [],
  serviceModules: ['marketing_studio']
})

describe('Marketing Studio catalog authority (TASK-1905)', () => {
  for (const role of Object.values(ROLE_CODES)) {
    it(`grants create/update only to catalog owners: ${role}`, () => {
      const subject = subjectFor([role])
      const allowed = role === ROLE_CODES.EFEONCE_ADMIN || role === ROLE_CODES.EFEONCE_OPERATIONS

      expect(can(subject, catalogCapability, 'create', 'tenant')).toBe(allowed)
      expect(can(subject, catalogCapability, 'update', 'tenant')).toBe(allowed)
      expect(can(subject, catalogCapability, 'delete', 'tenant')).toBe(false)
      expect(can(subject, catalogCapability, 'update', 'all')).toBe(false)
    })
  }

  it('does not combine account and designer into catalog authority', () => {
    const subject = subjectFor([ROLE_CODES.EFEONCE_ACCOUNT, ROLE_CODES.DESIGNER])

    expect(can(subject, 'marketing_studio.campaign.write', 'update', 'tenant')).toBe(true)
    expect(can(subject, catalogCapability, 'update', 'tenant')).toBe(false)
  })

  it('does not retain catalog authority from a stale primary role or admin route group', () => {
    const subject = { ...subjectFor([]), primaryRoleCode: ROLE_CODES.EFEONCE_ADMIN }

    expect(can(subject, catalogCapability, 'create', 'tenant')).toBe(false)
    expect(can(subject, catalogCapability, 'update', 'tenant')).toBe(false)
  })
})
