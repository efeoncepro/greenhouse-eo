import { describe, expect, it } from 'vitest'

import { getPeopleMeta } from '@/lib/people/get-people-meta'
import { getPersonAccess } from '@/lib/people/permissions'

describe('people access matrix', () => {
  it('grants admin all current person 360 tabs', () => {
    const access = getPersonAccess(['efeonce_admin'])

    expect(access.visibleTabs).toEqual([
      'memberships',
      'activity',
      'compensation',
      'payroll',
      'finance',
      'hr-profile',
      'ai-tools'
    ])
    expect(access.canViewMemberships).toBe(true)
    expect(access.canViewHrProfile).toBe(true)
    expect(access.canViewAiTools).toBe(true)
    expect(access.canViewIdentityContext).toBe(true)
    expect(access.canViewAccessContext).toBe(true)
  })

  it('grants hr payroll hr-profile but not ai-tools', () => {
    const access = getPersonAccess(['hr_payroll'])

    expect(access.visibleTabs).toEqual([
      'compensation',
      'payroll',
      'finance',
      'hr-profile'
    ])
    expect(access.canViewMemberships).toBe(false)
    expect(access.canViewHrProfile).toBe(true)
    expect(access.canViewAiTools).toBe(false)
    expect(access.canViewIdentityContext).toBe(true)
    expect(access.canViewAccessContext).toBe(false)
  })

  it('grants operations ai-tools but not hr-profile', () => {
    const access = getPersonAccess(['efeonce_operations'])

    expect(access.visibleTabs).toEqual([
      'memberships',
      'activity',
      'finance',
      'ai-tools'
    ])
    expect(access.canViewMemberships).toBe(true)
    expect(access.canViewHrProfile).toBe(false)
    expect(access.canViewAiTools).toBe(true)
    expect(access.canViewIdentityContext).toBe(true)
    expect(access.canViewAccessContext).toBe(true)
  })

  it('keeps people_viewer limited to read-only activity without hr or access context', () => {
    const access = getPersonAccess(['people_viewer'])

    expect(access.visibleTabs).toEqual(['activity'])
    expect(access.canViewMemberships).toBe(false)
    expect(access.canViewHrProfile).toBe(false)
    expect(access.canViewAiTools).toBe(false)
    expect(access.canViewIdentityContext).toBe(false)
    expect(access.canViewAccessContext).toBe(false)
  })
})

describe('people meta contract', () => {
  it('officializes the current cross-module enrichments and tabs', () => {
    const meta = getPeopleMeta(['efeonce_admin'])

    expect(meta.supportedTabs).toEqual([
      'memberships',
      'activity',
      'compensation',
      'payroll',
      'finance',
      'hr-profile',
      'ai-tools'
    ])
    expect(meta.availableEnrichments).toMatchObject({
      activity: true,
      compensation: true,
      payroll: true,
      finance: true,
      capacity: true,
      identity: true,
      access: true,
      hrProfile: true,
      aiTools: true,
      deliveryContext: true
    })
  })
})
