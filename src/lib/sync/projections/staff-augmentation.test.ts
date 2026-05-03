import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaterializeStaffAugPlacementSnapshotsForPeriod = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/staff-augmentation/snapshots', () => ({
  materializeStaffAugPlacementSnapshotsForPeriod: (...args: unknown[]) =>
    mockMaterializeStaffAugPlacementSnapshotsForPeriod(...args)
}))

// TASK-379: assert the v2 publish helper reaches the outbox with schemaVersion.
vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import {
  STAFF_AUG_PLACEMENT_TRIGGER_EVENTS,
  getStaffAugPlacementPeriodFromPayload,
  getStaffAugPlacementScopeFromPayload,
  staffAugPlacementProjection
} from '@/lib/sync/projections/staff-augmentation'

describe('staffAugPlacementProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives finance period scope from explicit fields and date-like payloads', () => {
    expect(getStaffAugPlacementPeriodFromPayload({ periodYear: 2026, periodMonth: 3 })).toEqual({
      year: 2026,
      month: 3
    })
    expect(getStaffAugPlacementScopeFromPayload({ payrollPeriodId: '2026-04' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-04'
    })
    expect(getStaffAugPlacementScopeFromPayload({ contractStartDate: '2026-05-14' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-05'
    })
  })

  it('listens to assignment, finance, provider and payroll events', () => {
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('staff_aug.placement.created')
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('assignment.updated')
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('finance.expense.updated')
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('accounting.commercial_cost_attribution.materialized')
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('provider.tooling_snapshot.materialized')
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('payroll_period.exported')
    expect(staffAugPlacementProjection.domain).toBe('finance')
  })

  it('materializes snapshots and emits a single period-level event (TASK-379)', async () => {
    mockMaterializeStaffAugPlacementSnapshotsForPeriod.mockResolvedValue([
      {
        snapshotId: 'placement-1:2026-03',
        placementId: 'placement-1',
        assignmentId: 'assignment-1',
        clientId: 'client-1',
        memberId: 'member-1',
        providerId: 'anthropic',
        periodYear: 2026,
        periodMonth: 3,
        periodId: '2026-03',
        projectedRevenueClp: 2400000,
        payrollEmployerCostClp: 1200000,
        commercialLoadedCostClp: 1450000,
        toolingCostClp: 95000,
        grossMarginProxyClp: 855000,
        grossMarginProxyPct: 35.63,
        snapshotStatus: 'complete'
      },
      {
        snapshotId: 'placement-2:2026-03',
        placementId: 'placement-2',
        assignmentId: 'assignment-2',
        clientId: 'client-2',
        memberId: 'member-2',
        providerId: 'openai',
        periodYear: 2026,
        periodMonth: 3,
        periodId: '2026-03',
        projectedRevenueClp: 1800000,
        payrollEmployerCostClp: 900000,
        commercialLoadedCostClp: 1100000,
        toolingCostClp: 60000,
        grossMarginProxyClp: 640000,
        grossMarginProxyPct: 35.55,
        snapshotStatus: 'complete'
      }
    ])
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const result = await staffAugPlacementProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'payroll_period.exported' }
    )

    expect(mockMaterializeStaffAugPlacementSnapshotsForPeriod).toHaveBeenCalledWith(
      2026,
      3,
      'reactive-refresh:payroll_period.exported:2026-03'
    )

    // Fan-out reduction: exactly ONE outbox insert for the whole period.
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
    const [sql, values] = mockRunGreenhousePostgresQuery.mock.calls[0] as [string, unknown[]]

    expect(sql).toContain('INSERT INTO greenhouse_sync.outbox_events')

    expect(values[1]).toBe('staff_aug_placement_snapshot')
    expect(values[2]).toBe('2026-03')
    expect(values[3]).toBe('staff_aug.placement_snapshot.period_materialized')

    const payload = JSON.parse(String(values[4])) as Record<string, unknown>

    expect(payload.schemaVersion).toBe(2)
    expect(payload.periodId).toBe('2026-03')
    expect(payload.snapshotCount).toBe(2)
    expect(payload._materializedAt).toEqual(expect.any(String))
    expect(payload.periodYear).toBe(2026)
    expect(payload.periodMonth).toBe(3)
    expect(payload.placementIds).toEqual(['placement-1', 'placement-2'])

    expect(result).toContain('2026-03')
  })

  it('does not publish the legacy per-entity event type anymore (TASK-379)', async () => {
    mockMaterializeStaffAugPlacementSnapshotsForPeriod.mockResolvedValue([
      {
        snapshotId: 'placement-1:2026-03',
        placementId: 'placement-1',
        assignmentId: 'assignment-1',
        clientId: 'client-1',
        memberId: 'member-1',
        providerId: 'anthropic',
        periodYear: 2026,
        periodMonth: 3,
        periodId: '2026-03',
        projectedRevenueClp: 0,
        payrollEmployerCostClp: 0,
        commercialLoadedCostClp: 0,
        toolingCostClp: 0,
        grossMarginProxyClp: 0,
        grossMarginProxyPct: 0,
        snapshotStatus: 'complete'
      }
    ])
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    await staffAugPlacementProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'payroll_period.exported' }
    )

    for (const call of mockRunGreenhousePostgresQuery.mock.calls) {
      const values = call[1] as unknown[]

      expect(values[3]).not.toBe('staff_aug.placement_snapshot.materialized')
    }
  })
})
