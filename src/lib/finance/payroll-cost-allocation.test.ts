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
})
