import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockCreateFinanceAccountInPostgres = vi.fn()
const mockUpsertFinanceExchangeRateInPostgres = vi.fn()
const mockSeedFinanceSupplierInPostgres = vi.fn()
const mockGetFinanceSupplierFromPostgres = vi.fn()
const mockCreateFinanceExpenseInPostgres = vi.fn()
const mockShouldFallbackFromFinancePostgres = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/finance/postgres-store', () => ({
  createFinanceAccountInPostgres: (...args: unknown[]) => mockCreateFinanceAccountInPostgres(...args),
  upsertFinanceExchangeRateInPostgres: (...args: unknown[]) => mockUpsertFinanceExchangeRateInPostgres(...args),
  seedFinanceSupplierInPostgres: (...args: unknown[]) => mockSeedFinanceSupplierInPostgres(...args),
  getFinanceSupplierFromPostgres: (...args: unknown[]) => mockGetFinanceSupplierFromPostgres(...args),
  shouldFallbackFromFinancePostgres: (...args: unknown[]) => mockShouldFallbackFromFinancePostgres(...args)
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  createFinanceExpenseInPostgres: (...args: unknown[]) => mockCreateFinanceExpenseInPostgres(...args),
  listFinanceExpensesFromPostgres: vi.fn().mockResolvedValue({ items: [] })
}))

vi.mock('@/lib/providers/canonical', () => ({
  syncProviderFromFinanceSupplier: vi.fn().mockResolvedValue({ providerId: 'provider-test' })
}))

vi.mock('@/lib/finance/canonical', () => ({
  resolveFinanceClientContext: vi.fn().mockResolvedValue({ clientId: 'client-1' }),
  resolveFinanceMemberContext: vi.fn().mockResolvedValue({
    memberId: 'member-1',
    memberName: 'Jane Doe',
    payrollEntryId: 'entry-1',
    payrollPeriodId: 'period-1'
  })
}))

import { POST as postAccount } from '@/app/api/finance/accounts/route'
import { POST as postExchangeRate } from '@/app/api/finance/exchange-rates/route'
import { POST as postSupplier } from '@/app/api/finance/suppliers/route'
import { PUT as putSupplier } from '@/app/api/finance/suppliers/[id]/route'
import { POST as postBulkExpenses } from '@/app/api/finance/expenses/bulk/route'

describe('Finance BigQuery write cutover guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FINANCE_BIGQUERY_WRITE_ENABLED = 'false'

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['internal'], userId: 'user-1' },
      errorResponse: null
    })

    mockShouldFallbackFromFinancePostgres.mockReturnValue(true)
  })

  it('fails closed for account creation when Postgres fails and fallback is disabled', async () => {
    mockCreateFinanceAccountInPostgres.mockRejectedValue(new Error('pg down'))

    const response = await postAccount(
      new Request('http://localhost/api/finance/accounts', {
        method: 'POST',
        body: JSON.stringify({
          accountId: 'acc-1',
          accountName: 'Cuenta Banco',
          bankName: 'Banco',
          currency: 'CLP'
        })
      })
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      code: 'FINANCE_BQ_WRITE_DISABLED'
    })
  })

  it('fails closed for exchange rate upsert when Postgres fails and fallback is disabled', async () => {
    mockUpsertFinanceExchangeRateInPostgres.mockRejectedValue(new Error('pg down'))

    const response = await postExchangeRate(
      new Request('http://localhost/api/finance/exchange-rates', {
        method: 'POST',
        body: JSON.stringify({
          fromCurrency: 'USD',
          toCurrency: 'CLP',
          rateDate: '2026-03-30',
          rate: 950
        })
      })
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      code: 'FINANCE_BQ_WRITE_DISABLED'
    })
  })

  it('fails closed for supplier creation when Postgres fails and fallback is disabled', async () => {
    mockSeedFinanceSupplierInPostgres.mockRejectedValue(new Error('pg down'))

    const response = await postSupplier(
      new Request('http://localhost/api/finance/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          legalName: 'Proveedor Test',
          category: 'other',
          paymentCurrency: 'CLP'
        })
      })
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      code: 'FINANCE_BQ_WRITE_DISABLED'
    })
  })

  it('fails closed for supplier updates when Postgres fails and fallback is disabled', async () => {
    mockGetFinanceSupplierFromPostgres.mockResolvedValue({
      supplierId: 'supplier-1',
      providerId: 'provider-1',
      organizationId: null,
      legalName: 'Proveedor Test',
      tradeName: null,
      taxId: null,
      taxIdType: 'RUT',
      country: 'CL',
      category: 'services',
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
      createdAt: null,
      updatedAt: null
    })
    mockSeedFinanceSupplierInPostgres.mockRejectedValue(new Error('pg down'))

    const response = await putSupplier(
      new Request('http://localhost/api/finance/suppliers/supplier-1', {
        method: 'PUT',
        body: JSON.stringify({
          legalName: 'Proveedor Renombrado'
        })
      }),
      { params: Promise.resolve({ id: 'supplier-1' }) }
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      code: 'FINANCE_BQ_WRITE_DISABLED'
    })
  })

  it('fails closed for bulk expense creation when Postgres fails and fallback is disabled', async () => {
    mockCreateFinanceExpenseInPostgres.mockRejectedValue(new Error('pg down'))

    const response = await postBulkExpenses(
      new Request('http://localhost/api/finance/expenses/bulk', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              expenseId: 'exp-1',
              description: 'Servicio',
              currency: 'CLP',
              subtotal: 1000,
              paymentDate: '2026-03-30'
            }
          ]
        })
      })
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      code: 'FINANCE_BQ_WRITE_DISABLED'
    })
  })
})
