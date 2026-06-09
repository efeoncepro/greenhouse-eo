import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as OrganizationBrandAssets from './organization-brand-assets'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockCreateOrganizationLogoCandidate = vi.fn()
const mockStoreSystemGeneratedPrivateAsset = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/account-360/organization-brand-assets', async () => {
  const actual = await vi.importActual<typeof OrganizationBrandAssets>('./organization-brand-assets')

  return {
    ...actual,
    createOrganizationLogoCandidate: (...args: unknown[]) => mockCreateOrganizationLogoCandidate(...args)
  }
})

vi.mock('@/lib/storage/greenhouse-assets', () => ({
  storeSystemGeneratedPrivateAsset: (...args: unknown[]) => mockStoreSystemGeneratedPrivateAsset(...args)
}))

const { createOperatorUrlOrganizationLogoCandidate } = await import('./organization-brand-assets-discovery')

describe('createOperatorUrlOrganizationLogoCandidate', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockCreateOrganizationLogoCandidate.mockReset()
    mockStoreSystemGeneratedPrivateAsset.mockReset()
    vi.unstubAllGlobals()
  })

  it('accepts a website URL and creates a candidate from og:image metadata', async () => {
    mockQuery
      .mockResolvedValueOnce([{
          organization_id: 'org-client',
          public_id: 'EO-ORG-0099',
          organization_name: 'LATAM Demo',
          website_url: null
        }])
      .mockResolvedValueOnce([{ is_operating_entity: false }])

    mockStoreSystemGeneratedPrivateAsset.mockResolvedValue({ assetId: 'asset-latam-logo' })
    mockCreateOrganizationLogoCandidate.mockResolvedValue({
      candidate_id: 'candidate-latam-logo',
      asset_id: 'asset-latam-logo'
    })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      }))
      .mockResolvedValueOnce(new Response(
        '<meta property="og:image" content="https://s.latamairlines.com/images/seo/logo_latam.jpg">',
        {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        }
      ))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/jpeg', 'content-length': '3' }
      }))

    vi.stubGlobal('fetch', fetchMock)

    const result = await createOperatorUrlOrganizationLogoCandidate({
      organizationId: 'org-client',
      sourceUrl: 'https://latam.com',
      actorUserId: 'user-admin'
    })

    expect(result).toEqual({
      candidate_id: 'candidate-latam-logo',
      asset_id: 'asset-latam-logo'
    })
    expect(mockStoreSystemGeneratedPrivateAsset).toHaveBeenCalledWith(expect.objectContaining({
      ownerAggregateType: 'organization_logo_candidate',
      ownerAggregateId: 'org-client',
      fileName: 'EO-ORG-0099-logo-candidate.jpg',
      mimeType: 'image/jpeg',
      actorUserId: 'user-admin',
      metadata: expect.objectContaining({
        source: 'operator_url',
        sourceUrl: 'https://s.latamairlines.com/images/seo/logo_latam.jpg',
        htmlSource: 'og:image',
        requestedUrl: 'https://latam.com/'
      })
    }))
    expect(mockCreateOrganizationLogoCandidate).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-client',
      assetId: 'asset-latam-logo',
      source: 'operator_url',
      sourceUrl: 'https://s.latamairlines.com/images/seo/logo_latam.jpg'
    }))
  })
})
