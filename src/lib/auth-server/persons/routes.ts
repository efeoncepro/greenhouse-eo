import { internalLoginReturnTarget } from '../internal/login-target'
import { handleStepUpPage, STEP_UP_PAGE_PATH } from './step-up-page'
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
 *   POST /auth/passkeys/register/{start,finish}      alta de passkey (exige sesión)
 *   POST /auth/passkeys/authenticate/{start,finish}  login por passkey (credenciales descubribles)
 *   GET  /auth/passkeys             dispositivos registrados de la persona
 *   POST /auth/totp/enroll/{start,finish}            alta del segundo factor (exige sesión)
 *   POST /auth/totp/verify          step-up: escribe `step_up_at` + `amr` en la sesión
 */

import { buildRequestAuditContext } from '../oauth/audit'
import {
  htmlResponse,
  acceptsHtml,
  isFormContentType,
  jsonResponse,
  parseFormBody,
  parseJsonBody,
  redirectResponse,
  requestOrigin,
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
  renderLoginPageResponse,
  renderMagicLinkConfirmPage,
  renderMagicLinkSentPage,
  renderAccessRevokedPage,
  renderRateLimitedPage,
  renderSessionClosedPage,
  renderSessionStartedPage
} from './pages'
import { buildSessionClearCookie, buildSessionCookie, readCookie, resolvePersonSession } from './sessions'
import {
  finishPasskeyStepUp,
  startPasskeyStepUp,
  finishPasskeyAuthentication,
  finishPasskeyRegistration,
  startPasskeyAuthentication,
  startPasskeyRegistration,
  type PasskeyDeps
} from './passkeys'
import type { PersonAuthStorePort } from './store/port'
import type { TotpSecretCipherPort } from './totp-cipher'
import {
  enforceRateLimit,
  PASSKEY_IP_RULES,
  PASSKEY_REGISTER_SUBJECT_RULE,
  PASSKEY_STEP_UP_SUBJECT_RULE
} from './rate-limit'
import { startTotpEnrollment, verifyTotp, type TotpDeps } from './totp'

export type PersonAuthHandlerDeps = Omit<MagicLinkDeps, 'store' | 'config'> & {
  internalLoginEnabled: () => boolean
  store: PersonAuthStorePort
  config: AuthServerPersonAuthConfig
  invitations: InvitationAcceptancePort
  mintSubject: () => string
  /** `external_idp:<environment>` esperado en el link de toda sesión de este emisor. */
  expectedSourceSystem: string
  /** `rpId` del WebAuthn: el HOST del emisor. Distinto del origen, que sí lleva esquema. */
  rpId: string
  /** Observabilidad del contador que retrocede (señal `auth.person.passkey_counter_regression`). */
  onPasskeyCounterRegression?: (input: { credentialId: string }) => void
  /** Cifrado en reposo del secreto TOTP (Cloud KMS en runtime; fake en tests). */
  totpCipher: TotpSecretCipherPort
  /** Observabilidad del envelope caído (señal `auth.person.totp_envelope_unavailable`). */
  onTotpEnvelopeUnavailable?: () => void
}

/** Direct entry is available when enabled; explicit continuations remain issuer-local and validated. */
const corporateLoginUrl = (deps: PersonAuthHandlerDeps, rawReturnTo: string | null): string | null => {
  if (!deps.internalLoginEnabled()) return null
  if (rawReturnTo === null) return '/auth/internal/login'

  const target = internalLoginReturnTarget(rawReturnTo, deps.issuer)

  return target ? '/auth/internal/login?' + new URLSearchParams({ return_to: target }) : null
}

const BROWSER_MUTATION_PATHS = new Set<string>([
  PERSON_AUTH_PATHS.magicLinkConsume, PERSON_AUTH_PATHS.passkeyAuthenticateStart, PERSON_AUTH_PATHS.passkeyAuthenticateFinish,
  PERSON_AUTH_PATHS.passkeyRegisterStart, PERSON_AUTH_PATHS.passkeyRegisterFinish,
  PERSON_AUTH_PATHS.passkeyStepUpStart, PERSON_AUTH_PATHS.passkeyStepUpFinish,
  PERSON_AUTH_PATHS.totpEnrollStart, PERSON_AUTH_PATHS.totpEnrollFinish,
  PERSON_AUTH_PATHS.totpVerify, PERSON_AUTH_PATHS.logout
])

/** Browser cookie mutations require origin evidence; Fetch Metadata can only tighten it. */
const isTrustedBrowserMutation = (request: OAuthHttpRequest, issuer: string): boolean => {
  const expected = new URL(issuer).origin
  const origin = request.headers.get('origin')
  const site = request.headers.get('sec-fetch-site')

  if (site !== null && site !== 'same-origin') return false
  if (origin !== null) return origin === expected

  // Legacy browsers may omit Origin, but a same-origin Referer is still required.
  return requestOrigin(request) === expected
}

export type PersonAuthHandler = (request: OAuthHttpRequest) => Promise<OAuthHttpResponse | null>

const STATIC_PATHS = new Set<string>([
  STEP_UP_PAGE_PATH,
  PERSON_AUTH_PATHS.login,
  PERSON_AUTH_PATHS.magicLinkRequest,
  PERSON_AUTH_PATHS.magicLinkConsume,
  PERSON_AUTH_PATHS.invitationAccept,
  PERSON_AUTH_PATHS.session,
  PERSON_AUTH_PATHS.logout,
  PERSON_AUTH_PATHS.passkeyRegisterStart,
  PERSON_AUTH_PATHS.passkeyRegisterFinish,
  PERSON_AUTH_PATHS.passkeyAuthenticateStart,
  PERSON_AUTH_PATHS.passkeyAuthenticateFinish,
  PERSON_AUTH_PATHS.passkeyStepUpStart,
  PERSON_AUTH_PATHS.passkeyStepUpFinish,
  PERSON_AUTH_PATHS.passkeyList,
  PERSON_AUTH_PATHS.totpEnrollStart,
  PERSON_AUTH_PATHS.totpEnrollFinish,
  PERSON_AUTH_PATHS.totpVerify
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

  const passkeyDeps: PasskeyDeps = {
    store: deps.store,
    config: deps.config,
    directory: deps.directory,
    environmentId: deps.environmentId,
    origin: new URL(deps.issuer).origin,
    rpId: deps.rpId,
    now: deps.now
  }

  const totpDeps: TotpDeps = {
    store: deps.store,
    config: deps.config,
    cipher: deps.totpCipher,
    environmentId: deps.environmentId,
    now: deps.now
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

    if (request.method === 'POST' && BROWSER_MUTATION_PATHS.has(path) && !isTrustedBrowserMutation(request, deps.issuer)) {
      return jsonResponse(403, { error: 'invalid_request' })
    }

    if (path === STEP_UP_PAGE_PATH) {
      if (request.method !== 'GET') return methodNotAllowed('GET')

      return handleStepUpPage(request, deps)
    }

    const { audit, ipValue } = requestContext(request)

    // Public ceremony gates run before session lookup, JSON/WebAuthn parsing or challenge allocation.
    const passkeyAction = (
      {
        [PERSON_AUTH_PATHS.passkeyStepUpStart]: 'step_up_start',
        [PERSON_AUTH_PATHS.passkeyStepUpFinish]: 'step_up_finish',
        [PERSON_AUTH_PATHS.passkeyAuthenticateStart]: 'authenticate_start',
        [PERSON_AUTH_PATHS.passkeyAuthenticateFinish]: 'authenticate_finish',
        [PERSON_AUTH_PATHS.passkeyRegisterStart]: 'register_start',
        [PERSON_AUTH_PATHS.passkeyRegisterFinish]: 'register_finish'
      } as Partial<Record<string, keyof typeof PASSKEY_IP_RULES>>
    )[path]

    const limitPasskey = async (subject: string | null = null): Promise<OAuthHttpResponse | null> => {
      if (!passkeyAction) return null

      const rule = subject
        ? passkeyAction.startsWith('step_up')
          ? PASSKEY_STEP_UP_SUBJECT_RULE
          : PASSKEY_REGISTER_SUBJECT_RULE
        : PASSKEY_IP_RULES[passkeyAction]

      const decision = await enforceRateLimit({
        store: deps.store,
        config: deps.config,
        rule,
        value: subject ?? ipValue,
        now: deps.now()
      })

      if (decision.allowed) return null
      await deps.store.recordAttempt({
        method: 'passkey',
        stage: passkeyAction.startsWith('register') ? 'register' : 'authenticate',
        outcome: 'rate_limited',
        reasonCode: decision.reason,
        environmentId: deps.environmentId,
        subjectHash: subject ? sha256Hex(subject) : null,
        ipHash: audit.ipHash,
        userAgentHash: audit.userAgentHash,
        correlationId: audit.correlationId,
        details: { dimension: rule.dimension, action: rule.action }
      })

      return jsonResponse(429, { status: 'rate_limited' }, { 'Retry-After': String(decision.retryAfterSeconds) })
    }

    if (passkeyAction) {
      if (request.method !== 'POST') return methodNotAllowed('POST')
      const limited = await limitPasskey()

      if (limited) return limited
    }

    // ─── Formulario de acceso ────────────────────────────────────────────────
    if (path === PERSON_AUTH_PATHS.login) {
      if (request.method !== 'GET') return methodNotAllowed('GET')

      return renderLoginPageResponse(200, {
        returnTo: sanitizeReturnTo(request.url.searchParams.get('return_to')),
        internalLoginUrl: corporateLoginUrl(deps, request.url.searchParams.get('return_to'))
      })
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
          ? renderLoginPageResponse(400, {
              returnTo: sanitizeReturnTo(readField(request, 'return_to')),
              internalLoginUrl: corporateLoginUrl(deps, readField(request, 'return_to')),
              error: 'invalid_email'
            })
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
        return wantsHtml
          ? htmlResponse(403, renderAccessRevokedPage())
          : jsonResponse(403, { status: 'access_revoked' })
      }

      if (result.status !== 'authenticated') {
        const kind =
          result.status === 'expired' ? 'expired' : result.status === 'already_used' ? 'already_used' : 'invalid'

        return wantsHtml ? htmlResponse(400, renderLinkProblemPage(kind)) : jsonResponse(400, { status: result.status })
      }

      const cookie = buildSessionCookie(
        deps.config.sessionCookieName,
        result.session.sessionId,
        deps.config.sessionSlidingTtlSeconds
      )

      // El `return_to` ya vino saneado a path relativo del emisor cuando se emitió el enlace.
      if (result.returnTo) {
        return {
          ...redirectResponse(result.returnTo),
          headers: { ...redirectResponse(result.returnTo).headers, 'Set-Cookie': cookie }
        }
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
        return wantsHtml
          ? htmlResponse(400, renderLinkProblemPage('invalid'))
          : jsonResponse(400, { status: 'invalid' })
      }

      return wantsHtml ? htmlResponse(202, renderInvitationAcceptedPage()) : jsonResponse(202, { status: 'accepted' })
    }

    // ─── Passkeys ────────────────────────────────────────────────────────────
    //
    // Registrar exige sesión (agregas una llave a TU cuenta); autenticar no, obviamente.
    if (
      path === PERSON_AUTH_PATHS.passkeyRegisterStart ||
      path === PERSON_AUTH_PATHS.passkeyRegisterFinish ||
      path === PERSON_AUTH_PATHS.passkeyList
    ) {
      const expectedMethod = path === PERSON_AUTH_PATHS.passkeyList ? 'GET' : 'POST'

      if (request.method !== expectedMethod) return methodNotAllowed(expectedMethod)

      const resolution = await resolvePersonSession({
        store: deps.store,
        config: deps.config,
        sessionId: readCookie(request.headers.get('cookie'), deps.config.sessionCookieName),
        expectedEnvironmentId: deps.environmentId,
        expectedSourceSystem: deps.expectedSourceSystem,
        now: deps.now()
      })

      if (resolution.status !== 'active') return jsonResponse(401, { status: 'unauthenticated' })

      const { session } = resolution

      if (path === PERSON_AUTH_PATHS.passkeyList) {
        const credentials = await deps.store.listPasskeyCredentials({
          environmentId: deps.environmentId,
          subject: session.subject
        })

        return jsonResponse(200, {
          status: 'ok',
          max: deps.config.maxPasskeysPerPerson,
          credentials: credentials.map(credential => ({
            credentialId: credential.credentialId,
            deviceName: credential.deviceName,
            deviceType: credential.deviceType,
            backedUp: credential.backedUp,
            createdAt: credential.createdAt.toISOString(),
            lastUsedAt: credential.lastUsedAt?.toISOString() ?? null
          }))
        })
      }

      const limited = await limitPasskey(session.subject)

      if (limited) return limited

      if (path === PERSON_AUTH_PATHS.passkeyRegisterStart) {
        const started = await startPasskeyRegistration(passkeyDeps, {
          subject: session.subject,
          displayName: readField(request, 'display_name'),
          ipHash: audit.ipHash,
          correlationId: audit.correlationId
        })

        if (started.status === 'limit_reached') {
          return jsonResponse(409, { status: 'limit_reached', max: started.max })
        }

        return jsonResponse(200, { status: 'ready', options: started.options })
      }

      const body = parseJsonBody(request.body)
      const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
      const challenge = typeof payload.challenge === 'string' ? payload.challenge : ''

      const finished = await finishPasskeyRegistration(passkeyDeps, {
        subject: session.subject,
        challenge,
        response: payload.response as never,
        deviceName: typeof payload.device_name === 'string' ? payload.device_name : null
      })

      await deps.store.recordAttempt({
        method: 'passkey',
        stage: 'register',
        outcome: finished.status === 'registered' ? 'success' : 'rejected',
        reasonCode: finished.status === 'registered' ? null : finished.reason,
        environmentId: deps.environmentId,
        subjectHash: sha256Hex(session.subject),
        ipHash: audit.ipHash,
        userAgentHash: audit.userAgentHash,
        correlationId: audit.correlationId,
        details: {}
      })

      if (finished.status !== 'registered') return jsonResponse(400, { status: 'rejected' })

      return jsonResponse(201, { status: 'registered', credentialId: finished.credentialId })
    }

    if (path === PERSON_AUTH_PATHS.passkeyStepUpStart || path === PERSON_AUTH_PATHS.passkeyStepUpFinish) {
      const resolved = await resolvePersonSession({
        store: deps.store,
        config: deps.config,
        sessionId: readCookie(request.headers.get('cookie'), deps.config.sessionCookieName),
        expectedEnvironmentId: deps.environmentId,
        expectedSourceSystem: deps.expectedSourceSystem,
        now: deps.now()
      })

      if (resolved.status !== 'active') return jsonResponse(401, { status: 'unauthenticated' })
      const limited = await limitPasskey(resolved.session.subject)

      if (limited) return limited

      if (path === PERSON_AUTH_PATHS.passkeyStepUpStart) {
        const started = await startPasskeyStepUp(passkeyDeps, {
          sessionHash: resolved.session.sessionHash,
          ipHash: audit.ipHash,
          correlationId: audit.correlationId
        })

        return started.status === 'ready'
          ? jsonResponse(200, started)
          : jsonResponse(401, { status: 'unauthenticated' })
      }

      const body = parseJsonBody(request.body)
      const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

      const result = await finishPasskeyStepUp(passkeyDeps, {
        sessionHash: resolved.session.sessionHash,
        challenge: typeof payload.challenge === 'string' ? payload.challenge : '',
        response: payload.response as never
      })

      await deps.store.recordAttempt({
        method: 'passkey',
        stage: 'authenticate',
        outcome: result.status === 'verified' ? 'success' : 'rejected',
        reasonCode: result.status === 'verified' ? null : result.status === 'rejected' ? result.reason : result.status,
        environmentId: deps.environmentId,
        subjectHash: sha256Hex(resolved.session.subject),
        ipHash: audit.ipHash,
        userAgentHash: audit.userAgentHash,
        correlationId: audit.correlationId,
        details: { purpose: 'step_up' }
      })
      if (result.status === 'counter_regression')
        deps.onPasskeyCounterRegression?.({ credentialId: result.credentialId })
      if (result.status !== 'verified') return jsonResponse(401, { status: 'rejected' })

      // Same cookie/session/auth_time/provenance: a verified local factor only updates step_up_at/amr.
      return jsonResponse(200, { status: 'verified', authLevel: 'step_up', amr: result.amr })
    }

    if (path === PERSON_AUTH_PATHS.passkeyAuthenticateStart) {
      if (request.method !== 'POST') return methodNotAllowed('POST')

      const started = await startPasskeyAuthentication(passkeyDeps, {
        ipHash: audit.ipHash,
        correlationId: audit.correlationId
      })

      return jsonResponse(200, { status: 'ready', options: started.options })
    }

    if (path === PERSON_AUTH_PATHS.passkeyAuthenticateFinish) {
      if (request.method !== 'POST') return methodNotAllowed('POST')

      const body = parseJsonBody(request.body)
      const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

      const result = await finishPasskeyAuthentication(passkeyDeps, {
        challenge: typeof payload.challenge === 'string' ? payload.challenge : '',
        response: payload.response as never,
        ipHash: audit.ipHash,
        userAgentHash: audit.userAgentHash,
        correlationId: audit.correlationId
      })

      const outcomeFor = () => {
        if (result.status === 'authenticated') return { outcome: 'success' as const, reasonCode: null }

        if (result.status === 'counter_regression') {
          return { outcome: 'rejected' as const, reasonCode: 'counter_regression' }
        }

        if (result.status === 'access_revoked') return { outcome: 'rejected' as const, reasonCode: 'access_revoked' }

        return { outcome: 'rejected' as const, reasonCode: result.reason }
      }

      const { outcome, reasonCode } = outcomeFor()

      await deps.store.recordAttempt({
        method: 'passkey',
        stage: 'authenticate',
        outcome,
        reasonCode,
        environmentId: deps.environmentId,
        subjectHash:
          result.status === 'authenticated' || result.status === 'counter_regression'
            ? sha256Hex(result.subject)
            : null,
        ipHash: audit.ipHash,
        userAgentHash: audit.userAgentHash,
        correlationId: audit.correlationId,
        details: {}
      })

      if (result.status === 'counter_regression') {
        deps.onPasskeyCounterRegression?.({ credentialId: result.credentialId })

        // La credencial ya quedó invalidada. Se responde 401 genérico: el detalle es del ledger.
        return jsonResponse(401, { status: 'rejected' })
      }

      if (result.status === 'access_revoked') return jsonResponse(403, { status: 'access_revoked' })
      if (result.status !== 'authenticated') return jsonResponse(401, { status: 'rejected' })

      return jsonResponse(
        200,
        { status: 'authenticated', amr: result.amr },
        {
          'Set-Cookie': buildSessionCookie(
            deps.config.sessionCookieName,
            result.session.sessionId,
            deps.config.sessionSlidingTtlSeconds
          )
        }
      )
    }

    // ─── TOTP (segundo factor) ───────────────────────────────────────────────
    //
    // Las tres rutas exigen sesión: el TOTP no es un método de login, es el step-up que autoriza
    // consentir un scope de escritura sobre una sesión que YA existe.
    if (
      path === PERSON_AUTH_PATHS.totpEnrollStart ||
      path === PERSON_AUTH_PATHS.totpEnrollFinish ||
      path === PERSON_AUTH_PATHS.totpVerify
    ) {
      if (request.method !== 'POST') return methodNotAllowed('POST')

      const resolution = await resolvePersonSession({
        store: deps.store,
        config: deps.config,
        sessionId: readCookie(request.headers.get('cookie'), deps.config.sessionCookieName),
        expectedEnvironmentId: deps.environmentId,
        expectedSourceSystem: deps.expectedSourceSystem,
        now: deps.now()
      })

      if (resolution.status !== 'active') return jsonResponse(401, { status: 'unauthenticated' })

      const { session } = resolution

      if (path === PERSON_AUTH_PATHS.totpEnrollStart) {
        const started = await startTotpEnrollment(totpDeps, { subject: session.subject })

        if (started.status === 'envelope_unavailable') {
          deps.onTotpEnvelopeUnavailable?.()

          // Degradación honesta: no se guarda un secreto sin cifrar «por esta vez».
          return jsonResponse(503, { status: 'envelope_unavailable' })
        }

        if (started.status === 'already_active') return jsonResponse(409, { status: 'already_active' })

        // Secreto y códigos en claro SÓLO acá: no vuelven a salir del servidor nunca más.
        return jsonResponse(200, {
          status: 'ready',
          secret: started.secret,
          otpauthUri: started.otpauthUri,
          backupCodes: started.backupCodes
        })
      }

      const code = readField(request, 'code') ?? ''

      const result = await verifyTotp(totpDeps, {
        subject: session.subject,
        code,
        confirmEnrollment: path === PERSON_AUTH_PATHS.totpEnrollFinish,
        ipHash: audit.ipHash,
        userAgentHash: audit.userAgentHash,
        correlationId: audit.correlationId
      })

      if (result.status === 'rate_limited') {
        return jsonResponse(429, { status: 'rate_limited' }, { 'Retry-After': String(result.retryAfterSeconds) })
      }

      if (result.status === 'envelope_unavailable') {
        deps.onTotpEnvelopeUnavailable?.()

        return jsonResponse(503, { status: 'envelope_unavailable' })
      }

      if (result.status !== 'verified') {
        // `invalid`, `replayed` y `not_enrolled` comparten respuesta: el detalle vive en el ledger.
        return jsonResponse(400, { status: 'rejected' })
      }

      // El step-up se ESCRIBE en la sesión: `authorize` lo lee de ahí, no de esta respuesta.
      const elevated = await deps.store.recordBoundSessionStepUp({
        sessionHash: session.sessionHash,
        subject: session.subject,
        environmentId: session.environmentId,
        profileId: session.profileId,
        linkId: session.linkId,
        stepUpAt: deps.now(),
        amr: result.amr
      })

      if (!elevated) return jsonResponse(401, { status: 'unauthenticated' })

      const openBackupCodes = await deps.store.countOpenTotpBackupCodes({
        environmentId: deps.environmentId,
        subject: session.subject
      })

      return jsonResponse(200, {
        status: 'verified',
        authLevel: 'step_up',
        usedBackupCode: result.usedBackupCode,
        remainingBackupCodes: openBackupCodes
      })
    }

    // ─── Contexto de la sesión ───────────────────────────────────────────────
    if (path === PERSON_AUTH_PATHS.session) {
      if (request.method !== 'GET') return methodNotAllowed('GET')

      const wantsHtml = acceptsHtml(request)
      const responseHeaders = { Vary: 'Accept' }

      const resolution = await resolvePersonSession({
        store: deps.store,
        config: deps.config,
        sessionId: readCookie(request.headers.get('cookie'), deps.config.sessionCookieName),
        expectedEnvironmentId: deps.environmentId,
        expectedSourceSystem: deps.expectedSourceSystem,
        now: deps.now()
      })

      if (resolution.status !== 'active') {
        const headers = { ...responseHeaders, 'Set-Cookie': buildSessionClearCookie(deps.config.sessionCookieName) }

        return wantsHtml
          ? renderLoginPageResponse(401, { returnTo: null, internalLoginUrl: corporateLoginUrl(deps, null) }, headers)
          : jsonResponse(401, { status: 'unauthenticated' }, headers)
      }

      if (wantsHtml) return htmlResponse(200, renderSessionStartedPage({ direct: true }), responseHeaders)

      // El `sub` crudo NO sale al cliente: la sesión se identifica por su hash truncado.
      return jsonResponse(200, {
        status: 'authenticated',
        environmentId: resolution.session.environmentId,
        subjectRef: sha256Hex(resolution.session.subject).slice(0, 32),
        authLevel: resolution.authLevel,
        amr: resolution.session.amr,
        authTime: resolution.session.authTime.toISOString(),
        expiresAt: resolution.session.expiresAt.toISOString()
      }, responseHeaders)
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
