import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

const captureMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

import {
  OFFBOARDING_EXECUTED_MEMBER_STILL_ACTIVE_SIGNAL_ID,
  OFFBOARDING_UNRESOLVED_EXIT_SIGNAL_ID,
  WORKFORCE_DEPROVISIONED_MEMBER_WITHOUT_CASE_SIGNAL_ID,
  getOffboardingExecutedMemberStillActiveSignal,
  getOffboardingUnresolvedExitSignal,
  getWorkforceDeprovisionedMemberWithoutCaseSignal
} from './offboarding-exit-drift'

beforeEach(() => {
  queryMock.mockReset()
  captureMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('TASK-1349 exit drift signals', () => {
  it('unresolved_exit_signal: 0 → ok, 1..3 → warning, >3 → error; SQL ignores access_only reviews and future signals', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    expect((await getOffboardingUnresolvedExitSignal()).severity).toBe('ok')

    queryMock.mockResolvedValueOnce([{ n: 2 }])
    const warning = await getOffboardingUnresolvedExitSignal()

    expect(warning.severity).toBe('warning')
    expect(warning.signalId).toBe(OFFBOARDING_UNRESOLVED_EXIT_SIGNAL_ID)
    expect(warning.summary).toContain('2 casos')

    queryMock.mockResolvedValueOnce([{ n: 4 }])
    expect((await getOffboardingUnresolvedExitSignal()).severity).toBe('error')

    const sql = String(queryMock.mock.calls[0][0])

    expect(sql).toContain("c.status IN ('draft', 'needs_review', 'blocked')")
    expect(sql).toContain("COALESCE(c.last_working_day, c.effective_date, c.created_at::date) <= CURRENT_DATE")
    expect(sql).toContain("<> 'access_only'")
    expect(sql).toContain("x.status = 'executed'")
  })

  it('executed_member_still_active: counts executed real exits with active members, never identity_only, never re-entries', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])
    const signal = await getOffboardingExecutedMemberStillActiveSignal()

    expect(signal.signalId).toBe(OFFBOARDING_EXECUTED_MEMBER_STILL_ACTIVE_SIGNAL_ID)
    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('3 salidas ejecutadas')

    const sql = String(queryMock.mock.calls[0][0])

    expect(sql).toContain("c.rule_lane <> 'identity_only'")
    expect(sql).toContain('m.active = TRUE')
    expect(sql).toContain('cv.effective_from > c.last_working_day')
  })

  it('deprovisioned_member_without_case: detection only over internal accounts', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1 }])
    const signal = await getWorkforceDeprovisionedMemberWithoutCaseSignal()

    expect(signal.signalId).toBe(WORKFORCE_DEPROVISIONED_MEMBER_WITHOUT_CASE_SIGNAL_ID)
    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('no se infiere salida laboral')

    const sql = String(queryMock.mock.calls[0][0])

    expect(sql).toContain("cu.tenant_type = 'efeonce_internal'")
    expect(sql).toContain('cu.active = FALSE')
    expect(sql).toContain("c.status <> 'cancelled'")
  })

  it('degrades honestly to unknown when the query fails', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))
    const signal = await getOffboardingUnresolvedExitSignal()

    expect(signal.severity).toBe('unknown')
    expect(captureMock).toHaveBeenCalledTimes(1)
  })
})
