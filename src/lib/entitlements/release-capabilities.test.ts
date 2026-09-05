import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { can, getTenantEntitlements } from './runtime'
import type { TenantEntitlementSubject } from './types'

const releaseContract = [
  ['platform.release.execute', 'execute'],
  ['platform.release.rollback', 'rollback'],
  ['platform.release.bypass_preflight', 'bypass_preflight'],
  ['platform.release.watchdog.read', 'read'],
  ['platform.release.preflight.execute', 'execute'],
  ['platform.release.preflight.read_results', 'read'],
  ['platform.release.preflight.override_batch_policy', 'update']
] as const

const subject = (role: string, routeGroups: string[] = []): TenantEntitlementSubject => ({
  userId: 'release-operator-fixture',
  tenantType: 'efeonce_internal',
  roleCodes: [role],
  primaryRoleCode: role,
  routeGroups,
  authorizedViews: []
})

describe('release authority: TASK-848/849/850 with TASK-935 role contract', () => {
  it.each(releaseContract)('admin receives exactly the governed action for %s', (capability, action) => {
    const entitlements = getTenantEntitlements(subject(ROLE_CODES.EFEONCE_ADMIN))

    expect(can(entitlements, capability, action, 'all')).toBe(true)
    expect(entitlements.entries.filter(entry => entry.capability === capability)).toEqual([
      expect.objectContaining({ capability, action, scope: 'all', source: 'role' })
    ])
    expect(can(entitlements, capability, action === 'read' ? 'execute' : 'read', 'all')).toBe(false)
  })

  it('finance admin receives only preflight result visibility', () => {
    for (const [capability, action] of releaseContract) {
      expect(can(subject(ROLE_CODES.FINANCE_ADMIN), capability, action, 'all')).toBe(
        capability === 'platform.release.preflight.read_results'
      )
    }
  })

  it.each([
    ROLE_CODES.COLLABORATOR,
    ROLE_CODES.EFEONCE_OPERATIONS,
    ROLE_CODES.EFEONCE_ACCOUNT,
    ROLE_CODES.FINANCE_ANALYST,
    ROLE_CODES.AI_TOOLING_ADMIN,
    ROLE_CODES.CLIENT_EXECUTIVE,
    ROLE_CODES.CLIENT_MANAGER,
    ROLE_CODES.CLIENT_SPECIALIST,
    'devops_operator'
  ])('does not grant release authority to %s or inherited route groups', role => {
    const actor = subject(role, ['admin', 'internal', 'finance'])

    if (role.startsWith('client_')) actor.tenantType = 'client'
    for (const [capability, action] of releaseContract) expect(can(actor, capability, action, 'all')).toBe(false)
  })
})
