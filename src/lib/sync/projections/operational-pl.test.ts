import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaterializeOperationalPl = vi.fn()
const mockPublishOutboxEvent = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/cost-intelligence/compute-operational-pl', () => ({
  materializeOperationalPl: (...args: unknown[]) => mockMaterializeOperationalPl(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import {
  getOperationalPlPeriodFromPayload,
  operationalPlProjection
} from '@/lib/sync/projections/operational-pl'

describe('operationalPlProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives the affected period from finance dates and period ids', () => {
    expect(getOperationalPlPeriodFromPayload({ invoiceDate: '2026-03-14' })).toEqual({ year: 2026, month: 3 })
    expect(getOperationalPlPeriodFromPayload({ periodId: '2026-04' })).toEqual({ year: 2026, month: 4 })
  })

  it('materializes snapshots and emits snapshot plus margin alert events', async () => {
    mockMaterializeOperationalPl.mockResolvedValue({
      periodClosed: true,
      snapshotRevision: 2,
      snapshots: [
        {
          snapshotId: 'client-client-1-2026-03-r2',
          scopeType: 'client',
          scopeId: 'client-1',
          scopeName: 'Acme',
          periodYear: 2026,
          periodMonth: 3,
          periodClosed: true,
          snapshotRevision: 2,
          currency: 'CLP',
          revenueClp: 1000,
          laborCostClp: 300,
          directExpenseClp: 200,
          overheadClp: 100,
          totalCostClp: 600,
          grossMarginClp: 400,
          grossMarginPct: 10,
          headcountFte: 1,
          revenuePerFteClp: 1000,
          costPerFteClp: 600,
          computationReason: 'reactive-refresh',
          materializedAt: null
        }
      ]
    })

    mockRunGreenhousePostgresQuery.mockResolvedValue([{ margin_alert_threshold_pct: 15 }])

    const result = await operationalPlProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'finance.expense.updated' }
    )

    expect(mockMaterializeOperationalPl).toHaveBeenCalledWith(
      2026,
      3,
      'reactive-refresh:finance.expense.updated:2026-03'
    )
    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(2)
    expect(result).toContain('2026-03')
  })
})
