import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { resolveAutoAllocation } from '@/lib/finance/auto-allocation-rules'

describe('resolveAutoAllocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('excludes internal assignments from payroll auto-allocation', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([
      { client_id: 'space-efeonce', fte_allocation: '1.000' },
      { client_id: 'client-sky', fte_allocation: '1.000' }
    ])

    const result = await resolveAutoAllocation({
      expenseId: 'expense-1',
      expenseType: 'payroll',
      memberId: 'member-1',
      totalAmountClp: 100000
    })

    expect(result).toEqual({
      expenseId: 'expense-1',
      ruleApplied: 'payroll_by_fte',
      allocations: [
        {
          clientId: 'client-sky',
          allocationPercent: 100,
          allocatedAmountClp: 100000,
          method: 'fte_weighted'
        }
      ]
    })
  })

  it('returns null when the member only has internal assignments', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([
      { client_id: 'space-efeonce', fte_allocation: '1.000' }
    ])

    const result = await resolveAutoAllocation({
      expenseId: 'expense-2',
      expenseType: 'payroll',
      memberId: 'member-2',
      totalAmountClp: 100000
    })

    expect(result).toBeNull()
  })

  it('excludes non-positive fte assignments through the shared classifier', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([
      { client_id: 'client-sky', fte_allocation: '0.000' }
    ])

    const result = await resolveAutoAllocation({
      expenseId: 'expense-3',
      expenseType: 'payroll',
      memberId: 'member-3',
      totalAmountClp: 100000
    })

    expect(result).toBeNull()
  })
})
