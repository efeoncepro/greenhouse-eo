import { describe, expect, it } from 'vitest'

import { buildEffectiveEntitlements, type EffectiveUserOverride } from './effective'
import type { TenantEntitlement } from './types'

const entry: TenantEntitlement = {
  module: 'growth', capability: 'growth.seo.observation.read', action: 'read', scope: 'tenant', source: 'role'
}

const override = (effect: 'grant' | 'revoke', approvalStatus: EffectiveUserOverride['approvalStatus'] = 'approved'): EffectiveUserOverride =>
  ({ ...entry, effect, approvalStatus, expiresAt: null })

const base = { baseEntries: [entry], userRoleCodes: ['efeonce_account'], userOverrides: [], roleDefaults: [] }

describe('canonical effective entitlement precedence', () => {
  it('applies a role revoke and then an approved user grant with provenance', () => {
    const roleDefaults = [{ ...entry, roleCode: 'efeonce_account', roleName: 'Account', effect: 'revoke' as const }]

    expect(buildEffectiveEntitlements({ ...base, roleDefaults })).toEqual([])
    expect(buildEffectiveEntitlements({ ...base, roleDefaults, userOverrides: [override('grant')] }))
      .toEqual([expect.objectContaining({ capability: entry.capability, originType: 'user_override', source: 'policy' })])
  })
  it('a user revoke wins, while pending or rejected changes do not confer or remove authority', () => {
    expect(buildEffectiveEntitlements({ ...base, userOverrides: [override('revoke')] })).toEqual([])

    for (const status of ['pending_approval', 'rejected'] as const) {
      expect(buildEffectiveEntitlements({ ...base, userOverrides: [override('revoke', status)] })).toHaveLength(1)
      expect(buildEffectiveEntitlements({ ...base, baseEntries: [], userOverrides: [override('grant', status)] })).toEqual([])
    }
  })
  it('does not apply another role default or invent wildcard deny semantics', () => {
    const roleDefaults = [{ ...entry, roleCode: 'efeonce_admin', roleName: 'Admin', effect: 'revoke' as const }]

    expect(buildEffectiveEntitlements({ ...base, roleDefaults })).toHaveLength(1)
    expect(buildEffectiveEntitlements({ ...base, userOverrides: [{ ...override('revoke'), scope: 'all' }] })).toHaveLength(1)
  })
})
