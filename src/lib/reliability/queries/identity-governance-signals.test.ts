import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

const captureMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

const {
  getIdentityGovernanceAuditLogWriteFailuresSignal,
  getIdentityGovernancePendingApprovalOverdueSignal,
  IDENTITY_GOVERNANCE_AUDIT_LOG_WRITE_FAILURES_SIGNAL_ID,
  IDENTITY_GOVERNANCE_PENDING_APPROVAL_OVERDUE_SIGNAL_ID
} = await import('./identity-governance-signals')

describe('TASK-839 — identity governance reliability signals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports audit log write failures as error when outbox events lack audit rows', async () => {
    queryMock.mockResolvedValueOnce([{ n: '2' }])

    const signal = await getIdentityGovernanceAuditLogWriteFailuresSignal()

    expect(signal.signalId).toBe(IDENTITY_GOVERNANCE_AUDIT_LOG_WRITE_FAILURES_SIGNAL_ID)
    expect(signal.moduleKey).toBe('identity')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('2 governance outbox events')
  })

  it('reports audit log write failures as ok at steady state', async () => {
    queryMock.mockResolvedValueOnce([{ n: '0' }])

    const signal = await getIdentityGovernanceAuditLogWriteFailuresSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'missing_audit_count', value: '0' })
      ])
    )
  })

  it('reports pending approvals older than seven days as warning', async () => {
    queryMock.mockResolvedValueOnce([{ n: '1' }])

    const signal = await getIdentityGovernancePendingApprovalOverdueSignal()

    expect(signal.signalId).toBe(IDENTITY_GOVERNANCE_PENDING_APPROVAL_OVERDUE_SIGNAL_ID)
    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('1 sensitive entitlement override')
  })

  it('degrades honestly when the query fails', async () => {
    queryMock.mockRejectedValueOnce(new Error('db unavailable'))

    const signal = await getIdentityGovernancePendingApprovalOverdueSignal()

    expect(signal.severity).toBe('unknown')
    expect(captureMock).toHaveBeenCalledWith(
      expect.any(Error),
      'identity',
      expect.objectContaining({
        tags: { source: 'reliability_signal_identity_governance_pending_approval_overdue' }
      })
    )
  })
})
