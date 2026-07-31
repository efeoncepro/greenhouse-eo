import { describe, expect, it, vi } from 'vitest'

import {
  buildAuthorizationUrl,
  buildPkceChallenge,
  createPkceVerifier,
  runFundingFlow,
  validateFundingInput
} from './globe-credit-funding'

describe('Globe credit funding CLI', () => {
  it('builds an S256 authorization request for an exact loopback callback', () => {
    const verifier = createPkceVerifier()

    const url = new URL(
      buildAuthorizationUrl({
        authorizeUrl: 'https://greenhouse.example.test/api/auth/sister-platforms/authorize',
        clientId: 'globe-admin-cli',
        redirectUri: 'http://127.0.0.1:43123/oauth/callback',
        state: 'state',
        nonce: 'nonce',
        scope: 'openid globe.credits.funding.propose globe.credits.funding.confirm',
        codeChallenge: buildPkceChallenge(verifier)
      })
    )

    expect(url.searchParams.get('client_id')).toBe('globe-admin-cli')
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:43123/oauth/callback')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe(buildPkceChallenge(verifier))
    expect(url.searchParams.get('state')).toBe('state')
  })

  it('validates typed funding input and rejects caller-supplied identity fields', () => {
    expect(
      validateFundingInput({
        globeWorkspaceId: 'greenhouse-org:efeonce',
        poolId: 'pool-main',
        grantCredits: 100,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-09-01T00:00:00.000Z',
        actor: { userId: 'forged' }
      })
    ).toEqual({
      globeWorkspaceId: 'greenhouse-org:efeonce',
      poolId: 'pool-main',
      grantCredits: 100,
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-09-01T00:00:00.000Z'
    })

    expect(() => validateFundingInput({ grantCredits: -1 })).toThrow('missing:periodStart')
  })

  it('uses distinct idempotency keys for propose and confirm and never sends a secret', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'opaque-token' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { proposal: { proposalId: 'p-1', fingerprint: 'f-1', plan: { grantCredits: 100 } } }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { outcome: { state: 'completed' } } }), { status: 200 })
      )

    const config = {
      apiBaseUrl: 'https://greenhouse.example.test',
      clientId: 'public-cli',
      scope: 'openid globe.credits.funding.propose globe.credits.funding.confirm',
      authorizeUrl: 'https://greenhouse.example.test/authorize',
      tokenUrl: 'https://greenhouse.example.test/token',
      openBrowser: vi.fn(async (url: string) => {
        const callback = new URL(url).searchParams.get('redirect_uri')

        if (!callback) throw new Error('missing_callback')
        await fetch(`${callback}?code=test-code&state=${new URL(url).searchParams.get('state')}`)
      }),
      fetchImpl,
      timeoutMs: 1000
    }

    const result = await runFundingFlow({
      config,
      input: {
        globeWorkspaceId: 'greenhouse-org:efeonce',
        poolId: 'pool-main',
        grantCredits: 100,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-09-01T00:00:00.000Z'
      },
      proposeIdempotencyKey: 'propose-key',
      confirmIdempotencyKey: 'confirm-key',
      confirm: async () => true
    })

    expect(result.confirmed).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(fetchImpl.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer opaque-token',
          'idempotency-key': 'propose-key'
        })
      })
    )
    expect(fetchImpl.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer opaque-token',
          'idempotency-key': 'confirm-key'
        })
      })
    )
    expect(fetchImpl.mock.calls[0]?.[1]).not.toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ 'client-secret': expect.anything() })
      })
    )
  })

  it('rejects equal idempotency keys before opening OAuth', async () => {
    const openBrowser = vi.fn()

    await expect(
      runFundingFlow({
        config: {
          apiBaseUrl: 'https://greenhouse.example.test',
          clientId: 'public-cli',
          scope: 'openid',
          authorizeUrl: 'https://greenhouse.example.test/authorize',
          tokenUrl: 'https://greenhouse.example.test/token',
          openBrowser,
          fetchImpl: vi.fn(),
          timeoutMs: 1000
        },
        input: {
          globeWorkspaceId: 'greenhouse-org:efeonce',
          poolId: 'pool-main',
          grantCredits: 100,
          periodStart: '2026-08-01T00:00:00.000Z',
          periodEnd: '2026-09-01T00:00:00.000Z'
        },
        proposeIdempotencyKey: 'same-key',
        confirmIdempotencyKey: 'same-key',
        confirm: async () => true
      })
    ).rejects.toThrow('idempotency_keys_must_be_distinct')

    expect(openBrowser).not.toHaveBeenCalled()
  })
})
