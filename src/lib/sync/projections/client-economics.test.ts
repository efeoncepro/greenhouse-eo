import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockComputeClientEconomicsSnapshots = vi.fn()

vi.mock('@/lib/finance/postgres-store-intelligence', () => ({
  computeClientEconomicsSnapshots: (...args: unknown[]) => mockComputeClientEconomicsSnapshots(...args)
}))

import {
  clientEconomicsProjection,
  getClientEconomicsPeriodFromPayload,
  getClientEconomicsScopeFromPayload
} from '@/lib/sync/projections/client-economics'

describe('clientEconomicsProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives the affected period from explicit period fields', () => {
    expect(getClientEconomicsPeriodFromPayload({ periodYear: 2026, periodMonth: 3 })).toEqual({
      year: 2026,
      month: 3
    })
  })

  it('derives the affected period from date fields when finance payloads do not include periodYear', () => {
    expect(getClientEconomicsScopeFromPayload({ invoiceDate: '2026-03-14' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-03'
    })
  })

  it('derives the affected period from payroll periodId payloads', () => {
    expect(getClientEconomicsScopeFromPayload({ periodId: '2026-04' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-04'
    })
  })

  it('listens to finance and payroll events that materially affect client economics', () => {
    expect(clientEconomicsProjection.triggerEvents).toEqual(expect.arrayContaining([
      'finance.income.created',
      'finance.expense.updated',
      'finance.cost_allocation.created',
      'payroll_period.calculated',
      'payroll_entry.upserted'
    ]))
  })

  it('recomputes the specific affected period instead of current month', async () => {
    mockComputeClientEconomicsSnapshots.mockResolvedValue([{ snapshotId: 'snap-1' }])

    const result = await clientEconomicsProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'finance.expense.updated' }
    )

    expect(mockComputeClientEconomicsSnapshots).toHaveBeenCalledWith(
      2026,
      3,
      'reactive-refresh:finance.expense.updated:2026-03'
    )
    expect(result).toContain('2026-03')
  })
})
