import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockAssertFinanceBigQueryReadiness = vi.fn()
const mockAssertPayrollBigQueryReadiness = vi.fn()
const mockRunFinanceQuery = vi.fn()
const mockListFinanceSuppliersFromPostgres = vi.fn()
const mockListFinanceAccountsFromPostgres = vi.fn()
const mockListFinanceExpenseSocialSecurityInstitutionsFromPostgres = vi.fn()
const mockListPayrollSocialSecurityInstitutionsFromPostgres = vi.fn()
const mockShouldFallbackFromFinancePostgres = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => mockRequireFinanceTenantContext()
}))

vi.mock('@/lib/finance/schema', () => ({
  assertFinanceBigQueryReadiness: (...args: unknown[]) => mockAssertFinanceBigQueryReadiness(...args)
}))

vi.mock('@/lib/payroll/schema', () => ({
  assertPayrollBigQueryReadiness: (...args: unknown[]) => mockAssertPayrollBigQueryReadiness(...args)
}))

vi.mock('@/lib/payroll/postgres-store', () => ({
  listPayrollSocialSecurityInstitutionsFromPostgres: (...args: unknown[]) =>
    mockListPayrollSocialSecurityInstitutionsFromPostgres(...args)
}))

vi.mock('@/lib/finance/shared', async () => {
  const actual = await vi.importActual('@/lib/finance/shared')

  return {
    ...actual,
    runFinanceQuery: (...args: unknown[]) => mockRunFinanceQuery(...args),
    getFinanceProjectId: () => 'test-project'
  }
})

vi.mock('@/lib/finance/postgres-store', () => ({
  listFinanceSuppliersFromPostgres: (...args: unknown[]) => mockListFinanceSuppliersFromPostgres(...args),
  listFinanceAccountsFromPostgres: (...args: unknown[]) => mockListFinanceAccountsFromPostgres(...args),
  shouldFallbackFromFinancePostgres: (...args: unknown[]) => mockShouldFallbackFromFinancePostgres(...args)
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  listFinanceExpenseSocialSecurityInstitutionsFromPostgres: (...args: unknown[]) =>
    mockListFinanceExpenseSocialSecurityInstitutionsFromPostgres(...args)
}))

import { GET } from './route'

describe('GET /api/finance/expenses/meta', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })

    mockAssertFinanceBigQueryReadiness.mockResolvedValue(undefined)
    mockAssertPayrollBigQueryReadiness.mockResolvedValue(undefined)
    mockShouldFallbackFromFinancePostgres.mockReturnValue(true)
    mockListFinanceSuppliersFromPostgres.mockResolvedValue({
      items: [
        {
          supplierId: 'beeconta',
          legalName: 'BEECONTA SPA',
          tradeName: 'Beeconta',
          paymentCurrency: 'CLP'
        },
        {
          supplierId: 'santander-chile',
          legalName: 'BANCO SANTANDER CHILE',
          tradeName: 'Santander - Chile',
          paymentCurrency: 'CLP'
        }
      ]
    })
    mockListFinanceAccountsFromPostgres.mockResolvedValue([
      {
        accountId: 'acc-1',
        accountName: 'Banco Chile',
        currency: 'CLP',
        accountType: 'bank'
      }
    ])
    mockListFinanceExpenseSocialSecurityInstitutionsFromPostgres.mockResolvedValue(['Fonasa'])
    mockListPayrollSocialSecurityInstitutionsFromPostgres.mockResolvedValue(['AFP Habitat'])
    mockRunFinanceQuery.mockImplementation(async (query: string) => {
      if (query.includes('FROM `test-project.greenhouse.fin_suppliers`')) {
        return [
          {
            supplier_id: 'legacy-only',
            legal_name: 'Legacy Supplier',
            trade_name: null,
            payment_currency: 'USD'
          }
        ]
      }

      if (query.includes('FROM `test-project.greenhouse.fin_expenses`')) {
        return [{ institution: 'Fonasa' }]
      }

      if (query.includes('FROM `test-project.greenhouse.compensation_versions`')) {
        return [{ institution: 'AFP Habitat' }]
      }

      return []
    })
  })

  it('returns active suppliers from Postgres-first instead of the legacy BigQuery supplier table', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(mockListFinanceSuppliersFromPostgres).toHaveBeenCalledWith({
      active: true,
      page: 1,
      pageSize: 1000
    })

    const body = await response.json()

    expect(body.suppliers).toEqual([
      {
        supplierId: 'beeconta',
        legalName: 'BEECONTA SPA',
        tradeName: 'Beeconta',
        paymentCurrency: 'CLP'
      },
      {
        supplierId: 'santander-chile',
        legalName: 'BANCO SANTANDER CHILE',
        tradeName: 'Santander - Chile',
        paymentCurrency: 'CLP'
      }
    ])

    expect(
      mockRunFinanceQuery.mock.calls.some(([query]) =>
        typeof query === 'string' && query.includes('FROM `test-project.greenhouse.fin_suppliers`')
      )
    ).toBe(false)
    expect(mockAssertFinanceBigQueryReadiness).not.toHaveBeenCalled()
  })

  it('degrades payroll institution enrichment without failing the full payload when payroll readiness is missing', async () => {
    mockListPayrollSocialSecurityInstitutionsFromPostgres.mockRejectedValueOnce(new Error('payroll postgres unavailable'))
    mockAssertPayrollBigQueryReadiness.mockRejectedValueOnce(new Error('payroll not ready'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.socialSecurityInstitutions).toContain('Fonasa')
    expect(
      mockRunFinanceQuery.mock.calls.some(([query]) =>
        typeof query === 'string' && query.includes('FROM `test-project.greenhouse.compensation_versions`')
      )
    ).toBe(false)
  })

  it('degrades finance historical institutions without failing the full payload when both Postgres and BigQuery legacy are unavailable', async () => {
    mockListFinanceExpenseSocialSecurityInstitutionsFromPostgres.mockRejectedValueOnce(new Error('finance postgres unavailable'))
    mockAssertFinanceBigQueryReadiness.mockRejectedValueOnce(new Error('finance bq not ready'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.socialSecurityInstitutions).toContain('AFP Habitat')
    expect(body.socialSecurityInstitutions).toContain('Fonasa')
    expect(body.suppliers).toHaveLength(2)
    expect(body.accounts).toHaveLength(1)
  })

  it('falls back to BigQuery per slice when suppliers Postgres is unavailable', async () => {
    mockListFinanceSuppliersFromPostgres.mockRejectedValueOnce(new Error('finance postgres schema is not ready'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockAssertFinanceBigQueryReadiness).toHaveBeenCalledWith({ tables: ['fin_suppliers'] })
    expect(body.suppliers).toEqual([
      {
        supplierId: 'legacy-only',
        legalName: 'Legacy Supplier',
        tradeName: null,
        paymentCurrency: 'USD'
      }
    ])
  })
})
