import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockResolveFinanceClientContext = vi.fn()
const mockResolveFinanceDownstreamScope = vi.fn()
const mockResolveFinanceMemberContext = vi.fn()
const mockCreateFinanceIncomeInPostgres = vi.fn()
const mockUpdateFinanceIncomeInPostgres = vi.fn()
const mockCreateFinanceExpenseInPostgres = vi.fn()
const mockBuildMonthlySequenceIdFromPostgres = vi.fn()
const mockResolveExchangeRateToClp = vi.fn()
const mockShouldFallbackFromFinancePostgres = vi.fn()
const mockListFinanceIncomeFromPostgres = vi.fn()
const mockListFinanceExpensesFromPostgres = vi.fn()

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
  updateFinanceIncomeInPostgres: (...args: unknown[]) => mockUpdateFinanceIncomeInPostgres(...args),
  createFinanceExpenseInPostgres: (...args: unknown[]) => mockCreateFinanceExpenseInPostgres(...args),
  buildMonthlySequenceIdFromPostgres: (...args: unknown[]) => mockBuildMonthlySequenceIdFromPostgres(...args),
  listFinanceIncomeFromPostgres: (...args: unknown[]) => mockListFinanceIncomeFromPostgres(...args),
  getFinanceIncomeFromPostgres: vi.fn(),
  listFinanceExpensesFromPostgres: (...args: unknown[]) => mockListFinanceExpensesFromPostgres(...args),
  getFinanceExpenseFromPostgres: vi.fn(),
  updateFinanceExpenseInPostgres: vi.fn()
}))

vi.mock('@/lib/finance/schema', () => ({
  ensureFinanceInfrastructure: vi.fn()
}))

vi.mock('@/lib/finance/bigquery-write-flag', () => ({
  isFinanceBigQueryWriteEnabled: vi.fn(() => true)
}))

vi.mock('@/lib/finance/shared', async () => {
  const actual = await vi.importActual('@/lib/finance/shared')

  return {
    ...actual,
    runFinanceQuery: vi.fn(),
    getFinanceProjectId: vi.fn(() => 'test-project'),
    buildMonthlySequenceId: vi.fn(),
    resolveExchangeRateToClp: (...args: unknown[]) => mockResolveExchangeRateToClp(...args)
  }
})

import { GET as getIncome, POST as postIncome } from '@/app/api/finance/income/route'
import { PUT as putIncome } from '@/app/api/finance/income/[id]/route'
import { GET as getExpenses, POST as postExpense } from '@/app/api/finance/expenses/route'
import { FinanceValidationError } from '@/lib/finance/shared'

describe('Finance identity drift payload propagation', () => {
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
      memberId: 'member-1',
      memberName: 'Jane Doe',
      payrollEntryId: 'entry-1',
      payrollPeriodId: 'period-1'
    })

    mockBuildMonthlySequenceIdFromPostgres.mockResolvedValue('SEQ-1')
    mockResolveExchangeRateToClp.mockResolvedValue(950)
    mockShouldFallbackFromFinancePostgres.mockReturnValue(false)
    mockCreateFinanceIncomeInPostgres.mockResolvedValue(undefined)
    mockUpdateFinanceIncomeInPostgres.mockResolvedValue({ incomeId: 'inc-1' })
    mockCreateFinanceExpenseInPostgres.mockResolvedValue(undefined)
    mockListFinanceIncomeFromPostgres.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 })
    mockListFinanceExpensesFromPostgres.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 })
  })

  it('normalizes income read filters through the canonical client context', async () => {
    const response = await getIncome(
      new Request('http://localhost/api/finance/income?clientProfileId=legacy-profile')
    )

    expect(response.status).toBe(200)
    expect(mockResolveFinanceClientContext).toHaveBeenCalledWith({
      clientId: null,
      clientProfileId: 'legacy-profile',
      hubspotCompanyId: null
    })
    expect(mockListFinanceIncomeFromPostgres).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        clientProfileId: 'profile-1',
        hubspotCompanyId: 'hub-1'
      })
    )
  })

  it('normalizes expense read filters through the canonical client context', async () => {
    const response = await getExpenses(
      new Request('http://localhost/api/finance/expenses?hubspotCompanyId=hub-1')
    )

    expect(response.status).toBe(200)
    expect(mockResolveFinanceDownstreamScope).toHaveBeenCalledWith({
      clientId: null,
      organizationId: null,
      clientProfileId: null,
      hubspotCompanyId: 'hub-1',
      requestedSpaceId: null
    })
    expect(mockListFinanceExpensesFromPostgres).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1'
      })
    )
  })

  it('preserves the legacy clientProfileId-as-HubSpot alias for income reads during transition', async () => {
    mockResolveFinanceClientContext
      .mockRejectedValueOnce(new FinanceValidationError('clientProfileId does not exist in the finance client context.', 409))
      .mockResolvedValueOnce({
        clientId: 'client-1',
        clientProfileId: 'profile-1',
        hubspotCompanyId: 'hub-1',
        clientName: 'Sky Airline',
        legalName: 'Sky Airline SA',
        organizationId: 'org-1'
      })

    const response = await getIncome(
      new Request('http://localhost/api/finance/income?clientProfileId=hub-1')
    )

    expect(response.status).toBe(200)
    expect(mockResolveFinanceClientContext).toHaveBeenNthCalledWith(1, {
      clientId: null,
      clientProfileId: 'hub-1',
      hubspotCompanyId: null
    })
    expect(mockResolveFinanceClientContext).toHaveBeenNthCalledWith(2, {
      hubspotCompanyId: 'hub-1'
    })
    expect(mockListFinanceIncomeFromPostgres).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        clientProfileId: 'profile-1',
        hubspotCompanyId: 'hub-1'
      })
    )
  })

  it('propagates the canonical client context into income creation payloads', async () => {
    const response = await postIncome(
      new Request('http://localhost/api/finance/income', {
        method: 'POST',
        body: JSON.stringify({
          invoiceDate: '2026-03-30',
          currency: 'USD',
          subtotal: 1000
        })
      })
    )

    expect(response.status).toBe(201)
    expect(mockCreateFinanceIncomeInPostgres).toHaveBeenCalledWith(
      expect.objectContaining({
        incomeId: 'SEQ-1',
        clientId: 'client-1',
        organizationId: 'org-1',
        clientProfileId: 'profile-1',
        hubspotCompanyId: 'hub-1',
        clientName: 'Sky Airline',
        actorUserId: 'user-1'
      })
    )
  })

  it('propagates the canonical client context into income update payloads', async () => {
    const response = await putIncome(
      new Request('http://localhost/api/finance/income/inc-1', {
        method: 'PUT',
        body: JSON.stringify({
          clientId: 'client-1'
        })
      }),
      { params: Promise.resolve({ id: 'inc-1' }) }
    )

    expect(response.status).toBe(200)
    expect(mockUpdateFinanceIncomeInPostgres).toHaveBeenCalledWith(
      'inc-1',
      expect.objectContaining({
        clientId: 'client-1',
        clientProfileId: 'profile-1',
        hubspotCompanyId: 'hub-1',
        organizationId: 'org-1',
        clientName: 'Sky Airline'
      })
    )
  })

  it('propagates the resolved client/member anchors into expense creation payloads', async () => {
    const response = await postExpense(
      new Request('http://localhost/api/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Servicio',
          currency: 'USD',
          subtotal: 1000,
          paymentDate: '2026-03-30',
          clientId: 'client-1',
          memberId: 'member-1'
        })
      })
    )

    expect(response.status).toBe(201)
    expect(mockCreateFinanceExpenseInPostgres).toHaveBeenCalledWith(
      expect.objectContaining({
        expenseId: 'SEQ-1',
        clientId: 'client-1',
        memberId: 'member-1',
        memberName: 'Jane Doe',
        payrollEntryId: 'entry-1',
        payrollPeriodId: 'period-1',
        actorUserId: 'user-1'
      })
    )
  })

  it.skip('propagates full canonical client context into expense update payloads', () => {
    // Current runtime only forwards clientId in expense updates.
    // The next hardening cut should also preserve clientProfileId,
    // hubspotCompanyId and organizationId after resolveFinanceClientContext.
  })
})
