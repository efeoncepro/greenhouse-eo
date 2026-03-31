import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireTenantContext = vi.fn()
const mockCreatePrivatePendingAsset = vi.fn()
const mockResolveCurrentHrMemberId = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireTenantContext: (...args: unknown[]) => mockRequireTenantContext(...args),
  hasRoleCode: vi.fn(() => false),
  hasRouteGroup: vi.fn((tenant: { routeGroups?: string[] }, group: string) => tenant.routeGroups?.includes(group) ?? false)
}))

vi.mock('@/lib/storage/greenhouse-assets', () => ({
  createPrivatePendingAsset: (...args: unknown[]) => mockCreatePrivatePendingAsset(...args)
}))

vi.mock('@/lib/hr-core/service', () => ({
  resolveCurrentHrMemberId: (...args: unknown[]) => mockResolveCurrentHrMemberId(...args)
}))

import { POST } from '@/app/api/assets/private/route'

describe('POST /api/assets/private', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireTenantContext.mockResolvedValue({
      tenant: {
        userId: 'user-1',
        memberId: null,
        clientId: null,
        spaceId: null,
        routeGroups: ['hr']
      },
      unauthorizedResponse: null
    })

    mockCreatePrivatePendingAsset.mockResolvedValue({
      assetId: 'asset-1',
      filename: 'respaldo.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 128,
      visibility: 'private',
      status: 'pending',
      bucketName: 'private-bucket',
      objectPath: 'leave/respaldo.pdf',
      publicId: 'pub-1',
      retentionClass: 'hr_leave',
      ownerAggregateType: 'leave_request_draft',
      ownerAggregateId: null,
      ownerClientId: null,
      ownerSpaceId: null,
      ownerMemberId: 'member-123',
      uploadedByUserId: 'user-1',
      attachedByUserId: null,
      deletedByUserId: null,
      uploadSource: 'user',
      downloadCount: 0,
      metadata: {},
      createdAt: null,
      uploadedAt: null,
      attachedAt: null,
      deletedAt: null,
      lastDownloadedAt: null
    })
  })

  it('resolves ownerMemberId for leave drafts when the session does not expose memberId', async () => {
    mockResolveCurrentHrMemberId.mockResolvedValue('member-123')

    const formData = new FormData()

    formData.set('file', new File(['pdf'], 'respaldo.pdf', { type: 'application/pdf' }))
    formData.set('contextType', 'leave_request_draft')

    const response = await POST(
      new Request('http://localhost/api/assets/private', {
        method: 'POST',
        body: formData
      })
    )

    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.asset.assetId).toBe('asset-1')
    expect(mockCreatePrivatePendingAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerMemberId: 'member-123'
      })
    )
  })
})
