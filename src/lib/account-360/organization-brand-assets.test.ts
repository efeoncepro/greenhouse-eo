import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockClientQuery = vi.fn()
const mockGetAssetById = vi.fn()
const mockAttachAssetToAggregate = vi.fn()
const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: async (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    callback({ query: mockClientQuery })
}))

vi.mock('@/lib/storage/greenhouse-assets', () => ({
  getAssetById: (...args: unknown[]) => mockGetAssetById(...args),
  attachAssetToAggregate: (...args: unknown[]) => mockAttachAssetToAggregate(...args),
  buildPrivateAssetDownloadUrl: (assetId: string) => `/api/assets/private/${assetId}`
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

const { attachOrganizationLogoAsset } = await import('./organization-brand-assets')

describe('attachOrganizationLogoAsset', () => {
  beforeEach(() => {
    mockClientQuery.mockReset()
    mockGetAssetById.mockReset()
    mockAttachAssetToAggregate.mockReset()
    mockPublishOutboxEvent.mockReset()
  })

  it('blocks operating entities before touching assets', async () => {
    mockClientQuery.mockResolvedValueOnce({
      rows: [{
        organization_id: 'org-efeonce',
        public_id: 'EO-ORG-0001',
        organization_name: 'Efeonce Group SpA',
        is_operating_entity: true,
        logo_asset_id: 'asset-legal'
      }]
    })

    await expect(attachOrganizationLogoAsset({
      organizationId: 'org-efeonce',
      assetId: 'asset-new',
      actorUserId: 'user-1'
    })).rejects.toMatchObject({
      code: 'operating_entity_forbidden'
    })

    expect(mockGetAssetById).not.toHaveBeenCalled()
    expect(mockAttachAssetToAggregate).not.toHaveBeenCalled()
  })

  it('attaches a logo to a non-operating organization and preserves the previous asset', async () => {
    mockClientQuery
      .mockResolvedValueOnce({
        rows: [{
          organization_id: 'org-client',
          public_id: 'EO-ORG-0002',
          organization_name: 'Cliente Demo',
          is_operating_entity: false,
          logo_asset_id: 'asset-old'
        }]
      })
      .mockResolvedValue({ rows: [] })

    mockGetAssetById.mockResolvedValue({
      assetId: 'asset-new',
      status: 'pending',
      ownerAggregateType: 'organization_logo_draft',
      ownerClientId: 'client-1',
      ownerSpaceId: null,
      ownerMemberId: null
    })

    mockAttachAssetToAggregate.mockResolvedValue({
      assetId: 'asset-new',
      ownerClientId: 'client-1',
      ownerSpaceId: null,
      ownerMemberId: null
    })

    const result = await attachOrganizationLogoAsset({
      organizationId: 'org-client',
      assetId: 'asset-new',
      actorUserId: 'user-1',
      reason: 'manual_review'
    })

    expect(mockAttachAssetToAggregate).toHaveBeenCalledWith(expect.objectContaining({
      assetId: 'asset-new',
      ownerAggregateType: 'organization_logo',
      ownerAggregateId: 'org-client',
      actorUserId: 'user-1'
    }))
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE greenhouse_core.assets'),
      expect.arrayContaining(['asset-old'])
    )
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'organization.brand_asset.updated'
    }), expect.anything())
    expect(result).toEqual({
      organizationId: 'org-client',
      previousLogoAssetId: 'asset-old',
      logoAssetId: 'asset-new',
      logoUrl: '/api/assets/private/asset-new?inline=1',
      variant: 'default'
    })
    expect(mockClientQuery).toHaveBeenCalledWith(expect.stringContaining('SET logo_asset_id = $2'), ['org-client', 'asset-new'])
  })

  it('TASK-1888 — la variante on_dark escribe logo_on_dark_asset_id y deja intacto el logo por defecto', async () => {
    mockClientQuery
      .mockResolvedValueOnce({
        rows: [{
          organization_id: 'org-client',
          public_id: 'EO-ORG-0002',
          organization_name: 'Cliente Demo',
          is_operating_entity: false,
          logo_asset_id: 'asset-default',
          logo_on_dark_asset_id: 'asset-dark-old'
        }]
      })
      .mockResolvedValue({ rows: [] })

    mockGetAssetById.mockResolvedValue({ assetId: 'asset-dark', status: 'pending', ownerAggregateType: 'organization_logo_draft', ownerClientId: null, ownerSpaceId: null, ownerMemberId: null })
    mockAttachAssetToAggregate.mockResolvedValue({ assetId: 'asset-dark', ownerClientId: null, ownerSpaceId: null, ownerMemberId: null })

    const result = await attachOrganizationLogoAsset({ organizationId: 'org-client', assetId: 'asset-dark', actorUserId: 'user-1', variant: 'on_dark' })

    expect(result).toMatchObject({ previousLogoAssetId: 'asset-dark-old', logoAssetId: 'asset-dark', variant: 'on_dark' })
    expect(mockClientQuery).toHaveBeenCalledWith(expect.stringContaining('SET logo_on_dark_asset_id = $2'), ['org-client', 'asset-dark'])
    expect(mockClientQuery).not.toHaveBeenCalledWith(expect.stringContaining('SET logo_asset_id'), expect.anything())
    // El asset anterior que se marca reemplazado es el de la MISMA variante, nunca el logo por defecto.
    expect(mockClientQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE greenhouse_core.assets'), expect.arrayContaining(['asset-dark-old']))
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'organization.brand_asset.updated', payload: expect.objectContaining({ variant: 'on_dark' }) }), expect.anything())
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(expect.objectContaining({ payload: { organizationId: 'org-client', updatedFields: ['logo_on_dark_asset_id'] } }), expect.anything())
  })
})
