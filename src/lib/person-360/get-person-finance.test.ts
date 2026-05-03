import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockResolvePersonIdentifier = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/person-360/resolve-eo-id', () => ({
  resolvePersonIdentifier: (...args: unknown[]) => mockResolvePersonIdentifier(...args)
}))

import { getPersonFinanceOverviewFromPostgres } from '@/lib/person-360/get-person-finance'

describe('getPersonFinanceOverviewFromPostgres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads person cost attribution from the canonical commercial attribution layer', async () => {
    mockResolvePersonIdentifier.mockResolvedValue({
      memberId: 'member-1',
      identityProfileId: 'ip-1'
    })

    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          identity_profile_id: 'ip-1',
          eo_id: 'eo-1',
          member_id: 'member-1',
          resolved_display_name: 'Julio Reyes',
          member_email: 'julio@example.com',
          total_payroll_entries: 2,
          expense_count: 1,
          paid_expense_count: 1,
          total_expenses_clp: 100000,
          last_expense_date: '2026-03-30'
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          client_name: 'Sky',
          organization_name: 'Sky Org',
          fte_allocation: '1',
          allocated_labor_clp: '800000',
          period_year: '2026',
          period_month: '3'
        }
      ])
      .mockResolvedValueOnce([])

    const result = await getPersonFinanceOverviewFromPostgres('eo-1')

    const costQuery = mockRunGreenhousePostgresQuery.mock.calls[6]?.[0] as string

    expect(costQuery).toContain('FROM greenhouse_serving.commercial_cost_attribution cca')
    expect(costQuery).not.toContain('greenhouse_serving.client_labor_cost_allocation')
    expect(result.costAttribution).toEqual([
      {
        clientId: 'client-1',
        clientName: 'Sky',
        organizationName: 'Sky Org',
        fteAllocation: 1,
        attributedCostClp: 800000,
        periodYear: 2026,
        periodMonth: 3
      }
    ])
  })

  it('applies organization scoping to assignments, expenses, and cost attribution when requested', async () => {
    mockResolvePersonIdentifier.mockResolvedValue({
      memberId: 'member-1',
      identityProfileId: 'ip-1'
    })

    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          identity_profile_id: 'ip-1',
          eo_id: 'eo-1',
          member_id: 'member-1',
          resolved_display_name: 'Julio Reyes',
          member_email: 'julio@example.com',
          total_payroll_entries: 2,
          expense_count: 5,
          paid_expense_count: 3,
          total_expenses_clp: 999999,
          last_expense_date: '2026-03-30'
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          expense_id: 'exp-1',
          client_id: 'client-1',
          client_name: 'Sky',
          expense_type: 'travel',
          description: 'Taxi',
          currency: 'CLP',
          total_amount: '10000',
          total_amount_clp: '10000',
          payment_status: 'paid',
          payment_date: '2026-03-20',
          document_date: '2026-03-20',
          supplier_name: null,
          service_line: null,
          payroll_entry_id: null,
          created_at: '2026-03-20T00:00:00Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          expense_count: '1',
          paid_expense_count: '1',
          total_expenses_clp: '10000',
          last_expense_date: '2026-03-20'
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          assignment_id: 'asg-1',
          client_id: 'client-1',
          client_name: 'Sky',
          fte_allocation: '1',
          hours_per_month: '160',
          role_title_override: null,
          start_date: '2026-03-01',
          end_date: null,
          active: true
        }
      ])
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          client_name: 'Sky',
          organization_name: 'Sky Org',
          fte_allocation: '1',
          allocated_labor_clp: '800000',
          period_year: '2026',
          period_month: '3'
        }
      ])
      .mockResolvedValueOnce([])

    const result = await getPersonFinanceOverviewFromPostgres('eo-1', { organizationId: 'org-sky' })

    const expenseQuery = mockRunGreenhousePostgresQuery.mock.calls[2]?.[0] as string
    const assignmentQuery = mockRunGreenhousePostgresQuery.mock.calls[5]?.[0] as string
    const costQuery = mockRunGreenhousePostgresQuery.mock.calls[6]?.[0] as string

    expect(expenseQuery).toContain('sp.organization_id = $2')
    expect(assignmentQuery).toContain('s.organization_id = $2')
    expect(costQuery).toContain('COALESCE(cca.organization_id, sp.organization_id) = $2')
    expect(result.summary).toMatchObject({
      expenseCount: 1,
      paidExpensesCount: 1,
      totalExpensesClp: 10000,
      lastExpenseDate: '2026-03-20'
    })
  })
})
