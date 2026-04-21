import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import type { GhOwnedFieldsSnapshot } from '../types'
import { upsertProductCatalogFromSource } from '../upsert-product-catalog-from-source'

type MockRow = {
  product_id: string
  gh_owned_fields_checksum: string | null
  is_archived: boolean
  hubspot_product_id: string | null
  source_variant_key: string | null
}

const createMockClient = (existingRow: MockRow | null) => {
  const queries: Array<{ sql: string; params: unknown[] }> = []
  let selectCalled = false

  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params })

      if (sql.includes('FROM greenhouse_commercial.product_catalog') && sql.includes('FOR UPDATE')) {
        selectCalled = true

        return { rows: existingRow ? [existingRow] : [] }
      }

      return { rows: [] }
    })
  } as never

  return { client, queries, wasLocked: () => selectCalled }
}

const baseSnapshot = (overrides: Partial<GhOwnedFieldsSnapshot> = {}): GhOwnedFieldsSnapshot => ({
  product_code: 'ECG-001',
  product_name: 'Senior Designer',
  description: 'Senior designer role',
  default_unit_price: 120,
  default_currency: 'USD',
  default_unit: 'hour',
  product_type: 'service',
  pricing_model: 'staff_aug',
  business_line_code: 'globe',
  is_archived: false,
  ...overrides
})

beforeEach(() => {
  mockPublishOutboxEvent.mockReset()
})

describe('upsertProductCatalogFromSource', () => {
  it('INSERTs and emits created when the row does not exist yet', async () => {
    const { client, queries } = createMockClient(null)

    const result = await upsertProductCatalogFromSource(client, {
      sourceKind: 'sellable_role',
      sourceId: 'role-1',
      snapshot: baseSnapshot()
    })

    expect(result.outcome).toBe('created')
    expect(result.previousChecksum).toBeNull()
    expect(result.productId).toMatch(/^prd-/)
    expect(queries.some(q => q.sql.includes('INSERT INTO greenhouse_commercial.product_catalog'))).toBe(true)
    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'commercial.product_catalog.created' }),
      client
    )
  })

  it('UPDATEs and emits updated when checksum changes', async () => {
    const { client, queries } = createMockClient({
      product_id: 'prd-existing',
      gh_owned_fields_checksum: 'old-checksum',
      is_archived: false,
      hubspot_product_id: 'hs-123',
      source_variant_key: null
    })

    const result = await upsertProductCatalogFromSource(client, {
      sourceKind: 'sellable_role',
      sourceId: 'role-1',
      snapshot: baseSnapshot({ default_unit_price: 150 })
    })

    expect(result.outcome).toBe('updated')
    expect(result.previousChecksum).toBe('old-checksum')
    expect(result.productId).toBe('prd-existing')
    expect(queries.some(q => q.sql.includes('UPDATE greenhouse_commercial.product_catalog'))).toBe(true)
    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'commercial.product_catalog.updated',
        payload: expect.objectContaining({
          previousChecksum: 'old-checksum',
          hubspotProductId: 'hs-123'
        })
      }),
      client
    )
  })

  it('emits archived when is_archived flips from false to true', async () => {
    const { client } = createMockClient({
      product_id: 'prd-existing',
      gh_owned_fields_checksum: 'old-checksum',
      is_archived: false,
      hubspot_product_id: null,
      source_variant_key: null
    })

    const result = await upsertProductCatalogFromSource(client, {
      sourceKind: 'sellable_role',
      sourceId: 'role-1',
      snapshot: baseSnapshot({ is_archived: true })
    })

    expect(result.outcome).toBe('archived')
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'commercial.product_catalog.archived',
        payload: expect.objectContaining({
          productId: 'prd-existing',
          archivedBy: 'task-546-materializer',
          reason: 'source_deactivated'
        })
      }),
      client
    )
  })

  it('emits unarchived when is_archived flips from true to false', async () => {
    const { client } = createMockClient({
      product_id: 'prd-existing',
      gh_owned_fields_checksum: 'old-checksum',
      is_archived: true,
      hubspot_product_id: null,
      source_variant_key: null
    })

    const result = await upsertProductCatalogFromSource(client, {
      sourceKind: 'sellable_role',
      sourceId: 'role-1',
      snapshot: baseSnapshot({ is_archived: false })
    })

    expect(result.outcome).toBe('unarchived')
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'commercial.product_catalog.unarchived' }),
      client
    )
  })

  it('returns noop without emitting when checksum and archival are unchanged', async () => {
    // First call: create → capture checksum
    const { client: createClient } = createMockClient(null)

    const createResult = await upsertProductCatalogFromSource(createClient, {
      sourceKind: 'sellable_role',
      sourceId: 'role-1',
      snapshot: baseSnapshot()
    })

    mockPublishOutboxEvent.mockClear()

    // Second call: existing row has the SAME checksum (simulating idempotent replay)
    const { client: replayClient, queries } = createMockClient({
      product_id: createResult.productId,
      gh_owned_fields_checksum: createResult.checksum,
      is_archived: false,
      hubspot_product_id: null,
      source_variant_key: null
    })

    const result = await upsertProductCatalogFromSource(replayClient, {
      sourceKind: 'sellable_role',
      sourceId: 'role-1',
      snapshot: baseSnapshot()
    })

    expect(result.outcome).toBe('noop')
    expect(result.productId).toBe(createResult.productId)
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()

    // Only the SELECT FOR UPDATE ran — no INSERT or UPDATE.
    const insertOrUpdate = queries.find(q =>
      q.sql.includes('INSERT INTO greenhouse_commercial.product_catalog') ||
      q.sql.includes('UPDATE greenhouse_commercial.product_catalog')
    )

    expect(insertOrUpdate).toBeUndefined()
  })

  it('locks the row by (source_kind, source_id, source_variant_key)', async () => {
    const { client, queries, wasLocked } = createMockClient(null)

    await upsertProductCatalogFromSource(client, {
      sourceKind: 'tool',
      sourceId: 'tool-42',
      sourceVariantKey: 'seat-enterprise',
      snapshot: baseSnapshot({ product_code: 'ETG-042' })
    })

    expect(wasLocked()).toBe(true)
    const selectQuery = queries.find(q => q.sql.includes('FOR UPDATE'))

    expect(selectQuery?.params).toEqual(['tool', 'tool-42', 'seat-enterprise'])
  })

  it('normalizes empty/whitespace source_variant_key to null', async () => {
    const { client, queries } = createMockClient(null)

    await upsertProductCatalogFromSource(client, {
      sourceKind: 'tool',
      sourceId: 'tool-42',
      sourceVariantKey: '   ',
      snapshot: baseSnapshot({ product_code: 'ETG-042' })
    })

    const selectQuery = queries.find(q => q.sql.includes('FOR UPDATE'))

    expect(selectQuery?.params?.[2]).toBeNull()
  })
})
