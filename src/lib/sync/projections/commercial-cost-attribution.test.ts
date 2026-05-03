import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaterializeCommercialCostAttributionForPeriod = vi.fn()
const mockReadCommercialCostAttributionByClientForPeriod = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/commercial-cost-attribution/member-period-attribution', () => ({
  materializeCommercialCostAttributionForPeriod: (...args: unknown[]) =>
    mockMaterializeCommercialCostAttributionForPeriod(...args),
  readCommercialCostAttributionByClientForPeriod: (...args: unknown[]) =>
    mockReadCommercialCostAttributionByClientForPeriod(...args)
}))

// TASK-379: assert the v2 publish helper reaches the outbox with schemaVersion.
vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import {
  commercialCostAttributionProjection,
  getCommercialCostAttributionPeriodFromPayload,
  getCommercialCostAttributionScopeFromPayload
} from '@/lib/sync/projections/commercial-cost-attribution'

describe('commercialCostAttributionProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives the period from explicit fields, period ids, and finance dates', () => {
    expect(getCommercialCostAttributionPeriodFromPayload({ periodYear: 2026, periodMonth: 3 })).toEqual({
      year: 2026,
      month: 3
    })
    expect(getCommercialCostAttributionScopeFromPayload({ periodId: '2026-04' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-04'
    })
    expect(getCommercialCostAttributionScopeFromPayload({ invoiceDate: '2026-05-14' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-05'
    })
  })

  it('listens to finance, payroll, and assignment events that affect attribution', () => {
    expect(commercialCostAttributionProjection.triggerEvents).toContain('finance.expense.updated')
    expect(commercialCostAttributionProjection.triggerEvents).toContain('assignment.updated')
    expect(commercialCostAttributionProjection.triggerEvents).toContain('payroll_period.exported')
    expect(commercialCostAttributionProjection.triggerEvents).toContain('compensation_version.updated')
  })

  it('materializes the period and emits a single period-level event (TASK-379)', async () => {
    mockMaterializeCommercialCostAttributionForPeriod.mockResolvedValue({
      rows: [
        {
          memberId: 'member-1',
          allocations: [{ clientId: 'client-1' }]
        },
        {
          memberId: 'member-2',
          allocations: [{ clientId: 'client-1' }, { clientId: 'client-2' }]
        }
      ],
      replaced: 3
    })
    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([
      { clientId: 'client-1' },
      { clientId: 'client-2' }
    ])
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const result = await commercialCostAttributionProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'finance.expense.updated' }
    )

    expect(mockMaterializeCommercialCostAttributionForPeriod).toHaveBeenCalledWith(
      2026,
      3,
      'reactive-refresh:finance.expense.updated:2026-03'
    )

    // Fan-out reduction: exactly ONE outbox insert for the whole period.
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
    const [sql, values] = mockRunGreenhousePostgresQuery.mock.calls[0] as [string, unknown[]]

    expect(sql).toContain('INSERT INTO greenhouse_sync.outbox_events')

    expect(values[1]).toBe('commercial_cost_attribution')
    expect(values[2]).toBe('2026-03')
    expect(values[3]).toBe('accounting.commercial_cost_attribution.period_materialized')

    const payload = JSON.parse(String(values[4])) as Record<string, unknown>

    expect(payload.schemaVersion).toBe(2)
    expect(payload.periodId).toBe('2026-03')
    expect(payload.snapshotCount).toBe(2)
    expect(payload._materializedAt).toEqual(expect.any(String))
    expect(payload.periodYear).toBe(2026)
    expect(payload.periodMonth).toBe(3)
    expect(payload.memberCount).toBe(2)
    expect(payload.allocationCount).toBe(3)
    expect(payload.clientCount).toBe(2)

    expect(result).toContain('2026-03')
  })

  it('does not publish the legacy per-entity event type anymore (TASK-379)', async () => {
    mockMaterializeCommercialCostAttributionForPeriod.mockResolvedValue({
      rows: [{ memberId: 'member-1', allocations: [] }],
      replaced: 0
    })
    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([])
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    await commercialCostAttributionProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'finance.expense.updated' }
    )

    for (const call of mockRunGreenhousePostgresQuery.mock.calls) {
      const values = call[1] as unknown[]

      expect(values[3]).not.toBe('accounting.commercial_cost_attribution.materialized')
    }
  })
})
