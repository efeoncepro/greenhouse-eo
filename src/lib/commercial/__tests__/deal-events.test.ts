import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import {
  publishDealCreated,
  publishDealLost,
  publishDealStageChanged,
  publishDealSynced,
  publishDealWon
} from '@/lib/commercial/deal-events'

beforeEach(() => {
  mockPublishOutboxEvent.mockReset()
})

describe('deal-events', () => {
  it('publishes commercial.deal.created on the deal aggregate', async () => {
    await publishDealCreated({
      dealId: 'dl-1',
      hubspotDealId: 'hs-deal-1',
      hubspotPipelineId: 'default',
      dealstage: 'qualified',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      amountClp: 1500000,
      currency: 'CLP',
      closeDate: '2026-04-30'
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'deal',
        aggregateId: 'dl-1',
        eventType: 'commercial.deal.created'
      }),
      undefined
    )
  })

  it('publishes commercial.deal.synced with action and changed fields', async () => {
    await publishDealSynced({
      dealId: 'dl-1',
      hubspotDealId: 'hs-deal-1',
      hubspotPipelineId: 'default',
      dealstage: 'proposal',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      action: 'updated',
      amountClp: 900000,
      currency: 'CLP',
      closeDate: '2026-05-01',
      isClosed: false,
      isWon: false,
      changedFields: ['dealstage', 'amountClp']
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'commercial.deal.synced',
        payload: expect.objectContaining({
          action: 'updated',
          changedFields: ['dealstage', 'amountClp']
        })
      }),
      undefined
    )
  })

  it('publishes stage_changed, won and lost events on the deal aggregate', async () => {
    await publishDealStageChanged({
      dealId: 'dl-1',
      hubspotDealId: 'hs-deal-1',
      hubspotPipelineId: 'sales',
      dealstage: 'closedwon',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      previousPipelineId: 'sales',
      previousDealstage: 'proposal',
      previousStageLabel: 'Proposal',
      currentStageLabel: 'Closed Won'
    })

    await publishDealWon({
      dealId: 'dl-1',
      hubspotDealId: 'hs-deal-1',
      hubspotPipelineId: 'sales',
      dealstage: 'closedwon',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      amountClp: 1200000,
      closeDate: '2026-05-01'
    })

    await publishDealLost({
      dealId: 'dl-2',
      hubspotDealId: 'hs-deal-2',
      hubspotPipelineId: 'sales',
      dealstage: 'closedlost',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      closeDate: '2026-05-02'
    })

    expect(mockPublishOutboxEvent.mock.calls[0][0]).toMatchObject({
      eventType: 'commercial.deal.stage_changed'
    })
    expect(mockPublishOutboxEvent.mock.calls[1][0]).toMatchObject({
      eventType: 'commercial.deal.won'
    })
    expect(mockPublishOutboxEvent.mock.calls[2][0]).toMatchObject({
      eventType: 'commercial.deal.lost'
    })
  })
})
