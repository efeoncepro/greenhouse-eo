import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockPushProductToHubSpot = vi.fn()

vi.mock('@/lib/hubspot/push-product-to-hubspot', () => ({
  pushProductToHubSpot: (...args: unknown[]) => mockPushProductToHubSpot(...args)
}))

import {
  PRODUCT_HUBSPOT_OUTBOUND_TRIGGER_EVENTS,
  productHubSpotOutboundProjection
} from '../product-hubspot-outbound'

beforeEach(() => {
  mockPushProductToHubSpot.mockReset()
})

describe('productHubSpotOutboundProjection registration', () => {
  it('is registered in cost_intelligence domain with canonical name', () => {
    expect(productHubSpotOutboundProjection.name).toBe('product_hubspot_outbound')
    expect(productHubSpotOutboundProjection.domain).toBe('cost_intelligence')
  })

  it('lists the 4 product_catalog lifecycle events as triggers', () => {
    expect(PRODUCT_HUBSPOT_OUTBOUND_TRIGGER_EVENTS).toEqual([
      'commercial.product_catalog.created',
      'commercial.product_catalog.updated',
      'commercial.product_catalog.archived',
      'commercial.product_catalog.unarchived'
    ])
  })
})

describe('productHubSpotOutboundProjection.extractScope', () => {
  it('resolves productId from camelCase payload', () => {
    expect(
      productHubSpotOutboundProjection.extractScope({ productId: 'prd-abc' })
    ).toEqual({ entityType: 'product_catalog', entityId: 'prd-abc' })
  })

  it('resolves product_id from snake_case payload', () => {
    expect(
      productHubSpotOutboundProjection.extractScope({ product_id: 'prd-abc' })
    ).toEqual({ entityType: 'product_catalog', entityId: 'prd-abc' })
  })

  it('returns null when the payload has no product identifier', () => {
    expect(productHubSpotOutboundProjection.extractScope({})).toBeNull()
    expect(productHubSpotOutboundProjection.extractScope({ unrelated: 'value' })).toBeNull()
  })
})

describe('productHubSpotOutboundProjection.refresh', () => {
  it('invokes pushProductToHubSpot with scope + eventType + actorId', async () => {
    mockPushProductToHubSpot.mockResolvedValueOnce({
      status: 'synced',
      action: 'created',
      productId: 'prd-abc',
      hubspotProductId: 'hs-42'
    })

    const result = await productHubSpotOutboundProjection.refresh(
      { entityType: 'product_catalog', entityId: 'prd-abc' },
      {
        eventType: 'commercial.product_catalog.created',
        actorId: 'user-1'
      }
    )

    expect(mockPushProductToHubSpot).toHaveBeenCalledWith({
      productId: 'prd-abc',
      eventType: 'commercial.product_catalog.created',
      actorId: 'user-1'
    })
    expect(result).toBe('product_hubspot_outbound prd-abc: synced:created')
  })

  it('returns the skip reason when the helper skips', async () => {
    mockPushProductToHubSpot.mockResolvedValueOnce({
      status: 'skipped_no_anchors',
      action: 'noop',
      productId: 'prd-abc',
      hubspotProductId: null,
      reason: 'anti_ping_pong_window'
    })

    const result = await productHubSpotOutboundProjection.refresh(
      { entityType: 'product_catalog', entityId: 'prd-abc' },
      {}
    )

    expect(result).toBe('product_hubspot_outbound prd-abc: skipped_no_anchors:noop (anti_ping_pong_window)')
  })

  it('drops unknown eventType values instead of propagating them', async () => {
    mockPushProductToHubSpot.mockResolvedValueOnce({
      status: 'synced',
      action: 'updated',
      productId: 'prd-abc',
      hubspotProductId: 'hs-42'
    })

    await productHubSpotOutboundProjection.refresh(
      { entityType: 'product_catalog', entityId: 'prd-abc' },
      { eventType: 'bogus.not.a.real.event' }
    )

    expect(mockPushProductToHubSpot).toHaveBeenCalledWith({
      productId: 'prd-abc',
      eventType: null,
      actorId: null
    })
  })
})
