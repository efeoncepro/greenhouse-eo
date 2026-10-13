// The one door of the quoter: who may do what (TASK-2025, Slice 4). No database.
//
// The subjects here are built the way the platform builds them: a person carries the route groups of its role
// (`ROLE_ROUTE_GROUPS`); the machine subject of an internal binding of the ecosystem lane carries the role
// `efeonce_account` and `routeGroups: ['internal']`, exactly as `ecosystem-insights-scope.ts` derives it.
import { describe, expect, it } from 'vitest'

import { ENTITLEMENT_CAPABILITY_CATALOG } from '@/config/entitlements-catalog'
import { ROLE_CODES } from '@/config/role-codes'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { QUOTER_HUMAN_ONLY_NEEDS, QUOTER_NEEDS, assertQuoterAccess, hasQuoterCapability } from '../authz'
import { isQuoterError } from '../errors'
import type { QuoterNeed } from '../authz'
import type { QuoterActor } from '../types'

const subject = (role: string, routeGroups: string[], tenantType: TenantEntitlementSubject['tenantType'] = 'efeonce_internal'): TenantEntitlementSubject => ({
  userId: `user-${role}`,
  tenantType,
  roleCodes: [role],
  primaryRoleCode: role,
  routeGroups,
  authorizedViews: []
})

const MACHINE: TenantEntitlementSubject = {
  userId: 'consumer:efeonce-quoter-cli',
  tenantType: 'efeonce_internal',
  roleCodes: [ROLE_CODES.EFEONCE_ACCOUNT],
  primaryRoleCode: ROLE_CODES.EFEONCE_ACCOUNT,
  routeGroups: ['internal'],
  authorizedViews: []
}

const MEMBER: QuoterActor = { kind: 'member', memberId: 'member-fixture', principalId: 'user-fixture' }
const AGENT: QuoterActor = { kind: 'agent', principalId: 'consumer:efeonce-quoter-cli' }

const allowed = (who: TenantEntitlementSubject) => QUOTER_NEEDS.filter(need => hasQuoterCapability(who, need))

const outcome = (input: Parameters<typeof assertQuoterAccess>[0]) => {
  try {
    assertQuoterAccess(input)
  } catch (error) {
    return isQuoterError(error) ? error.code : error
  }

  return 'allowed'
}

const WORKING: QuoterNeed[] = ['catalog.read', 'simulate', 'quote.read', 'quote.create', 'quote.update']

describe('quoter access: capabilities by role', () => {
  it('every capability the door asks for is declared in the catalog', () => {
    const quoter = ENTITLEMENT_CAPABILITY_CATALOG.filter(capability => capability.key.startsWith('commercial.quoter.'))

    expect(quoter.map(capability => `${capability.key}:${[...capability.actions].join(',')}`).sort()).toEqual([
      'commercial.quoter.catalog.activate:execute',
      'commercial.quoter.catalog:read,update',
      'commercial.quoter.exception:approve',
      'commercial.quoter.issue:approve',
      'commercial.quoter.quote:read,create,update',
      'commercial.quoter.simulate:read'
    ])
    expect(quoter.every(capability => capability.module === 'commercial')).toBe(true)
  })

  it('each role holds what the decision gives it, and nothing else', () => {
    expect(allowed(subject(ROLE_CODES.EFEONCE_ADMIN, ['internal', 'admin', 'commercial']))).toEqual([...QUOTER_NEEDS])
    expect(allowed(subject(ROLE_CODES.FINANCE_ADMIN, ['finance', 'commercial']))).toEqual([
      ...QUOTER_NEEDS.filter(need => need !== 'exception')
    ])
    expect(allowed(subject(ROLE_CODES.EFEONCE_ACCOUNT, ['internal', 'commercial']))).toEqual([
      ...QUOTER_NEEDS.filter(need => WORKING.includes(need) || need === 'issue')
    ])
    expect(allowed(subject(ROLE_CODES.FINANCE_ANALYST, ['finance', 'commercial']))).toEqual(QUOTER_NEEDS.filter(need => WORKING.includes(need)))
  })

  it('the grants are by role: the same role without its route group holds the same', () => {
    for (const role of [ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.FINANCE_ADMIN, ROLE_CODES.EFEONCE_ACCOUNT, ROLE_CODES.FINANCE_ANALYST])
      expect(allowed(subject(role, [])), role).toEqual(allowed(subject(role, ['commercial'])))
  })

  it('roles outside commercial, and every client role, hold nothing of the quoter', () => {
    for (const role of [
      ROLE_CODES.HR_MANAGER,
      ROLE_CODES.HR_PAYROLL,
      ROLE_CODES.EFEONCE_OPERATIONS,
      ROLE_CODES.PEOPLE_VIEWER,
      ROLE_CODES.AI_TOOLING_ADMIN,
      ROLE_CODES.DESIGNER,
      ROLE_CODES.COLLABORATOR
    ])
      expect(allowed(subject(role, ['internal', 'my'])), role).toEqual([])

    for (const role of [ROLE_CODES.CLIENT_EXECUTIVE, ROLE_CODES.CLIENT_MANAGER, ROLE_CODES.CLIENT_SPECIALIST])
      expect(allowed(subject(role, ['client'], 'client')), role).toEqual([])
  })
})

describe('quoter access: the door', () => {
  const admin = subject(ROLE_CODES.EFEONCE_ADMIN, ['internal', 'admin', 'commercial'])

  it('the machine subject of an internal binding issues, withdraws and records answers; it never does an act of a person', () => {
    for (const need of [...WORKING, 'issue'] as QuoterNeed[]) expect(outcome({ subject: MACHINE, need, actor: AGENT }), need).toBe('allowed')

    // It does not hold these capabilities at all.
    for (const need of ['exception', 'catalog.activate', 'catalog.update'] as QuoterNeed[])
      expect(outcome({ subject: MACHINE, need, actor: AGENT }), need).toBe('forbidden')
  })

  it('the two acts of a person take a person, even when the role holds the capability', () => {
    expect([...QUOTER_HUMAN_ONLY_NEEDS].sort()).toEqual(['catalog.activate', 'exception'])

    for (const need of QUOTER_HUMAN_ONLY_NEEDS) {
      expect(outcome({ subject: admin, need, actor: MEMBER }), need).toBe('allowed')
      // An agent session of an administrator, a service job, or nobody named.
      expect(outcome({ subject: admin, need, actor: AGENT }), need).toBe('human_actor_required')
      expect(outcome({ subject: admin, need, actor: { kind: 'service', principalId: 'job' } }), need).toBe('human_actor_required')
      expect(outcome({ subject: admin, need }), need).toBe('human_actor_required')
    }

    // Issuing is not an act of a person: an agent session with the capability issues.
    expect(outcome({ subject: admin, need: 'issue', actor: AGENT })).toBe('allowed')
  })

  it('a client identity is never a subject of the quoter, whatever it carries', () => {
    const disguised: TenantEntitlementSubject = { ...admin, tenantType: 'client' }

    for (const need of QUOTER_NEEDS) expect(outcome({ subject: disguised, need, actor: MEMBER }), need).toBe('forbidden')
  })
})
