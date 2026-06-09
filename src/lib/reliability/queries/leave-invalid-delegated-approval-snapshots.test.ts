import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const { getLeaveInvalidDelegatedApprovalSnapshotsSignal } = await import(
  './leave-invalid-delegated-approval-snapshots'
)

describe('hr.leave.invalid_delegated_approval_snapshots signal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is ok (steady) when count is 0', async () => {
    mockQuery.mockResolvedValue([{ n: 0 }])

    const signal = await getLeaveInvalidDelegatedApprovalSnapshotsSignal()

    expect(signal.signalId).toBe('hr.leave.invalid_delegated_approval_snapshots')
    expect(signal.moduleKey).toBe('identity')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('ok')
  })

  it('is error when count > 0', async () => {
    mockQuery.mockResolvedValue([{ n: 2 }])

    const signal = await getLeaveInvalidDelegatedApprovalSnapshotsSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('2 snapshots')
  })

  it('parametrizes by the no-honor effective_supervisor stages from config', async () => {
    mockQuery.mockResolvedValue([{ n: 0 }])

    const signal = await getLeaveInvalidDelegatedApprovalSnapshotsSignal()
    const stagesEvidence = signal.evidence.find(item => item.label === 'stages_no_honor')?.value ?? ''

    expect(stagesEvidence).toContain('leave.supervisor_review')
    expect(stagesEvidence).toContain('expense_report.supervisor_review')
    expect(stagesEvidence).toContain('performance_evaluation.supervisor_review')

    // El reader pasa los pares (workflow, stage) como dos arrays al unnest.
    const [, params] = mockQuery.mock.calls[0] as [string, [string[], string[]]]

    expect(params[0]).toEqual(expect.arrayContaining(['leave', 'expense_report', 'performance_evaluation']))
    expect(params[1].every(stage => stage === 'supervisor_review')).toBe(true)
  })

  it('degrades honestly to unknown when the query fails', async () => {
    mockQuery.mockRejectedValue(new Error('boom'))

    const signal = await getLeaveInvalidDelegatedApprovalSnapshotsSignal()

    expect(signal.severity).toBe('unknown')
  })
})
