/**
 * TASK-998 — test del reader Teams self-serve (bot Graph).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const secretMock = vi.fn()
const graphTokenMock = vi.fn()
const fetchMock = vi.fn()

vi.mock('@/lib/integrations/teams/bot-framework/token-cache', () => ({
  readBotFrameworkSecret: (...a: unknown[]) => secretMock(...a),
  acquireGraphToken: (...a: unknown[]) => graphTokenMock(...a)
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { inspectGroupChatForLinking, isTeamsGroupChatId, listTeamsForLinking, listTeamChannelsForLinking } from './teams-channels-reader'

beforeEach(() => {
  secretMock.mockReset()
  graphTokenMock.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

describe('listTeamsForLinking — TASK-998', () => {
  it('degrada honesto cuando no hay credenciales del bot', async () => {
    secretMock.mockResolvedValueOnce(null)
    const r = await listTeamsForLinking()

    expect(r.ok).toBe(false)
    expect(r.teams).toEqual([])
    expect(graphTokenMock).not.toHaveBeenCalled()
  })

  it('lista equipos ordenados (caso Berel)', async () => {
    secretMock.mockResolvedValueOnce({ clientId: 'c', clientSecret: 's', tenantId: 't' })
    graphTokenMock.mockResolvedValueOnce('graph-token')
    fetchMock.mockResolvedValueOnce(
      okJson({ value: [{ id: '2', displayName: 'Sky - Efeonce' }, { id: '1', displayName: 'Berel - Efeonce' }] })
    )

    const r = await listTeamsForLinking()

    expect(r.ok).toBe(true)
    expect(r.teams.map(t => t.displayName)).toEqual(['Berel - Efeonce', 'Sky - Efeonce'])
    expect(graphTokenMock).toHaveBeenCalledWith({ clientId: 'c', clientSecret: 's', tenantId: 't' })
  })

  it('degrada cuando Graph responde error', async () => {
    secretMock.mockResolvedValueOnce({ clientId: 'c', clientSecret: 's', tenantId: 't' })
    graphTokenMock.mockResolvedValueOnce('graph-token')
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })

    const r = await listTeamsForLinking()

    expect(r.ok).toBe(false)
    expect(r.reason).toContain('403')
  })
})

describe('listTeamChannelsForLinking — TASK-998', () => {
  it('exige teamId', async () => {
    const r = await listTeamChannelsForLinking('  ')

    expect(r.ok).toBe(false)
    expect(secretMock).not.toHaveBeenCalled()
  })

  it('lista canales del equipo (caso Squad Berel)', async () => {
    secretMock.mockResolvedValueOnce({ clientId: 'c', clientSecret: 's', tenantId: 't' })
    graphTokenMock.mockResolvedValueOnce('graph-token')
    fetchMock.mockResolvedValueOnce(okJson({ value: [{ id: '19:abc', displayName: 'Squad Berel' }] }))

    const r = await listTeamChannelsForLinking('team-berel')

    expect(r.ok).toBe(true)
    expect(r.channels).toEqual([{ channelId: '19:abc', displayName: 'Squad Berel' }])
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '')

    expect(url).toContain('/teams/team-berel/channels')
  })
})

describe('inspectGroupChatForLinking — TASK-1852 (read-only, nunca envía)', () => {
  const chatId = '19:1f04b439276946b6b8285e9969bf2d2d@thread.v2'

  it('valida la forma del chat id antes de tocar Graph', async () => {
    expect(isTeamsGroupChatId(chatId)).toBe(true)
    expect(isTeamsGroupChatId('19:abc@thread.tacv2')).toBe(false)
    const r = await inspectGroupChatForLinking('https://teams.microsoft.com/l/chat/19:x@thread.v2', 'bot')

    expect(r).toMatchObject({ ok: false, membership: 'unverified' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('marca verified sólo cuando el bot aparece instalado en el chat, y sólo con GETs', async () => {
    secretMock.mockResolvedValue({ clientId: 'bot-app', clientSecret: 's', tenantId: 't' })
    graphTokenMock.mockResolvedValue('graph-token')
    fetchMock
      .mockResolvedValueOnce(okJson({ id: chatId, chatType: 'group', topic: 'Berel' }))
      .mockResolvedValueOnce(okJson({ value: [{ teamsApp: { id: 'x', externalId: 'bot-app', displayName: 'Greenhouse' } }] }))

    const r = await inspectGroupChatForLinking(chatId, 'bot-app')

    expect(r).toEqual({ ok: true, membership: 'verified', chatType: 'group', topic: 'Berel' })
    for (const call of fetchMock.mock.calls) expect((call[1] as RequestInit | undefined)?.method ?? 'GET').toBe('GET')
    expect(String(fetchMock.mock.calls[1][0])).toContain('/installedApps')
  })

  it('queda unverified con razón cuando Graph deniega o el bot no está en el chat', async () => {
    secretMock.mockResolvedValue({ clientId: 'bot-app', clientSecret: 's', tenantId: 't' })
    graphTokenMock.mockResolvedValue('graph-token')
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })
    await expect(inspectGroupChatForLinking(chatId, 'bot-app')).resolves.toMatchObject({ ok: true, membership: 'unverified', reason: expect.stringContaining('403') })

    fetchMock
      .mockResolvedValueOnce(okJson({ id: chatId, chatType: 'group' }))
      .mockResolvedValueOnce(okJson({ value: [{ teamsApp: { id: 'other', externalId: 'other-app' } }] }))
    await expect(inspectGroupChatForLinking(chatId, 'bot-app')).resolves.toMatchObject({ ok: true, membership: 'unverified', reason: expect.stringContaining('no aparece instalado') })
  })
})

