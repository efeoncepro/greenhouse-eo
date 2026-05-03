import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockReadLatestMemberCapacityEconomicsSnapshot = vi.fn()
const mockConvertFteToHours = vi.fn()
const mockPublishCapacityOvercommitDetected = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/member-capacity-economics/store', () => ({
  readLatestMemberCapacityEconomicsSnapshot: (...args: unknown[]) =>
    mockReadLatestMemberCapacityEconomicsSnapshot(...args)
}))

vi.mock('@/lib/commercial/pricing-governance-store', () => ({
  convertFteToHours: (...args: unknown[]) => mockConvertFteToHours(...args)
}))

vi.mock('@/lib/commercial/capacity-overcommit-events', () => ({
  publishCapacityOvercommitDetected: (...args: unknown[]) => mockPublishCapacityOvercommitDetected(...args)
}))

import { detectAllOvercommits, detectMemberOvercommit } from '@/lib/team-capacity/overcommit-detector'

beforeEach(() => {
  mockRunGreenhousePostgresQuery.mockReset()
  mockReadLatestMemberCapacityEconomicsSnapshot.mockReset()
  mockConvertFteToHours.mockReset()
  mockPublishCapacityOvercommitDetected.mockReset()
})

describe('overcommit-detector', () => {
  it('detects overcommit using contractedHours as denominator', async () => {
    mockReadLatestMemberCapacityEconomicsSnapshot.mockResolvedValue({
      memberId: 'member-1',
      periodYear: 2026,
      periodMonth: 4,
      contractedFte: 1,
      contractedHours: 160,
      assignedHours: 90,
      usageKind: 'hours',
      usedHours: 90,
      usagePercent: 56.25,
      commercialAvailabilityHours: 70,
      operationalAvailabilityHours: 70,
      snapshotStatus: 'materialized',
      assignmentCount: 1,
      materializedAt: '2026-04-19T12:00:00.000Z'
    })

    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ period_year: 2026, period_month: 4 }])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          period_year: 2026,
          period_month: 4,
          contracted_fte: 1,
          contracted_hours: 160,
          assigned_hours: 90,
          usage_kind: 'hours',
          used_hours: 90,
          usage_percent: 56.25,
          commercial_availability_hours: 70,
          operational_availability_hours: 70,
          snapshot_status: 'materialized',
          assignment_count: 1,
          materialized_at: '2026-04-19T12:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          quotation_id: 'quo-1',
          quotation_number: 'EO-QUO-001',
          quotation_status: 'sent',
          quotation_updated_at: '2026-04-10T10:00:00.000Z',
          quotation_sent_at: '2026-04-09T10:00:00.000Z',
          quotation_approved_at: null,
          line_item_id: 'qli-1',
          line_type: 'person',
          label: 'Senior engineer',
          hours_estimated: '180',
          fte_allocation: null,
          client_id: 'client-1',
          organization_id: 'org-1',
          space_id: 'space-1'
        }
      ])

    const result = await detectMemberOvercommit('member-1', '2026-04-19')

    expect(result?.overcommitted).toBe(true)
    expect(result?.overcommitHours).toBe(20)
  })

  it('falls back to convertFteToHours when hours_estimated is missing', async () => {
    mockReadLatestMemberCapacityEconomicsSnapshot.mockResolvedValue({
      memberId: 'member-2',
      periodYear: 2026,
      periodMonth: 4,
      contractedFte: 1,
      contractedHours: 160,
      assignedHours: 80,
      usageKind: 'hours',
      usedHours: 80,
      usagePercent: 50,
      commercialAvailabilityHours: 80,
      operationalAvailabilityHours: 80,
      snapshotStatus: 'materialized',
      assignmentCount: 1,
      materializedAt: '2026-04-19T12:00:00.000Z'
    })

    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ period_year: 2026, period_month: 4 }])
      .mockResolvedValueOnce([
        {
          member_id: 'member-2',
          period_year: 2026,
          period_month: 4,
          contracted_fte: 1,
          contracted_hours: 160,
          assigned_hours: 80,
          usage_kind: 'hours',
          used_hours: 80,
          usage_percent: 50,
          commercial_availability_hours: 80,
          operational_availability_hours: 80,
          snapshot_status: 'materialized',
          assignment_count: 1,
          materialized_at: '2026-04-19T12:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'member-2',
          quotation_id: 'quo-2',
          quotation_number: 'EO-QUO-002',
          quotation_status: 'approved',
          quotation_updated_at: '2026-04-12T10:00:00.000Z',
          quotation_sent_at: '2026-04-11T10:00:00.000Z',
          quotation_approved_at: '2026-04-12T10:00:00.000Z',
          line_item_id: 'qli-2',
          line_type: 'person',
          label: 'Lead consultant',
          hours_estimated: null,
          fte_allocation: '0.5',
          client_id: 'client-2',
          organization_id: 'org-2',
          space_id: 'space-2'
        }
      ])

    mockConvertFteToHours.mockResolvedValueOnce({ monthlyHours: 90 })

    const result = await detectMemberOvercommit('member-2', '2026-04-19')

    expect(mockConvertFteToHours).toHaveBeenCalledWith(0.5, '2026-04-19')
    expect(result?.commitmentHours).toBe(90)
    expect(result?.overcommitted).toBe(false)
  })

  it('publishes one outbox event per overcommitted member', async () => {
    mockReadLatestMemberCapacityEconomicsSnapshot.mockResolvedValue(null)
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ period_year: 2026, period_month: 4 }])
      .mockResolvedValueOnce([{ member_id: 'member-1' }])
      .mockResolvedValueOnce([{ period_year: 2026, period_month: 4 }])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          period_year: 2026,
          period_month: 4,
          contracted_fte: 1,
          contracted_hours: 160,
          assigned_hours: 100,
          usage_kind: 'hours',
          used_hours: 100,
          usage_percent: 62.5,
          commercial_availability_hours: 60,
          operational_availability_hours: 60,
          snapshot_status: 'materialized',
          assignment_count: 1,
          materialized_at: '2026-04-19T12:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          quotation_id: 'quo-1',
          quotation_number: 'EO-QUO-001',
          quotation_status: 'sent',
          quotation_updated_at: '2026-04-10T10:00:00.000Z',
          quotation_sent_at: '2026-04-09T10:00:00.000Z',
          quotation_approved_at: null,
          line_item_id: 'qli-1',
          line_type: 'person',
          label: 'Senior engineer',
          hours_estimated: '180',
          fte_allocation: null,
          client_id: 'client-1',
          organization_id: 'org-1',
          space_id: 'space-1'
        }
      ])

    const results = await detectAllOvercommits('2026-04-19')

    expect(results).toHaveLength(1)
    expect(mockPublishCapacityOvercommitDetected).toHaveBeenCalledTimes(1)
  })
})
