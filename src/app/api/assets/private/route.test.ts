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

const mockCan = vi.fn(() => false)

vi.mock('@/lib/entitlements/runtime', () => ({
  can: (...args: unknown[]) => mockCan(...(args as [])),
  buildTenantEntitlementSubject: (tenant: unknown) => tenant
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

  // ── TASK-1399 — Proposal Studio: el binario del RFP entra por HTTP ──────────
  //
  // Antes de esta task los contextos existían en el asset store (límite 50 MB, MIME docx/xlsx,
  // retención document_vault, scan gate) pero NO en la allowlist de esta ruta: todo upload de
  // propuesta moría en `400 Unsupported asset context` — el RFP sólo entraba por script.

  it('acepta el RFP de una propuesta cuando el actor tiene commercial.proposal.manage', async () => {
    mockCan.mockReturnValue(true)
    mockRequireTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', memberId: 'julio', clientId: null, spaceId: null, routeGroups: ['internal'] },
      unauthorizedResponse: null
    })

    const form = new FormData()

    form.append('file', new File(['bases'], 'bases.pdf', { type: 'application/pdf' }))
    form.append('contextType', 'proposal_rfp_draft')

    const response = await POST(new Request('http://localhost/api/assets/private', { method: 'POST', body: form }))

    expect(response.status).toBe(201)
    expect(mockCan).toHaveBeenCalledWith(expect.anything(), 'commercial.proposal.manage', 'update', 'tenant')
    expect(mockCreatePrivatePendingAsset).toHaveBeenCalledWith(
      expect.objectContaining({ contextType: 'proposal_rfp_draft' })
    )
  })

  it('RECHAZA el RFP a quien no tiene la capability (el documento comercial no es un archivo personal)', async () => {
    mockCan.mockReturnValue(false)
    mockRequireTenantContext.mockResolvedValue({
      // Un member cualquiera: sin la capability NO sube un RFP (no vale el member-only).
      tenant: { userId: 'user-2', memberId: 'alguien', clientId: null, spaceId: null, routeGroups: [] },
      unauthorizedResponse: null
    })

    const form = new FormData()

    form.append('file', new File(['bases'], 'bases.pdf', { type: 'application/pdf' }))
    form.append('contextType', 'proposal_rfp_draft')

    const response = await POST(new Request('http://localhost/api/assets/private', { method: 'POST', body: form }))

    expect(response.status).toBe(403)
    expect(mockCreatePrivatePendingAsset).not.toHaveBeenCalled()
  })

  it('el deliverable de una propuesta usa la misma puerta', async () => {
    mockCan.mockReturnValue(true)
    mockRequireTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', memberId: 'julio', clientId: null, spaceId: null, routeGroups: ['internal'] },
      unauthorizedResponse: null
    })

    const form = new FormData()

    form.append('file', new File(['deck'], 'deck.pdf', { type: 'application/pdf' }))
    form.append('contextType', 'proposal_deliverable_draft')

    const response = await POST(new Request('http://localhost/api/assets/private', { method: 'POST', body: form }))

    expect(response.status).toBe(201)
  })
})
