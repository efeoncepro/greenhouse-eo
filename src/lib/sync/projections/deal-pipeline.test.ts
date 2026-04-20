import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaterializeDealPipelineSnapshot = vi.fn()
const mockMaterializeDealPipelineSnapshotForQuotation = vi.fn()
const mockMaterializeDealPipelineSnapshotForHubSpotDeal = vi.fn()

vi.mock('@/lib/commercial-intelligence/deal-pipeline-materializer', () => ({
  materializeDealPipelineSnapshot: (...args: unknown[]) =>
    mockMaterializeDealPipelineSnapshot(...args),
  materializeDealPipelineSnapshotForQuotation: (...args: unknown[]) =>
    mockMaterializeDealPipelineSnapshotForQuotation(...args),
  materializeDealPipelineSnapshotForHubSpotDeal: (...args: unknown[]) =>
    mockMaterializeDealPipelineSnapshotForHubSpotDeal(...args)
}))

import {
  DEAL_PIPELINE_TRIGGER_EVENTS,
  dealPipelineProjection,
  extractDealPipelineScope
} from '@/lib/sync/projections/deal-pipeline'

describe('dealPipelineProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listens to deal and quotation lifecycle events that affect the rollup', () => {
    expect(DEAL_PIPELINE_TRIGGER_EVENTS).toContain('commercial.deal.synced')
    expect(DEAL_PIPELINE_TRIGGER_EVENTS).toContain('commercial.deal.won')
    expect(DEAL_PIPELINE_TRIGGER_EVENTS).toContain('commercial.quotation.sent')
    expect(DEAL_PIPELINE_TRIGGER_EVENTS).toContain('commercial.quotation.invoice_emitted')
    expect(dealPipelineProjection.domain).toBe('cost_intelligence')
  })

  it('extracts scope from deal, quotation, and hubspot deal payloads', () => {
    expect(extractDealPipelineScope({ dealId: 'dl-1' })).toEqual({
      entityType: 'deal',
      entityId: 'dl-1'
    })
    expect(extractDealPipelineScope({ quotationId: 'quo-1' })).toEqual({
      entityType: 'quotation',
      entityId: 'quo-1'
    })
    expect(extractDealPipelineScope({ hubspotDealId: 'hs-1' })).toEqual({
      entityType: 'hubspot_deal',
      entityId: 'hs-1'
    })
    expect(extractDealPipelineScope({})).toBeNull()
  })

  it('refreshes by deal id when the scope is a canonical deal', async () => {
    mockMaterializeDealPipelineSnapshot.mockResolvedValue({ dealId: 'dl-1' })

    const result = await dealPipelineProjection.refresh(
      { entityType: 'deal', entityId: 'dl-1' },
      { _eventType: 'commercial.deal.synced' }
    )

    expect(mockMaterializeDealPipelineSnapshot).toHaveBeenCalledWith({
      dealId: 'dl-1',
      sourceEvent: 'commercial.deal.synced'
    })
    expect(result).toContain('dl-1')
  })

  it('refreshes from quotation scope when only quotation identity is available', async () => {
    mockMaterializeDealPipelineSnapshotForQuotation.mockResolvedValue({ dealId: 'dl-2' })

    const result = await dealPipelineProjection.refresh(
      { entityType: 'quotation', entityId: 'quo-2' },
      { _eventType: 'commercial.quotation.invoice_emitted' }
    )

    expect(mockMaterializeDealPipelineSnapshotForQuotation).toHaveBeenCalledWith({
      quotationId: 'quo-2',
      sourceEvent: 'commercial.quotation.invoice_emitted'
    })
    expect(result).toContain('quo-2')
  })
})
