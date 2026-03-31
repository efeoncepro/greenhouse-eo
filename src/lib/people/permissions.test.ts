import { describe, expect, it } from 'vitest'

import { getPeopleMeta } from '@/lib/people/get-people-meta'
import { getPersonAccess } from '@/lib/people/permissions'

describe('people access matrix', () => {
  it('grants admin all consolidated person tabs', () => {
    const access = getPersonAccess(['efeonce_admin'])

    expect(access.visibleTabs).toEqual([
      'profile',
      'activity',
      'memberships',
      'economy',
      'ai-tools'
    ])
    expect(access.canViewMemberships).toBe(true)
    expect(access.canViewHrProfile).toBe(true)
    expect(access.canViewAiTools).toBe(true)
    expect(access.canViewIdentityContext).toBe(true)
    expect(access.canViewAccessContext).toBe(true)
  })

  it('grants hr payroll profile and economy but not ai-tools', () => {
    const access = getPersonAccess(['hr_payroll'])

    expect(access.visibleTabs).toEqual([
      'profile',
      'economy'
    ])
    expect(access.canViewMemberships).toBe(false)
    expect(access.canViewHrProfile).toBe(true)
    expect(access.canViewAiTools).toBe(false)
    expect(access.canViewIdentityContext).toBe(true)
    expect(access.canViewAccessContext).toBe(false)
  })

  it('grants operations ai-tools but not economy', () => {
    const access = getPersonAccess(['efeonce_operations'])

    expect(access.visibleTabs).toEqual([
      'profile',
      'activity',
      'memberships',
      'economy',
      'ai-tools'
    ])
    expect(access.canViewMemberships).toBe(true)
    expect(access.canViewHrProfile).toBe(false)
    expect(access.canViewAiTools).toBe(true)
    expect(access.canViewIdentityContext).toBe(true)
    expect(access.canViewAccessContext).toBe(true)
  })

  it('keeps people_viewer limited to activity only', () => {
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
  it('officializes the consolidated 5-tab model', () => {
    const meta = getPeopleMeta(['efeonce_admin'])

    expect(meta.supportedTabs).toEqual([
      'profile',
      'activity',
      'memberships',
      'economy',
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
