import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import {
  publishDiscountHealthAlert,
  publishProductCreated,
  publishProductSynced,
  publishQuoteCreated,
  publishQuoteLineItemsSynced,
  publishQuoteSynced
} from '../quotation-events'

beforeEach(() => {
  mockPublishOutboxEvent.mockReset()
})

describe('publishQuoteCreated', () => {
  it('emits legacy finance.quote.created and commercial.quotation.created when quotationId present', async () => {
    await publishQuoteCreated({
      quoteId: 'QUO-HS-123',
      quotationId: 'qt-abc',
      hubspotQuoteId: 'hs-123',
      hubspotDealId: 'deal-456',
      sourceSystem: 'hubspot',
      direction: 'outbound',
      organizationId: 'org-1',
      spaceId: 'space-1',
      amount: 1_000_000,
      currency: 'CLP',
      lineItemCount: 3
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(2)
    expect(mockPublishOutboxEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        aggregateType: 'quote',
        aggregateId: 'QUO-HS-123',
        eventType: 'finance.quote.created'
      }),
      undefined
    )
    expect(mockPublishOutboxEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        aggregateType: 'quotation',
        aggregateId: 'qt-abc',
        eventType: 'commercial.quotation.created',
        payload: expect.objectContaining({ quotationId: 'qt-abc' })
      }),
      undefined
    )
  })

  it('emits only legacy event when quotationId is null', async () => {
    await publishQuoteCreated({
      quoteId: 'QUO-HS-123',
      quotationId: null,
      direction: 'inbound'
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'finance.quote.created' }),
      undefined
    )
  })
})

describe('publishQuoteSynced', () => {
  it('dual-publishes with action in payload', async () => {
    await publishQuoteSynced({
      quoteId: 'QUO-HS-123',
      quotationId: 'qt-abc',
      action: 'updated',
      sourceSystem: 'hubspot'
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(2)
    const [legacyCall, canonicalCall] = mockPublishOutboxEvent.mock.calls

    expect(legacyCall[0]).toMatchObject({ eventType: 'finance.quote.synced' })
    expect(canonicalCall[0]).toMatchObject({ eventType: 'commercial.quotation.synced' })
    expect(canonicalCall[0].payload).toMatchObject({ action: 'updated', quotationId: 'qt-abc' })
  })
})

describe('publishQuoteLineItemsSynced', () => {
  it('emits both legacy quote_line_item event and canonical line_items_synced', async () => {
    await publishQuoteLineItemsSynced({
      quoteId: 'QUO-HS-123',
      quotationId: 'qt-abc',
      hubspotQuoteId: 'hs-123',
      created: 2,
      updated: 1
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(2)
    expect(mockPublishOutboxEvent.mock.calls[0][0]).toMatchObject({
      aggregateType: 'quote_line_item',
      eventType: 'finance.quote_line_item.synced'
    })
    expect(mockPublishOutboxEvent.mock.calls[1][0]).toMatchObject({
      aggregateType: 'quotation_line_item',
      eventType: 'commercial.quotation.line_items_synced'
    })
  })
})

describe('publishProductCreated', () => {
  it('dual-publishes finance.product.created and commercial.product_catalog.created', async () => {
    await publishProductCreated({
      productId: 'GH-PROD-xyz',
      hubspotProductId: 'hs-xyz',
      name: 'Retainer',
      sku: 'RET-01',
      commercialProductId: 'prd-999',
      direction: 'outbound'
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(2)
    expect(mockPublishOutboxEvent.mock.calls[0][0]).toMatchObject({
      eventType: 'finance.product.created'
    })
    expect(mockPublishOutboxEvent.mock.calls[1][0]).toMatchObject({
      eventType: 'commercial.product_catalog.created',
      aggregateId: 'prd-999'
    })
  })

  it('skips canonical emission when commercialProductId is null', async () => {
    await publishProductCreated({
      productId: 'GH-PROD-xyz',
      direction: 'inbound'
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)
    expect(mockPublishOutboxEvent.mock.calls[0][0].eventType).toBe('finance.product.created')
  })
})

describe('publishProductSynced', () => {
  it('dual-publishes finance.product.synced and commercial.product_catalog.synced', async () => {
    await publishProductSynced({
      productId: 'GH-PROD-xyz',
      commercialProductId: 'prd-999',
      action: 'created',
      name: 'Retainer'
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(2)
    expect(mockPublishOutboxEvent.mock.calls[1][0]).toMatchObject({
      eventType: 'commercial.product_catalog.synced'
    })
  })
})

describe('publishDiscountHealthAlert', () => {
  it('emits only the canonical commercial.discount.health_alert event', async () => {
    await publishDiscountHealthAlert({
      quotationId: 'qt-abc',
      versionNumber: 2,
      marginPct: 8,
      floorPct: 20,
      targetPct: 30,
      alerts: [{ code: 'margin_below_floor', level: 'error' }],
      createdBy: 'user-1'
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)
    expect(mockPublishOutboxEvent.mock.calls[0][0]).toMatchObject({
      aggregateType: 'quotation',
      aggregateId: 'qt-abc',
      eventType: 'commercial.discount.health_alert'
    })
  })
})
