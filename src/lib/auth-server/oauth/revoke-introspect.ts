/**
 * `POST /oauth/revoke` (RFC 7009) y `POST /oauth/introspect` (RFC 7662) — TASK-1829.
 *
 * Revoke: el cliente autenticado revoca un refresh (opaco) o un access token (JWT propio verificado
 * localmente); en ambos casos cae toda la familia. Responde 200 aunque el token no exista (RFC 7009
 * §2.2) y 401 sólo si el cliente no autentica. Introspect: sólo clientes confidenciales (RFC 7662 §2.1);
 * un token revocado, expirado o ajeno responde `active: false` sin más detalle.
 */

import type { GrantsVersionPort } from './grants'

import type { SigningKeyRecord } from '../keys'
import { buildRequestAuditContext, recordOAuthAudit } from './audit'
import type { ClientResolverDeps } from './clients'
import type { AuthServerOAuthConfig } from './config'
import { OAuthProtocolError, isOAuthProtocolError } from './errors'
import { jsonResponse, type OAuthHttpRequest, type OAuthHttpResponse } from './http'
import { sha256Hex } from './primitives'
import type { OAuthClientRecord, OAuthStorePort } from './store/port'
import { authenticateTokenEndpointClient, parseTokenForm } from './token'
import { verifyIssuedAccessToken } from './verify'

export type RevokeIntrospectDeps = {
  grantsPort?: GrantsVersionPort
  store: OAuthStorePort
  config: AuthServerOAuthConfig
  cimd: ClientResolverDeps['cimd']
  loadKeys: () => Promise<readonly SigningKeyRecord[]>
  now?: () => Date
}

const looksLikeJwt = (token: string): boolean => token.split('.').length === 3

type LocatedToken =
  | { authorizationContextId: string | null; environmentId: string; kind: 'access'; grantId: string; subject: string; clientId: string; active: boolean; scope: string; exp: number; iat: number; jti: string; gv: number }
  | { authorizationContextId: string | null; environmentId: string; kind: 'refresh'; grantId: string; subject: string; clientId: string; active: boolean; scopes: string[]; exp: number }
  | null

const locateToken = async (token: string, deps: RevokeIntrospectDeps, now: Date): Promise<LocatedToken> => {
  if (looksLikeJwt(token)) {
    const verified = await verifyIssuedAccessToken(token, { config: deps.config, keys: await deps.loadKeys(), now })

    if (!verified) return null

    const record = await deps.store.getAccessToken(verified.jti)

    if (!record || record.subject !== verified.sub || record.clientId !== verified.azp ||
        (record.authorizationContextId ?? null) !== verified.authorizationContextId) return null

    return {
      authorizationContextId: record.authorizationContextId ?? null,
      environmentId: record.environmentId,
      kind: 'access',
      grantId: record.grantId,
      subject: record.subject,
      clientId: record.clientId,
      active: record.revokedAt === null && record.expiresAt.getTime() > now.getTime(),
      scope: verified.scope,
      exp: verified.exp,
      iat: verified.iat,
      jti: verified.jti,
      gv: verified.gv
    }
  }

  const record = await deps.store.getRefreshToken(sha256Hex(token))

  if (!record) return null

  const exp = Math.min(record.expiresAt.getTime(), record.absoluteExpiresAt.getTime())

  return {
    authorizationContextId: record.authorizationContextId ?? null,
    environmentId: record.environmentId,
    kind: 'refresh',
    grantId: record.grantId,
    subject: record.subject,
    clientId: record.clientId,
    active: record.status === 'active' && exp > now.getTime(),
    scopes: record.scopes,
    exp: Math.floor(exp / 1000)
  }
}

const errorResponse = (error: OAuthProtocolError): OAuthHttpResponse =>
  jsonResponse(error.statusCode, error.toBody(), error.code === 'invalid_client' ? { 'WWW-Authenticate': 'Basic realm="oauth"' } : {})

const withClient = async (
  request: OAuthHttpRequest,
  deps: RevokeIntrospectDeps
): Promise<{ form: Map<string, string>; client: OAuthClientRecord; token: string }> => {
  const form = parseTokenForm(request)
  const client = await authenticateTokenEndpointClient(request, form, deps)
  const token = form.get('token')

  if (!token) throw new OAuthProtocolError('invalid_request', { description: 'token required', reason: 'token_missing' })

  const hint = form.get('token_type_hint')

  if (hint && hint !== 'access_token' && hint !== 'refresh_token') {
    throw new OAuthProtocolError('unsupported_token_type', { description: 'token_type_hint', reason: 'hint' })
  }

  return { form, client, token }
}

export const handleRevoke = async (request: OAuthHttpRequest, deps: RevokeIntrospectDeps): Promise<OAuthHttpResponse> => {
  const now = (deps.now ?? (() => new Date()))()
  const audit = buildRequestAuditContext(request.headers)

  try {
    const { client, token } = await withClient(request, deps)
    const located = await locateToken(token, deps, now)

    // RFC 7009 §2.2: token inexistente o ajeno ⇒ 200 sin revelar nada.
    if (located && located.clientId === client.clientId && located.active) {
      const revoked = await deps.store.revokeGrant({ grantId: located.grantId, now, reason: `client_revoke:${located.kind}` })

      await recordOAuthAudit(deps.store, audit, {
        eventType: 'revoke',
        outcome: 'success',
        clientId: client.clientId,
        subject: located.subject,
        grantId: located.grantId,
        errorCode: null,
        details: { kind: located.kind, ...revoked }
      })
    } else {
      await recordOAuthAudit(deps.store, audit, { eventType: 'revoke', outcome: 'success', clientId: client.clientId, grantId: null, errorCode: null, details: { noop: true } })
    }

    return jsonResponse(200, {})
  } catch (error) {
    if (isOAuthProtocolError(error)) {
      await recordOAuthAudit(deps.store, audit, { eventType: 'revoke', outcome: 'rejected', clientId: null, grantId: null, errorCode: error.code, details: { reason: error.reason } })

      return errorResponse(error)
    }

    throw error
  }
}

export const handleIntrospect = async (request: OAuthHttpRequest, deps: RevokeIntrospectDeps): Promise<OAuthHttpResponse> => {
  const now = (deps.now ?? (() => new Date()))()
  const audit = buildRequestAuditContext(request.headers)

  try {
    const { client, token } = await withClient(request, deps)

    if (client.clientType !== 'confidential') {
      throw new OAuthProtocolError('invalid_client', { description: 'introspection requires a confidential client', reason: 'public_client' })
    }

    const located = await locateToken(token, deps, now)

    // Context revocation, disabled lane and workforce/grant changes invalidate introspection too.
    // Revoke deliberately uses stored liveness only, so it remains available when authority is off.
    if (located?.active && located.authorizationContextId) {
      try {
        const authority = await deps.grantsPort?.resolve({ environmentId: located.environmentId, subject: located.subject, clientId: located.clientId, authorizationContextId: located.authorizationContextId })

        located.active = Boolean(authority?.bound && (located.kind !== 'access' || authority.grantsVersion === located.gv))
      } catch {
        located.active = false
      }
    }

    await recordOAuthAudit(deps.store, audit, {
      eventType: 'introspect',
      outcome: 'success',
      clientId: client.clientId,
      subject: located?.subject ?? null,
      grantId: located?.grantId ?? null,
      errorCode: null,
      details: { active: Boolean(located?.active), kind: located?.kind ?? null }
    })

    if (!located || !located.active) return jsonResponse(200, { active: false })

    if (located.kind === 'access') {
      return jsonResponse(200, {
        active: true,
        ...(located.authorizationContextId ? { authorization_context_id: located.authorizationContextId, authorization_context_version: 1 } : {}),
        token_type: 'Bearer',
        scope: located.scope,
        client_id: located.clientId,
        sub: located.subject,
        exp: located.exp,
        iat: located.iat,
        jti: located.jti,
        aud: deps.config.mcpAudience,
        iss: deps.config.issuer,
        gv: located.gv
      })
    }

    return jsonResponse(200, {
      active: true,
      token_type: 'refresh_token',
      scope: located.scopes.join(' '),
      client_id: located.clientId,
      sub: located.subject,
      exp: located.exp,
      iss: deps.config.issuer
    })
  } catch (error) {
    if (isOAuthProtocolError(error)) {
      await recordOAuthAudit(deps.store, audit, { eventType: 'introspect', outcome: 'rejected', clientId: null, grantId: null, errorCode: error.code, details: { reason: error.reason } })

      return errorResponse(error)
    }

    throw error
  }
}
