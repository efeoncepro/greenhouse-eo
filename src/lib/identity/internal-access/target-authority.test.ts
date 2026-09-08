import { describe, expect, it } from 'vitest'

import type { TenantEntitlement } from '@/lib/entitlements/types'
import { evaluateInternalTarget } from './target-authority'

const read: TenantEntitlement = {
  module: 'growth', capability: 'growth.seo.observation.read', action: 'read', scope: 'tenant', source: 'role'
}

const identity: TenantEntitlement = {
  module: 'organization', capability: 'organization.identity', action: 'read', scope: 'all', source: 'role'
}

const target = (organizationId: string): Parameters<typeof evaluateInternalTarget>[0] => ({
  profileId: 'person', organizationId, activeCapabilities: [read.capability],
  spaces: [{
    spaceId: `space-${organizationId}`, userId: 'user',
    relation: { kind: 'internal_admin', subjectUserId: 'user', organizationId },
    platformEntries: [read, identity], spaceEntries: [read, identity]
  }]
})

describe('internal organization target authority', () => {
  it('allows A/B independently and denies unrelated C', () => {
    const a = evaluateInternalTarget(target('a'))
    const b = evaluateInternalTarget(target('b'))
    const c = target('c')

    c.spaces[0].relation = { kind: 'unrelated_internal', subjectUserId: 'user', organizationId: 'c' }
    expect(a?.capabilities).toEqual([read.capability])
    expect(b?.capabilities).toEqual([read.capability])
    expect(a?.authorityRevision).not.toEqual(b?.authorityRevision)
    expect(evaluateInternalTarget(c)).toBeNull()
  })
  it('revokes B without changing A and rejects global capability revocation on both', () => {
    const a = target('a'), b = target('b')
    const before = evaluateInternalTarget(a)

    b.spaces[0].spaceEntries = [identity]
    expect(evaluateInternalTarget(b)).toBeNull()
    expect(evaluateInternalTarget(a)).toEqual(before)

    for (const facts of [a, b]) {
      facts.spaces[0].platformEntries = [identity]
      expect(evaluateInternalTarget(facts)).toBeNull()
    }
  })
  it('cannot union a granted space with a denied space or substitute another organization/user', () => {
    const a = target('a')
    const second = { ...a.spaces[0], spaceId: 'second', spaceEntries: [identity] }

    expect(evaluateInternalTarget({ ...a, spaces: [...a.spaces, second] })).toBeNull()
    expect(evaluateInternalTarget({ ...a, spaces: [a.spaces[0], a.spaces[0]] })).toBeNull()
    a.spaces[0].relation = { kind: 'internal_admin', subjectUserId: 'other-user', organizationId: 'a' }
    expect(evaluateInternalTarget(a)).toBeNull()
    a.spaces[0].relation = { kind: 'internal_admin', subjectUserId: 'user', organizationId: 'b' }
    expect(evaluateInternalTarget(a)).toBeNull()
  })
  it('a role-derived admin relationship still needs global identity and module entitlements', () => {
    const a = target('a')

    a.spaces[0].platformEntries = [read]
    expect(evaluateInternalTarget(a)).toBeNull()
    a.spaces[0].platformEntries = [read, { ...identity, scope: 'tenant' }]
    expect(evaluateInternalTarget(a)).toBeNull()
    expect(evaluateInternalTarget({ ...target('a'), activeCapabilities: [] })).toBeNull()
    expect(evaluateInternalTarget({ ...target('a'), spaces: [] })).toBeNull()
  })
})
