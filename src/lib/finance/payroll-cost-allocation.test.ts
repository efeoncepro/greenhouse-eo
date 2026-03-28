import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { computeClientLaborCosts } from '@/lib/finance/payroll-cost-allocation'

describe('computeClientLaborCosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries the serving view for the requested payroll period', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([
      {
        client_id: 'client-1',
        client_name: 'Sky Airline',
        allocated_labor_clp: '2500000.49',
        headcount_fte: '1.500',
        headcount_members: '2'
      }
    ])

    const result = await computeClientLaborCosts(2026, 3)

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM greenhouse_serving.client_labor_cost_allocation'),
      [2026, 3]
    )
    expect(mockRunGreenhousePostgresQuery.mock.calls[0][0]).toContain('allocated_labor_clp IS NOT NULL')
    expect(result).toEqual([
      {
        clientId: 'client-1',
        clientName: 'Sky Airline',
        allocatedLaborClp: 2500000.49,
        headcountFte: 1.5,
        memberCount: 2
      }
    ])
  })

  it('uses period_year and period_month params, never CURRENT_DATE', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    await computeClientLaborCosts(2026, 2)

    const query = mockRunGreenhousePostgresQuery.mock.calls[0][0] as string
    const params = mockRunGreenhousePostgresQuery.mock.calls[0][1] as unknown[]

    expect(query).not.toContain('CURRENT_DATE')
    expect(query).not.toContain('NOW()')
    expect(query).toContain('period_year')
    expect(query).toContain('period_month')
    expect(params).toEqual([2026, 2])
  })

  it('returns empty array when no labor allocations exist', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const result = await computeClientLaborCosts(2025, 12)

    expect(result).toEqual([])
  })

  it('handles multiple clients in the same period', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([
      { client_id: 'c-1', client_name: 'Sky', allocated_labor_clp: '1000000', headcount_fte: '1', headcount_members: '1' },
      { client_id: 'c-2', client_name: 'Aldea', allocated_labor_clp: '500000', headcount_fte: '0.5', headcount_members: '1' }
    ])

    const result = await computeClientLaborCosts(2026, 3)

    expect(result).toHaveLength(2)
    expect(result[0].clientId).toBe('c-1')
    expect(result[1].clientId).toBe('c-2')
  })
})
