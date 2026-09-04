/**
 * Router de la superficie de personas del emisor (TASK-1830).
 *
 * Transporte-agnóstico igual que el router OAuth: `services/auth-server/app.ts` lo adapta a
 * `node:http` y los tests lo llaman con `OAuthHttpRequest` planos. Con
 * `AUTH_SERVER_PERSON_AUTH_ENABLED=false` toda la superficie responde 404 — no 403: un 403 confirma
 * que la ruta existe.
 *
 *   GET  /login                     formulario de acceso por correo
 *   POST /auth/magic-link/request   emite el enlace (respuesta idéntica exista o no el correo)
 *   GET  /m/<tokenId>.<verificador> página intermedia (los escáneres de correo NO consumen un GET)
 *   POST /auth/magic-link/consume   consume el enlace y abre sesión
 *   GET  /i/<token>                 página intermedia de invitación
 *   POST /auth/invitations/accept   liga la persona y despacha el magic link al correo del operador
 *   GET  /auth/session              contexto de la sesión vigente (JSON)
 *   POST /auth/session/logout       revoca la sesión y limpia la cookie
 */

import { buildRequestAuditContext } from '../oauth/audit'
import {
  htmlResponse,
  isFormContentType,
  jsonResponse,
  parseFormBody,
  parseJsonBody,
  redirectResponse,
  type OAuthHttpRequest,
  type OAuthHttpResponse
} from '../oauth/http'
import { sha256Hex } from '../oauth/primitives'
import type { AuthServerPersonAuthConfig } from './config'
import { acceptInvitationAndSendMagicLink, type InvitationAcceptancePort } from './invitations'
import { consumeMagicLink, requestMagicLink, sanitizeReturnTo, type MagicLinkDeps } from './magic-link'
import {
  PERSON_AUTH_PATHS,
  renderInvitationAcceptedPage,
  renderInvitationConfirmPage,
  renderLinkProblemPage,
  renderLoginPage,
  renderMagicLinkConfirmPage,
  renderMagicLinkSentPage,
  renderAccessRevokedPage,
  renderRateLimitedPage,
  renderSessionClosedPage,
  renderSessionStartedPage
} from './pages'
import {
  buildSessionClearCookie,
  buildSessionCookie,
  readCookie,
  resolvePersonSession
} from './sessions'
import type { PersonAuthStorePort } from './store/port'

export type PersonAuthHandlerDeps = Omit<MagicLinkDeps, 'store' | 'config'> & {
  store: PersonAuthStorePort
  config: AuthServerPersonAuthConfig
  invitations: InvitationAcceptancePort
  mintSubject: () => string
  /** `external_idp:<environment>` esperado en el link de toda sesión de este emisor. */
  expectedSourceSystem: string
}

export type PersonAuthHandler = (request: OAuthHttpRequest) => Promise<OAuthHttpResponse | null>

const STATIC_PATHS = new Set<string>([
  PERSON_AUTH_PATHS.login,
  PERSON_AUTH_PATHS.magicLinkRequest,
  PERSON_AUTH_PATHS.magicLinkConsume,
  PERSON_AUTH_PATHS.invitationAccept,
  PERSON_AUTH_PATHS.session,
  PERSON_AUTH_PATHS.logout
])

export const isPersonAuthPath = (pathname: string): boolean =>
  STATIC_PATHS.has(pathname) ||
  pathname.startsWith(PERSON_AUTH_PATHS.magicLinkLanding) ||
  pathname.startsWith(PERSON_AUTH_PATHS.invitationLanding)

/** Lee un campo tanto de un form como de un JSON: la UI manda form, los canaries mandan JSON. */
const readField = (request: OAuthHttpRequest, name: string): string | null => {
  if (isFormContentType(request)) return parseFormBody(request.body).get(name)?.trim() || null

  const body = parseJsonBody(request.body)

  if (!body || typeof body !== 'object') return null

  const value = (body as Record<string, unknown>)[name]

  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const methodNotAllowed = (allow: string): OAuthHttpResponse =>
  jsonResponse(405, { error: 'method_not_allowed' }, { Allow: allow })

export const createPersonAuthHandler = (deps: PersonAuthHandlerDeps): PersonAuthHandler => {
  const magicLinkDeps: MagicLinkDeps = {
    store: deps.store,
    config: deps.config,
    directory: deps.directory,
    mailer: deps.mailer,
    environmentId: deps.environmentId,
    issuer: deps.issuer,
    now: deps.now,
    sleep: deps.sleep,
    onError: deps.onError
  }

  const requestContext = (request: OAuthHttpRequest) => {
    const audit = buildRequestAuditContext(request.headers)

    const forwarded =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || null

    return { audit, ipValue: forwarded }
  }

  return async request => {
    const path = request.url.pathname

    if (!isPersonAuthPath(path)) return null
    if (!deps.config.personAuthEnabled) return jsonResponse(404, { error: 'not_found' })

    const { audit, ipValue } = requestContext(request)

    // ─── Formulario de acceso ────────────────────────────────────────────────
    if (path === PERSON_AUTH_PATHS.login) {
      if (request.method !== 'GET') return methodNotAllowed('GET')

      return htmlResponse(200, renderLoginPage({ returnTo: sanitizeReturnTo(request.url.searchParams.get('return_to')) }))
    }

    // ─── Emisión del magic link ──────────────────────────────────────────────
    if (path === PERSON_AUTH_PATHS.magicLinkRequest) {
      if (request.method !== 'POST') return methodNotAllowed('POST')

      const wantsHtml = isFormContentType(request)

      const result = await requestMagicLink(magicLinkDeps, {
        email: readField(request, 'email') ?? '',
        returnTo: readField(request, 'return_to'),
        ipHash: audit.ipHash,
        ipValue,
        userAgentHash: audit.userAgentHash,
        correlationId: audit.correlationId
      })

      if (result.status === 'rate_limited') {
        return wantsHtml
          ? htmlResponse(429, renderRateLimitedPage(), { 'Retry-After': String(result.retryAfterSeconds) })
          : jsonResponse(429, { status: 'rate_limited' }, { 'Retry-After': String(result.retryAfterSeconds) })
      }

      if (result.status === 'invalid_email') {
        return wantsHtml
          ? htmlResponse(400, renderLoginPage({ returnTo: readField(request, 'return_to'), error: 'invalid_email' }))
          : jsonResponse(400, { status: 'invalid_email' })
      }

      // 202 idéntico exista o no el correo: el cuerpo, el código y el tiempo son los mismos.
      return wantsHtml ? htmlResponse(202, renderMagicLinkSentPage()) : jsonResponse(202, { status: 'accepted' })
    }

    // ─── Página intermedia del magic link ────────────────────────────────────
    if (path.startsWith(PERSON_AUTH_PATHS.magicLinkLanding)) {
      if (request.method !== 'GET') return methodNotAllowed('GET')

      const token = decodeURIComponent(path.slice(PERSON_AUTH_PATHS.magicLinkLanding.length))

      if (!token) return htmlResponse(400, renderLinkProblemPage('invalid'))

      return htmlResponse(200, renderMagicLinkConfirmPage(token))
    }

    // ─── Consumo del magic link ──────────────────────────────────────────────
    if (path === PERSON_AUTH_PATHS.magicLinkConsume) {
      if (request.method !== 'POST') return methodNotAllowed('POST')

      const wantsHtml = isFormContentType(request)

      const result = await consumeMagicLink(magicLinkDeps, {
        token: readField(request, 'token') ?? '',
        ipHash: audit.ipHash,
        ipValue,
        userAgentHash: audit.userAgentHash,
        correlationId: audit.correlationId
      })

      if (result.status === 'rate_limited') {
        return wantsHtml
          ? htmlResponse(429, renderRateLimitedPage(), { 'Retry-After': String(result.retryAfterSeconds) })
          : jsonResponse(429, { status: 'rate_limited' }, { 'Retry-After': String(result.retryAfterSeconds) })
      }

      if (result.status === 'access_revoked') {
        return wantsHtml ? htmlResponse(403, renderAccessRevokedPage()) : jsonResponse(403, { status: 'access_revoked' })
      }

      if (result.status !== 'authenticated') {
        const kind = result.status === 'expired' ? 'expired' : result.status === 'already_used' ? 'already_used' : 'invalid'

        return wantsHtml ? htmlResponse(400, renderLinkProblemPage(kind)) : jsonResponse(400, { status: result.status })
      }

      const cookie = buildSessionCookie(
        deps.config.sessionCookieName,
        result.session.sessionId,
        deps.config.sessionSlidingTtlSeconds
      )

      // El `return_to` ya vino saneado a path relativo del emisor cuando se emitió el enlace.
      if (result.returnTo) {
        return { ...redirectResponse(result.returnTo), headers: { ...redirectResponse(result.returnTo).headers, 'Set-Cookie': cookie } }
      }

      return wantsHtml
        ? htmlResponse(200, renderSessionStartedPage(), { 'Set-Cookie': cookie })
        : jsonResponse(200, { status: 'authenticated' }, { 'Set-Cookie': cookie })
    }

    // ─── Página intermedia de la invitación ──────────────────────────────────
    if (path.startsWith(PERSON_AUTH_PATHS.invitationLanding)) {
      if (request.method !== 'GET') return methodNotAllowed('GET')

      const token = decodeURIComponent(path.slice(PERSON_AUTH_PATHS.invitationLanding.length))

      if (!token) return htmlResponse(400, renderLinkProblemPage('invalid'))

      return htmlResponse(200, renderInvitationConfirmPage(token))
    }

    // ─── Aceptación de la invitación ─────────────────────────────────────────
    if (path === PERSON_AUTH_PATHS.invitationAccept) {
      if (request.method !== 'POST') return methodNotAllowed('POST')

      const wantsHtml = isFormContentType(request)

      const result = await acceptInvitationAndSendMagicLink(
        { ...magicLinkDeps, invitations: deps.invitations, mintSubject: deps.mintSubject },
        {
          token: readField(request, 'token') ?? '',
          returnTo: readField(request, 'return_to'),
          ipHash: audit.ipHash,
          ipValue,
          userAgentHash: audit.userAgentHash,
          correlationId: audit.correlationId
        }
      )

      if (result.status === 'rate_limited') {
        return wantsHtml
          ? htmlResponse(429, renderRateLimitedPage(), { 'Retry-After': String(result.retryAfterSeconds) })
          : jsonResponse(429, { status: 'rate_limited' }, { 'Retry-After': String(result.retryAfterSeconds) })
      }

      if (result.status === 'invalid') {
        return wantsHtml ? htmlResponse(400, renderLinkProblemPage('invalid')) : jsonResponse(400, { status: 'invalid' })
      }

      return wantsHtml ? htmlResponse(202, renderInvitationAcceptedPage()) : jsonResponse(202, { status: 'accepted' })
    }

    // ─── Contexto de la sesión ───────────────────────────────────────────────
    if (path === PERSON_AUTH_PATHS.session) {
      if (request.method !== 'GET') return methodNotAllowed('GET')

      const resolution = await resolvePersonSession({
        store: deps.store,
        config: deps.config,
        sessionId: readCookie(request.headers.get('cookie'), deps.config.sessionCookieName),
        expectedEnvironmentId: deps.environmentId,
        expectedSourceSystem: deps.expectedSourceSystem,
        now: deps.now()
      })

      if (resolution.status !== 'active') {
        return jsonResponse(401, { status: 'unauthenticated' }, { 'Set-Cookie': buildSessionClearCookie(deps.config.sessionCookieName) })
      }

      // El `sub` crudo NO sale al cliente: la sesión se identifica por su hash truncado.
      return jsonResponse(200, {
        status: 'authenticated',
        environmentId: resolution.session.environmentId,
        subjectRef: sha256Hex(resolution.session.subject).slice(0, 32),
        authLevel: resolution.authLevel,
        amr: resolution.session.amr,
        authTime: resolution.session.authTime.toISOString(),
        expiresAt: resolution.session.expiresAt.toISOString()
      })
    }

    // ─── Cierre de sesión ────────────────────────────────────────────────────
    if (path === PERSON_AUTH_PATHS.logout) {
      if (request.method !== 'POST') return methodNotAllowed('POST')

      const sessionId = readCookie(request.headers.get('cookie'), deps.config.sessionCookieName)

      if (sessionId) {
        await deps.store.revokeSession({ sessionHash: sha256Hex(sessionId), now: deps.now(), reason: 'logout' })
      }

      const clear = buildSessionClearCookie(deps.config.sessionCookieName)

      return isFormContentType(request)
        ? htmlResponse(200, renderSessionClosedPage(), { 'Set-Cookie': clear })
        : jsonResponse(200, { status: 'signed_out' }, { 'Set-Cookie': clear })
    }

    return jsonResponse(404, { error: 'not_found' })
  }
}
