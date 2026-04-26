import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const resolveSecretByRefMock = vi.fn()

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecretByRef: (...args: unknown[]) => resolveSecretByRefMock(...args)
}))

const {
  acquireBotFrameworkToken,
  readBotFrameworkSecret,
  __resetBotFrameworkTokenCache,
  BotFrameworkTokenError
} = await import('@/lib/integrations/teams/bot-framework/token-cache')

describe('readBotFrameworkSecret', () => {
  beforeEach(() => {
    resolveSecretByRefMock.mockReset()
  })

  it('parses valid JSON blob', async () => {
    resolveSecretByRefMock.mockResolvedValueOnce(
      JSON.stringify({ clientId: 'a', clientSecret: 'b', tenantId: 'c' })
    )

    const blob = await readBotFrameworkSecret('greenhouse-teams-bot')

    expect(blob).toEqual({ clientId: 'a', clientSecret: 'b', tenantId: 'c' })
  })

  it('returns null when secret_ref is empty', async () => {
    resolveSecretByRefMock.mockResolvedValueOnce(null)

    expect(await readBotFrameworkSecret('greenhouse-teams-bot')).toBeNull()
  })

  it('returns null when JSON is malformed', async () => {
    resolveSecretByRefMock.mockResolvedValueOnce('not json')

    expect(await readBotFrameworkSecret('greenhouse-teams-bot')).toBeNull()
  })

  it('returns null when required keys are missing', async () => {
    resolveSecretByRefMock.mockResolvedValueOnce(JSON.stringify({ clientId: 'a' }))

    expect(await readBotFrameworkSecret('greenhouse-teams-bot')).toBeNull()
  })
})

describe('acquireBotFrameworkToken', () => {
  beforeEach(() => {
    __resetBotFrameworkTokenCache()
  })

  afterEach(() => {
    __resetBotFrameworkTokenCache()
  })

  it('returns access token from a 200 response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'token-123', expires_in: 3600 }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const token = await acquireBotFrameworkToken({
      tenantId: 'tenant-a',
      clientId: 'client-a',
      clientSecret: 'secret',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(token).toBe('token-123')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('caches the token across calls until 60s before expiry', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'token-cached', expires_in: 3600 }), { status: 200 })
    )

    let now = 1_000_000

    const params = {
      tenantId: 't',
      clientId: 'c',
      clientSecret: 's',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => now
    }

    await acquireBotFrameworkToken(params)
    await acquireBotFrameworkToken(params)

    expect(fetchImpl).toHaveBeenCalledTimes(1)

    // Advance to 60s before expiry — should refresh.
    now += (3600 - 60 + 1) * 1_000

    fetchImpl.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'token-refreshed', expires_in: 3600 }), { status: 200 })
    )

    const refreshed = await acquireBotFrameworkToken(params)

    expect(refreshed).toBe('token-refreshed')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('throws BotFrameworkTokenError on 401', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('invalid_client', { status: 401 }))

    await expect(
      acquireBotFrameworkToken({
        tenantId: 't',
        clientId: 'c',
        clientSecret: 's',
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).rejects.toBeInstanceOf(BotFrameworkTokenError)
  })

  it('throws when access_token is missing in the response body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ expires_in: 3600 }), { status: 200 })
    )

    await expect(
      acquireBotFrameworkToken({
        tenantId: 't',
        clientId: 'c',
        clientSecret: 's',
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).rejects.toBeInstanceOf(BotFrameworkTokenError)
  })
})
