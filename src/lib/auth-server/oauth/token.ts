/**
 * `POST /oauth/token` (TASK-1829): grants `authorization_code` (PKCE S256) y `refresh_token` (rotación
 * con detección de reuso). Autenticación de cliente: `none` (públicos) o `client_secret_basic` /
 * `client_secret_post` (confidenciales). Rate limit por IP y por `client_id`.
 *
 * Reuso de code ⇒ se revoca la familia que abrió (RFC 6749 §4.1.2) + audit `code_reuse`.
 * Reuso de refresh ⇒ se revoca toda la familia (RFC 6819 §5.2.2.3) + audit `refresh_reuse`.
 * Ningún token sale sin consentimiento activo para cada scope ni sin binding `bound` (gv fresco).
 */

import { buildRequestAuditContext, enforceOAuthRateLimit, recordOAuthAudit, type OAuthRequestAuditContext } from './audit'
import { assertScopesAllowedForClient, authenticateClient, parseClientCredentials, resolveClient, type ClientResolverDeps } from './clients'
import type { AuthServerOAuthConfig } from './config'
import { missingConsentScopes } from './consent'
import { OAuthProtocolError, isOAuthProtocolError } from './errors'
import type { GrantsVersionPort } from './grants'
import { isFormContentType, jsonResponse, parseFormBody, type OAuthHttpRequest, type OAuthHttpResponse } from './http'
import { sha256Hex, verifyPkceS256 } from './primitives'
import type { OAuthClientRecord, OAuthStorePort } from './store/port'
import { issueInitialTokenSet, prepareTokenSet, toTokenResponseBody, type AccessTokenSigner } from './tokens'

export type TokenDeps = {
  store: OAuthStorePort
  config: AuthServerOAuthConfig
  signer: AccessTokenSigner
  grantsPort: GrantsVersionPort
  cimd: ClientResolverDeps['cimd']
  now?: () => Date
}

const TOKEN_EVENTS = ['token', 'refresh'] as const

const errorResponse = (error: OAuthProtocolError): OAuthHttpResponse =>
  jsonResponse(error.statusCode, error.toBody(), error.code === 'invalid_client' ? { 'WWW-Authenticate': 'Basic realm="oauth"' } : {})

/** Consumidores del token endpoint: parsea + autentica al cliente (compartido con revoke/introspect). */
export const authenticateTokenEndpointClient = async (
  request: OAuthHttpRequest,
  form: Map<string, string>,
  deps: Pick<TokenDeps, 'store' | 'config' | 'cimd'>
): Promise<OAuthClientRecord> => {
  const credentials = parseClientCredentials({
    authorization: request.headers.get('authorization'),
    bodyClientId: form.get('client_id') ?? null,
    bodyClientSecret: form.get('client_secret') ?? null
  })

  if (!credentials.clientId) throw new OAuthProtocolError('invalid_client', { description: 'client_id required', reason: 'client_id_missing' })

  const client = await resolveClient(credentials.clientId, { store: deps.store, config: deps.config, cimd: deps.cimd })

  authenticateClient(client, credentials)

  return client
}

export const parseTokenForm = (request: OAuthHttpRequest): Map<string, string> => {
  if (request.method !== 'POST') throw new OAuthProtocolError('invalid_request', { description: 'POST required', reason: 'method' })
  if (!isFormContentType(request)) throw new OAuthProtocolError('invalid_request', { description: 'application/x-www-form-urlencoded required', reason: 'content_type' })

  const form = parseFormBody(request.body)

  if (form.has('__duplicate__')) throw new OAuthProtocolError('invalid_request', { description: 'duplicate parameter', reason: 'duplicate_param' })

  return form
}

const assertConsentAndBinding = async (
  deps: TokenDeps,
  input: { client: OAuthClientRecord; subject: string; environmentId: string; scopes: readonly string[]; authorizationContextId?: string | null }
): Promise<number> => {
  // A previously granted scope does not bypass the client's current issuance policy.
  assertScopesAllowedForClient(input.client, input.scopes)

  const consents = await deps.store.listActiveConsents({ subject: input.subject, environmentId: input.environmentId, clientId: input.client.clientId, authorizationContextId: input.authorizationContextId })

  if (missingConsentScopes(consents, input.scopes).length > 0) {
    throw new OAuthProtocolError('invalid_grant', { description: 'consent missing', reason: 'consent_missing' })
  }

  const grants = await deps.grantsPort.resolve({ environmentId: input.environmentId, subject: input.subject, clientId: input.client.clientId, authorizationContextId: input.authorizationContextId })

  if (!grants.bound) throw new OAuthProtocolError('invalid_grant', { description: 'no organization binding', reason: `unbound:${grants.outcome}` })

  return grants.grantsVersion
}

const handleAuthorizationCodeGrant = async (
  request: OAuthHttpRequest,
  form: Map<string, string>,
  client: OAuthClientRecord,
  audit: OAuthRequestAuditContext,
  deps: TokenDeps,
  now: Date
): Promise<OAuthHttpResponse> => {
  const code = form.get('code')
  const redirectUri = form.get('redirect_uri')
  const codeVerifier = form.get('code_verifier')

  if (!code || !redirectUri || !codeVerifier) {
    throw new OAuthProtocolError('invalid_request', { description: 'code, redirect_uri and code_verifier are required', reason: 'params_missing' })
  }

  const consumed = await deps.store.consumeAuthorizationCode({ codeHash: sha256Hex(code), now })

  if (consumed.status === 'not_found') throw new OAuthProtocolError('invalid_grant', { description: 'invalid code', reason: 'code_not_found' })

  if (consumed.status === 'already_consumed') {
    // Reuso: la familia que abrió ese code queda revocada (RFC 6749 §4.1.2).
    const revoked = await deps.store.revokeGrant({ grantId: consumed.code.grantId, now, reason: 'authorization_code_reuse' })

    await recordOAuthAudit(deps.store, audit, {
      eventType: 'code_reuse',
      outcome: 'rejected',
      clientId: client.clientId,
      subject: consumed.code.subject,
      grantId: consumed.code.grantId,
      errorCode: 'invalid_grant',
      details: { ...revoked, codeClientId: consumed.code.clientId }
    })

    throw new OAuthProtocolError('invalid_grant', { description: 'code already used', reason: 'code_reuse' })
  }

  if (consumed.status === 'expired') throw new OAuthProtocolError('invalid_grant', { description: 'code expired', reason: 'code_expired' })

  const record = consumed.code

  if (record.clientId !== client.clientId) throw new OAuthProtocolError('invalid_grant', { description: 'code issued to another client', reason: 'client_mismatch' })
  if (record.redirectUri !== redirectUri) throw new OAuthProtocolError('invalid_grant', { description: 'redirect_uri mismatch', reason: 'redirect_mismatch' })
  if (!verifyPkceS256(codeVerifier, record.codeChallenge)) throw new OAuthProtocolError('invalid_grant', { description: 'PKCE verification failed', reason: 'pkce_mismatch' })

  const grantsVersion = await assertConsentAndBinding(deps, { client, subject: record.subject, environmentId: record.environmentId, scopes: record.scopes, authorizationContextId: record.authorizationContextId })

  const tokens = await issueInitialTokenSet(deps, {
    authorizationContextId: record.authorizationContextId ?? null,
    client,
    subject: record.subject,
    environmentId: record.environmentId,
    scopes: record.scopes,
    grantId: record.grantId,
    grantsVersion,
    authTime: record.authTime,
    now
  })

  await recordOAuthAudit(deps.store, audit, {
    eventType: 'token',
    outcome: 'success',
    clientId: client.clientId,
    subject: record.subject,
    grantId: record.grantId,
    errorCode: null,
    details: { grant: 'authorization_code', jti: tokens.jti, scopes: record.scopes, gv: grantsVersion }
  })

  return jsonResponse(200, toTokenResponseBody(tokens))
}

const handleRefreshTokenGrant = async (
  form: Map<string, string>,
  client: OAuthClientRecord,
  audit: OAuthRequestAuditContext,
  deps: TokenDeps,
  now: Date
): Promise<OAuthHttpResponse> => {
  const refreshToken = form.get('refresh_token')

  if (!refreshToken) throw new OAuthProtocolError('invalid_request', { description: 'refresh_token required', reason: 'refresh_missing' })
  if (!client.grantTypes.includes('refresh_token')) throw new OAuthProtocolError('unauthorized_client', { description: 'refresh_token not allowed for client', reason: 'client_grant_types' })

  const tokenHash = sha256Hex(refreshToken)
  const previous = await deps.store.getRefreshToken(tokenHash)

  if (!previous) throw new OAuthProtocolError('invalid_grant', { description: 'invalid refresh_token', reason: 'refresh_not_found' })

  if (previous.clientId !== client.clientId) {
    // Un refresh presentado por otro cliente es un token filtrado: se quema la familia.
    await deps.store.revokeGrant({ grantId: previous.grantId, now, reason: 'refresh_client_mismatch' })
    await recordOAuthAudit(deps.store, audit, { eventType: 'refresh_reuse', outcome: 'rejected', clientId: client.clientId, subject: previous.subject, grantId: previous.grantId, errorCode: 'invalid_grant', details: { reason: 'client_mismatch' } })

    throw new OAuthProtocolError('invalid_grant', { description: 'invalid refresh_token', reason: 'refresh_client_mismatch' })
  }

  const requestedScope = form.get('scope')
  let scopes = previous.scopes

  if (requestedScope) {
    const narrowed = requestedScope.split(/\s+/).filter(Boolean)

    if (narrowed.length === 0 || narrowed.some(scope => !previous.scopes.includes(scope))) {
      throw new OAuthProtocolError('invalid_scope', { description: 'scope exceeds the original grant', reason: 'scope_exceeds' })
    }

    scopes = narrowed
  }

  const grantsVersion = await assertConsentAndBinding(deps, { client, subject: previous.subject, environmentId: previous.environmentId, scopes, authorizationContextId: previous.authorizationContextId })

  const prepared = await prepareTokenSet(deps.config, deps.signer, {
    authorizationContextId: previous.authorizationContextId ?? null,
    client,
    subject: previous.subject,
    environmentId: previous.environmentId,
    scopes,
    grantId: previous.grantId,
    grantsVersion,
    // Unknown legacy authentication time is conservatively ancient, never refreshed to now.
    authTime: previous.authTime ?? new Date(0),
    now,
    absoluteExpiresAt: previous.absoluteExpiresAt
  })

  // Deslizante con tope absoluto.
  prepared.refresh.expiresAt = new Date(Math.min(prepared.refresh.expiresAt.getTime(), previous.absoluteExpiresAt.getTime()))

  const rotation = await deps.store.rotateRefreshToken({ tokenHash, now, next: prepared.refresh, accessToken: prepared.access })

  if (rotation.status === 'reused' || rotation.status === 'revoked') {
    const revoked = await deps.store.revokeGrant({ grantId: previous.grantId, now, reason: 'refresh_token_reuse' })

    await recordOAuthAudit(deps.store, audit, {
      eventType: 'refresh_reuse',
      outcome: 'rejected',
      clientId: client.clientId,
      subject: previous.subject,
      grantId: previous.grantId,
      errorCode: 'invalid_grant',
      details: { ...revoked, previousStatus: rotation.status }
    })

    throw new OAuthProtocolError('invalid_grant', { description: 'refresh_token no longer valid', reason: `refresh_${rotation.status}` })
  }

  if (rotation.status !== 'rotated') throw new OAuthProtocolError('invalid_grant', { description: 'refresh_token expired', reason: `refresh_${rotation.status}` })

  await recordOAuthAudit(deps.store, audit, {
    eventType: 'refresh',
    outcome: 'success',
    clientId: client.clientId,
    subject: previous.subject,
    grantId: previous.grantId,
    errorCode: null,
    details: { jti: prepared.tokens.jti, scopes, gv: grantsVersion }
  })

  return jsonResponse(200, toTokenResponseBody(prepared.tokens))
}

export const handleToken = async (request: OAuthHttpRequest, deps: TokenDeps): Promise<OAuthHttpResponse> => {
  const now = (deps.now ?? (() => new Date()))()
  const audit = buildRequestAuditContext(request.headers)
  let clientId: string | null = null

  try {
    const form = parseTokenForm(request)

    clientId = form.get('client_id') ?? null

    await enforceOAuthRateLimit(deps.store, audit, {
      rule: { eventTypes: TOKEN_EVENTS, windowSeconds: 60, perIp: deps.config.tokenRateLimitPerIp, perClient: deps.config.tokenRateLimitPerClient },
      clientId,
      now
    })

    const client = await authenticateTokenEndpointClient(request, form, deps)

    clientId = client.clientId

    const grantType = form.get('grant_type')

    if (grantType === 'authorization_code') return await handleAuthorizationCodeGrant(request, form, client, audit, deps, now)
    if (grantType === 'refresh_token') return await handleRefreshTokenGrant(form, client, audit, deps, now)

    throw new OAuthProtocolError('unsupported_grant_type', { description: 'authorization_code or refresh_token', reason: 'grant_type' })
  } catch (error) {
    if (isOAuthProtocolError(error)) {
      if (error.code !== 'slow_down') {
        await recordOAuthAudit(deps.store, audit, { eventType: 'token', outcome: 'rejected', clientId, grantId: null, errorCode: error.code, details: { reason: error.reason } })
      }

      return errorResponse(error)
    }

    throw error
  }
}
