import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const resolveMock = vi.fn()

vi.mock('@/lib/home/rollout-flags', () => ({
  resolveHomeRolloutFlag: (...args: unknown[]) => resolveMock(...args)
}))

const { isWorkspaceShellEnabledForSubject } = await import('./index')

const subject = { userId: 'user-1', tenantId: 'tenant-a', roleCodes: ['efeonce_admin'] }

describe('TASK-612 Slice 4 — isWorkspaceShellEnabledForSubject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses flag_key organization_workspace_shell_agency for agency scope', async () => {
    resolveMock.mockResolvedValueOnce({ enabled: true, source: 'pg', scopeType: 'global' })

    const result = await isWorkspaceShellEnabledForSubject(subject, 'agency')

    expect(result).toBe(true)
    expect(resolveMock).toHaveBeenCalledWith('organization_workspace_shell_agency', subject)
  })

  it('uses flag_key organization_workspace_shell_finance for finance scope', async () => {
    resolveMock.mockResolvedValueOnce({ enabled: false, source: 'pg', scopeType: 'global' })

    const result = await isWorkspaceShellEnabledForSubject(subject, 'finance')

    expect(result).toBe(false)
    expect(resolveMock).toHaveBeenCalledWith('organization_workspace_shell_finance', subject)
  })

  it('returns false (default disabled) when resolver returns enabled=false', async () => {
    resolveMock.mockResolvedValueOnce({ enabled: false, source: 'default', scopeType: null })

    const result = await isWorkspaceShellEnabledForSubject(subject, 'agency')

    expect(result).toBe(false)
  })

  it('forwards full subject (userId + tenantId + roleCodes) to resolveHomeRolloutFlag', async () => {
    resolveMock.mockResolvedValueOnce({ enabled: true, source: 'pg', scopeType: 'role' })

    await isWorkspaceShellEnabledForSubject(subject, 'agency')

    const passedSubject = resolveMock.mock.calls[0][1]

    expect(passedSubject).toEqual(subject)
  })
})
