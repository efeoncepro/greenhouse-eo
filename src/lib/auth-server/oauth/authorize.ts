import type { ConsentContextPort } from './consent-context'
/**
 * `GET /oauth/authorize` (TASK-1829): authorization code + PKCE S256 obligatorio.
 *
 * Orden de validación (RFC 6749 §4.1.2.1): client + redirect_uri se validan ANTES de cualquier
 * redirect; con ellos inválidos se responde una página de error y nunca se redirige. El resto de los
 * errores vuelve al cliente con `error`, `state` e `iss` (RFC 9207). La persona la resuelve el
 * `SubjectSessionPort` (TASK-1830); el consentimiento se exige por (subject, client, scope) y los
 * scopes de escritura además exigen `authLevel = step_up`. `gv` se resuelve al autorizar y se
 * re-resuelve al emitir.
 */

import { buildRequestAuditContext, recordOAuthAudit } from './audit'
import { assertScopesAllowedForClient, loopbackPolicyFor, resolveAuthorizeRedirectUri, resolveClient, type ClientResolverDeps } from './clients'
import type { AuthServerOAuthConfig } from './config'
import { missingConsentScopes } from './consent'
import { OAuthProtocolError, isOAuthProtocolError } from './errors'
import type { GrantsVersionPort } from './grants'
import { htmlResponse, redirectResponse, type OAuthHttpRequest, type OAuthHttpResponse } from './http'
import { OAUTH_ENDPOINT_PATHS } from './metadata'
import { renderConsentPage, renderErrorPage, renderLoginRequiredPage, renderStepUpRequiredPage } from './pages/render'
import { generateOpaqueId, generateOpaqueToken, isPkceToken, parseScopeParam, secondsFromNow, sha256Hex } from './primitives'
import { EFEONCE_MCP_BASE_SCOPE, isWriteScope } from './scopes'
import type { OAuthStorePort } from './store/port'
import type { SubjectSessionPort } from './subject'
import { AUTHORIZATION_CODE_PREFIX } from './tokens'

export type AuthorizeDeps = {
  store: OAuthStorePort
  config: AuthServerOAuthConfig
  subjectPort: SubjectSessionPort
  consentContextPort: ConsentContextPort
  grantsPort: GrantsVersionPort
  cimd: ClientResolverDeps['cimd']
  now?: () => Date
}

const paramOf = (url: URL, name: string): string | null => {
  const values = url.searchParams.getAll(name)

  if (values.length > 1) throw new OAuthProtocolError('invalid_request', { description: `duplicate ${name}`, reason: 'duplicate_param', redirectable: true })

  const value = values[0]?.trim()

  return value ? value : null
}

const buildErrorRedirect = (redirectUri: string, error: OAuthProtocolError, state: string | null, issuer: string): OAuthHttpResponse => {
  const url = new URL(redirectUri)

  url.searchParams.set('error', error.code)
  if (error.description) url.searchParams.set('error_description', error.description)
  if (state) url.searchParams.set('state', state)
  url.searchParams.set('iss', issuer)

  return redirectResponse(url.toString())
}

export const handleAuthorize = async (request: OAuthHttpRequest, deps: AuthorizeDeps): Promise<OAuthHttpResponse> => {
  const now = (deps.now ?? (() => new Date()))()
  const audit = buildRequestAuditContext(request.headers)
  const url = request.url

  if (request.method !== 'GET') return htmlResponse(405, renderErrorPage('invalid_request'), { Allow: 'GET' })

  // 1. Cliente + redirect_uri: sin redirect posible hasta validarlos.
  let clientId: string | null = null
  let redirectUri: string | null = null
  let state: string | null = null

  try {
    clientId = paramOf(url, 'client_id')
    state = paramOf(url, 'state')

    if (!clientId) throw new OAuthProtocolError('invalid_request', { description: 'client_id required', reason: 'client_id_missing' })

    const client = await resolveClient(clientId, { store: deps.store, config: deps.config, cimd: deps.cimd })
    const requestedRedirect = paramOf(url, 'redirect_uri')

    if (!requestedRedirect) {
      throw new OAuthProtocolError('invalid_request', { description: 'redirect_uri required', reason: 'redirect_uri_missing' })
    }

    redirectUri = resolveAuthorizeRedirectUri(client, requestedRedirect, loopbackPolicyFor(deps.config))

    if (!redirectUri) {
      throw new OAuthProtocolError('invalid_redirect_uri', { description: 'redirect_uri not registered', reason: 'redirect_uri_unregistered' })
    }

    // 2. Parámetros redirigibles.
    try {
      const responseType = paramOf(url, 'response_type')

      if (responseType !== 'code') {
        throw new OAuthProtocolError('unsupported_response_type', { description: 'only code is supported', reason: 'response_type', redirectable: true })
      }

      if (!client.responseTypes.includes('code') || !client.grantTypes.includes('authorization_code')) {
        throw new OAuthProtocolError('unauthorized_client', { description: 'client not allowed to use authorization_code', reason: 'client_grant_types', redirectable: true })
      }

      const codeChallenge = paramOf(url, 'code_challenge')
      const codeChallengeMethod = paramOf(url, 'code_challenge_method')

      if (!codeChallenge || !isPkceToken(codeChallenge)) {
        throw new OAuthProtocolError('invalid_request', { description: 'code_challenge required (S256)', reason: 'pkce_missing', redirectable: true })
      }

      if (codeChallengeMethod !== 'S256') {
        throw new OAuthProtocolError('invalid_request', { description: 'code_challenge_method must be S256', reason: 'pkce_method', redirectable: true })
      }

      const resource = paramOf(url, 'resource')

      if (resource && resource !== deps.config.mcpAudience) {
        throw new OAuthProtocolError('invalid_target', { description: 'unknown resource', reason: 'resource_mismatch', redirectable: true })
      }

      const scopes = parseScopeParam(url.searchParams.get('scope'), [EFEONCE_MCP_BASE_SCOPE])

      assertScopesAllowedForClient(client, scopes)

      const prompt = paramOf(url, 'prompt')
      const nonce = paramOf(url, 'nonce')

      // 3. Persona autenticada por este emisor (TASK-1830).
      const subject = await deps.subjectPort.resolve(request, { clientId: client.clientId, audience: deps.config.mcpAudience })

      if (!subject || subject.environmentId !== deps.config.environmentId) {
        await recordOAuthAudit(deps.store, audit, { eventType: 'authorize', outcome: 'rejected', clientId, grantId: null, errorCode: 'login_required' })

        if (prompt === 'none') {
          return buildErrorRedirect(redirectUri, new OAuthProtocolError('login_required', { redirectable: true }), state, deps.config.issuer)
        }

        return htmlResponse(401, renderLoginRequiredPage(`${url.pathname}${url.search}`))
      }

      // 4. Autoridad vigente antes de pedir factor o consentimiento.
      const grants = await deps.grantsPort.resolve({ environmentId: subject.environmentId, subject: subject.subject, clientId: client.clientId, authorizationContextId: subject.authorizationContextId })

      if (!grants.bound) {
        throw new OAuthProtocolError('access_denied', { description: 'no organization binding', reason: `unbound:${grants.outcome}`, redirectable: true })
      }

      // 5. Step-up para scopes de escritura (regla dura del ADR).
      if (scopes.some(isWriteScope) && subject.authLevel !== 'step_up') {
        await recordOAuthAudit(deps.store, audit, { eventType: 'authorize', outcome: 'rejected', clientId, subject: subject.subject, grantId: null, errorCode: 'interaction_required', details: { reason: 'step_up_required' } })

        if (prompt === 'none') {
          return buildErrorRedirect(redirectUri, new OAuthProtocolError('interaction_required', { redirectable: true }), state, deps.config.issuer)
        }

        return htmlResponse(403, renderStepUpRequiredPage(`${url.pathname}${url.search}`))
      }

      const consentContext = await deps.consentContextPort.resolve({
        environmentId: subject.environmentId, subject: subject.subject, clientId: client.clientId,
        audience: deps.config.mcpAudience, authorizationContextId: subject.authorizationContextId
      }).catch(() => ({ outcome: 'unavailable' as const }))

      if (consentContext.outcome !== 'resolved' || consentContext.organizations.length === 0) {
        throw new OAuthProtocolError(consentContext.outcome === 'unavailable' ? 'temporarily_unavailable' : 'access_denied', {
          reason: 'consent_context_unavailable', redirectable: true
        })
      }

      // 6. Consentimiento por cliente y scope.
      const consents = await deps.store.listActiveConsents({ subject: subject.subject, environmentId: subject.environmentId, clientId: client.clientId, authorizationContextId: subject.authorizationContextId })
      const missing = missingConsentScopes(consents, scopes)

      if (missing.length > 0) {
        if (prompt === 'none') {
          return buildErrorRedirect(redirectUri, new OAuthProtocolError('consent_required', { redirectable: true }), state, deps.config.issuer)
        }

        return htmlResponse(
          200,
          renderConsentPage({
            organizations: consentContext.organizations,
            clientName: client.clientName,
            clientId: client.clientId,
            scopes,
            returnTo: `${url.pathname}${url.search}`,
            actionPath: OAUTH_ENDPOINT_PATHS.consent
          })
        )
      }

      // 7. Code de un solo uso.
      const code = generateOpaqueToken(AUTHORIZATION_CODE_PREFIX, 32)
      const grantId = `grt-${generateOpaqueId(12)}`

      await deps.store.insertAuthorizationCode({
        authorizationContextId: subject.authorizationContextId ?? null,
        codeHash: sha256Hex(code),
        clientId: client.clientId,
        subject: subject.subject,
        environmentId: subject.environmentId,
        grantId,
        redirectUri,
        scopes,
        codeChallenge,
        codeChallengeMethod: 'S256',
        nonce,
        authTime: subject.authTime,
        grantsVersion: grants.grantsVersion,
        expiresAt: secondsFromNow(now, deps.config.authorizationCodeTtlSeconds),
        consumedAt: null,
        createdAt: now,
        ipHash: audit.ipHash,
        correlationId: audit.correlationId
      })

      await recordOAuthAudit(deps.store, audit, {
        eventType: 'authorize',
        outcome: 'success',
        clientId: client.clientId,
        subject: subject.subject,
        grantId,
        errorCode: null,
        details: { scopes, gv: grants.grantsVersion, memberships: grants.memberships }
      })

      const target = new URL(redirectUri)

      target.searchParams.set('code', code)
      if (state) target.searchParams.set('state', state)
      target.searchParams.set('iss', deps.config.issuer)

      return redirectResponse(target.toString())
    } catch (error) {
      if (isOAuthProtocolError(error) && error.redirectable) {
        await recordOAuthAudit(deps.store, audit, { eventType: 'authorize', outcome: 'rejected', clientId, grantId: null, errorCode: error.code, details: { reason: error.reason } })

        return buildErrorRedirect(redirectUri, error, state, deps.config.issuer)
      }

      throw error
    }
  } catch (error) {
    if (isOAuthProtocolError(error)) {
      await recordOAuthAudit(deps.store, audit, { eventType: 'authorize', outcome: 'rejected', clientId, grantId: null, errorCode: error.code, details: { reason: error.reason } })

      return htmlResponse(error.statusCode, renderErrorPage(error.code))
    }

    throw error
  }
}
