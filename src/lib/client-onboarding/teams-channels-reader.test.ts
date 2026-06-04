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

import { listTeamsForLinking, listTeamChannelsForLinking } from './teams-channels-reader'

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
