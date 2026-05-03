import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
const clientQueryMock = vi.fn()

const withTransactionMock = vi.fn(
  async (callback: (client: { query: typeof clientQueryMock }) => unknown) =>
    callback({ query: clientQueryMock })
)

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  withTransaction: (callback: (client: { query: typeof clientQueryMock }) => unknown) =>
    withTransactionMock(callback)
}))

import {
  listExpensesForDistributionPeriod,
  persistExpenseDistributionResolution,
  readSharedOperationalOverheadPool
} from './repository'
import type { ExpenseDistributionResolutionDraft } from './types'

const draft = (
  overrides: Partial<ExpenseDistributionResolutionDraft> = {}
): ExpenseDistributionResolutionDraft => ({
  expenseId: 'EXP-1',
  periodYear: 2026,
  periodMonth: 4,
  distributionLane: 'shared_operational_overhead',
  resolutionStatus: 'resolved',
  confidence: 'medium',
  source: 'deterministic_resolver',
  amountClp: 100_000,
  basisAmountClp: 100_000,
  economicCategory: 'vendor_cost_saas',
  legacyCostCategory: 'operational',
  memberId: null,
  clientId: null,
  supplierId: 'supplier-1',
  toolCatalogId: null,
  payrollEntryId: null,
  payrollPeriodId: null,
  paymentObligationId: null,
  evidence: { matched_rule: 'SAAS_SHARED_OPERATIONAL' },
  riskFlags: [],
  ...overrides
})

beforeEach(() => {
  queryMock.mockReset()
  clientQueryMock.mockReset()
  withTransactionMock.mockClear()
})

describe('listExpensesForDistributionPeriod', () => {
  it('maps expense rows into resolver inputs', async () => {
    queryMock.mockResolvedValueOnce([
      {
        expense_id: 'EXP-1',
        period_year: 2026,
        period_month: 4,
        payment_date: '2026-04-30',
        document_date: null,
        receipt_date: null,
        total_amount_clp: '120000',
        effective_cost_amount_clp: '100000',
        economic_category: 'vendor_cost_saas',
        cost_category: 'operational',
        cost_is_direct: false,
        expense_type: 'supplier',
        supplier_id: 'sup-1',
        supplier_name: 'Notion',
        description: 'Workspace',
        payment_provider: null,
        payment_rail: null,
        member_id: null,
        payroll_entry_id: null,
        payroll_period_id: null,
        client_id: null,
        allocated_client_id: null,
        tool_catalog_id: 'notion',
        direct_overhead_scope: 'none',
        direct_overhead_kind: null,
        direct_overhead_member_id: null
      }
    ])

    const rows = await listExpensesForDistributionPeriod({ year: 2026, month: 4 })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      expenseId: 'EXP-1',
      economicCategory: 'vendor_cost_saas',
      toolCatalogId: 'notion'
    })
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('greenhouse_finance.expenses'), [2026, 4])
  })
})

describe('persistExpenseDistributionResolution', () => {
  it('inserts a new active resolution when none exists', async () => {
    clientQueryMock.mockResolvedValueOnce({ rows: [] })
    clientQueryMock.mockResolvedValueOnce({ rows: [] })

    const result = await persistExpenseDistributionResolution(draft())

    expect(result.action).toBe('inserted')
    expect(result.resolutionId).toMatch(/^edr-exp-1-/)
    expect(clientQueryMock).toHaveBeenCalledTimes(2)
    expect(clientQueryMock.mock.calls[1]?.[0]).toContain('INSERT INTO greenhouse_finance.expense_distribution_resolution')
  })

  it('does not rewrite an identical active resolution', async () => {
    clientQueryMock.mockResolvedValueOnce({
      rows: [
        {
          resolution_id: 'edr-current',
          distribution_lane: 'shared_operational_overhead',
          resolution_status: 'resolved',
          amount_clp: '100000',
          member_id: null,
          client_id: null,
          supplier_id: 'supplier-1',
          tool_catalog_id: null,
          payroll_entry_id: null,
          payroll_period_id: null,
          payment_obligation_id: null
        }
      ]
    })

    const result = await persistExpenseDistributionResolution(draft())

    expect(result).toEqual({ resolutionId: 'edr-current', action: 'unchanged' })
    expect(clientQueryMock).toHaveBeenCalledTimes(1)
  })

  it('supersedes and inserts when the active lane changes', async () => {
    clientQueryMock.mockResolvedValueOnce({
      rows: [
        {
          resolution_id: 'edr-current',
          distribution_lane: 'shared_operational_overhead',
          resolution_status: 'resolved',
          amount_clp: '100000',
          member_id: null,
          client_id: null,
          supplier_id: 'supplier-1',
          tool_catalog_id: null,
          payroll_entry_id: null,
          payroll_period_id: null,
          payment_obligation_id: null
        }
      ]
    })
    clientQueryMock.mockResolvedValueOnce({ rows: [] })
    clientQueryMock.mockResolvedValueOnce({ rows: [] })

    const result = await persistExpenseDistributionResolution(
      draft({ distributionLane: 'shared_financial_cost' })
    )

    expect(result.action).toBe('superseded_and_inserted')
    expect(clientQueryMock.mock.calls[1]?.[0]).toContain("resolution_status = 'superseded'")
    expect(clientQueryMock.mock.calls[2]?.[0]).toContain('INSERT INTO greenhouse_finance.expense_distribution_resolution')
  })
})

describe('readSharedOperationalOverheadPool', () => {
  it('sums only active shared operational overhead resolutions', async () => {
    queryMock.mockResolvedValueOnce([{ total_clp: '4497493' }])

    const total = await readSharedOperationalOverheadPool({ year: 2026, month: 4 })

    expect(total).toBe(4_497_493)
    expect(queryMock.mock.calls[0]?.[0]).toContain("distribution_lane = 'shared_operational_overhead'")
  })
})
