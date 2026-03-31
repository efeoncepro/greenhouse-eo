import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockEnsureFinanceInfrastructure = vi.fn()
const mockEnsurePayrollInfrastructure = vi.fn()
const mockRunFinanceQuery = vi.fn()
const mockListFinanceSuppliersFromPostgres = vi.fn()
const mockListFinanceAccountsFromPostgres = vi.fn()
const mockShouldFallbackFromFinancePostgres = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => mockRequireFinanceTenantContext()
}))

vi.mock('@/lib/finance/schema', () => ({
  ensureFinanceInfrastructure: () => mockEnsureFinanceInfrastructure()
}))

vi.mock('@/lib/payroll/schema', () => ({
  ensurePayrollInfrastructure: () => mockEnsurePayrollInfrastructure()
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

import { GET } from './route'

describe('GET /api/finance/expenses/meta', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })

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
  })
})
