import { JSDOM } from 'jsdom'

import { describe, expect, it, vi } from 'vitest'

import { InternalLoginError } from './oidc'

import { createInternalLoginHandler, INTERNAL_LOGIN_COOKIE } from './login-http'

const identity = { issuer: 'https://login.example', tenantId: 'tenant', objectId: 'object', authTime: new Date() }

const fixture = () => {
  let enabled = true
  const completeSession = vi.fn(async () => '__Host-session=opaque; Path=/; Secure; HttpOnly; SameSite=Lax')

  const flow = {
    start: vi.fn(async () => ({ location: 'https://login.example/authorize', browserBinding: 'binding' })),
    complete: vi.fn(async () => ({ identity, returnTo: '/oauth/authorize?client_id=trusted' }))
  }

  const allowAttempt = vi.fn(async () => true)
  const onOutcome = vi.fn(async () => undefined)
  const handler = createInternalLoginHandler({ enabled: () => enabled, flow, completeSession, allowAttempt, onOutcome })

  const request = (path: string, cookie = `${INTERNAL_LOGIN_COOKIE}=binding`, method = 'GET', accept = '') =>
    handler({
      method,
      url: new URL(path, 'https://auth.example'),
      headers: new Headers({ cookie, accept }),
      body: ''
    })

  return {
    request,
    flow,
    completeSession,
    allowAttempt,
    onOutcome,
    disable: () => {
      enabled = false
    }
  }
}

describe('corporate login HTTP boundary', () => {
  it('starts with a protected host-only cookie and no-store redirect', async () => {
    const f = fixture()
    const response = await f.request('/auth/internal/login?return_to=%2Foauth%2Fauthorize')

    expect(f.flow.start).toHaveBeenCalledWith('/oauth/authorize')
    expect(response?.status).toBe(302)
    expect(response?.headers['Set-Cookie']).toBe(
      `${INTERNAL_LOGIN_COOKIE}=binding; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600`
    )
    expect(response?.headers['Cache-Control']).toBe('no-store')
  })

  it('defaults only an absent continuation to the fixed session landing', async () => {
    const f = fixture()

    expect((await f.request('/auth/internal/login'))?.status).toBe(302)
    expect(f.flow.start).toHaveBeenCalledWith('/auth/session')
    f.flow.start.mockClear()

    for (const query of ['return_to=', 'return_to=/auth/session&return_to=/oauth/authorize']) {
      expect((await f.request('/auth/internal/login?' + query))?.status).toBe(400)
    }

    expect(f.flow.start).not.toHaveBeenCalled()
  })

  it('uses only the stored return target and session command result', async () => {
    const f = fixture()
    const response = await f.request('/auth/internal/callback?state=state&code=code&return_to=https://attacker.example')

    expect(f.flow.complete).toHaveBeenCalledWith({ state: 'state', code: 'code', browserBinding: 'binding' })
    expect(f.completeSession).toHaveBeenCalledWith(identity)
    expect(response?.headers.Location).toBe('/oauth/authorize?client_id=trusted')
    expect(response?.headers['Set-Cookie']).toContain('__Host-session=')
  })

  it('rejects duplicate params/cookies, upstream errors and missing browser custody', async () => {
    const f = fixture()

    for (const [path, cookie] of [
      ['/auth/internal/callback?state=a&state=b&code=secret', `${INTERNAL_LOGIN_COOKIE}=binding`],
      ['/auth/internal/callback?state=a&code=secret', `${INTERNAL_LOGIN_COOKIE}=a; ${INTERNAL_LOGIN_COOKIE}=b`],
      ['/auth/internal/callback?state=a&code=secret', ''],
      ['/auth/internal/callback?error=secret&error_description=private', '']
    ]) {
      const response = await f.request(path, cookie)

      expect(response?.status).toBe(400)
      expect(response?.body).not.toMatch(/secret|private/)
    }

    expect(f.completeSession).not.toHaveBeenCalled()
    expect(f.flow.complete).not.toHaveBeenCalled()
  })

  it('rate-limits both routes before transaction creation, exchange or session creation', async () => {
    const f = fixture()

    f.allowAttempt.mockResolvedValue(false)

    for (const path of ['/auth/internal/login?return_to=secret', '/auth/internal/callback?state=a&code=secret']) {
      const response = await f.request(path)

      expect(response?.status).toBe(429)
      expect(response?.headers['Retry-After']).toBe('60')
    }

    expect(f.flow.start).not.toHaveBeenCalled()
    expect(f.flow.complete).not.toHaveBeenCalled()
    expect(f.completeSession).not.toHaveBeenCalled()
    expect(f.onOutcome.mock.calls).toEqual([
      [{ stage: 'login', outcome: 'failure', reason: 'rate_limited' }],
      [{ stage: 'callback', outcome: 'failure', reason: 'rate_limited' }]
    ])
  })

  it('audits success and failure using only the fixed sanitized vocabulary', async () => {
    const f = fixture()

    await f.request('/auth/internal/login?return_to=%2Foauth%2Fauthorize')
    await f.request('/auth/internal/callback?state=secret&code=secret')
    await f.request('/auth/internal/callback?error=secret&error_description=private')
    expect(f.onOutcome.mock.calls).toEqual([
      [{ stage: 'login', outcome: 'success', reason: 'ok' }],
      [{ stage: 'callback', outcome: 'success', reason: 'ok' }],
      [{ stage: 'callback', outcome: 'failure', reason: 'upstream_rejected' }]
    ])
    f.onOutcome.mockRejectedValue(new Error('private ledger error'))
    const response = await f.request('/auth/internal/callback?error=secret')

    expect(response?.status).toBe(503)
    expect(response?.body).toBe('{"error":"upstream_unavailable"}')
  })

  it('fails closed for disabled routes, wrong method and unknown command errors', async () => {
    const f = fixture()

    expect((await f.request('/auth/internal/login', '', 'POST'))?.status).toBe(405)
    f.completeSession.mockRejectedValueOnce(new Error('private database details'))
    const response = await f.request('/auth/internal/callback?state=a&code=secret')

    expect(response?.body).toBe('{"error":"upstream_unavailable"}')
    f.disable()
    expect((await f.request('/auth/internal/login?return_to=x'))?.status).toBe(404)
    expect(await f.request('/unrelated')).toBeNull()
  })
  it('negotiates safe browser recovery for cancellation, invalid transactions, throttling and unavailable services', async () => {
    const f = fixture()

    const hostile =
      '/auth/internal/callback?error=cancelled&error_description=%3Cscript%3EPRIVATE%3C/script%3E&return_to=https://evil.example'

    const cancelled = await f.request(hostile, undefined, 'GET', 'text/html,application/xhtml+xml')

    expect(cancelled?.status).toBe(400)
    expect(cancelled?.headers['Content-Type']).toContain('text/html')
    expect(cancelled?.body).toContain('Vuelve a la aplicación')
    expect(cancelled?.body).not.toContain('PRIVATE')
    expect(cancelled?.body).not.toContain('evil.example')
    const document = new JSDOM(cancelled?.body).window.document

    /*
     * La página de error puede ofrecer UNA salida, pero jamás una que venga de la request: este
     * callback recibe `return_to` y `error_description` del atacante, y un enlace derivado de eso
     * sería un redirect abierto servido con la marca del emisor. Antes se garantizaba prohibiendo
     * toda ancla; ahora se afirma lo que de verdad importa —destino estático y del mismo origen—,
     * que además cubre el caso que la prohibición no veía: un `href` relativo construido con input.
     */
    const links = [...(document.querySelector('[data-capture="auth-internal-login-error"]')?.querySelectorAll('a') ?? [])]

    expect(links.map(link => link.getAttribute('href'))).toEqual(['/login'])
    expect(cancelled?.headers['Set-Cookie']).toContain('Max-Age=0')
    expect(cancelled?.headers['Cache-Control']).toBe('no-store')
    f.flow.complete.mockRejectedValueOnce(new InternalLoginError('transaction_invalid'))
    expect(
      (await f.request('/auth/internal/callback?state=expired&code=PRIVATE', undefined, 'GET', 'text/html'))?.status
    ).toBe(400)
    f.allowAttempt.mockResolvedValueOnce(false)
    const limited = await f.request('/auth/internal/login?return_to=PRIVATE', undefined, 'GET', 'text/html')

    expect(limited?.status).toBe(429)
    expect(limited?.headers['Retry-After']).toBe('60')
    expect(limited?.body).toContain('Espera un minuto')
    f.completeSession.mockRejectedValueOnce(new Error('PRIVATE backend details'))
    const unavailable = await f.request('/auth/internal/callback?state=a&code=PRIVATE', undefined, 'GET', 'text/html')

    expect(unavailable?.status).toBe(503)
    expect(unavailable?.body).not.toContain('PRIVATE')
    expect(unavailable?.headers['Content-Security-Policy']).toContain("default-src 'none'")
    expect(f.completeSession).toHaveBeenCalledTimes(1)
  })

  it('keeps JSON for non-HTML negotiation including an explicitly rejected HTML media type', async () => {
    const f = fixture()

    for (const accept of ['', 'application/json', '*/*', 'text/html;q=0,application/json']) {
      const response = await f.request('/auth/internal/callback?error=cancelled', undefined, 'GET', accept)

      expect(response?.headers['Content-Type']).toContain('application/json')
      expect(response?.body).toBe('{"error":"upstream_rejected"}')
    }
  })
})

describe('internal diagnostic audit boundary', () => {
  it('records only the safe diagnostic, never upstream data or HTTP details', async () => {
    for (const accept of ['', 'text/html']) {
      const f = fixture()
      const error = new InternalLoginError('upstream_rejected', 'identity_claims_invalid')

      Object.assign(error, { message: 'PRIVATE raw error', token: 'PRIVATE token', body: 'PRIVATE response' })
      f.flow.complete.mockRejectedValueOnce(error)
      const response = await f.request('/auth/internal/callback?state=PRIVATE&code=PRIVATE', undefined, 'GET', accept)

      expect(response?.status).toBe(400)
      expect(response?.body).not.toContain('PRIVATE')
      expect(response?.body).not.toContain('identity_claims_invalid')
      expect(f.onOutcome).toHaveBeenCalledExactlyOnceWith({
        stage: 'callback',
        outcome: 'failure',
        reason: 'upstream_rejected',
        diagnostic: 'identity_claims_invalid'
      })
      expect(f.completeSession).not.toHaveBeenCalled()
    }
  })

  it('rejects forged diagnostic fields and never copies an unknown exception', async () => {
    for (const error of [
      Object.assign(new InternalLoginError('upstream_rejected'), { diagnostic: 'PRIVATE upstream body' }),
      Object.assign(new Error('PRIVATE raw error'), { diagnostic: 'identity_claims_invalid' })
    ]) {
      const f = fixture()

      f.flow.complete.mockRejectedValueOnce(error)
      const response = await f.request('/auth/internal/callback?state=a&code=PRIVATE')

      expect(response?.body).not.toContain('PRIVATE')
      expect(f.onOutcome).toHaveBeenCalledExactlyOnceWith({
        stage: 'callback',
        outcome: 'failure',
        reason: error instanceof InternalLoginError ? 'upstream_rejected' : 'upstream_unavailable'
      })
    }
  })

  it('diagnoses enrollment denial without revealing it in HTTP', async () => {
    const f = fixture()

    f.completeSession.mockRejectedValueOnce(new InternalLoginError('upstream_rejected', 'identity_not_enrolled'))
    const response = await f.request('/auth/internal/callback?state=a&code=PRIVATE')

    expect(response?.body).toBe('{"error":"upstream_rejected"}')
    expect(f.onOutcome).toHaveBeenCalledExactlyOnceWith({
      stage: 'callback',
      outcome: 'failure',
      reason: 'upstream_rejected',
      diagnostic: 'identity_not_enrolled'
    })
  })
})
