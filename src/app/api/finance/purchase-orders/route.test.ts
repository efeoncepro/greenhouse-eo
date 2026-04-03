import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockResolveFinanceDownstreamScope = vi.fn()
const mockListPurchaseOrders = vi.fn()
const mockCreatePurchaseOrder = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/finance/canonical', () => ({
  resolveFinanceDownstreamScope: (...args: unknown[]) => mockResolveFinanceDownstreamScope(...args)
}))

vi.mock('@/lib/finance/shared', () => ({
  FinanceValidationError: class FinanceValidationError extends Error {
    statusCode: number

    constructor(message: string, statusCode = 422) {
      super(message)
      this.statusCode = statusCode
    }
  }
}))

vi.mock('@/lib/finance/purchase-order-store', () => ({
  listPurchaseOrders: (...args: unknown[]) => mockListPurchaseOrders(...args),
  createPurchaseOrder: (...args: unknown[]) => mockCreatePurchaseOrder(...args)
}))

import { GET, POST } from '@/app/api/finance/purchase-orders/route'

describe('purchase-orders route org-first contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['finance'], userId: 'user-1', spaceId: 'space-default' },
      errorResponse: null
    })

    mockResolveFinanceDownstreamScope.mockResolvedValue({
      clientId: 'client-1',
      clientProfileId: 'profile-1',
      hubspotCompanyId: 'hubspot-1',
      clientName: 'Sky Airline',
      legalName: 'Sky Airline SA',
      organizationId: 'org-1',
      spaceId: 'space-1'
    })

    mockListPurchaseOrders.mockResolvedValue([])
    mockCreatePurchaseOrder.mockResolvedValue({
      poId: 'PO-1',
      poNumber: 'PO-001',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1'
    })
  })

  it('filters purchase orders by organization scope instead of requiring clientId', async () => {
    const response = await GET(
      new Request('http://localhost/api/finance/purchase-orders?organizationId=org-1&status=active')
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockResolveFinanceDownstreamScope).toHaveBeenCalledWith({
      clientId: undefined,
      organizationId: 'org-1',
      clientProfileId: undefined,
      hubspotCompanyId: undefined,
      requestedSpaceId: undefined
    })
    expect(mockListPurchaseOrders).toHaveBeenCalledWith({
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      status: 'active'
    })
    expect(body).toEqual({ items: [], total: 0 })
  })

  it('creates a purchase order from organization-first input without a raw clientId', async () => {
    const response = await POST(
      new Request('http://localhost/api/finance/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poNumber: 'PO-001',
          organizationId: 'org-1',
          clientProfileId: 'profile-1',
          authorizedAmount: 1200,
          issueDate: '2026-04-01',
          currency: 'CLP'
        })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(201)
    expect(mockResolveFinanceDownstreamScope).toHaveBeenCalledWith({
      clientId: undefined,
      organizationId: 'org-1',
      clientProfileId: 'profile-1',
      hubspotCompanyId: undefined,
      requestedSpaceId: 'space-default',
      requireLegacyClientBridge: true
    })
    expect(mockCreatePurchaseOrder).toHaveBeenCalledWith({
      poNumber: 'PO-001',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      authorizedAmount: 1200,
      currency: 'CLP',
      exchangeRateToClp: undefined,
      issueDate: '2026-04-01',
      expiryDate: undefined,
      description: undefined,
      serviceScope: undefined,
      contactName: undefined,
      contactEmail: undefined,
      attachmentAssetId: undefined,
      notes: undefined,
      attachmentUrl: undefined,
      createdBy: 'user-1'
    })
    expect(body).toMatchObject({
      poId: 'PO-1',
      poNumber: 'PO-001'
    })
  })
})
