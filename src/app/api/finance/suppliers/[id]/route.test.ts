import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockGetFinanceSupplierFromPostgres = vi.fn()
const mockListFinanceExpensesFromPostgres = vi.fn()
const mockGetLatestProviderToolingSnapshot = vi.fn()
const mockEnsureFinanceInfrastructure = vi.fn()
const mockRunFinanceQuery = vi.fn()
const mockGetFinanceProjectId = vi.fn()
const mockSyncProviderFromFinanceSupplier = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => mockRequireFinanceTenantContext()
}))

vi.mock('@/lib/providers/canonical', () => ({
  syncProviderFromFinanceSupplier: (...args: unknown[]) => mockSyncProviderFromFinanceSupplier(...args)
}))

vi.mock('@/lib/providers/provider-tooling-snapshots', () => ({
  getLatestProviderToolingSnapshot: (...args: unknown[]) => mockGetLatestProviderToolingSnapshot(...args)
}))

vi.mock('@/lib/finance/schema', () => ({
  ensureFinanceInfrastructure: () => mockEnsureFinanceInfrastructure()
}))

vi.mock('@/lib/finance/postgres-store', () => ({
  getFinanceSupplierFromPostgres: (...args: unknown[]) => mockGetFinanceSupplierFromPostgres(...args),
  seedFinanceSupplierInPostgres: vi.fn(),
  shouldFallbackFromFinancePostgres: vi.fn()
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  listFinanceExpensesFromPostgres: (...args: unknown[]) => mockListFinanceExpensesFromPostgres(...args)
}))

vi.mock('@/lib/finance/bigquery-write-flag', () => ({
  isFinanceBigQueryWriteEnabled: vi.fn()
}))

vi.mock('@/lib/finance/shared', () => ({
  runFinanceQuery: (...args: unknown[]) => mockRunFinanceQuery(...args),
  getFinanceProjectId: () => mockGetFinanceProjectId(),
  assertNonEmptyString: (value: unknown) => String(value),
  assertValidCurrency: (value: unknown) => String(value),
  normalizeString: (value: unknown) => String(value ?? '').trim(),
  normalizeBoolean: (value: unknown) => Boolean(value),
  toNumber: (value: unknown) => Number(value),
  toTimestampString: (value: unknown) => (typeof value === 'string' ? value : null),
  toDateString: (value: unknown) => (typeof value === 'string' ? value : null),
  FinanceValidationError: class FinanceValidationError extends Error {},
  SUPPLIER_CATEGORIES: ['software', 'infrastructure', 'professional_services', 'media', 'creative', 'hr_services', 'office', 'legal_accounting', 'other'],
  PAYMENT_METHODS: ['transfer', 'check', 'cash', 'credit_card', 'other']
}))

import { GET } from './route'

describe('GET /api/finance/suppliers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })
    mockGetFinanceProjectId.mockReturnValue('greenhouse-test')
    mockGetFinanceSupplierFromPostgres.mockResolvedValue(null)
    mockListFinanceExpensesFromPostgres.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
    mockGetLatestProviderToolingSnapshot.mockResolvedValue(null)
    mockRunFinanceQuery.mockResolvedValue([])
    mockEnsureFinanceInfrastructure.mockResolvedValue(undefined)
    mockSyncProviderFromFinanceSupplier.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('includes providerTooling when the supplier is linked to a provider', async () => {
    mockGetFinanceSupplierFromPostgres.mockResolvedValue({
      supplierId: 'supplier-1',
      providerId: 'anthropic',
      legalName: 'Anthropic PBC',
      tradeName: 'Anthropic',
      taxId: '123',
      taxIdType: 'RUT',
      country: 'US',
      category: 'software',
      serviceType: 'AI',
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
      createdBy: 'user-1',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-02T10:00:00.000Z'
    })
    mockListFinanceExpensesFromPostgres.mockResolvedValue({
      items: [
        {
          expenseId: 'exp-1',
          totalAmount: 120000,
          currency: 'CLP',
          paymentDate: '2026-03-20',
          documentDate: null,
          dueDate: null,
          paymentMethod: 'transfer',
          documentNumber: 'F-1',
          description: 'Licencia Anthropic'
        }
      ],
      total: 1,
      page: 1,
      pageSize: 20
    })
    mockGetLatestProviderToolingSnapshot.mockResolvedValue({
      providerId: 'anthropic',
      providerName: 'Anthropic',
      providerType: 'ai_vendor',
      supplierCategory: 'software',
      paymentCurrency: 'USD',
      periodId: '2026-03',
      toolCount: 2,
      activeToolCount: 2,
      activeLicenseCount: 3,
      activeMemberCount: 2,
      walletCount: 1,
      activeWalletCount: 1,
      subscriptionCostTotalClp: 78400,
      usageCostTotalClp: 45000,
      financeExpenseCount: 2,
      financeExpenseTotalClp: 120000,
      payrollMemberCount: 2,
      licensedMemberPayrollCostClp: 3200000,
      totalProviderCostClp: 3368400,
      latestExpenseDate: '2026-03-20',
      latestLicenseChangeAt: '2026-03-18T10:00:00.000Z',
      snapshotStatus: 'complete',
      materializedAt: '2026-03-30T12:00:00.000Z'
    })

    const response = await GET(new Request('http://localhost/api/finance/suppliers/supplier-1'), {
      params: Promise.resolve({ id: 'supplier-1' })
    })

    expect(response.status).toBe(200)
    expect(mockGetLatestProviderToolingSnapshot).toHaveBeenCalledWith('anthropic')

    const body = await response.json()

    expect(body).toMatchObject({
      supplierId: 'supplier-1',
      providerId: 'anthropic',
      providerTooling: expect.objectContaining({
        providerId: 'anthropic',
        periodId: '2026-03',
        activeLicenseCount: 3,
        totalProviderCostClp: 3368400
      }),
      paymentHistory: [
        {
          expenseId: 'exp-1',
          amount: 120000,
          currency: 'CLP',
          paymentDate: '2026-03-20',
          paymentMethod: 'transfer',
          documentNumber: 'F-1',
          description: 'Licencia Anthropic'
        }
      ]
    })
  })

  it('omits providerTooling when the supplier is not linked to a provider', async () => {
    mockGetFinanceSupplierFromPostgres.mockResolvedValue({
      supplierId: 'supplier-2',
      providerId: null,
      legalName: 'Local Studio',
      tradeName: null,
      taxId: null,
      taxIdType: 'RUT',
      country: 'CL',
      category: 'creative',
      serviceType: null,
      isInternational: false,
      primaryContactName: null,
      primaryContactEmail: null,
      primaryContactPhone: null,
      website: null,
      bankName: null,
      bankAccountNumber: null,
      bankAccountType: null,
      bankRouting: null,
      paymentCurrency: 'CLP',
      defaultPaymentTerms: 30,
      defaultPaymentMethod: 'transfer',
      requiresPo: false,
      isActive: true,
      notes: null,
      createdBy: 'user-1',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-02T10:00:00.000Z'
    })

    const response = await GET(new Request('http://localhost/api/finance/suppliers/supplier-2'), {
      params: Promise.resolve({ id: 'supplier-2' })
    })

    expect(response.status).toBe(200)
    expect(mockGetLatestProviderToolingSnapshot).not.toHaveBeenCalled()

    const body = await response.json()

    expect(body.providerTooling).toBeNull()
  })
})
