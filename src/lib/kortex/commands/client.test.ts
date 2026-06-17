import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.KORTEX_COMMAND_API_BASE_URL
  delete process.env.KORTEX_COMMAND_ADMIN_TOKEN
})

describe('Kortex command client allowlist', () => {
  it('allowlists only fixed Kortex command registry paths', async () => {
    const { isAllowedKortexCommandPath } = await import('./client')

    expect(isAllowedKortexCommandPath('/api/v1/strategy/conversations')).toBe(true)
    expect(isAllowedKortexCommandPath('/api/v1/strategy/workspaces/workspace-1/approval-decisions')).toBe(true)
    expect(isAllowedKortexCommandPath('/api/v1/strategy/release-candidates/rc-1/execute-custom-objects')).toBe(true)
    expect(isAllowedKortexCommandPath('/api/v1/portals/48713323/hub-profile')).toBe(true)
    expect(isAllowedKortexCommandPath('/api/v1/evil')).toBe(false)
    expect(isAllowedKortexCommandPath('/api/v1/strategy/workspaces/workspace-1/delete')).toBe(false)
  })

  it('sends the Kortex admin bootstrap token only for admin-breakglass commands', async () => {
    process.env.KORTEX_COMMAND_API_BASE_URL = 'https://kortex.example.test'
    process.env.KORTEX_COMMAND_ADMIN_TOKEN = 'admin-token-1'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ status: 'ok' })
    })

    vi.stubGlobal('fetch', fetchMock)

    const { fetchKortexCommandJson } = await import('./client')

    await fetchKortexCommandJson({
      method: 'POST',
      path: '/api/v1/admin/snapshots/trigger',
      body: {},
      commandName: 'kortex.admin.snapshots.trigger',
      idempotencyKey: 'idem-admin',
      actorUserId: 'user-1'
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://kortex.example.test/api/v1/admin/snapshots/trigger',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Kortex-Admin-Token': 'admin-token-1' })
      })
    )
  })
})
