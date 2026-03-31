import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaterializePeriodClosureStatus = vi.fn()

vi.mock('@/lib/cost-intelligence/check-period-readiness', () => ({
  materializePeriodClosureStatus: (...args: unknown[]) => mockMaterializePeriodClosureStatus(...args)
}))

import {
  getPeriodClosureStatusPeriodFromPayload,
  getPeriodClosureStatusScopeFromPayload,
  periodClosureStatusProjection
} from '@/lib/sync/projections/period-closure-status'

describe('periodClosureStatusProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives the affected period from payroll period ids', () => {
    expect(getPeriodClosureStatusPeriodFromPayload({ periodId: '2026-03' })).toEqual({
      year: 2026,
      month: 3
    })
  })

  it('derives the affected period from finance date payloads', () => {
    expect(getPeriodClosureStatusScopeFromPayload({ invoiceDate: '2026-03-14' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-03'
    })
  })

  it('refreshes the materialized period closure snapshot for the scoped month', async () => {
    mockMaterializePeriodClosureStatus.mockResolvedValue({
      periodId: '2026-03',
      closureStatus: 'ready',
      readinessPct: 100
    })

    const result = await periodClosureStatusProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'finance.expense.updated' }
    )

    expect(mockMaterializePeriodClosureStatus).toHaveBeenCalledWith({ year: 2026, month: 3 })
    expect(result).toContain('2026-03')
  })
})
