import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// ── DB mock (pricing reads + drift report write) ────────────────────────

interface CapturedCall {
  sql: string
  values: unknown[]
}

const captured: CapturedCall[] = []

/** In-memory GH prices keyed by product_id. Tests override before calls. */
let ghPrices: Array<{ currency_code: string; unit_price: number }> = []

const mockQuery = vi.fn(async (sql: string, values: unknown[] = []) => {
  const trimmed = sql.trim()

  captured.push({ sql: trimmed, values })

  if (trimmed.startsWith('SELECT currency_code, unit_price')) {
    return ghPrices.map(row => ({ ...row }))
  }

  // INSERT INTO source_sync_runs — no rows returned
  return []
})

vi.mock('@/lib/db', () => ({
  query: (sql: string, values?: unknown[]) => mockQuery(sql, values),
  withTransaction: vi.fn()
}))

// ── Ref table reverse lookups ───────────────────────────────────────────

const mockCategoryByHubspotValue = vi.fn<(...args: unknown[]) => Promise<{ code: string } | null>>(
  async () => ({ code: 'staff_augmentation' })
)

const mockUnitByHubspotValue = vi.fn<(...args: unknown[]) => Promise<{ code: string } | null>>(
  async () => ({ code: 'hour' })
)

const mockTaxByHubspotValue = vi.fn<(...args: unknown[]) => Promise<{ code: string } | null>>(
  async () => ({ code: 'cl_iva_19' })
)

vi.mock('@/lib/commercial/product-catalog-references', () => ({
  getProductCategoryByHubspotValue: (...args: unknown[]) => mockCategoryByHubspotValue(...args),
  getProductUnitByHubspotValue: (...args: unknown[]) => mockUnitByHubspotValue(...args),
  getTaxCategoryByHubspotValue: (...args: unknown[]) => mockTaxByHubspotValue(...args)
}))

// Owner binding (injected per-test via loadOwnerBinding option)
const mockLoadBinding = vi.fn()

// Sanitizer helpers — use actual module (no mock — direct passthrough)

// ── Imports after mocks ─────────────────────────────────────────────────

import type { HubSpotGreenhouseProductProfile } from '@/lib/integrations/hubspot-greenhouse-service'

import {
  detectProductDriftV2,
  persistDriftReport,
  type ProductCatalogDriftSnapshot
} from '../drift-detector-v2'

// ── Fixtures ────────────────────────────────────────────────────────────

const baseSnapshot = (
  overrides: Partial<ProductCatalogDriftSnapshot> = {}
): ProductCatalogDriftSnapshot => ({
  product_id: 'CPROD-001',
  hubspot_product_id: 'HS-1',
  product_name: 'Senior Designer',
  description: 'Senior role',
  description_rich_html: '<p>Senior role</p>',
  hubspot_product_type_code: 'service',
  hubspot_pricing_model: 'flat',
  hubspot_product_classification: 'standalone',
  hubspot_bundle_type_code: 'none',
  category_code: 'staff_augmentation',
  unit_code: 'hour',
  tax_category_code: 'cl_iva_19',
  marketing_url: null,
  image_urls: [],
  commercial_owner_member_id: 'mem-1',
  is_archived: false,
  ...overrides
})

const baseProfile = (
  overrides: Partial<HubSpotGreenhouseProductProfile> = {}
): HubSpotGreenhouseProductProfile => ({
  identity: { productId: 'CPROD-001', name: 'Senior Designer', sku: 'ECG-001', hubspotProductId: 'HS-1' },
  pricing: { unitPrice: 120, costOfGoodsSold: null, currency: 'USD', tax: null },
  billing: { isRecurring: false, frequency: null, periodCount: null },
  metadata: {
    description: 'Senior role',
    isArchived: false,
    createdAt: null,
    lastModifiedAt: '2026-04-24T12:00:00Z'
  },
  source: { sourceSystem: 'hubspot', sourceObjectType: 'product', sourceObjectId: 'HS-1' },
  owner: null,
  pricesByCurrency: { CLP: 100000, USD: 100, CLF: 0.03, COP: null, MXN: null, PEN: null },
  descriptionRichHtml: '<p>Senior role</p>',
  categoryHubspotValue: 'Staff augmentation',
  unitHubspotValue: 'Hour',
  taxCategoryHubspotValue: 'Chile - IVA 19%',
  productType: 'service',
  pricingModel: 'flat',
  productClassification: 'standalone',
  bundleType: 'none',
  imageUrls: [],
  marketingUrl: null,
  hubspotOwnerAssignedAt: null,
  ...overrides
})

beforeEach(() => {
  vi.clearAllMocks()
  captured.length = 0
  ghPrices = [
    { currency_code: 'CLP', unit_price: 100000 },
    { currency_code: 'USD', unit_price: 100 },
    { currency_code: 'CLF', unit_price: 0.03 }
  ]
  mockCategoryByHubspotValue.mockResolvedValue({ code: 'staff_augmentation' })
  mockUnitByHubspotValue.mockResolvedValue({ code: 'hour' })
  mockTaxByHubspotValue.mockResolvedValue({ code: 'cl_iva_19' })
  mockLoadBinding.mockReset()
})

// ── Tests ───────────────────────────────────────────────────────────────

describe('detectProductDriftV2', () => {
  describe('price drift', () => {
    it('returns pending_overwrite when a currency price differs', async () => {
      const profile = baseProfile({
        pricesByCurrency: { CLP: 999999, USD: 100, CLF: 0.03, COP: null, MXN: null, PEN: null }
      })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot())

      const drift = report.driftedFields.find(d => d.name === 'price_clp')

      expect(drift).toBeDefined()
      expect(drift?.classification).toBe('pending_overwrite')
      expect(drift?.hsValue).toBe(999999)
      expect(drift?.ghValue).toBe(100000)
    })

    it('detects missing GH currency as drift against HS non-null', async () => {
      ghPrices = [{ currency_code: 'USD', unit_price: 100 }]

      const profile = baseProfile({
        pricesByCurrency: { CLP: 100000, USD: 100, CLF: null, COP: null, MXN: null, PEN: null }
      })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot())

      expect(report.driftedFields.some(d => d.name === 'price_clp')).toBe(true)
    })

    it('no drift when all 6 currencies match (within epsilon)', async () => {
      ghPrices = [
        { currency_code: 'CLP', unit_price: 100000.001 },
        { currency_code: 'USD', unit_price: 100 },
        { currency_code: 'CLF', unit_price: 0.03 }
      ]

      const profile = baseProfile({
        pricesByCurrency: { CLP: 100000, USD: 100, CLF: 0.03, COP: null, MXN: null, PEN: null }
      })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot())

      const priceDrifts = report.driftedFields.filter(d => d.name.startsWith('price_'))

      expect(priceDrifts).toHaveLength(0)
    })
  })

  describe('owner drift', () => {
    it('error when HS owner has no binding in greenhouse_core.members', async () => {
      mockLoadBinding.mockResolvedValue(null)

      const profile = baseProfile({
        owner: {
          hubspotOwnerId: 'HS-OWN-UNKNOWN',
          ownerEmail: null,
          ownerFirstName: null,
          ownerLastName: null,
          ownerDisplayName: null,
          userId: null,
          archived: false
        }
      })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot(), {
        loadOwnerBinding: mockLoadBinding
      })

      const drift = report.driftedFields.find(d => d.name === 'commercial_owner')

      expect(drift?.classification).toBe('error')
      expect(drift?.reason).toMatch(/no member binding/)
    })

    it('pending_overwrite when resolved binding differs from current GH owner', async () => {
      mockLoadBinding.mockResolvedValue({ memberId: 'mem-DIFFERENT', userId: null, email: null })

      const profile = baseProfile({
        owner: {
          hubspotOwnerId: 'HS-OWN-2',
          ownerEmail: null,
          ownerFirstName: null,
          ownerLastName: null,
          ownerDisplayName: null,
          userId: null,
          archived: false
        }
      })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot({
        commercial_owner_member_id: 'mem-1'
      }), { loadOwnerBinding: mockLoadBinding })

      const drift = report.driftedFields.find(d => d.name === 'commercial_owner')

      expect(drift?.classification).toBe('pending_overwrite')
      expect(drift?.hsValue).toBe('mem-DIFFERENT')
      expect(drift?.ghValue).toBe('mem-1')
    })

    it('no drift when bound member matches current GH owner', async () => {
      mockLoadBinding.mockResolvedValue({ memberId: 'mem-1', userId: null, email: null })

      const profile = baseProfile({
        owner: {
          hubspotOwnerId: 'HS-OWN-2',
          ownerEmail: null,
          ownerFirstName: null,
          ownerLastName: null,
          ownerDisplayName: null,
          userId: null,
          archived: false
        }
      })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot({
        commercial_owner_member_id: 'mem-1'
      }), { loadOwnerBinding: mockLoadBinding })

      expect(report.driftedFields.some(d => d.name === 'commercial_owner')).toBe(false)
    })
  })

  describe('ref table classification', () => {
    it('manual_drift when HS category hubspot_option_value is unknown', async () => {
      mockCategoryByHubspotValue.mockResolvedValue(null)

      const profile = baseProfile({ categoryHubspotValue: 'Unknown category label' })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot())

      const drift = report.driftedFields.find(d => d.name === 'category_code')

      expect(drift?.classification).toBe('manual_drift')
      expect(drift?.reason).toMatch(/not registered/)
    })

    it('pending_overwrite when HS category resolves but differs from GH code', async () => {
      mockCategoryByHubspotValue.mockResolvedValue({ code: 'other_category' })

      const profile = baseProfile({ categoryHubspotValue: 'Marketing Services' })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot())

      const drift = report.driftedFields.find(d => d.name === 'category_code')

      expect(drift?.classification).toBe('pending_overwrite')
      expect(drift?.hsValue).toBe('other_category')
      expect(drift?.ghValue).toBe('staff_augmentation')
    })

    it('unit_code manual_drift pattern mirrors category', async () => {
      mockUnitByHubspotValue.mockResolvedValue(null)

      const profile = baseProfile({ unitHubspotValue: 'Strange unit' })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot())

      const drift = report.driftedFields.find(d => d.name === 'unit_code')

      expect(drift?.classification).toBe('manual_drift')
    })
  })

  describe('classification tuple drift', () => {
    it('productType differs → pending_overwrite', async () => {
      const profile = baseProfile({ productType: 'inventory' })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot())

      const drift = report.driftedFields.find(d => d.name === 'hubspot_product_type_code')

      expect(drift?.classification).toBe('pending_overwrite')
    })

    it('pricingModel differs → pending_overwrite', async () => {
      const profile = baseProfile({ pricingModel: 'tiered' })

      const report = await detectProductDriftV2('CPROD-001', profile, baseSnapshot())

      const drift = report.driftedFields.find(d => d.name === 'hubspot_pricing_model')

      expect(drift?.classification).toBe('pending_overwrite')
    })
  })

  describe('marketing drift', () => {
    it('marketing_url differs → pending_overwrite', async () => {
      const profile = baseProfile({ marketingUrl: 'https://example.com/new' })

      const report = await detectProductDriftV2(
        'CPROD-001',
        profile,
        baseSnapshot({ marketing_url: 'https://example.com/old' })
      )

      const drift = report.driftedFields.find(d => d.name === 'marketing_url')

      expect(drift?.classification).toBe('pending_overwrite')
    })

    it('image_urls differ → pending_overwrite', async () => {
      const profile = baseProfile({ imageUrls: ['https://cdn.example.com/x.jpg'] })

      const report = await detectProductDriftV2(
        'CPROD-001',
        profile,
        baseSnapshot({ image_urls: ['https://cdn.example.com/y.jpg'] })
      )

      const drift = report.driftedFields.find(d => d.name === 'image_urls')

      expect(drift?.classification).toBe('pending_overwrite')
    })
  })

  it('NEVER issues UPDATE/INSERT against product_catalog or product_catalog_prices', async () => {
    const profile = baseProfile({
      pricesByCurrency: { CLP: 999, USD: 99, CLF: null, COP: null, MXN: null, PEN: null }
    })

    await detectProductDriftV2('CPROD-001', profile, baseSnapshot())

    for (const call of captured) {
      expect(call.sql).not.toMatch(/UPDATE\s+greenhouse_commercial\.product_catalog/i)
      expect(call.sql).not.toMatch(/INSERT\s+INTO\s+greenhouse_commercial\.product_catalog/i)
    }
  })
})

describe('persistDriftReport', () => {
  it('INSERTs a source_sync_runs row with source_system=product_drift_v2', async () => {
    await persistDriftReport({
      productId: 'CPROD-001',
      hubspotProductId: 'HS-1',
      scannedAt: '2026-04-24T12:00:00Z',
      driftedFields: []
    })

    expect(captured).toHaveLength(1)
    expect(captured[0].sql).toMatch(/INSERT INTO greenhouse_sync\.source_sync_runs/)
    expect(captured[0].sql).toMatch(/'product_drift_v2'/)
    expect(captured[0].values[1]).toBe('no_drift')
  })

  it('marks status drift_detected when driftedFields is non-empty', async () => {
    await persistDriftReport({
      productId: 'CPROD-001',
      hubspotProductId: 'HS-1',
      scannedAt: '2026-04-24T12:00:00Z',
      driftedFields: [
        { name: 'price_clp', hsValue: 1, ghValue: 2, classification: 'pending_overwrite' }
      ]
    })

    expect(captured[0].values[1]).toBe('drift_detected')
  })
})
