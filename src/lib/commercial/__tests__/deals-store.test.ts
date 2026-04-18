import { describe, expect, it } from 'vitest'

import { classifyDealTransition } from '@/lib/commercial/deals-store'

describe('classifyDealTransition', () => {
  it('treats missing previous state as a created deal', () => {
    const result = classifyDealTransition(null, {
      dealId: 'dl-1',
      hubspotDealId: 'hs-deal-1',
      hubspotPipelineId: 'default',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      dealName: 'Expansion',
      dealstage: 'qualified',
      dealstageLabel: 'Qualified',
      pipelineName: 'default',
      dealType: null,
      amount: 1000,
      amountClp: 1000,
      currency: 'CLP',
      exchangeRateToClp: 1,
      closeDate: '2026-04-30',
      probabilityPct: 20,
      isClosed: false,
      isWon: false,
      isDeleted: false,
      dealOwnerHubspotUserId: null,
      dealOwnerUserId: 'user-1',
      dealOwnerEmail: 'owner@example.com',
      createdInHubspotAt: null,
      hubspotLastSyncedAt: '2026-04-18T00:00:00Z',
      sourcePayload: {},
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z'
    })

    expect(result).toMatchObject({
      action: 'created',
      wonTransition: false,
      lostTransition: false
    })
  })

  it('detects stage changes and won transitions', () => {
    const previous = {
      dealId: 'dl-1',
      hubspotDealId: 'hs-deal-1',
      hubspotPipelineId: 'default',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      dealName: 'Expansion',
      dealstage: 'proposal',
      dealstageLabel: 'Proposal',
      pipelineName: 'default',
      dealType: null,
      amount: 1000,
      amountClp: 1000,
      currency: 'CLP',
      exchangeRateToClp: 1,
      closeDate: '2026-04-30',
      probabilityPct: 50,
      isClosed: false,
      isWon: false,
      isDeleted: false,
      dealOwnerHubspotUserId: null,
      dealOwnerUserId: 'user-1',
      dealOwnerEmail: 'owner@example.com',
      createdInHubspotAt: null,
      hubspotLastSyncedAt: '2026-04-18T00:00:00Z',
      sourcePayload: {},
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z'
    }

    const next = {
      ...previous,
      dealstage: 'closedwon',
      dealstageLabel: 'Closed Won',
      probabilityPct: 100,
      isClosed: true,
      isWon: true,
      hubspotLastSyncedAt: '2026-04-18T01:00:00Z'
    }

    const result = classifyDealTransition(previous, next)

    expect(result.action).toBe('updated')
    expect(result.stageChanged).toBe(true)
    expect(result.wonTransition).toBe(true)
    expect(result.lostTransition).toBe(false)
    expect(result.changedFields).toEqual(
      expect.arrayContaining(['dealstage', 'dealstageLabel', 'probabilityPct', 'isClosed', 'isWon'])
    )
  })

  it('flags closed lost transitions without marking them as won', () => {
    const previous = {
      dealId: 'dl-1',
      hubspotDealId: 'hs-deal-1',
      hubspotPipelineId: 'default',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      dealName: 'Expansion',
      dealstage: 'negotiation',
      dealstageLabel: 'Negotiation',
      pipelineName: 'default',
      dealType: null,
      amount: 1000,
      amountClp: 1000,
      currency: 'CLP',
      exchangeRateToClp: 1,
      closeDate: '2026-04-30',
      probabilityPct: 75,
      isClosed: false,
      isWon: false,
      isDeleted: false,
      dealOwnerHubspotUserId: null,
      dealOwnerUserId: 'user-1',
      dealOwnerEmail: 'owner@example.com',
      createdInHubspotAt: null,
      hubspotLastSyncedAt: '2026-04-18T00:00:00Z',
      sourcePayload: {},
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z'
    }

    const result = classifyDealTransition(previous, {
      ...previous,
      dealstage: 'closedlost',
      dealstageLabel: 'Closed Lost',
      probabilityPct: 0,
      isClosed: true,
      isWon: false,
      hubspotLastSyncedAt: '2026-04-18T02:00:00Z'
    })

    expect(result.action).toBe('updated')
    expect(result.stageChanged).toBe(true)
    expect(result.wonTransition).toBe(false)
    expect(result.lostTransition).toBe(true)
  })
})
