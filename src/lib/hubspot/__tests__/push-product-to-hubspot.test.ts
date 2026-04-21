import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// ── Mocks ──
const mockQuery = vi.fn()
const mockWithTransaction = vi.fn()
const mockCreateProduct = vi.fn()
const mockUpdateProduct = vi.fn()
const mockArchiveProduct = vi.fn()
const mockPublishSynced = vi.fn()
const mockPublishFailed = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: (fn: (client: unknown) => Promise<unknown>) => mockWithTransaction(fn)
}))

vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({
  createHubSpotGreenhouseProduct: (...args: unknown[]) => mockCreateProduct(...args),
  updateHubSpotGreenhouseProduct: (...args: unknown[]) => mockUpdateProduct(...args),
  archiveHubSpotGreenhouseProduct: (...args: unknown[]) => mockArchiveProduct(...args)
}))

vi.mock('../product-hubspot-events', () => ({
  publishProductHubSpotSynced: (...args: unknown[]) => mockPublishSynced(...args),
  publishProductHubSpotSyncFailed: (...args: unknown[]) => mockPublishFailed(...args)
}))

import { pushProductToHubSpot } from '../push-product-to-hubspot'
import { ProductNotFoundError } from '../product-hubspot-types'

const baseRow = (overrides: Record<string, unknown> = {}) => ({
  product_id: 'prd-abc',
  product_code: 'ECG-001',
  product_name: 'Senior Designer',
  description: 'Senior designer role',
  default_unit_price: 120,
  default_currency: 'USD',
  default_unit: 'hour',
  hubspot_product_id: null,
  source_kind: 'sellable_role',
  source_id: 'role-1',
  business_line_code: 'globe',
  is_archived: false,
  gh_owned_fields_checksum: 'checksum-abc',
  hubspot_sync_attempt_count: 0,
  hubspot_last_write_at: null,
  ...overrides
})

const mockReadRow = (row: Record<string, unknown> | null) => {
  mockQuery.mockImplementationOnce(async () => (row ? [row] : []))
}

const createMockTxClient = () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []

  const client = {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values })

      return { rows: [] }
    })
  }

  return { client, calls }
}

beforeEach(() => {
  mockQuery.mockReset()
  mockWithTransaction.mockReset()
  mockCreateProduct.mockReset()
  mockUpdateProduct.mockReset()
  mockArchiveProduct.mockReset()
  mockPublishSynced.mockReset()
  mockPublishFailed.mockReset()

  // Default transaction behavior: invoke the callback with a captured client.
  mockWithTransaction.mockImplementation(async (fn: (client: unknown) => Promise<unknown>) => {
    const { client } = createMockTxClient()

    return fn(client)
  })
})

describe('pushProductToHubSpot — happy paths', () => {
  it('create: row without hubspot_product_id → calls POST /products + persists id + emits synced', async () => {
    mockReadRow(baseRow({ hubspot_product_id: null }))
    mockCreateProduct.mockResolvedValueOnce({ hubspotProductId: 'hs-42' })

    const result = await pushProductToHubSpot({ productId: 'prd-abc' })

    expect(result).toEqual({
      status: 'synced',
      action: 'created',
      productId: 'prd-abc',
      hubspotProductId: 'hs-42'
    })
    expect(mockCreateProduct).toHaveBeenCalledTimes(1)
    expect(mockPublishSynced).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'created', hubspotProductId: 'hs-42' }),
      expect.anything()
    )
    expect(mockPublishFailed).not.toHaveBeenCalled()
  })

  it('update: row with hubspot_product_id → calls PATCH + emits synced updated', async () => {
    mockReadRow(baseRow({ hubspot_product_id: 'hs-42' }))
    mockUpdateProduct.mockResolvedValueOnce({ status: 'updated', hubspotProductId: 'hs-42' })

    const result = await pushProductToHubSpot({ productId: 'prd-abc' })

    expect(result.status).toBe('synced')
    expect(result.action).toBe('updated')
    expect(mockUpdateProduct).toHaveBeenCalledTimes(1)
    expect(mockPublishSynced).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'updated' })
    )
  })

  it('archive: archived event + hubspot_product_id → calls POST /archive', async () => {
    mockReadRow(baseRow({ hubspot_product_id: 'hs-42', is_archived: true }))
    mockArchiveProduct.mockResolvedValueOnce({ status: 'archived', hubspotProductId: 'hs-42' })

    const result = await pushProductToHubSpot({
      productId: 'prd-abc',
      eventType: 'commercial.product_catalog.archived'
    })

    expect(result.action).toBe('archived')
    expect(mockArchiveProduct).toHaveBeenCalledWith('hs-42')
  })

  it('unarchive: hubspot_product_id + is_archived=false after unarchive event → PATCH', async () => {
    mockReadRow(baseRow({ hubspot_product_id: 'hs-42', is_archived: false }))
    mockUpdateProduct.mockResolvedValueOnce({ status: 'updated', hubspotProductId: 'hs-42' })

    const result = await pushProductToHubSpot({
      productId: 'prd-abc',
      eventType: 'commercial.product_catalog.unarchived'
    })

    expect(result.action).toBe('unarchived')
    expect(mockUpdateProduct).toHaveBeenCalledTimes(1)
  })
})

describe('pushProductToHubSpot — skip paths', () => {
  it('archive without hubspot_product_id → noop without calling Cloud Run', async () => {
    mockReadRow(baseRow({ hubspot_product_id: null, is_archived: true }))

    const result = await pushProductToHubSpot({
      productId: 'prd-abc',
      eventType: 'commercial.product_catalog.archived'
    })

    expect(result.action).toBe('noop')
    expect(result.status).toBe('skipped_no_anchors')
    expect(mockArchiveProduct).not.toHaveBeenCalled()
    expect(mockCreateProduct).not.toHaveBeenCalled()
  })

  it('anti-ping-pong: skip when hubspot_last_write_at is within 60s', async () => {
    const recent = new Date(Date.now() - 30_000).toISOString()

    mockReadRow(baseRow({ hubspot_product_id: 'hs-42', hubspot_last_write_at: recent }))

    const result = await pushProductToHubSpot({ productId: 'prd-abc' })

    expect(result.status).toBe('skipped_no_anchors')
    expect(result.reason).toBe('anti_ping_pong_window')
    expect(mockCreateProduct).not.toHaveBeenCalled()
    expect(mockUpdateProduct).not.toHaveBeenCalled()
  })

  it('anti-ping-pong: proceeds when hubspot_last_write_at older than 60s', async () => {
    const old = new Date(Date.now() - 120_000).toISOString()

    mockReadRow(baseRow({ hubspot_product_id: 'hs-42', hubspot_last_write_at: old }))
    mockUpdateProduct.mockResolvedValueOnce({ status: 'updated', hubspotProductId: 'hs-42' })

    const result = await pushProductToHubSpot({ productId: 'prd-abc' })

    expect(result.status).toBe('synced')
    expect(mockUpdateProduct).toHaveBeenCalledTimes(1)
  })
})

describe('pushProductToHubSpot — degraded modes', () => {
  it('endpoint_not_deployed on PATCH → persists trace + emits synced with flag, no throw', async () => {
    mockReadRow(baseRow({ hubspot_product_id: 'hs-42' }))
    mockUpdateProduct.mockResolvedValueOnce({
      status: 'endpoint_not_deployed',
      hubspotProductId: 'hs-42',
      message: 'not deployed yet'
    })

    const result = await pushProductToHubSpot({ productId: 'prd-abc' })

    expect(result.status).toBe('endpoint_not_deployed')
    expect(result.action).toBe('updated')
    expect(mockPublishSynced).toHaveBeenCalledWith(
      expect.objectContaining({ endpointNotDeployed: true })
    )
    expect(mockPublishFailed).not.toHaveBeenCalled()
  })

  it('endpoint_not_deployed on archive → persists trace + emits synced with flag', async () => {
    mockReadRow(baseRow({ hubspot_product_id: 'hs-42', is_archived: true }))
    mockArchiveProduct.mockResolvedValueOnce({
      status: 'endpoint_not_deployed',
      hubspotProductId: 'hs-42',
      message: 'archive endpoint not live'
    })

    const result = await pushProductToHubSpot({
      productId: 'prd-abc',
      eventType: 'commercial.product_catalog.archived'
    })

    expect(result.status).toBe('endpoint_not_deployed')
    expect(result.action).toBe('archived')
  })
})

describe('pushProductToHubSpot — error paths', () => {
  it('network / 5xx on create → persists failed trace + emits failed + rethrows', async () => {
    mockReadRow(baseRow({ hubspot_product_id: null }))
    mockCreateProduct.mockRejectedValueOnce(new Error('HubSpot 503'))

    await expect(pushProductToHubSpot({ productId: 'prd-abc' })).rejects.toThrow('HubSpot 503')
    expect(mockPublishFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'created',
        errorMessage: 'HubSpot 503'
      })
    )
  })

  it('missing row → throws ProductNotFoundError', async () => {
    mockReadRow(null)

    await expect(pushProductToHubSpot({ productId: 'prd-ghost' })).rejects.toBeInstanceOf(
      ProductNotFoundError
    )
    expect(mockCreateProduct).not.toHaveBeenCalled()
    expect(mockPublishFailed).not.toHaveBeenCalled()
  })

  it('HubSpot returns empty hubspotProductId on create → persists failed + rethrows', async () => {
    mockReadRow(baseRow({ hubspot_product_id: null }))
    mockCreateProduct.mockResolvedValueOnce({ hubspotProductId: '' })

    await expect(pushProductToHubSpot({ productId: 'prd-abc' })).rejects.toThrow(
      /empty hubspotProductId/
    )
    expect(mockPublishFailed).toHaveBeenCalled()
  })
})
