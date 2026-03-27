import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { readMemberDirectToolCosts } from '@/lib/team-capacity/tool-cost-reader'

describe('team-capacity/tool-cost-reader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads license, tooling and FX inputs for a member period', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          tool_id: 'claude-team',
          cost_model: 'subscription',
          subscription_amount: 60,
          subscription_currency: 'USD',
          subscription_billing_cycle: 'monthly',
          subscription_seats: 3
        }
      ])
      .mockResolvedValueOnce([{ total_tooling_cost_target: 12500 }])
      .mockResolvedValueOnce([{ from_currency: 'USD', rate: 900 }])

    const result = await readMemberDirectToolCosts('member-1', { year: 2026, month: 3 })

    expect(result.licenses).toEqual([
      {
        toolId: 'claude-team',
        costModel: 'subscription',
        subscriptionAmount: 60,
        subscriptionCurrency: 'USD',
        subscriptionBillingCycle: 'monthly',
        subscriptionSeats: 3
      }
    ])
    expect(result.toolingCostTarget).toBe(12500)
    expect(result.fxByCurrency.USD).toBe(900)
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(3)
  })

  it('skips FX lookup when all license costs are already in target currency', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          tool_id: 'workspace-pro',
          cost_model: 'subscription',
          subscription_amount: 12000,
          subscription_currency: 'CLP',
          subscription_billing_cycle: 'monthly',
          subscription_seats: 1
        }
      ])
      .mockResolvedValueOnce([{ total_tooling_cost_target: 0 }])

    const result = await readMemberDirectToolCosts('member-1', { year: 2026, month: 3 })

    expect(result.fxByCurrency).toEqual({})
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(2)
  })
})
