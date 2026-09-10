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
const inspectMock = vi.fn()

vi.mock('./teams-channels-reader', () => ({
  inspectGroupChatForLinking: (...a: unknown[]) => inspectMock(...a),
  isTeamsGroupChatId: (value: string) => /^19:[A-Za-z0-9_-]+@thread\.v2$/.test(value.trim())
}))

import { writeTeamsChannelFromAnchor, writeTeamsGroupChatForSpace } from './teams-connect-store'

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

describe('writeTeamsGroupChatForSpace (TASK-1852)', () => {
  const chatId = '19:1f04b439276946b6b8285e9969bf2d2d@thread.v2'

  it('rechaza un identificador que no es un chat grupal sin tocar secretos ni PostgreSQL', async () => {
    const res = await writeTeamsGroupChatForSpace('space-cli-abc', { chatId: '19:abc@thread.tacv2', displayName: 'Berel' })

    expect(res).toEqual({ ok: false, reason: 'invalid_chat_id' })
    expect(readBotMock).not.toHaveBeenCalled()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('persiste chat_group como ready sólo cuando Graph confirma que el bot está instalado', async () => {
    inspectMock.mockResolvedValueOnce({ ok: true, membership: 'verified', chatType: 'group', topic: 'Berel' })
    queryMock.mockResolvedValueOnce([{ channel_code: 'client-teams-chat-space-cli-abc' }])

    const res = await writeTeamsGroupChatForSpace('space-cli-ABC', { chatId, displayName: 'Grupo Berel' })

    expect(res).toMatchObject({ ok: true, channelCode: 'client-teams-chat-space-cli-abc', provisioningStatus: 'ready', membership: 'verified' })
    expect(inspectMock).toHaveBeenCalledWith(chatId, 'bot-app-123')
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]

    expect(sql).toContain("'chat_group'")
    expect(sql).not.toContain('team_id')
    expect(params).toEqual(['client-teams-chat-space-cli-abc', 'Teams chat — Grupo Berel', 'greenhouse-teams-bot-client-credentials', 'bot-app-123', 'tenant-abc', chatId, 'ready', null, 'space-cli-ABC'])
  })

  it('degrada a pending_setup con la razón persistida cuando la pertenencia del bot no se confirma', async () => {
    inspectMock.mockResolvedValueOnce({ ok: true, membership: 'unverified', reason: 'Microsoft Graph respondió 403 al listar las apps del chat; la pertenencia del bot no se pudo confirmar.' })
    queryMock.mockResolvedValueOnce([{ channel_code: 'client-teams-chat-space-cli-abc' }])

    const res = await writeTeamsGroupChatForSpace('space-cli-abc', { chatId, displayName: 'Grupo Berel' })

    expect(res).toMatchObject({ ok: true, provisioningStatus: 'pending_setup', membership: 'unverified' })
    const [, params] = queryMock.mock.calls[0] as [string, unknown[]]

    expect(params[6]).toBe('pending_setup')
    expect(String(params[7])).toContain('403')
  })

  it('no escribe cuando falta el secret del bot y reporta persist_failed sin lanzar', async () => {
    readBotMock.mockResolvedValueOnce(null)
    await expect(writeTeamsGroupChatForSpace('space-cli-abc', { chatId, displayName: 'Berel' })).resolves.toEqual({ ok: false, reason: 'bot_secret_unavailable' })

    inspectMock.mockResolvedValueOnce({ ok: true, membership: 'verified' })
    queryMock.mockRejectedValueOnce(new Error('boom'))
    await expect(writeTeamsGroupChatForSpace('space-cli-abc', { chatId, displayName: 'Berel' })).resolves.toEqual({ ok: false, reason: 'persist_failed' })
  })
})

