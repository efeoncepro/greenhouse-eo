import { beforeEach, describe, expect, it, vi } from 'vitest'

const runQueryMock = vi.fn<(sql: string, params: unknown[]) => Promise<unknown[]>>()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (sql: string, params: unknown[]) => runQueryMock(sql, params),
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false
}))

vi.mock('@/lib/payroll/exit-eligibility', () => ({
  isPayrollExitEligibilityWindowEnabled: () => true
}))

vi.mock('@/lib/payroll/participation-window', () => ({
  isPayrollParticipationWindowEnabled: () => true
}))

import {
  FORCE_RECOMPUTE_MIN_REASON_CHARS,
  PayrollForceRecomputeAuditError,
  recordPayrollForceRecomputeAudit
} from './force-recompute-audit'

const buildDbRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  audit_id: '11111111-2222-3333-4444-555555555555',
  target_kind: 'period',
  target_period_id: 'period-2026-05',
  target_entry_id: null,
  target_member_id: null,
  actor_user_id: 'user-admin-1',
  reason: 'Reabrir mayo para corregir boleta de Felipe (incidente prod 2026-05-20)',
  flag_state_snapshot: {
    PAYROLL_PARTICIPATION_WINDOW_ENABLED: true,
    PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED: true,
    capturedAt: '2026-05-16T10:00:00.000Z'
  },
  effective_at: '2026-05-16T10:00:00.000Z',
  created_at: '2026-05-16T10:00:00.000Z',
  ...overrides
})

beforeEach(() => {
  runQueryMock.mockReset()
})

describe('recordPayrollForceRecomputeAudit', () => {
  it('inserts audit row for period target with valid reason', async () => {
    runQueryMock.mockResolvedValueOnce([buildDbRow()])

    const result = await recordPayrollForceRecomputeAudit({
      targetKind: 'period',
      targetPeriodId: 'period-2026-05',
      actorUserId: 'user-admin-1',
      reason: 'Reabrir mayo para corregir boleta de Felipe (incidente prod 2026-05-20)'
    })

    expect(result.auditId).toBe('11111111-2222-3333-4444-555555555555')
    expect(result.targetKind).toBe('period')
    expect(result.targetPeriodId).toBe('period-2026-05')
    expect(result.flagStateSnapshot).toMatchObject({
      PAYROLL_PARTICIPATION_WINDOW_ENABLED: true
    })

    expect(runQueryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = runQueryMock.mock.calls[0]

    expect(sql).toContain('member_payroll_force_recompute_audit_log')
    expect(params[1]).toBe('period') /* target_kind */
    expect(params[2]).toBe('period-2026-05') /* target_period_id */
  })

  it('rejects reason shorter than the canonical minimum (20 chars)', async () => {
    await expect(
      recordPayrollForceRecomputeAudit({
        targetKind: 'period',
        targetPeriodId: 'period-2026-05',
        actorUserId: 'user-admin-1',
        reason: 'Too short'
      })
    ).rejects.toThrow(PayrollForceRecomputeAuditError)

    expect(runQueryMock).not.toHaveBeenCalled()
  })

  it('rejects reason that is whitespace-padded below threshold', async () => {
    await expect(
      recordPayrollForceRecomputeAudit({
        targetKind: 'period',
        targetPeriodId: 'period-2026-05',
        actorUserId: 'user-admin-1',
        reason: '    short    '
      })
    ).rejects.toThrow(/at least 20 chars/)
  })

  it('rejects when actor user id is empty', async () => {
    await expect(
      recordPayrollForceRecomputeAudit({
        targetKind: 'period',
        targetPeriodId: 'period-2026-05',
        actorUserId: '',
        reason: 'Reabrir mayo para corregir boleta de Felipe (incidente prod 2026-05-20)'
      })
    ).rejects.toThrow(/actor_user_id is required/)

    expect(runQueryMock).not.toHaveBeenCalled()
  })

  it('inserts audit row for entry target with member id', async () => {
    runQueryMock.mockResolvedValueOnce([
      buildDbRow({
        target_kind: 'entry',
        target_period_id: 'period-2026-05',
        target_entry_id: 'entry-felipe-2026-05',
        target_member_id: 'member-felipe'
      })
    ])

    const result = await recordPayrollForceRecomputeAudit({
      targetKind: 'entry',
      targetEntryId: 'entry-felipe-2026-05',
      targetMemberId: 'member-felipe',
      targetPeriodId: 'period-2026-05',
      actorUserId: 'user-admin-1',
      reason: 'Re-emitir boleta honorarios de Felipe con bruto prorrateado correcto'
    })

    expect(result.targetKind).toBe('entry')
    expect(result.targetEntryId).toBe('entry-felipe-2026-05')
    expect(result.targetMemberId).toBe('member-felipe')

    const [, params] = runQueryMock.mock.calls[0]

    expect(params[1]).toBe('entry') /* target_kind */
    expect(params[3]).toBe('entry-felipe-2026-05') /* target_entry_id */
    expect(params[4]).toBe('member-felipe') /* target_member_id */
  })

  it('serializes flag state snapshot + metadata as JSON strings for the SQL bind', async () => {
    runQueryMock.mockResolvedValueOnce([buildDbRow()])

    await recordPayrollForceRecomputeAudit({
      targetKind: 'period',
      targetPeriodId: 'period-2026-05',
      actorUserId: 'user-admin-1',
      reason: 'Forzar recompute mayo bajo flag participation activado el 20',
      metadata: { incident_ref: 'INC-2026-05-20' }
    })

    const [, params] = runQueryMock.mock.calls[0]

    /* params[8] = flag_state_snapshot JSON string */
    expect(typeof params[8]).toBe('string')
    expect(JSON.parse(params[8] as string)).toMatchObject({
      PAYROLL_PARTICIPATION_WINDOW_ENABLED: true,
      PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED: true
    })
    /* params[11] = metadata JSON string */
    expect(typeof params[11]).toBe('string')
    expect(JSON.parse(params[11] as string)).toMatchObject({ incident_ref: 'INC-2026-05-20' })
  })

  it('exposes the canonical minimum reason length constant', () => {
    expect(FORCE_RECOMPUTE_MIN_REASON_CHARS).toBe(20)
  })
})
