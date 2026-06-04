import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
const readBotMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...a: unknown[]) => queryMock(...a)
}))
vi.mock('@/lib/integrations/teams/bot-framework/token-cache', () => ({
  readBotFrameworkSecret: (...a: unknown[]) => readBotMock(...a)
}))
vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { writeTeamsChannelFromAnchor } from './teams-connect-store'

beforeEach(() => {
  vi.clearAllMocks()
  readBotMock.mockResolvedValue({ clientId: 'bot-app-123', clientSecret: 'x', tenantId: 'tenant-abc' })
})

describe('writeTeamsChannelFromAnchor (TASK-1010)', () => {
  it('degrada honesto SIN escribir cuando el anchor no tiene channelId (CHECK exige channel_id para teams_bot)', async () => {
    const res = await writeTeamsChannelFromAnchor('space-cli-abc', { teamId: 't1', teamName: 'Berel - Efeonce' })

    expect(res.ok).toBe(false)
    expect(res.reason).toBe('channel_pending')
    expect(queryMock).not.toHaveBeenCalled()
    expect(readBotMock).not.toHaveBeenCalled()
  })

  it('degrada cuando el secret del bot no se resuelve (sin romper el alta)', async () => {
    readBotMock.mockResolvedValueOnce(null)

    const res = await writeTeamsChannelFromAnchor('space-cli-abc', { teamId: 't1', teamName: 'Berel', channelId: 'c1' })

    expect(res.ok).toBe(false)
    expect(res.reason).toBe('bot_secret_unavailable')
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('UPSERT canónico con channel_code determinístico + bot_app_id/tenant del secret', async () => {
    queryMock.mockResolvedValueOnce([{ channel_code: 'client-teams-space-cli-abc' }])

    const res = await writeTeamsChannelFromAnchor(
      'space-cli-ABC_123',
      { teamId: 't1', teamName: 'Berel', channelId: 'c1', channelName: 'Squad' }
    )

    expect(res.ok).toBe(true)
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]

    expect(sql).toContain('greenhouse_core.teams_notification_channels')
    expect(sql).toContain("'teams_bot'")
    expect(sql).toContain('ON CONFLICT (channel_code)')
    // channel_code determinístico, sanitizado a ^[a-z0-9-]+$
    expect(params[0]).toBe('client-teams-space-cli-abc-123')
    expect(/^[a-z0-9-]+$/.test(params[0] as string)).toBe(true)
    // bot_app_id + tenant vienen del secret; space_id scopeado
    expect(params[3]).toBe('bot-app-123') // bot_app_id
    expect(params[4]).toBe('t1') // team_id
    expect(params[5]).toBe('c1') // channel_id
    expect(params[6]).toBe('tenant-abc') // azure_tenant_id
    expect(params[7]).toBe('space-cli-ABC_123') // space_id (original, sin sanitizar)
  })
})
