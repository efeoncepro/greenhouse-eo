import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const broker = vi.hoisted(() => ({
  consume: vi.fn(),
  audit: vi.fn(async () => undefined),
  metadata: vi.fn(() => ({ correlationId: 'correlation-1', ipHash: null, userAgentHash: null }))
}))

const exchange = vi.hoisted(() => ({ run: vi.fn() }))

vi.mock('@/lib/sister-platforms/oauth-broker', () => ({
  consumeSisterPlatformAuthorizationCode: broker.consume,
  getOAuthRequestAuditMetadata: broker.metadata,
  recordSisterPlatformOAuthAuditEvent: broker.audit,
  SisterPlatformOAuthError: class SisterPlatformOAuthError extends Error {
    constructor(
      message: string,
      readonly options: { statusCode?: number; errorCode?: string } = {}
    ) {
      super(message)
    }

    get statusCode() {
      return this.options.statusCode ?? 400
    }

    get errorCode() {
      return this.options.errorCode ?? 'invalid_request'
    }
  }
}))
vi.mock('@/lib/sister-platforms/mcp-token-exchange', () => ({
  exchangeMcpGatewayToken: exchange.run,
  McpTokenExchangeError: class McpTokenExchangeError extends Error {
    constructor(
      readonly code: string,
      readonly statusCode = 400
    ) {
      super(code)
    }
  },
  RFC8693_TOKEN_EXCHANGE_GRANT: 'urn:ietf:params:oauth:grant-type:token-exchange',
  RFC8693_ACCESS_TOKEN_TYPE: 'urn:ietf:params:oauth:token-type:access_token'
}))

import { POST } from './route'

const tokenExchangeForm = () =>
  new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    client_id: 'efeonce-mcp-gateway',
    subject_token: 'entra-access-token',
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    scope: 'globe.credits.funding.ensure'
  })

describe('sister-platform token endpoint RFC8693 grant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    exchange.run.mockResolvedValue({
      accessTokenId: 'spoauth-token-1',
      accessToken: 'opaque-token',
      correlationId: 'correlation-1',
      expiresIn: 300,
      scope: 'globe.credits.funding.ensure'
    })
  })

  it('keeps workload and subject tokens in separate fields and returns a narrowed opaque token', async () => {
    const request = new Request(
      'https://greenhouse.example.test/api/integrations/v1/sister-platforms/oauth/token',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer google-workload-id-token',
          'content-type': 'application/x-www-form-urlencoded'
        },
        body: tokenExchangeForm()
      }
    )

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(exchange.run).toHaveBeenCalledWith(
      expect.objectContaining({
        workloadToken: 'google-workload-id-token',
        subjectToken: 'entra-access-token',
        clientId: 'efeonce-mcp-gateway',
        requestedScope: 'globe.credits.funding.ensure'
      })
    )
    expect(body).toEqual({
      token_type: 'Bearer',
      issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      access_token: 'opaque-token',
      expires_in: 300,
      scope: 'globe.credits.funding.ensure',
      correlation_id: 'correlation-1'
    })
    expect(JSON.stringify(body)).not.toContain('spoauth-token-1')
  })

  it('rejects JSON for the RFC8693 grant so subject_token must travel as form data', async () => {
    const response = await POST(
      new Request('https://greenhouse.example.test/api/integrations/v1/sister-platforms/oauth/token', {
        method: 'POST',
        headers: { authorization: 'Bearer workload', 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(tokenExchangeForm()))
      })
    )

    expect(response.status).toBe(400)
    expect(exchange.run).not.toHaveBeenCalled()
  })

  it('returns RFC-compatible OAuth errors without exposing identity details', async () => {
    const { McpTokenExchangeError } = await import('@/lib/sister-platforms/mcp-token-exchange')

    exchange.run.mockRejectedValue(new McpTokenExchangeError('identity_not_bound', 403))

    const response = await POST(
      new Request('https://greenhouse.example.test/api/integrations/v1/sister-platforms/oauth/token', {
        method: 'POST',
        headers: {
          authorization: 'Bearer google-workload-id-token',
          'content-type': 'application/x-www-form-urlencoded'
        },
        body: tokenExchangeForm()
      })
    )

    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({
      error: 'invalid_grant',
      error_description: 'Sister platform token exchange rejected.'
    })
    expect(JSON.stringify(body)).not.toContain('identity_not_bound')
  })
})
