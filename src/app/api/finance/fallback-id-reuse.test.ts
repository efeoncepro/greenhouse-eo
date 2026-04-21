import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockResolveFinanceClientContext = vi.fn()
const mockResolveFinanceDownstreamScope = vi.fn()
const mockResolveFinanceMemberContext = vi.fn()
const mockCreateFinanceIncomeInPostgres = vi.fn()
const mockCreateFinanceExpenseInPostgres = vi.fn()
const mockBuildMonthlySequenceIdFromPostgres = vi.fn()
const mockResolveExchangeRateToClp = vi.fn()
const mockShouldFallbackFromFinancePostgres = vi.fn()
const mockEnsureFinanceInfrastructure = vi.fn()
const mockRunFinanceQuery = vi.fn()
const mockBuildMonthlySequenceId = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/finance/canonical', () => ({
  resolveFinanceClientContext: (...args: unknown[]) => mockResolveFinanceClientContext(...args),
  resolveFinanceDownstreamScope: (...args: unknown[]) => mockResolveFinanceDownstreamScope(...args),
  resolveFinanceMemberContext: (...args: unknown[]) => mockResolveFinanceMemberContext(...args)
}))

vi.mock('@/lib/finance/postgres-store', () => ({
  shouldFallbackFromFinancePostgres: (...args: unknown[]) => mockShouldFallbackFromFinancePostgres(...args)
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  createFinanceIncomeInPostgres: (...args: unknown[]) => mockCreateFinanceIncomeInPostgres(...args),
  createFinanceExpenseInPostgres: (...args: unknown[]) => mockCreateFinanceExpenseInPostgres(...args),
  buildMonthlySequenceIdFromPostgres: (...args: unknown[]) => mockBuildMonthlySequenceIdFromPostgres(...args),
  listFinanceIncomeFromPostgres: vi.fn(),
  listFinanceExpensesFromPostgres: vi.fn()
}))

vi.mock('@/lib/finance/schema', () => ({
  ensureFinanceInfrastructure: (...args: unknown[]) => mockEnsureFinanceInfrastructure(...args)
}))

vi.mock('@/lib/finance/bigquery-write-flag', () => ({
  isFinanceBigQueryWriteEnabled: vi.fn(() => true)
}))

vi.mock('@/lib/finance/shared', async () => {
  const actual = await vi.importActual('@/lib/finance/shared')

  return {
    ...actual,
    runFinanceQuery: (...args: unknown[]) => mockRunFinanceQuery(...args),
    getFinanceProjectId: vi.fn(() => 'test-project'),
    buildMonthlySequenceId: (...args: unknown[]) => mockBuildMonthlySequenceId(...args),
    resolveExchangeRateToClp: (...args: unknown[]) => mockResolveExchangeRateToClp(...args)
  }
})

import { POST as postIncome } from '@/app/api/finance/income/route'
import { POST as postExpense } from '@/app/api/finance/expenses/route'

describe('Finance fallback ID reuse', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['finance'], userId: 'user-1' },
      errorResponse: null
    })

    mockResolveFinanceClientContext.mockResolvedValue({
      clientId: 'client-1',
      clientProfileId: 'profile-1',
      hubspotCompanyId: 'hub-1',
      clientName: 'Sky Airline',
      legalName: 'Sky Airline SA',
      organizationId: 'org-1'
    })

    mockResolveFinanceDownstreamScope.mockResolvedValue({
      clientId: 'client-1',
      clientProfileId: 'profile-1',
      hubspotCompanyId: 'hub-1',
      clientName: 'Sky Airline',
      legalName: 'Sky Airline SA',
      organizationId: 'org-1',
      spaceId: 'space-1'
    })

    mockResolveFinanceMemberContext.mockResolvedValue({
      memberId: null,
      memberName: null,
      payrollEntryId: null,
      payrollPeriodId: null
    })

    mockResolveExchangeRateToClp.mockResolvedValue(950)
    mockShouldFallbackFromFinancePostgres.mockReturnValue(true)
    mockEnsureFinanceInfrastructure.mockResolvedValue(undefined)
    mockRunFinanceQuery.mockResolvedValue([])
    mockBuildMonthlySequenceId.mockResolvedValue('SHOULD-NOT-BE-USED')
  })

  it('reuses the Postgres-generated income id in the BigQuery fallback path', async () => {
    mockBuildMonthlySequenceIdFromPostgres.mockResolvedValue('INC-202603-001')
    mockCreateFinanceIncomeInPostgres.mockRejectedValue(new Error('connection timeout after insert'))

    const response = await postIncome(
      new Request('http://localhost/api/finance/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-03-30',
          currency: 'USD',
          subtotal: 1000,
          taxCode: 'cl_vat_non_billable'
        })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toMatchObject({ incomeId: 'INC-202603-001', created: true })
    expect(mockBuildMonthlySequenceId).not.toHaveBeenCalled()
    expect(mockRunFinanceQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `test-project.greenhouse.fin_income`'),
      expect.objectContaining({ incomeId: 'INC-202603-001' })
    )
  })

  it('reuses the Postgres-generated expense id in the BigQuery fallback path', async () => {
    mockBuildMonthlySequenceIdFromPostgres.mockResolvedValue('EXP-202603-001')
    mockCreateFinanceExpenseInPostgres.mockRejectedValue(new Error('connection timeout after insert'))

    const response = await postExpense(
      new Request('http://localhost/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Servicio operativo',
          currency: 'USD',
          subtotal: 1000,
          paymentDate: '2026-03-30',
          clientId: 'client-1'
        })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toMatchObject({ expenseId: 'EXP-202603-001', created: true })
    expect(mockBuildMonthlySequenceId).not.toHaveBeenCalled()
    expect(mockRunFinanceQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `test-project.greenhouse.fin_expenses`'),
      expect.objectContaining({ expenseId: 'EXP-202603-001' })
    )
  })
})
