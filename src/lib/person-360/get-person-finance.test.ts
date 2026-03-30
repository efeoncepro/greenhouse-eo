import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockResolvePersonIdentifier = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
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

    const costQuery = mockRunGreenhousePostgresQuery.mock.calls[5]?.[0] as string

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
})
