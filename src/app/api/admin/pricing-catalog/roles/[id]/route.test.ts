import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockGetServerAuthSession = vi.fn()
const mockRequireFinanceTenantContext = vi.fn()
const mockCanAdministerPricingCatalog = vi.fn()
const mockRequireIfMatch = vi.fn()
const mockRecordPricingCatalogAudit = vi.fn()
const mockPublishSellableRoleUpdated = vi.fn()
const mockPublishSellableRoleDeactivated = vi.fn()
const mockPublishSellableRoleReactivated = vi.fn()

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
  requireIfMatch: (...args: unknown[]) => mockRequireIfMatch(...args),
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
  publishSellableRoleUpdated: (...args: unknown[]) => mockPublishSellableRoleUpdated(...args),
  publishSellableRoleDeactivated: (...args: unknown[]) => mockPublishSellableRoleDeactivated(...args),
  publishSellableRoleReactivated: (...args: unknown[]) => mockPublishSellableRoleReactivated(...args)
}))

import { DELETE, PATCH } from './route'

const buildRoleRow = (overrides: Record<string, unknown> = {}) => ({
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
  notes: 'Before change',
  created_at: '2026-04-22T12:00:00.000Z',
  updated_at: '2026-04-22T12:00:00.000Z',
  ...overrides
})

describe('sellable role mutation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { userId: 'usr-1', clientName: 'Greenhouse', roleCodes: ['efeonce_admin'] },
      errorResponse: null
    })
    mockCanAdministerPricingCatalog.mockReturnValue(true)
    mockRequireIfMatch.mockReturnValue({
      ok: true,
      missingIfMatch: false
    })
    mockGetServerAuthSession.mockResolvedValue({
      user: { name: 'Agent GH', email: 'agent@greenhouse.efeonce.org' }
    })
    mockRecordPricingCatalogAudit.mockResolvedValue({ auditId: 'audit-1' })
    mockPublishSellableRoleUpdated.mockResolvedValue('outbox-updated')
    mockPublishSellableRoleDeactivated.mockResolvedValue('outbox-deactivated')
    mockPublishSellableRoleReactivated.mockResolvedValue('outbox-reactivated')
  })

  it('publishes sellable_role.updated for metadata edits', async () => {
    mockQuery
      .mockResolvedValueOnce([buildRoleRow()])
      .mockResolvedValueOnce([
        buildRoleRow({
          notes: 'After change',
          updated_at: '2026-04-22T12:30:00.000Z'
        })
      ])

    const response = await PATCH(
      new Request('http://localhost/api/admin/pricing-catalog/roles/role-1', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'After change' })
      }),
      { params: Promise.resolve({ id: 'role-1' }) }
    )

    expect(response.status).toBe(200)
    expect(mockPublishSellableRoleUpdated).toHaveBeenCalledWith({
      roleId: 'role-1',
      roleSku: 'ECG-033',
      roleCode: 'executive_creator',
      roleLabelEs: 'Executive Creator',
      category: 'creativo',
      tier: '2',
      active: true
    })
    expect(mockPublishSellableRoleDeactivated).not.toHaveBeenCalled()
  })

  it('publishes sellable_role.deactivated when PATCH toggles active=false', async () => {
    mockQuery
      .mockResolvedValueOnce([buildRoleRow()])
      .mockResolvedValueOnce([
        buildRoleRow({
          active: false,
          updated_at: '2026-04-22T12:45:00.000Z'
        })
      ])

    const response = await PATCH(
      new Request('http://localhost/api/admin/pricing-catalog/roles/role-1', {
        method: 'PATCH',
        body: JSON.stringify({ active: false })
      }),
      { params: Promise.resolve({ id: 'role-1' }) }
    )

    expect(response.status).toBe(200)
    expect(mockPublishSellableRoleDeactivated).toHaveBeenCalledWith({
      roleId: 'role-1',
      roleSku: 'ECG-033',
      deactivatedAt: '2026-04-22T12:45:00.000Z'
    })
    expect(mockPublishSellableRoleUpdated).not.toHaveBeenCalled()
  })

  it('publishes sellable_role.deactivated when DELETE archives the role', async () => {
    mockQuery
      .mockResolvedValueOnce([buildRoleRow()])
      .mockResolvedValueOnce([
        buildRoleRow({
          active: false,
          updated_at: '2026-04-22T12:55:00.000Z'
        })
      ])

    const response = await DELETE(
      new Request('http://localhost/api/admin/pricing-catalog/roles/role-1', {
        method: 'DELETE'
      }),
      { params: Promise.resolve({ id: 'role-1' }) }
    )

    expect(response.status).toBe(204)
    expect(mockPublishSellableRoleDeactivated).toHaveBeenCalledWith({
      roleId: 'role-1',
      roleSku: 'ECG-033',
      deactivatedAt: '2026-04-22T12:55:00.000Z'
    })
  })
})
