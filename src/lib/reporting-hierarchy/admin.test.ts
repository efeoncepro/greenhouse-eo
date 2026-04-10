import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListDirectReports = vi.fn()
const mockListApprovalDelegations = vi.fn()
const mockWithTransaction = vi.fn()
const mockUpsertReportingLineInTransaction = vi.fn()
const mockCreateResponsibilityInTransaction = vi.fn()
const mockRevokeResponsibilityInTransaction = vi.fn()

vi.mock('@/lib/reporting-hierarchy/readers', () => ({
  listDirectReports: (...args: unknown[]) => mockListDirectReports(...args)
}))

vi.mock('@/lib/reporting-hierarchy/store', () => ({
  upsertReportingLineInTransaction: (...args: unknown[]) => mockUpsertReportingLineInTransaction(...args),
  upsertReportingLine: vi.fn()
}))

vi.mock('@/lib/operational-responsibility/store', () => ({
  createResponsibility: vi.fn(),
  createResponsibilityInTransaction: (...args: unknown[]) => mockCreateResponsibilityInTransaction(...args),
  revokeResponsibility: vi.fn(),
  revokeResponsibilityInTransaction: (...args: unknown[]) => mockRevokeResponsibilityInTransaction(...args)
}))

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args)
}))

vi.mock('@/lib/hr-core/shared', async () => {
  const actual = await vi.importActual('@/lib/hr-core/shared')

  return {
    ...actual,
    normalizeString: (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  }
})

import {
  assignApprovalDelegationWithDependencies,
  bulkReassignDirectReports,
  formatTimestampLike,
  mapHierarchyHistoryRow
} from '@/lib/reporting-hierarchy/admin'

describe('reporting hierarchy admin helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockListDirectReports.mockReset()
    mockListApprovalDelegations.mockReset()
    mockWithTransaction.mockReset()
    mockUpsertReportingLineInTransaction.mockReset()
    mockCreateResponsibilityInTransaction.mockReset()
    mockRevokeResponsibilityInTransaction.mockReset()
  })

  it('formats Date-like history timestamps as ISO strings', () => {
    const row = mapHierarchyHistoryRow({
      reporting_line_id: 'rpt-1',
      member_id: 'member-1',
      member_name: 'Daniela Ferreira',
      supervisor_member_id: 'member-2',
      supervisor_name: 'Julio Reyes',
      previous_supervisor_member_id: null,
      previous_supervisor_name: null,
      effective_from: '2026-04-10T12:00:00.000Z',
      effective_to: new Date('2026-04-20T12:00:00.000Z') as unknown as string,
      source_system: 'greenhouse_manual',
      change_reason: 'team_refresh',
      changed_by_user_id: 'user-1',
      changed_by_name: 'HR Admin',
      created_at: '2026-04-10T12:00:00.000Z'
    })

    expect(row.effectiveTo).toBe('2026-04-20T12:00:00.000Z')
    expect(formatTimestampLike(new Date('2026-04-20T12:00:00.000Z'))).toBe('2026-04-20T12:00:00.000Z')
  })

  it('loads direct reports at the requested effective date for bulk reassignments', async () => {
    const fakeClient = { query: vi.fn() }

    mockListDirectReports.mockResolvedValue([{ memberId: 'member-1' }])
    mockUpsertReportingLineInTransaction.mockResolvedValue({
      memberId: 'member-1',
      supervisorMemberId: 'member-9'
    })
    mockWithTransaction.mockImplementation(async callback => callback(fakeClient as never))

    const result = await bulkReassignDirectReports({
      currentSupervisorMemberId: 'member-2',
      nextSupervisorMemberId: 'member-9',
      actorUserId: 'user-1',
      reason: 'lead_transition',
      effectiveFrom: '2026-04-20T12:00:00.000Z'
    })

    expect(mockListDirectReports).toHaveBeenCalledWith('member-2', {
      effectiveAt: '2026-04-20T12:00:00.000Z'
    })
    expect(mockUpsertReportingLineInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'member-1',
        supervisorMemberId: 'member-9',
        effectiveFrom: '2026-04-20T12:00:00.000Z'
      }),
      fakeClient
    )
    expect(result.updatedCount).toBe(1)
  })

  it('replaces approval delegations atomically inside a single transaction', async () => {
    const fakeClient = { query: vi.fn() }

    mockListApprovalDelegations
      .mockResolvedValueOnce([
        {
          responsibilityId: 'resp-old',
          supervisorMemberId: 'member-1',
          supervisorName: 'Julio Reyes',
          delegateMemberId: 'member-3',
          delegateMemberName: 'Old Delegate',
          effectiveFrom: '2026-04-01T00:00:00.000Z',
          effectiveTo: null,
          active: true,
          isPrimary: true,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          responsibilityId: 'resp-new',
          supervisorMemberId: 'member-1',
          supervisorName: 'Julio Reyes',
          delegateMemberId: 'member-2',
          delegateMemberName: 'New Delegate',
          effectiveFrom: '2026-04-10T12:00:00.000Z',
          effectiveTo: null,
          active: true,
          isPrimary: true,
          createdAt: '2026-04-10T12:00:00.000Z',
          updatedAt: '2026-04-10T12:00:00.000Z'
        }
      ])

    mockWithTransaction.mockImplementation(async callback => callback(fakeClient as never))
    mockCreateResponsibilityInTransaction.mockResolvedValue('resp-new')
    mockRevokeResponsibilityInTransaction.mockResolvedValue(undefined)

    const delegation = await assignApprovalDelegationWithDependencies(
      {
        supervisorMemberId: 'member-1',
        delegateMemberId: 'member-2',
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        effectiveTo: '2026-04-20T12:00:00.000Z'
      },
      {
        loadApprovalDelegations: mockListApprovalDelegations
      }
    )

    expect(mockWithTransaction).toHaveBeenCalledTimes(1)
    expect(mockRevokeResponsibilityInTransaction).toHaveBeenCalledWith('resp-old', fakeClient)
    expect(mockCreateResponsibilityInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'member-2',
        scopeType: 'member',
        scopeId: 'member-1',
        responsibilityType: 'approval_delegate',
        isPrimary: true,
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        effectiveTo: '2026-04-20T12:00:00.000Z'
      }),
      fakeClient
    )
    expect(delegation?.responsibilityId).toBe('resp-new')
  })
})
