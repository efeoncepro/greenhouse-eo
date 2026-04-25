import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// ── DB mock ─────────────────────────────────────────────────────────────
//
// The hydrator runs two DB round-trips per call: a SELECT to read the
// current product_catalog row, then an UPDATE. We capture both via a
// single `mockQuery` that dispatches on the SQL prefix so tests can assert
// exactly what columns the UPDATE wrote.

interface CapturedUpdate {
  sql: string
  values: unknown[]
}

const captured: CapturedUpdate[] = []

const mockRow = {
  product_id: 'CPROD-001',
  gh_last_write_at: null as string | null,
  owner_gh_authoritative: false as boolean | null,
  commercial_owner_member_id: null as string | null,
  commercial_owner_assigned_at: null as string | null,
  marketing_url: null as string | null,
  image_urls: null as string[] | null,
  description_rich_html: null as string | null
}

const mockQuery = vi.fn(async (sql: string, values: unknown[] = []) => {
  const trimmed = sql.trim()

  if (trimmed.startsWith('SELECT')) {
    return [{ ...mockRow }]
  }

  captured.push({ sql: trimmed, values })

  return []
})

vi.mock('@/lib/db', () => ({
  query: (sql: string, values?: unknown[]) => mockQuery(sql, values),
  withTransaction: vi.fn()
}))

// Avoid the real owner-bridge (it queries `members` + `person_360`).
const mockLoadBinding = vi.fn()

// ── Imports after mocks ─────────────────────────────────────────────────

import type { HubSpotGreenhouseProductProfile } from '@/lib/integrations/hubspot-greenhouse-service'

import { hydrateProductCatalogFromHubSpotV2 } from '../inbound-product-catalog-hydration'

// ── Helpers ─────────────────────────────────────────────────────────────

const buildProfile = (
  overrides: Partial<HubSpotGreenhouseProductProfile> = {}
): HubSpotGreenhouseProductProfile => ({
  identity: {
    productId: 'CPROD-001',
    name: 'Senior Designer',
    sku: 'ECG-001',
    hubspotProductId: 'HS-001'
  },
  pricing: { unitPrice: 120, costOfGoodsSold: null, currency: 'USD', tax: null },
  billing: { isRecurring: false, frequency: null, periodCount: null },
  metadata: {
    description: 'Senior role',
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
    lastModifiedAt: '2026-04-24T12:00:00Z'
  },
  source: {
    sourceSystem: 'hubspot',
    sourceObjectType: 'product',
    sourceObjectId: 'HS-001'
  },

  // v2 defaults — opt-in per test
  owner: null,
  pricesByCurrency: {},
  descriptionRichHtml: null,
  categoryHubspotValue: null,
  unitHubspotValue: null,
  taxCategoryHubspotValue: null,
  imageUrls: [],
  marketingUrl: null,
  hubspotOwnerAssignedAt: null,
  ...overrides
})

beforeEach(() => {
  vi.clearAllMocks()
  captured.length = 0

  // Reset mockRow to baseline (all v2 fields null / empty)
  Object.assign(mockRow, {
    product_id: 'CPROD-001',
    gh_last_write_at: null,
    owner_gh_authoritative: false,
    commercial_owner_member_id: null,
    commercial_owner_assigned_at: null,
    marketing_url: null,
    image_urls: null,
    description_rich_html: null
  })
  mockLoadBinding.mockReset()
})

// ── Tests ───────────────────────────────────────────────────────────────

describe('hydrateProductCatalogFromHubSpotV2', () => {
  it('returns skipped_no_row when product_catalog has no row for productId', async () => {
    mockQuery.mockImplementationOnce(async () => [])

    const result = await hydrateProductCatalogFromHubSpotV2('MISSING-1', buildProfile())

    expect(result).toEqual({ kind: 'skipped_no_row', productId: 'MISSING-1' })
    expect(captured).toHaveLength(0)
  })

  it('captures commercial_owner_assigned_at on first sync (always-write)', async () => {
    const result = await hydrateProductCatalogFromHubSpotV2(
      'CPROD-001',
      buildProfile({ hubspotOwnerAssignedAt: '2026-04-20T10:00:00Z' })
    )

    expect(result.kind).toBe('updated')
    expect((result as { fieldsWritten: string[] }).fieldsWritten).toContain('commercial_owner_assigned_at')
    expect(captured[0].values).toContain('2026-04-20T10:00:00Z')
  })

  it('writes marketing_url only when GH value is NULL (first-sync)', async () => {
    const result = await hydrateProductCatalogFromHubSpotV2(
      'CPROD-001',
      buildProfile({ marketingUrl: 'https://efeonce.com/role/senior' })
    )

    expect(result.kind).toBe('updated')
    expect((result as { fieldsWritten: string[] }).fieldsWritten).toContain('marketing_url')
  })

  it('preserves existing marketing_url (NO overwrite)', async () => {
    mockRow.marketing_url = 'https://efeonce.com/ORIGINAL'

    const result = await hydrateProductCatalogFromHubSpotV2(
      'CPROD-001',
      buildProfile({ marketingUrl: 'https://efeonce.com/FROM-HS' })
    )

    expect(result.kind).toBe('no_changes')
    expect(captured).toHaveLength(0)
  })

  it('writes image_urls only when GH array is empty/NULL', async () => {
    const result = await hydrateProductCatalogFromHubSpotV2(
      'CPROD-001',
      buildProfile({ imageUrls: ['https://cdn.example.com/a.jpg'] })
    )

    expect(result.kind).toBe('updated')
    expect((result as { fieldsWritten: string[] }).fieldsWritten).toContain('image_urls')
  })

  it('preserves existing non-empty image_urls', async () => {
    mockRow.image_urls = ['https://cdn.example.com/existing.jpg']

    const result = await hydrateProductCatalogFromHubSpotV2(
      'CPROD-001',
      buildProfile({ imageUrls: ['https://cdn.example.com/new.jpg'] })
    )

    expect(result.kind).toBe('no_changes')
  })

  describe('owner conflict resolution', () => {
    it('HS wins when gh_last_write_at is older AND owner_gh_authoritative=false', async () => {
      mockRow.gh_last_write_at = '2026-04-20T00:00:00Z'
      mockRow.owner_gh_authoritative = false
      mockLoadBinding.mockResolvedValue({ memberId: 'mem-XYZ', userId: null, email: null })

      const result = await hydrateProductCatalogFromHubSpotV2(
        'CPROD-001',
        buildProfile({
          owner: {
            hubspotOwnerId: 'HS-OWN-5',
            ownerEmail: 'x@y.com',
            ownerFirstName: null,
            ownerLastName: null,
            ownerDisplayName: null,
            userId: null,
            archived: false
          },
          metadata: {
            description: null,
            isArchived: false,
            createdAt: null,
            lastModifiedAt: '2026-04-24T12:00:00Z' // NEWER than GH
          }
        }),
        { loadOwnerBinding: mockLoadBinding }
      )

      expect(result.kind).toBe('updated')
      expect((result as { fieldsWritten: string[] }).fieldsWritten).toContain('commercial_owner_member_id')
      expect(captured[0].values).toContain('mem-XYZ')
    })

    it('GH wins when owner_gh_authoritative=true (HS value ignored even if newer)', async () => {
      mockRow.owner_gh_authoritative = true
      mockRow.commercial_owner_member_id = 'mem-ORIGINAL'
      mockLoadBinding.mockResolvedValue({ memberId: 'mem-OTHER', userId: null, email: null })

      const result = await hydrateProductCatalogFromHubSpotV2(
        'CPROD-001',
        buildProfile({
          owner: {
            hubspotOwnerId: 'HS-OWN-5',
            ownerEmail: null,
            ownerFirstName: null,
            ownerLastName: null,
            ownerDisplayName: null,
            userId: null,
            archived: false
          }
        }),
        { loadOwnerBinding: mockLoadBinding }
      )

      expect(result.kind).toBe('no_changes')
      expect(mockLoadBinding).not.toHaveBeenCalled()
    })

    it('GH wins when hs_lastmodifieddate is OLDER than gh_last_write_at', async () => {
      mockRow.gh_last_write_at = '2026-05-01T00:00:00Z'
      mockRow.owner_gh_authoritative = false
      mockLoadBinding.mockResolvedValue({ memberId: 'mem-OTHER', userId: null, email: null })

      const result = await hydrateProductCatalogFromHubSpotV2(
        'CPROD-001',
        buildProfile({
          owner: {
            hubspotOwnerId: 'HS-OWN-5',
            ownerEmail: null,
            ownerFirstName: null,
            ownerLastName: null,
            ownerDisplayName: null,
            userId: null,
            archived: false
          },
          metadata: {
            description: null,
            isArchived: false,
            createdAt: null,
            lastModifiedAt: '2026-04-24T12:00:00Z' // OLDER than GH
          }
        }),
        { loadOwnerBinding: mockLoadBinding }
      )

      expect(result.kind).toBe('no_changes')
      expect(mockLoadBinding).not.toHaveBeenCalled()
    })

    it('returns owner_unmapped when HS owner has no GH binding', async () => {
      mockRow.gh_last_write_at = '2026-01-01T00:00:00Z'
      mockRow.owner_gh_authoritative = false
      mockLoadBinding.mockResolvedValue(null)

      const result = await hydrateProductCatalogFromHubSpotV2(
        'CPROD-001',
        buildProfile({
          owner: {
            hubspotOwnerId: 'HS-OWN-UNKNOWN',
            ownerEmail: null,
            ownerFirstName: null,
            ownerLastName: null,
            ownerDisplayName: null,
            userId: null,
            archived: false
          }
        }),
        { loadOwnerBinding: mockLoadBinding }
      )

      expect(result).toEqual({
        kind: 'owner_unmapped',
        productId: 'CPROD-001',
        hubspotOwnerId: 'HS-OWN-UNKNOWN'
      })

      // No UPDATE should have been issued after the owner bailout.
      expect(captured).toHaveLength(0)
    })
  })

  it('NEVER writes to product_catalog_prices (only issues UPDATE on product_catalog)', async () => {
    await hydrateProductCatalogFromHubSpotV2(
      'CPROD-001',
      buildProfile({
        marketingUrl: 'https://x',
        imageUrls: ['y'],
        descriptionRichHtml: '<p>z</p>'
      })
    )

    for (const call of captured) {
      expect(call.sql).toMatch(/product_catalog\b/)
      expect(call.sql).not.toMatch(/product_catalog_prices/)
    }
  })
})
