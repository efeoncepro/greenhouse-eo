import { internalLoginFailureResponse } from './login-error-page'
/** TASK-1836 — browser-bound corporate login; identity/session writes belong to the injected command. */
import { jsonResponse, redirectResponse, type OAuthHttpRequest, type OAuthHttpResponse } from '../oauth/http'

import {
  InternalLoginError,
  INTERNAL_LOGIN_DIAGNOSTICS,
  type InternalLoginDiagnostic,
  type UpstreamIdentity,
  type createInternalLoginFlow
} from './oidc'

export const INTERNAL_LOGIN_COOKIE = '__Host-efeonce-internal-login'
const COOKIE_ATTRIBUTES = 'Path=/; Secure; HttpOnly; SameSite=Lax'

export type InternalLoginStage = 'login' | 'callback'
export type InternalLoginOutcome = {
  stage: InternalLoginStage
  outcome: 'success' | 'failure'
  reason: 'ok' | 'rate_limited' | InternalLoginError['code']
  diagnostic?: InternalLoginDiagnostic
}

export type InternalLoginHandlerDeps = {
  enabled: () => boolean
  flow: ReturnType<typeof createInternalLoginFlow>
  /** Enforce canonical limits before transaction creation, upstream exchange or session minting. */
  allowAttempt: (request: OAuthHttpRequest, stage: InternalLoginStage) => Promise<boolean>
  /** Only this fixed vocabulary crosses the audit boundary; never pass request URLs or upstream data. */
  onOutcome: (outcome: InternalLoginOutcome) => Promise<void>
  /** Must resolve canonical tenant/oid, enforce eligibility, then atomically mint session plus provenance. */
  completeSession: (identity: UpstreamIdentity) => Promise<string>
}

export const isInternalLoginPath = (path: string): boolean =>
  path === '/auth/internal/login' || path === '/auth/internal/callback'

const singleParam = (params: URLSearchParams, key: string): string => {
  const values = params.getAll(key)

  if (values.length !== 1 || !values[0]) throw new InternalLoginError('transaction_invalid')

  return values[0]
}

const browserBinding = (request: OAuthHttpRequest): string => {
  const values = (request.headers.get('cookie') ?? '')
    .split(';')
    .map(value => value.trim())
    .filter(value => value.startsWith(`${INTERNAL_LOGIN_COOKIE}=`))

  if (values.length !== 1) throw new InternalLoginError('transaction_invalid')

  return values[0].slice(INTERNAL_LOGIN_COOKIE.length + 1)
}

export const createInternalLoginHandler =
  (deps: InternalLoginHandlerDeps) =>
  async (request: OAuthHttpRequest): Promise<OAuthHttpResponse | null> => {
    if (!isInternalLoginPath(request.url.pathname)) return null
    if (!deps.enabled()) return internalLoginFailureResponse(request, 404, 'not_found')
    if (request.method !== 'GET') return jsonResponse(405, { error: 'method_not_allowed' }, { Allow: 'GET' })

    const stage: InternalLoginStage = request.url.pathname === '/auth/internal/login' ? 'login' : 'callback'

    try {
      if (!(await deps.allowAttempt(request, stage))) {
        await deps.onOutcome({ stage, outcome: 'failure', reason: 'rate_limited' })

        return internalLoginFailureResponse(request, 429, 'rate_limited', { 'Retry-After': '60' })
      }

      if (request.url.pathname === '/auth/internal/login') {
        const start = await deps.flow.start(singleParam(request.url.searchParams, 'return_to'))
        const response = redirectResponse(start.location)

        response.headers['Set-Cookie'] =
          `${INTERNAL_LOGIN_COOKIE}=${start.browserBinding}; ${COOKIE_ATTRIBUTES}; Max-Age=600`

        await deps.onOutcome({ stage, outcome: 'success', reason: 'ok' })

        return response
      }

      // An upstream denial is never forwarded to a supplied URL or reflected into a response body.
      if (request.url.searchParams.has('error')) throw new InternalLoginError('upstream_rejected')

      const completed = await deps.flow.complete({
        state: singleParam(request.url.searchParams, 'state'),
        code: singleParam(request.url.searchParams, 'code'),
        browserBinding: browserBinding(request)
      })

      if (!deps.enabled()) throw new InternalLoginError('configuration_invalid')
      const sessionCookie = await deps.completeSession(completed.identity)
      const response = redirectResponse(completed.returnTo)

      // This response model permits one cookie. The one-use transaction is already consumed; its
      // browser binding expires naturally in ten minutes and is replaced by the next login attempt.
      response.headers['Set-Cookie'] = sessionCookie

      await deps.onOutcome({ stage, outcome: 'success', reason: 'ok' })

      return response
    } catch (error) {
      const code = error instanceof InternalLoginError ? error.code : 'upstream_unavailable'

      const diagnostic =
        error instanceof InternalLoginError
          ? INTERNAL_LOGIN_DIAGNOSTICS.find(value => value === error.diagnostic)
          : undefined

      // Failure of the audit sink also fails closed; its own exception must never escape HTTP.
      const audited = await deps
        .onOutcome({ stage, outcome: 'failure', reason: code, ...(diagnostic ? { diagnostic } : {}) })
        .then(
          () => true,
          () => false
        )

      const status = !audited || code === 'upstream_unavailable' || code === 'configuration_invalid' ? 503 : 400

      return internalLoginFailureResponse(request, status, audited ? code : 'upstream_unavailable', {
        'Set-Cookie': `${INTERNAL_LOGIN_COOKIE}=; ${COOKIE_ATTRIBUTES}; Max-Age=0`
      })
    }
  }
