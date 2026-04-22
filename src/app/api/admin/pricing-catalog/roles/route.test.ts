import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListSellableRoles = vi.fn()
const mockQuery = vi.fn()
const mockGetServerAuthSession = vi.fn()
const mockRequireFinanceTenantContext = vi.fn()
const mockCanAdministerPricingCatalog = vi.fn()
const mockRecordPricingCatalogAudit = vi.fn()
const mockPublishSellableRoleCreated = vi.fn()

vi.mock('@/lib/commercial/sellable-roles-store', () => ({
  listSellableRoles: (...args: unknown[]) => mockListSellableRoles(...args)
}))

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/auth', () => ({
  getServerAuthSession: (...args: unknown[]) => mockGetServerAuthSession(...args)
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args),
  canAdministerPricingCatalog: (...args: unknown[]) => mockCanAdministerPricingCatalog(...args)
}))

vi.mock('@/lib/tenant/optimistic-locking', () => ({
  withOptimisticLockHeaders: (response: Response) => response
}))

vi.mock('@/lib/commercial/pricing-catalog-constraints', () => ({
  validateSellableRole: () => [],
  getBlockingConstraintIssues: () => []
}))

vi.mock('@/lib/commercial/pricing-catalog-audit-store', () => ({
  recordPricingCatalogAudit: (...args: unknown[]) => mockRecordPricingCatalogAudit(...args)
}))

vi.mock('@/lib/commercial/sellable-role-events', () => ({
  publishSellableRoleCreated: (...args: unknown[]) => mockPublishSellableRoleCreated(...args)
}))

import { POST } from './route'

describe('POST /api/admin/pricing-catalog/roles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { userId: 'usr-1', clientName: 'Greenhouse', roleCodes: ['efeonce_admin'] },
      errorResponse: null
    })
    mockCanAdministerPricingCatalog.mockReturnValue(true)
    mockGetServerAuthSession.mockResolvedValue({
      user: { name: 'Agent GH', email: 'agent@greenhouse.efeonce.org' }
    })
    mockRecordPricingCatalogAudit.mockResolvedValue({ auditId: 'audit-1' })
    mockPublishSellableRoleCreated.mockResolvedValue('outbox-1')
    mockQuery.mockResolvedValue([
      {
        role_id: 'role-1',
        role_sku: 'ECG-033',
        role_code: 'executive_creator',
        role_label_es: 'Executive Creator',
        role_label_en: 'Executive Creator',
        category: 'creativo',
        tier: '2',
        tier_label: 'Senior',
        can_sell_as_staff: true,
        can_sell_as_service_component: true,
        active: true,
        notes: 'First sync candidate',
        created_at: '2026-04-22T12:00:00.000Z',
        updated_at: '2026-04-22T12:00:00.000Z'
      }
    ])
  })

  it('publishes sellable_role.created after creating a role', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/pricing-catalog/roles', {
        method: 'POST',
        body: JSON.stringify({
          roleLabelEs: 'Executive Creator',
          roleLabelEn: 'Executive Creator',
          category: 'creativo',
          tier: '2',
          tierLabel: 'Senior',
          canSellAsStaff: true,
          canSellAsServiceComponent: true,
          notes: 'First sync candidate'
        })
      })
    )

    expect(response.status).toBe(201)
    expect(mockRecordPricingCatalogAudit).toHaveBeenCalledTimes(1)
    expect(mockPublishSellableRoleCreated).toHaveBeenCalledWith({
      roleId: 'role-1',
      roleSku: 'ECG-033',
      roleCode: 'executive_creator',
      roleLabelEs: 'Executive Creator',
      category: 'creativo',
      tier: '2'
    })
  })
})
