import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('server-only', () => ({}))

import {
  publishProductCatalogArchived,
  publishProductCatalogCreated,
  publishProductCatalogUnarchived,
  publishProductCatalogUpdated,
  publishProductSyncConflictDetected,
  publishProductSyncConflictResolved
} from '../product-catalog-events'

beforeEach(() => {
  mockPublishOutboxEvent.mockReset()
})

describe('product-catalog-events', () => {
  it('publishes commercial.product_catalog.created on the product aggregate', async () => {
    await publishProductCatalogCreated({
      productId: 'PRD-001',
      sourceKind: 'sellable_role',
      sourceId: 'role-1',
      productCode: 'ECG-001',
      productName: 'Senior Designer',
      defaultUnitPrice: 120,
      defaultCurrency: 'USD',
      defaultUnit: 'hour',
      businessLineCode: 'globe',
      hubspotProductId: null,
      ghOwnedFieldsChecksum: 'abc123',
      isArchived: false
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'product_catalog',
        aggregateId: 'PRD-001',
        eventType: 'commercial.product_catalog.created'
      }),
      undefined
    )
  })

  it('publishes commercial.product_catalog.updated with changedFields', async () => {
    await publishProductCatalogUpdated({
      productId: 'PRD-001',
      sourceKind: 'tool',
      sourceId: 'tool-1',
      productCode: 'ETG-012',
      productName: 'Figma Pro Seat',
      defaultUnitPrice: 15,
      defaultCurrency: 'USD',
      defaultUnit: 'month',
      businessLineCode: null,
      hubspotProductId: 'hs-99',
      ghOwnedFieldsChecksum: 'newhash',
      previousChecksum: 'oldhash',
      isArchived: false,
      changedFields: ['default_unit_price', 'product_name']
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'commercial.product_catalog.updated',
        payload: expect.objectContaining({ changedFields: ['default_unit_price', 'product_name'] })
      }),
      undefined
    )
  })

  it('publishes archived/unarchived events with archival metadata', async () => {
    await publishProductCatalogArchived({
      productId: 'PRD-1',
      sourceKind: 'manual',
      sourceId: null,
      productCode: 'PRD-0001',
      archivedAt: '2026-04-21T10:00:00Z',
      archivedBy: 'user-1',
      reason: 'deprecated'
    })

    await publishProductCatalogUnarchived({
      productId: 'PRD-1',
      sourceKind: 'manual',
      sourceId: null,
      productCode: 'PRD-0001',
      unarchivedAt: '2026-04-21T12:00:00Z',
      unarchivedBy: 'user-2'
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(2)
    expect(mockPublishOutboxEvent.mock.calls[0][0].eventType).toBe(
      'commercial.product_catalog.archived'
    )
    expect(mockPublishOutboxEvent.mock.calls[1][0].eventType).toBe(
      'commercial.product_catalog.unarchived'
    )
  })

  it('publishes sync conflict events under the product_sync_conflict aggregate', async () => {
    await publishProductSyncConflictDetected({
      conflictId: 'conf-1',
      productId: 'PRD-1',
      hubspotProductId: null,
      conflictType: 'orphan_in_greenhouse',
      detectedAt: '2026-04-21T10:00:00Z',
      conflictingFields: { default_unit_price: { gh: 120, hs: 130 } }
    })

    await publishProductSyncConflictResolved({
      conflictId: 'conf-1',
      productId: 'PRD-1',
      hubspotProductId: null,
      conflictType: 'orphan_in_greenhouse',
      resolutionStatus: 'resolved_greenhouse_wins',
      resolvedBy: 'user-1',
      resolutionAppliedAt: '2026-04-21T11:00:00Z'
    })

    const [firstCall, secondCall] = mockPublishOutboxEvent.mock.calls

    expect(firstCall[0].aggregateType).toBe('product_sync_conflict')
    expect(firstCall[0].eventType).toBe('commercial.product_sync_conflict.detected')
    expect(secondCall[0].eventType).toBe('commercial.product_sync_conflict.resolved')
  })
})
