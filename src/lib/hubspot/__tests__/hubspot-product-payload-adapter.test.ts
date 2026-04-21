import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  __buildCustomProperties,
  adaptProductCatalogToHubSpotCreatePayload,
  adaptProductCatalogToHubSpotUpdatePayload,
  type ProductCatalogSyncSnapshot
} from '../hubspot-product-payload-adapter'

const baseSnapshot = (
  overrides: Partial<ProductCatalogSyncSnapshot> = {}
): ProductCatalogSyncSnapshot => ({
  productId: 'prd-abc',
  productCode: 'ECG-001',
  productName: 'Senior Designer',
  description: 'Senior designer role',
  defaultUnitPrice: 120,
  defaultCurrency: 'USD',
  defaultUnit: 'hour',
  isArchived: false,
  sourceKind: 'sellable_role',
  sourceId: 'role-1',
  businessLineCode: 'globe',
  ghLastWriteAt: '2026-04-21T18:00:00.000Z',
  ...overrides
})

describe('adaptProductCatalogToHubSpotCreatePayload', () => {
  it('maps snapshot to HubSpot create payload with canonical custom properties', () => {
    const payload = adaptProductCatalogToHubSpotCreatePayload(baseSnapshot())

    expect(payload.name).toBe('Senior Designer')
    expect(payload.sku).toBe('ECG-001')
    expect(payload.description).toBe('Senior designer role')
    expect(payload.unitPrice).toBe(120)
    expect(payload.createdBy).toBe('task-547-outbound')

    const customProps = (payload as { customProperties?: Record<string, unknown> }).customProperties

    expect(customProps).toEqual({
      gh_product_code: 'ECG-001',
      gh_source_kind: 'sellable_role',
      gh_last_write_at: '2026-04-21T18:00:00.000Z',
      gh_archived_by_greenhouse: false,
      gh_business_line: 'globe'
    })
  })

  it('omits description + unitPrice when null', () => {
    const payload = adaptProductCatalogToHubSpotCreatePayload(
      baseSnapshot({ description: null, defaultUnitPrice: null })
    )

    expect(payload.description).toBeUndefined()
    expect(payload.unitPrice).toBeUndefined()
  })
})

describe('adaptProductCatalogToHubSpotUpdatePayload', () => {
  it('reflects is_archived=true in both field and custom property', () => {
    const payload = adaptProductCatalogToHubSpotUpdatePayload(baseSnapshot({ isArchived: true }))

    expect(payload.isArchived).toBe(true)

    const customProps = (payload as { customProperties?: Record<string, unknown> }).customProperties

    expect(customProps).toMatchObject({ gh_archived_by_greenhouse: true })
  })

  it('carries business_line_code=null to gh_business_line without coercion', () => {
    const payload = adaptProductCatalogToHubSpotUpdatePayload(
      baseSnapshot({ businessLineCode: null })
    )

    const customProps = (payload as { customProperties?: Record<string, unknown> }).customProperties

    expect(customProps).toMatchObject({ gh_business_line: null })
  })
})

describe('__buildCustomProperties', () => {
  it('is stable regardless of key order (defensive against JSON reordering)', () => {
    const a = __buildCustomProperties(baseSnapshot())
    const b = __buildCustomProperties(baseSnapshot())

    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
