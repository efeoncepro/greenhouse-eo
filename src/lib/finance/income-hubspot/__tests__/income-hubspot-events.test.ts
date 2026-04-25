import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import {
  publishIncomeHubSpotArtifactAttached,
  publishIncomeHubSpotSyncFailed,
  publishIncomeHubSpotSynced
} from '../income-hubspot-events'

describe('income-hubspot-events', () => {
  beforeEach(() => {
    mockPublishOutboxEvent.mockReset()
  })

  it('publishes finance.income.hubspot_synced scoped to the income aggregate', async () => {
    await publishIncomeHubSpotSynced({
      incomeId: 'INC-000001',
      hubspotInvoiceId: 'hs-invoice-1',
      hubspotCompanyId: 'company-1',
      hubspotDealId: 'deal-1',
      syncedAt: '2026-04-21T10:00:00Z',
      attemptCount: 1
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'income',
        aggregateId: 'INC-000001',
        eventType: 'finance.income.hubspot_synced'
      }),
      undefined
    )
  })

  it('publishes finance.income.hubspot_sync_failed preserving status + error', async () => {
    await publishIncomeHubSpotSyncFailed({
      incomeId: 'INC-000001',
      hubspotInvoiceId: null,
      status: 'endpoint_not_deployed',
      errorMessage: 'Cloud Run /invoices not deployed',
      failedAt: '2026-04-21T10:00:00Z',
      attemptCount: 1
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'finance.income.hubspot_sync_failed',
        payload: expect.objectContaining({ status: 'endpoint_not_deployed' })
      }),
      undefined
    )
  })

  it('publishes finance.income.hubspot_artifact_attached for Nubox artifacts', async () => {
    await publishIncomeHubSpotArtifactAttached({
      incomeId: 'INC-000001',
      hubspotInvoiceId: 'hs-invoice-1',
      hubspotArtifactNoteId: 'note-1',
      attachedAt: '2026-04-21T11:00:00Z',
      artifactKind: 'dte'
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'finance.income.hubspot_artifact_attached',
        payload: expect.objectContaining({ artifactKind: 'dte', hubspotArtifactNoteId: 'note-1' })
      }),
      undefined
    )
  })
})
