import { describe, expect, it, vi } from 'vitest'

import {
  buildAuthorizationUrl,
  buildPkceChallenge,
  createPkceVerifier,
  runCreditCapacityStatus,
  runCreditFundingOperationGet,
  runCreditFundingOperationReconcile,
  runCreditFundingOperationsList,
  runOneShotCreditFundingEnsure,
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
      timeoutMs: 1000,
      vercelBypassSecret: 'staging-bypass'
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
    expect(fetchImpl.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-vercel-protection-bypass': 'staging-bypass' })
      })
    )
    expect(fetchImpl.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer opaque-token',
          'idempotency-key': 'propose-key',
          'x-vercel-protection-bypass': 'staging-bypass'
        })
      })
    )
    expect(fetchImpl.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer opaque-token',
          'idempotency-key': 'confirm-key',
          'x-vercel-protection-bypass': 'staging-bypass'
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

  it('adapts status and preview through OAuth bearer requests without an idempotency key', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'status-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: { state: 'ready' } } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'preview-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { preview: { state: 'limited' } } }), { status: 200 }))

    const config = cliConfig(fetchImpl)

    await runCreditCapacityStatus({
      config,
      input: { globeWorkspaceId: 'greenhouse-org:efeonce', requestedCredits: 25 }
    })
    await runCreditCapacityStatus({
      config,
      input: { globeWorkspaceId: 'greenhouse-org:efeonce', requestedCredits: 50 },
      preview: true
    })

    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/status?globeWorkspaceId=greenhouse-org%3Aefeonce&requestedCredits=25'
    )
    expect(fetchImpl.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ authorization: 'Bearer status-token' })
      })
    )
    expect(fetchImpl.mock.calls[1]?.[1]?.headers).not.toEqual(
      expect.objectContaining({ 'idempotency-key': expect.anything() })
    )
    expect(fetchImpl.mock.calls[3]?.[0]).toBe(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/preview'
    )
    expect(fetchImpl.mock.calls[3]?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ globeWorkspaceId: 'greenhouse-org:efeonce', requestedCredits: 50 })
      })
    )
  })

  it('adapts operation list and reconcile with encoded filters and command idempotency', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'list-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { operations: { items: [] } } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'get-token' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { operation: { operationId: 'op/1' } } }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'reconcile-token' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { operation: { operationId: 'op/1' } } }), { status: 200 })
      )

    const config = cliConfig(fetchImpl)

    await runCreditFundingOperationsList({
      config,
      globeWorkspaceId: 'greenhouse-org:efeonce',
      limit: 20,
      state: 'outcome_unknown',
      cursor: 'cursor value'
    })
    await runCreditFundingOperationGet({
      config,
      globeWorkspaceId: 'greenhouse-org:efeonce',
      operationId: 'op/1'
    })
    await runCreditFundingOperationReconcile({
      config,
      globeWorkspaceId: 'greenhouse-org:efeonce',
      operationId: 'op/1',
      idempotencyKey: 'reconcile-key'
    })

    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/operations?globeWorkspaceId=greenhouse-org%3Aefeonce&limit=20&state=outcome_unknown&cursor=cursor+value'
    )
    expect(fetchImpl.mock.calls[3]?.[0]).toBe(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/operations/op%2F1?globeWorkspaceId=greenhouse-org%3Aefeonce'
    )
    expect(fetchImpl.mock.calls[5]?.[0]).toBe(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/operations/op%2F1/reconcile'
    )
    expect(fetchImpl.mock.calls[5]?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer reconcile-token',
          'idempotency-key': 'reconcile-key'
        }),
        body: JSON.stringify({ globeWorkspaceId: 'greenhouse-org:efeonce' })
      })
    )
  })

  it('executes one-shot ensure with only the opaque authority id', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'ensure-token' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { funding: { authorityId: 'authority-1', outcome: 'completed' } }
          }),
          { status: 200 }
        )
      )

    await runOneShotCreditFundingEnsure({ config: cliConfig(fetchImpl), authorityId: 'authority-1' })

    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/ensure'
    )
    expect(fetchImpl.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer ensure-token' }),
        body: JSON.stringify({ authorityId: 'authority-1' })
      })
    )
  })
})

const cliConfig = (fetchImpl: ReturnType<typeof vi.fn>) => ({
  apiBaseUrl: 'https://greenhouse.example.test',
  clientId: 'public-cli',
  scope: 'openid globe.credits.funding.read globe.credits.funding.reconcile',
  authorizeUrl: 'https://greenhouse.example.test/authorize',
  tokenUrl: 'https://greenhouse.example.test/token',
  openBrowser: vi.fn(async (url: string) => {
    const parsed = new URL(url)
    const callback = parsed.searchParams.get('redirect_uri')

    if (!callback) throw new Error('missing_callback')
    await fetch(`${callback}?code=test-code&state=${parsed.searchParams.get('state')}`)
  }),
  fetchImpl: fetchImpl as unknown as typeof fetch,
  timeoutMs: 1000
})
