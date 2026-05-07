import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}))

import { query, withTransaction } from '@/lib/db'

import {
  approveEngagement,
  EngagementApprovalConflictError,
  EngagementApprovalValidationError,
  rejectEngagement,
  requestApproval,
  withdrawApproval
} from './approvals'
import { getMemberCapacityForPeriod } from './capacity-checker'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>
const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>

const eligibleService = {
  service_id: 'SVC-HS-123',
  active: true,
  status: 'active',
  hubspot_sync_status: 'synced'
}

const serviceForApproval = {
  service_id: 'SVC-HS-123',
  engagement_kind: 'pilot',
  start_date: '2026-05-10',
  target_end_date: '2026-05-24'
}

const pendingApproval = {
  ...serviceForApproval,
  approval_id: 'engagement-approval-1',
  service_id: 'SVC-HS-123',
  requested_by: 'user-requester',
  expected_internal_cost_clp: '1200000.00',
  expected_duration_days: 14,
  decision_deadline: '2026-05-24',
  success_criteria_json: { conversion: 'signed_contract' },
  capacity_warning_json: null,
  capacity_override_reason: null,
  status: 'pending',
  approved_by: null,
  approved_at: null,
  rejected_by: null,
  rejected_at: null,
  rejection_reason: null,
  withdrawn_by: null,
  withdrawn_at: null,
  withdrawal_reason: null,
  created_at: '2026-05-07T12:00:00.000Z',
  updated_at: '2026-05-07T12:00:00.000Z'
}

const approvedApproval = {
  ...pendingApproval,
  status: 'approved',
  approved_by: 'admin-1',
  approved_at: '2026-05-07T13:00:00.000Z'
}

const buildClient = (responses: Array<{ rows: unknown[] }>) => {
  const queryMock = vi.fn(async () => responses.shift() ?? { rows: [] })

  return { query: queryMock }
}

describe('engagement capacity checker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates overlapping commercial capacity and excludes internal assignments', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        assignment_id: 'assignment-1',
        client_id: 'client-sky',
        client_name: 'Sky',
        service_id: 'SVC-HS-999',
        fte_allocation: '0.70',
        hours_per_month: null,
        contracted_hours_month: null,
        start_date: '2026-05-01',
        end_date: null
      },
      {
        assignment_id: 'assignment-internal',
        client_id: 'efeonce_internal',
        client_name: 'Efeonce',
        service_id: null,
        fte_allocation: '0.50',
        hours_per_month: null,
        contracted_hours_month: null,
        start_date: '2026-05-01',
        end_date: null
      }
    ])

    const capacity = await getMemberCapacityForPeriod('member-1', '2026-05-10', '2026-05-24')

    expect(capacity.memberId).toBe('member-1')
    expect(capacity.totalFte).toBe(1)
    expect(capacity.allocatedFte).toBe(0.7)
    expect(capacity.availableFte).toBeCloseTo(0.3)
    expect(capacity.conflictingAssignments).toEqual([
      {
        assignmentId: 'assignment-1',
        clientId: 'client-sky',
        clientName: 'Sky',
        serviceId: 'SVC-HS-999',
        fte: 0.7,
        startDate: '2026-05-01',
        endDate: null
      }
    ])

    expect(String(mockedQuery.mock.calls[0][0])).toContain('COALESCE(a.start_date')
  })
})

describe('engagement approval helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedWithTransaction.mockImplementation(async (run: (client: unknown) => Promise<unknown>) => {
      return run(buildClient([]))
    })
  })

  it('requests approval after eligibility guard and marks the service pending_approval', async () => {
    const client = buildClient([
      { rows: [eligibleService] },
      { rows: [serviceForApproval] },
      { rows: [{ approval_id: 'engagement-approval-1' }] },
      { rows: [] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      requestApproval({
        serviceId: 'SVC-HS-123',
        requestedBy: 'user-requester',
        expectedInternalCostClp: 1200000,
        expectedDurationDays: 14,
        decisionDeadline: '2026-05-24',
        successCriteria: { conversion: 'signed_contract' }
      })
    ).resolves.toEqual({ approvalId: 'engagement-approval-1' })

    const calls = client.query.mock.calls as unknown as Array<[string, unknown[]?]>

    expect(calls[2][0]).toContain('INSERT INTO greenhouse_commercial.engagement_approvals')
    expect(calls[3][0]).toContain("SET status = 'pending_approval'")
  })

  it('rejects approval requests for regular services before inserting', async () => {
    const client = buildClient([
      { rows: [eligibleService] },
      { rows: [{ ...serviceForApproval, engagement_kind: 'regular' }] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      requestApproval({
        serviceId: 'SVC-HS-123',
        requestedBy: 'user-requester',
        expectedInternalCostClp: 1200000,
        expectedDurationDays: 14,
        decisionDeadline: '2026-05-24',
        successCriteria: { conversion: 'signed_contract' }
      })
    ).rejects.toBeInstanceOf(EngagementApprovalValidationError)

    expect(client.query).toHaveBeenCalledTimes(2)
  })

  it('maps duplicate approval requests to conflict', async () => {
    const client = buildClient([])

    client.query.mockResolvedValueOnce({ rows: [eligibleService] })
    client.query.mockResolvedValueOnce({ rows: [serviceForApproval] })
    client.query.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }))
    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      requestApproval({
        serviceId: 'SVC-HS-123',
        requestedBy: 'user-requester',
        expectedInternalCostClp: 1200000,
        expectedDurationDays: 14,
        decisionDeadline: '2026-05-24',
        successCriteria: { conversion: 'signed_contract' }
      })
    ).rejects.toBeInstanceOf(EngagementApprovalConflictError)
  })

  it('approves without override when projected capacity remains under 100%', async () => {
    const client = buildClient([
      { rows: [pendingApproval] },
      { rows: [eligibleService] },
      {
        rows: [
          {
            assignment_id: 'assignment-1',
            client_id: 'client-sky',
            client_name: 'Sky',
            service_id: 'SVC-HS-999',
            fte_allocation: '0.40',
            hours_per_month: null,
            contracted_hours_month: null,
            start_date: '2026-05-01',
            end_date: null
          }
        ]
      },
      { rows: [{ ...approvedApproval, capacity_warning_json: { hasWarning: false, members: [] } }] },
      { rows: [] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    const approval = await approveEngagement({
      serviceId: 'SVC-HS-123',
      approvedBy: 'admin-1',
      approvedAt: '2026-05-07T13:00:00.000Z',
      proposedMembers: [{ memberId: 'member-1', proposedFte: 0.4 }]
    })

    expect(approval.status).toBe('approved')
    expect(approval.approvedBy).toBe('admin-1')
    expect(client.query).toHaveBeenCalledTimes(5)
  })

  it('requires override reason when projected capacity exceeds 100%', async () => {
    const client = buildClient([
      { rows: [pendingApproval] },
      { rows: [eligibleService] },
      {
        rows: [
          {
            assignment_id: 'assignment-1',
            client_id: 'client-sky',
            client_name: 'Sky',
            service_id: 'SVC-HS-999',
            fte_allocation: '0.80',
            hours_per_month: null,
            contracted_hours_month: null,
            start_date: '2026-05-01',
            end_date: null
          }
        ]
      }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      approveEngagement({
        serviceId: 'SVC-HS-123',
        approvedBy: 'admin-1',
        approvedAt: '2026-05-07T13:00:00.000Z',
        proposedMembers: [{ memberId: 'member-1', proposedFte: 0.4 }]
      })
    ).rejects.toBeInstanceOf(EngagementApprovalValidationError)

    expect(client.query).toHaveBeenCalledTimes(3)
  })

  it('persists warning snapshot when capacity override is declared', async () => {
    const client = buildClient([
      { rows: [pendingApproval] },
      { rows: [eligibleService] },
      {
        rows: [
          {
            assignment_id: 'assignment-1',
            client_id: 'client-sky',
            client_name: 'Sky',
            service_id: 'SVC-HS-999',
            fte_allocation: '0.80',
            hours_per_month: null,
            contracted_hours_month: null,
            start_date: '2026-05-01',
            end_date: null
          }
        ]
      },
      { rows: [approvedApproval] },
      { rows: [] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await approveEngagement({
      serviceId: 'SVC-HS-123',
      approvedBy: 'admin-1',
      approvedAt: '2026-05-07T13:00:00.000Z',
      proposedMembers: [{ memberId: 'member-1', proposedFte: 0.4 }],
      capacityOverrideReason: 'Approved because coverage is temporary.'
    })

    const updateApprovalCall = client.query.mock.calls[3] as unknown as [string, unknown[]]
    const warningSnapshot = JSON.parse(updateApprovalCall[1][3] as string)

    expect(warningSnapshot.hasWarning).toBe(true)
    expect(warningSnapshot.members[0].projectedFte).toBe(1.2000000000000002)
    expect(updateApprovalCall[1][4]).toBe('Approved because coverage is temporary.')
  })

  it('rejects and withdraws pending approvals with actor evidence', async () => {
    const rejectClient = buildClient([
      { rows: [pendingApproval] },
      { rows: [eligibleService] },
      {
        rows: [
          {
            ...pendingApproval,
            status: 'rejected',
            rejected_by: 'admin-1',
            rejected_at: '2026-05-07T13:00:00.000Z',
            rejection_reason: 'Insufficient decision criteria.'
          }
        ]
      }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(rejectClient))

    await expect(
      rejectEngagement({
        serviceId: 'SVC-HS-123',
        rejectedBy: 'admin-1',
        rejectedAt: '2026-05-07T13:00:00.000Z',
        rejectionReason: 'Insufficient decision criteria.'
      })
    ).resolves.toMatchObject({ status: 'rejected', rejectedBy: 'admin-1' })

    const withdrawClient = buildClient([
      { rows: [pendingApproval] },
      { rows: [eligibleService] },
      {
        rows: [
          {
            ...pendingApproval,
            status: 'withdrawn',
            withdrawn_by: 'user-requester',
            withdrawn_at: '2026-05-07T13:00:00.000Z',
            withdrawal_reason: 'Client scope changed substantially.'
          }
        ]
      }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(withdrawClient))

    await expect(
      withdrawApproval({
        serviceId: 'SVC-HS-123',
        withdrawnBy: 'user-requester',
        withdrawnAt: '2026-05-07T13:00:00.000Z',
        withdrawalReason: 'Client scope changed substantially.'
      })
    ).resolves.toMatchObject({ status: 'withdrawn', withdrawnBy: 'user-requester' })
  })
})
