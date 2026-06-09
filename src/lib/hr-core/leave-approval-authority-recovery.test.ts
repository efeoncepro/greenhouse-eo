import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockWithTransaction = vi.fn()
const mockResolve = vi.fn()
const mockUpsert = vi.fn()
const mockRevoke = vi.fn()
const mockPublish = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithTransaction(...args)
}))

vi.mock('@/lib/approval-authority/resolver', () => ({
  resolveApprovalAuthorityForStage: (...args: unknown[]) => mockResolve(...args)
}))

vi.mock('@/lib/approval-authority/store', () => ({
  upsertWorkflowApprovalSnapshotInTransaction: (...args: unknown[]) => mockUpsert(...args)
}))

vi.mock('@/lib/operational-responsibility/store', () => ({
  revokeResponsibilityInTransaction: (...args: unknown[]) => mockRevoke(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublish(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const { runLeaveApprovalAuthorityRecovery } = await import('./leave-approval-authority-recovery')

const invalidResponsibilityRow = {
  responsibility_id: 'resp-2de74ab9',
  delegate_member_id: 'valentina-hoyos',
  supervisor_member_id: 'daniela-ferreira',
  active: true
}

const driftedSnapshotRow = {
  leave_request_id: 'leave-14abe9e8',
  subject_member_id: 'andres-carlosama',
  authority_source: 'delegation',
  formal_approver_member_id: 'daniela-ferreira',
  effective_approver_member_id: 'valentina-hoyos',
  delegate_responsibility_id: 'resp-2de74ab9'
}

const formalResolution = {
  workflowDomain: 'leave',
  stageCode: 'supervisor_review',
  authoritySource: 'reporting_hierarchy',
  formalApproverMemberId: 'daniela-ferreira',
  formalApproverName: 'Daniela Ferreira',
  effectiveApproverMemberId: 'daniela-ferreira',
  effectiveApproverName: 'Daniela Ferreira',
  delegateMemberId: null,
  delegateMemberName: null,
  delegateResponsibilityId: null,
  fallbackRoleCodes: [],
  delegated: false,
  snapshotPayload: {}
}

// El mock de runGreenhousePostgresQuery rutea por el contenido del SQL.
const routeQuery = (responsibilities: unknown[], snapshots: unknown[]) => (sql: string) => {
  if (sql.includes('operational_responsibilities')) {
    return Promise.resolve(responsibilities)
  }

  if (sql.includes('workflow_approval_snapshots')) {
    return Promise.resolve(snapshots)
  }

  return Promise.resolve([])
}

describe('runLeaveApprovalAuthorityRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolve.mockResolvedValue(formalResolution)
    mockWithTransaction.mockImplementation(async (cb: (client: unknown) => Promise<unknown>) =>
      cb({ query: vi.fn() })
    )
  })

  it('dry-run builds the plan and mutates nothing', async () => {
    mockQuery.mockImplementation(routeQuery([invalidResponsibilityRow], [driftedSnapshotRow]))

    const plan = await runLeaveApprovalAuthorityRecovery({
      dryRun: true,
      supervisorMemberId: 'daniela-ferreira'
    })

    expect(plan.dryRun).toBe(true)
    expect(plan.applied).toBe(false)
    expect(plan.invalidResponsibilities).toHaveLength(1)
    expect(plan.invalidResponsibilities[0]).toMatchObject({
      responsibilityId: 'resp-2de74ab9',
      action: 'revoke'
    })
    expect(plan.snapshotRepairs).toHaveLength(1)
    expect(plan.snapshotRepairs[0].before.effectiveApproverMemberId).toBe('valentina-hoyos')
    expect(plan.snapshotRepairs[0].after.effectiveApproverMemberId).toBe('daniela-ferreira')
    expect(plan.snapshotRepairs[0].after.authoritySource).toBe('reporting_hierarchy')

    expect(mockWithTransaction).not.toHaveBeenCalled()
    expect(mockRevoke).not.toHaveBeenCalled()
    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('apply revokes the invalid responsibility, recomputes the snapshot via resolver, and emits outbox', async () => {
    mockQuery.mockImplementation(routeQuery([invalidResponsibilityRow], [driftedSnapshotRow]))

    const plan = await runLeaveApprovalAuthorityRecovery({
      dryRun: false,
      supervisorMemberId: 'daniela-ferreira',
      delegateResponsibilityId: 'resp-2de74ab9',
      leaveRequestId: 'leave-14abe9e8',
      actorUserId: 'user-operator',
      reason: 'TASK-1020 remediación'
    })

    expect(plan.applied).toBe(true)
    expect(mockWithTransaction).toHaveBeenCalledTimes(1)
    expect(mockRevoke).toHaveBeenCalledWith('resp-2de74ab9', expect.anything())
    // SSOT: recompute SIEMPRE vía el resolver canónico (no reimplementa autoridad).
    expect(mockResolve).toHaveBeenCalledWith({
      workflowDomain: 'leave',
      subjectMemberId: 'andres-carlosama',
      stageCode: 'supervisor_review'
    })
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowDomain: 'leave',
        workflowEntityId: 'leave-14abe9e8',
        subjectMemberId: 'andres-carlosama',
        resolution: formalResolution
      })
    )
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'leave_request.approval_authority_recovered',
        payload: expect.objectContaining({ schemaVersion: 1, leaveRequestId: 'leave-14abe9e8' })
      }),
      expect.anything()
    )
  })

  it('is a no-op when there is no drift (idempotent second run)', async () => {
    mockQuery.mockImplementation(routeQuery([], []))

    const plan = await runLeaveApprovalAuthorityRecovery({
      dryRun: false,
      supervisorMemberId: 'daniela-ferreira'
    })

    expect(plan.applied).toBe(true)
    expect(plan.invalidResponsibilities).toHaveLength(0)
    expect(plan.snapshotRepairs).toHaveLength(0)
    expect(mockWithTransaction).not.toHaveBeenCalled()
    expect(mockRevoke).not.toHaveBeenCalled()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('skips a snapshot whose recompute is unchanged (no spurious repair)', async () => {
    // Snapshot ya sano: before == resolver output → no se repara.
    const healthySnapshot = {
      ...driftedSnapshotRow,
      authority_source: 'reporting_hierarchy',
      effective_approver_member_id: 'daniela-ferreira',
      delegate_responsibility_id: null
    }

    mockQuery.mockImplementation(routeQuery([], [healthySnapshot]))

    const plan = await runLeaveApprovalAuthorityRecovery({
      dryRun: true,
      supervisorMemberId: 'daniela-ferreira'
    })

    expect(plan.snapshotRepairs).toHaveLength(0)
  })
})
