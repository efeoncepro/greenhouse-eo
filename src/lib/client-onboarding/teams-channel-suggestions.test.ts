/**
 * TASK-997 Slice 4 — test del suggest reader de equipos Teams (Graph).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const readSecretMock = vi.fn()
const acquireGraphTokenMock = vi.fn()

vi.mock('@/lib/integrations/teams/bot-framework/token-cache', () => ({
  readBotFrameworkSecret: (...args: unknown[]) => readSecretMock(...args),
  acquireGraphToken: (...args: unknown[]) => acquireGraphTokenMock(...args)
}))

import { listTeamsChannelSuggestions } from './teams-channel-suggestions'

beforeEach(() => {
  readSecretMock.mockReset()
  acquireGraphTokenMock.mockReset()
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('listTeamsChannelSuggestions — TASK-997 Slice 4', () => {
  it('devuelve [] sin tocar Graph cuando la query es corta', async () => {
    expect(await listTeamsChannelSuggestions('x')).toEqual([])
    expect(readSecretMock).not.toHaveBeenCalled()
  })

  it('lanza cuando faltan credenciales del bot (→ endpoint degrada)', async () => {
    readSecretMock.mockResolvedValueOnce(null)
    await expect(listTeamsChannelSuggestions('Berel')).rejects.toThrow('teams_bot_credentials_unavailable')
  })

  it('mapea groups (Teams) → {teamId, teamName}', async () => {
    readSecretMock.mockResolvedValueOnce({ clientId: 'c', clientSecret: 's', tenantId: 't' })
    acquireGraphTokenMock.mockResolvedValueOnce('graph-token')
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [{ id: 'team-1', displayName: 'Grupo Berel' }] })
    })

    const rows = await listTeamsChannelSuggestions('Berel')

    expect(rows).toEqual([{ teamId: 'team-1', teamName: 'Grupo Berel' }])
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]

    expect(String(url)).toContain('graph.microsoft.com/v1.0/groups')
    expect((init as { headers: Record<string, string> }).headers.Authorization).toBe('Bearer graph-token')
    expect((init as { headers: Record<string, string> }).headers.ConsistencyLevel).toBe('eventual')
  })

  it('lanza cuando Graph responde no-ok (→ endpoint degrada)', async () => {
    readSecretMock.mockResolvedValueOnce({ clientId: 'c', clientSecret: 's', tenantId: 't' })
    acquireGraphTokenMock.mockResolvedValueOnce('graph-token')
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 403 })

    await expect(listTeamsChannelSuggestions('Berel')).rejects.toThrow('graph_groups_search_failed_403')
  })
})
