import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockListFinanceSuppliersFromPostgres = vi.fn()
const mockShouldFallbackFromFinancePostgres = vi.fn()
const mockAssertFinanceBigQueryReadiness = vi.fn()
const mockRunFinanceQuery = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => mockRequireFinanceTenantContext()
}))

vi.mock('@/lib/finance/schema', () => ({
  assertFinanceBigQueryReadiness: (...args: unknown[]) => mockAssertFinanceBigQueryReadiness(...args),
  ensureFinanceInfrastructure: vi.fn()
}))

vi.mock('@/lib/finance/postgres-store', () => ({
  listFinanceSuppliersFromPostgres: (...args: unknown[]) => mockListFinanceSuppliersFromPostgres(...args),
  seedFinanceSupplierInPostgres: vi.fn(),
  shouldFallbackFromFinancePostgres: (...args: unknown[]) => mockShouldFallbackFromFinancePostgres(...args)
}))

vi.mock('@/lib/finance/bigquery-write-flag', () => ({
  isFinanceBigQueryWriteEnabled: vi.fn(() => true)
}))

vi.mock('@/lib/account-360/organization-identity', () => ({
  ensureOrganizationForSupplier: vi.fn()
}))

vi.mock('@/lib/account-360/organization-store', () => ({
  ensureOrganizationContactMembership: vi.fn()
}))

vi.mock('@/lib/providers/canonical', () => ({
  syncProviderFromFinanceSupplier: vi.fn()
}))

vi.mock('@/lib/finance/shared', async () => {
  const actual = await vi.importActual('@/lib/finance/shared')

  return {
    ...actual,
    runFinanceQuery: (...args: unknown[]) => mockRunFinanceQuery(...args),
    getFinanceProjectId: () => 'test-project'
  }
})

import { GET } from './route'

describe('GET /api/finance/suppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })

    mockShouldFallbackFromFinancePostgres.mockReturnValue(false)
    mockAssertFinanceBigQueryReadiness.mockResolvedValue(undefined)
    mockRunFinanceQuery.mockResolvedValue([])
  })

  it('returns the Postgres-first supplier directory without invoking BigQuery readiness when Postgres succeeds', async () => {
    mockListFinanceSuppliersFromPostgres.mockResolvedValue({
      items: [
        {
          supplierId: 'supplier-1',
          providerId: 'anthropic',
          legalName: 'Anthropic PBC',
          tradeName: 'Anthropic',
          taxId: null,
          taxIdType: 'RUT',
          country: 'US',
          category: 'software',
          serviceType: 'ai',
          isInternational: true,
          primaryContactName: 'Contact',
          primaryContactEmail: 'contact@anthropic.com',
          primaryContactPhone: null,
          website: 'https://anthropic.com',
          bankName: null,
          bankAccountNumber: null,
          bankAccountType: null,
          bankRouting: null,
          paymentCurrency: 'USD',
          defaultPaymentTerms: 30,
          defaultPaymentMethod: 'transfer',
          requiresPo: false,
          isActive: true,
          notes: null,
          organizationContactsCount: 1,
          contactSummary: {
            name: 'Contact',
            email: 'contact@anthropic.com',
            role: 'billing',
            source: 'organization_membership'
          },
          createdBy: 'user-1',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-02T00:00:00.000Z'
        }
      ],
      total: 1,
      page: 1,
      pageSize: 50
    })

    const response = await GET(new Request('http://localhost/api/finance/suppliers?page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.total).toBe(1)
    expect(body.items[0]).toMatchObject({
      supplierId: 'supplier-1',
      providerId: 'anthropic',
      legalName: 'Anthropic PBC'
    })
    expect(mockAssertFinanceBigQueryReadiness).not.toHaveBeenCalled()
  })

  it('uses the read-only BigQuery readiness gate when Postgres falls back', async () => {
    mockListFinanceSuppliersFromPostgres.mockRejectedValueOnce(new Error('postgres unavailable'))
    mockShouldFallbackFromFinancePostgres.mockReturnValue(true)
    mockRunFinanceQuery
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          supplier_id: 'legacy-1',
          provider_id: null,
          legal_name: 'Legacy Supplier',
          trade_name: null,
          tax_id: null,
          tax_id_type: null,
          country: 'CL',
          category: 'other',
          service_type: null,
          is_international: false,
          primary_contact_name: null,
          primary_contact_email: null,
          primary_contact_phone: null,
          website: null,
          bank_name: null,
          bank_account_number: null,
          bank_account_type: null,
          bank_routing: null,
          payment_currency: 'CLP',
          default_payment_terms: 30,
          default_payment_method: 'transfer',
          requires_po: false,
          is_active: true,
          notes: null,
          created_by: 'user-1',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z'
        }
      ])

    const response = await GET(new Request('http://localhost/api/finance/suppliers?page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockAssertFinanceBigQueryReadiness).toHaveBeenCalledWith({ tables: ['fin_suppliers'] })
    expect(body.items[0]).toMatchObject({
      supplierId: 'legacy-1',
      legalName: 'Legacy Supplier'
    })
  })
})
