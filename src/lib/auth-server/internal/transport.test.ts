import { createServer, request as nodeRequest, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'
import { createHash } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import { createAuthServerRequestHandler, type AuthServerAppDeps } from '../../../../services/auth-server/app'
import { readAuthServerOAuthConfig } from '../oauth/config'
import { InMemoryOAuthStore } from '../oauth/store/memory-store'
import { createInternalLoginHandler } from './login-http'
import { EMAIL_OTP_PREPARE_PATH, EMAIL_OTP_VERIFY_PATH } from '../email-otp/handler'
import type { OAuthHttpRequest, OAuthHttpResponse } from '../oauth/http'
import { MAX_BODY_BYTES } from '../oauth/http'
import { AUTH_FONT_ASSETS, AUTH_FONT_LICENSES } from '../oauth/pages/fonts.generated'

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const NOW = new Date('2026-09-05T13:00:00Z')

const unavailable = (): never => {
  throw new Error('unused transport dependency invoked')
}

const harness = (options: { appEnabled?: boolean; internalEnabled?: boolean; oauthEnabled?: boolean;
  firstParty?: (request: OAuthHttpRequest) => Promise<OAuthHttpResponse | null>;
  invitationOtp?: (request: OAuthHttpRequest) => Promise<OAuthHttpResponse | null> } = {}) => {
  let internalEnabled = options.internalEnabled ?? true
  const allowAttempt = vi.fn(async () => true)
  const onOutcome = vi.fn(async () => undefined)

  const flow = {
    start: vi.fn(async () => ({ location: 'https://login.example/authorize', browserBinding: 'opaque' })),
    complete: vi.fn(async () => ({
      identity: { issuer: 'https://login.example', tenantId: 'tenant', objectId: 'oid', authTime: NOW },
      returnTo: '/oauth/authorize?client_id=trusted'
    }))
  }

  const internal = createInternalLoginHandler({
    enabled: () => internalEnabled,
    flow,
    allowAttempt,
    onOutcome,
    completeSession: async () => '__Host-session=opaque; Secure; HttpOnly; Path=/'
  })

  const deps: AuthServerAppDeps = {
    enabled: options.appEnabled ?? true,
    allowedHosts: ['auth.example'],
    gitSha: 'test',
    oauthConfig: readAuthServerOAuthConfig({ NODE_ENV: 'test', AUTH_SERVER_ISSUER: 'https://auth.example',
      AUTH_SERVER_OAUTH_ENABLED: options.oauthEnabled ? 'true' : 'false' }),
    pingPostgres: async () => undefined,
    getActiveSigningKey: async () => null,
    getPublishableSigningKeys: async () => [],
    getSigner: unavailable,
    signAccessToken: unavailable,
    store: new InMemoryOAuthStore(),
    subjectPort: { resolve: unavailable },
    grantsPort: { resolve: unavailable },
    consentContextPort: { resolve: unavailable },
    cimd: { fetcher: unavailable },
    internal,
    firstParty: options.firstParty,
    invitationOtp: options.invitationOtp,
    now: () => NOW
  }

  const handler = createAuthServerRequestHandler(deps)

  const request = async (
    options: { path?: string; method?: string; host?: string; headers?: Record<string, string>; body?: string } = {}
  ) => {
    const req = Object.assign(Readable.from(options.body === undefined ? [] : [Buffer.from(options.body)]), {
      method: options.method ?? 'GET',
      url: options.path ?? '/auth/internal/login?return_to=%2Foauth%2Fauthorize',
      headers: { host: options.host ?? 'auth.example', ...options.headers }
    }) as IncomingMessage

    const result = { status: 0, headers: {} as Record<string, string>, body: '' as string | Buffer }

    const res = {
      writeHead: (status: number, headers: Record<string, string>) => {
        result.status = status
        result.headers = headers
      },
      end: (body?: string | Buffer) => {
        result.body = body ?? ''
      }
    } as unknown as ServerResponse

    await handler(req, res)

    return result
  }

  return {
    request,
    handler,
    flow,
    allowAttempt,
    disable: () => {
      internalEnabled = false
    }
  }
}

describe('auth-server internal login Node transport', () => {
  it('serves exact bundled font bytes and licenses without invoking identity dependencies', async () => {
    const f = harness()

    for (const [path, asset] of Object.entries({ ...AUTH_FONT_ASSETS, ...AUTH_FONT_LICENSES })) {
      const response = await f.request({ path })

      expect(response.status).toBe(200)
      expect(createHash('sha256').update(response.body).digest('hex')).toBe(asset.sha256)
      expect(response.headers['Content-Type']).toBe(asset.contentType)
      expect(response.headers['X-Content-Type-Options']).toBe('nosniff')
      expect(response.headers['Cross-Origin-Resource-Policy']).toBe('same-origin')
      expect((await f.request({ path, method: 'HEAD' })).body).toBe('')
      expect((await f.request({ path, method: 'POST' })).status).toBe(405)
    }

    expect((await f.request({ path: '/fonts/not-allowed.ttf' })).status).toBe(404)
    expect((await f.request({ path: '/fonts/Geist-Regular.ttf', host: 'attacker.example' })).status).toBe(421)
    expect((await harness({ appEnabled: false }).request({ path: '/fonts/Geist-Regular.ttf' })).status).toBe(404)
    expect(f.flow.start).not.toHaveBeenCalled()
  })
  it('routes login and callback through the actual handler, retaining cookie/security headers', async () => {
    const f = harness()
    const started = await f.request()

    expect(started.status).toBe(302)
    expect(started.headers.Location).toBe('https://login.example/authorize')
    expect(started.headers['Cache-Control']).toBe('no-store')
    expect(started.headers['Set-Cookie']).toContain('__Host-efeonce-internal-login=opaque;')

    const completed = await f.request({
      path: '/auth/internal/callback?state=state&code=code',
      headers: { cookie: '__Host-efeonce-internal-login=opaque' }
    })

    expect(completed.status).toBe(302)
    expect(completed.headers.Location).toBe('/oauth/authorize?client_id=trusted')
    expect(f.flow.complete).toHaveBeenCalledOnce()
  })

  it('enforces host, method, master switch and dynamic internal switch', async () => {
    const f = harness()

    expect((await f.request({ host: 'attacker.example' })).status).toBe(421)
    expect((await f.request({ method: 'POST' })).status).toBe(405)
    expect(f.flow.start).not.toHaveBeenCalled()
    f.disable()
    expect((await f.request()).status).toBe(404)
    expect((await harness({ appEnabled: false }).request()).status).toBe(404)
  })

  it('forwards only the ALB client hop, ignoring forged first values and x-real-ip', async () => {
    const f = harness()

    for (const forged of ['198.51.100.1', '198.51.100.99']) {
      await f.request({ headers: { 'x-forwarded-for': `${forged}, 203.0.113.7, 203.0.113.250`, 'x-real-ip': forged } })
    }

    const calls = f.allowAttempt.mock.calls as unknown as Array<
      [{ headers: { get(name: string): string | null } }, string]
    >

    expect(calls.map(([request]) => request.headers.get('x-forwarded-for'))).toEqual(['203.0.113.7', '203.0.113.7'])
    expect(calls.map(([request]) => request.headers.get('x-real-ip'))).toEqual([null, null])
    expect(calls.map(([, stage]) => stage)).toEqual(['login', 'login'])
  })

  it('uses the shared unknown-IP path for missing, malformed or insufficient forwarded chains', async () => {
    const f = harness()

    for (const headers of [
      {},
      { 'x-forwarded-for': '198.51.100.1' },
      { 'x-forwarded-for': 'forged, not-an-ip, 203.0.113.250', 'x-real-ip': '198.51.100.1' }
    ] as Record<string, string>[]) {
      await f.request({ headers })
    }

    const calls = f.allowAttempt.mock.calls as unknown as Array<[{ headers: { get(name: string): string | null } }]>

    expect(calls.map(([request]) => request.headers.get('x-forwarded-for'))).toEqual([null, null, null])
    expect(calls.map(([request]) => request.headers.get('x-real-ip'))).toEqual([null, null, null])
  })
})

describe('auth-server first-party and invitation OTP Node transport', () => {
  it.each(['content-length', 'chunked'] as const)('returns a complete 413 and closes the real Node socket for an oversized %s POST', async mode => {
    const invitationOtp = vi.fn(async (): Promise<OAuthHttpResponse> => ({ status: 200, body: '{}', headers: {} }))
    const f = harness({ invitationOtp })
    const server = createServer((req, res) => { void f.handler(req, res) })

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))

    try {
      const payload = Buffer.alloc(MAX_BODY_BYTES + 1, 'x')
      const port = (server.address() as AddressInfo).port
      let resolveSocketClosed!: () => void
      const socketClosed = new Promise<void>(resolve => { resolveSocketClosed = resolve })

      const response = await new Promise<{ status: number; body: string; connection: string | undefined }>((resolve, reject) => {
        const req = nodeRequest({ hostname: '127.0.0.1', port, method: 'POST', path: EMAIL_OTP_PREPARE_PATH,
          headers: { Host: 'auth.example', ...(mode === 'content-length'
            ? { 'Content-Length': payload.length } : { 'Transfer-Encoding': 'chunked' }) } }, res => {
          let body = ''

          res.on('data', chunk => { body += chunk.toString() })
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body,
            connection: res.headers.connection }))
        })

        req.on('socket', socket => socket.once('close', resolveSocketClosed))
        req.setTimeout(3000, () => req.destroy(new Error('oversized_body_response_timeout')))
        req.on('error', reject)
        if (mode === 'chunked') req.write(payload.subarray(0, 32768))

        req.end(mode === 'chunked' ? payload.subarray(32768) : payload)
      })

      expect(response.status).toBe(413)
      expect(response.connection).toBe('close')
      expect(JSON.parse(response.body)).toEqual({ error: 'invalid_request', error_description: 'body too large' })
      expect(invitationOtp).not.toHaveBeenCalled()
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('oversized_body_socket_remained_open')), 3000)

        void socketClosed.then(() => { clearTimeout(timeout); resolve() })
      })
    } finally {
      server.closeAllConnections()
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })

  it('delegates first-party authorization only behind the issuer, OAuth and host gates', async () => {
    const firstParty = vi.fn(async (request: OAuthHttpRequest): Promise<OAuthHttpResponse> => ({
      status: 302, body: '', headers: { Location: `https://rooms.example.test/auth/callback?client_id=${request.url.searchParams.get('client_id')}`,
        'Cache-Control': 'no-store' }
    }))

    const path = '/oauth/authorize?client_id=efeonce-rp-rooms'
    const enabled = harness({ oauthEnabled: true, firstParty })
    const response = await enabled.request({ path })

    expect(response.status).toBe(302)
    expect(response.headers.Location).toContain('rooms.example.test/auth/callback')
    expect(response.headers['Set-Cookie']).toBeUndefined()
    expect(firstParty).toHaveBeenCalledOnce()
    expect(firstParty.mock.calls[0]?.[0].url.searchParams.get('client_id')).toBe('efeonce-rp-rooms')

    expect((await enabled.request({ path, host: 'attacker.example' })).status).toBe(421)
    expect((await harness({ oauthEnabled: false, firstParty }).request({ path })).status).toBe(404)
    expect((await harness({ appEnabled: false, oauthEnabled: true, firstParty }).request({ path })).status).toBe(404)
    expect(firstParty).toHaveBeenCalledOnce()
  })

  it('routes only the two invitation OTP endpoints and passes the exact body without a browser cookie', async () => {
    const invitationOtp = vi.fn(async (request: OAuthHttpRequest): Promise<OAuthHttpResponse> => ({
      status: request.method === 'POST' ? 401 : 405, body: JSON.stringify({ error: 'invalid_client' }),
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    }))

    const f = harness({ invitationOtp })
    const body = '{"invitationId":"opaque"}'

    for (const path of [EMAIL_OTP_PREPARE_PATH, EMAIL_OTP_VERIFY_PATH]) {
      const response = await f.request({ path, method: 'POST', body,
        headers: { 'content-type': 'application/json', authorization: 'Basic invalid' } })

      expect(response.status).toBe(401)
      expect(response.headers['Set-Cookie']).toBeUndefined()
      expect(response.body).toBe('{"error":"invalid_client"}')
    }

    expect(invitationOtp).toHaveBeenCalledTimes(2)
    expect(invitationOtp.mock.calls.map(([request]) => request.body)).toEqual([body, body])
    expect(invitationOtp.mock.calls.map(([request]) => request.headers.get('authorization'))).toEqual(['Basic invalid', 'Basic invalid'])
    expect((await f.request({ path: EMAIL_OTP_PREPARE_PATH, method: 'POST', body,
      host: 'attacker.example' })).status).toBe(421)
    expect((await f.request({ path: '/auth/invitations/email-otp/unknown', method: 'POST', body })).status).toBe(404)
    expect((await harness({ appEnabled: false, invitationOtp }).request({ path: EMAIL_OTP_PREPARE_PATH,
      method: 'POST', body })).status).toBe(404)
    expect(invitationOtp).toHaveBeenCalledTimes(2)
  })
})
