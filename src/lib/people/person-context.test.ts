import { describe, expect, it } from 'vitest'

import { buildPersonAccessContext, buildPersonIdentityContext } from '@/lib/people/person-context'
import type { Person360 } from '@/types/person-360'

const baseProfile: Person360 = {
  identityProfileId: 'ip_123',
  eoId: 'EO-ID0123',
  serialNumber: 123,
  canonicalEmail: 'person@efeonce.com',
  fullName: 'Sky Person',
  jobTitle: 'Operations Lead',
  profileType: 'internal',
  identityStatus: 'resolved',
  identityActive: true,
  primarySourceSystem: 'microsoft',
  defaultAuthMode: 'microsoft',
  resolved: {
    email: 'person@efeonce.com',
    displayName: 'Sky Person',
    avatarUrl: null,
    phone: null,
    jobTitle: 'Operations Lead'
  },
  memberFacet: {
    memberId: 'member_1',
    memberPublicId: 'EO-MBR0001',
    displayName: 'Sky Person',
    email: 'person@efeonce.com',
    phone: null,
    jobLevel: 'lead',
    employmentType: 'full_time',
    hireDate: '2026-01-01',
    contractEndDate: null,
    dailyRequired: true,
    reportsToMemberId: null,
    status: 'active',
    active: true,
    departmentId: 'dept_1',
    departmentName: 'Operations'
  },
  userFacet: {
    userId: 'user_1',
    userPublicId: 'EO-USR0001',
    email: 'person@efeonce.com',
    fullName: 'Sky Person',
    tenantType: 'efeonce_internal',
    authMode: 'microsoft',
    status: 'active',
    active: true,
    clientId: 'client_internal',
    clientName: 'Efeonce Internal',
    lastLoginAt: '2026-03-20T12:00:00.000Z',
    avatarUrl: null,
    timezone: 'America/Santiago',
    defaultPortalHomePath: '/internal/dashboard',
    microsoftOid: 'oid_123',
    googleSub: null,
    passwordHashAlgorithm: null
  },
  crmFacet: {
    contactRecordId: 'crm_1',
    displayName: 'Sky Person',
    email: 'person@efeonce.com',
    jobTitle: 'Operations Lead',
    phone: null,
    mobilePhone: null,
    lifecycleStage: 'customer',
    leadStatus: null,
    hubspotContactId: '12345'
  },
  userCount: 1,
  sourceLinkCount: 3,
  linkedSystems: ['hubspot', 'microsoft', 'notion'],
  activeRoleCodes: ['efeonce_operations', 'ai_tooling_admin'],
  hasMemberFacet: true,
  hasUserFacet: true,
  hasCrmFacet: true
}

describe('buildPersonIdentityContext', () => {
  it('maps canonical identity and linked facet summary from person_360', () => {
    expect(buildPersonIdentityContext(baseProfile, 'user_1')).toEqual({
      eoId: 'EO-ID0123',
      identityProfileId: 'ip_123',
      linkedUserId: 'user_1',
      canonicalEmail: 'person@efeonce.com',
      primarySourceSystem: 'microsoft',
      defaultAuthMode: 'microsoft',
      linkedSystems: ['hubspot', 'microsoft', 'notion'],
      sourceLinkCount: 3,
      userCount: 1,
      hasMemberFacet: true,
      hasUserFacet: true,
      hasCrmFacet: true,
      crmContactId: 'crm_1'
    })
  })
})

describe('buildPersonAccessContext', () => {
  it('maps the linked user facet into an access summary', () => {
    expect(buildPersonAccessContext(baseProfile)).toEqual({
      userId: 'user_1',
      userPublicId: 'EO-USR0001',
      email: 'person@efeonce.com',
      tenantType: 'efeonce_internal',
      authMode: 'microsoft',
      status: 'active',
      active: true,
      lastLoginAt: '2026-03-20T12:00:00.000Z',
      defaultPortalHomePath: '/internal/dashboard',
      roleCodes: ['ai_tooling_admin', 'efeonce_operations'],
      routeGroups: ['ai_tooling', 'internal'],
      canOpenAdminUser: true
    })
  })

  it('returns null when the person has no linked user facet', () => {
    expect(buildPersonAccessContext({
      ...baseProfile,
      userFacet: null,
      hasUserFacet: false,
      activeRoleCodes: []
    })).toBeNull()
  })
})
