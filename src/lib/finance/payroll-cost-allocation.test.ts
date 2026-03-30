import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockReadCommercialCostAttributionByClientForPeriod = vi.fn()

vi.mock('@/lib/commercial-cost-attribution/member-period-attribution', () => ({
  readCommercialCostAttributionByClientForPeriod: (...args: unknown[]) =>
    mockReadCommercialCostAttributionByClientForPeriod(...args)
}))

import { computeClientLaborCosts } from '@/lib/finance/payroll-cost-allocation'

describe('computeClientLaborCosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads client labor cost from the canonical commercial attribution layer for the requested period', async () => {
    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([
      {
        clientId: 'client-1',
        clientName: 'Sky Airline',
        laborCostClp: 2500000.49,
        overheadCostClp: 250000,
        loadedCostClp: 2750000.49,
        headcountFte: 1.5,
        memberCount: 2
      }
    ])

    const result = await computeClientLaborCosts(2026, 3)

    expect(mockReadCommercialCostAttributionByClientForPeriod).toHaveBeenCalledWith(2026, 3)
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
    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([])

    await computeClientLaborCosts(2026, 2)

    expect(mockReadCommercialCostAttributionByClientForPeriod).toHaveBeenCalledWith(2026, 2)
  })

  it('returns empty array when no labor allocations exist', async () => {
    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([])

    const result = await computeClientLaborCosts(2025, 12)

    expect(result).toEqual([])
  })

  it('handles multiple clients in the same period', async () => {
    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([
      { clientId: 'c-1', clientName: 'Sky', laborCostClp: 1000000, overheadCostClp: 0, loadedCostClp: 1000000, headcountFte: 1, memberCount: 1 },
      { clientId: 'c-2', clientName: 'Aldea', laborCostClp: 500000, overheadCostClp: 0, loadedCostClp: 500000, headcountFte: 0.5, memberCount: 1 }
    ])

    const result = await computeClientLaborCosts(2026, 3)

    expect(result).toHaveLength(2)
    expect(result[0].clientId).toBe('c-1')
    expect(result[1].clientId).toBe('c-2')
  })
})
