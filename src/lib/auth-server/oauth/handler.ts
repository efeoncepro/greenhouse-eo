/**
 * Router de la superficie OAuth del emisor (TASK-1829). Transporte-agnóstico: `services/auth-server/app.ts`
 * lo adapta a `node:http`; los tests lo llaman con `OAuthHttpRequest` planos. Con
 * `AUTH_SERVER_OAUTH_ENABLED=false` toda la superficie responde 404 (`/readyz` y el JWKS viven en el
 * servicio, no acá).
 */

import type { SigningKeyRecord } from '../keys'
import { buildRequestAuditContext, enforceOAuthRateLimit, recordOAuthAudit } from './audit'
import { handleAuthorize } from './authorize'
import type { ClientResolverDeps } from './clients'
import type { AuthServerOAuthConfig } from './config'
import { handleConsent } from './consent-endpoint'
import { registerDynamicClient } from './dcr'
import { OAuthProtocolError, isOAuthProtocolError } from './errors'
import type { GrantsVersionPort } from './grants'
import { isJsonContentType, jsonResponse, parseJsonBody, type OAuthHttpRequest, type OAuthHttpResponse } from './http'
import { OAUTH_ENDPOINT_PATHS, buildAuthorizationServerMetadata, buildOpenIdConfiguration } from './metadata'
import { handleIntrospect, handleRevoke } from './revoke-introspect'
import type { OAuthStorePort } from './store/port'
import type { SubjectSessionPort } from './subject'
import { handleToken } from './token'
import type { AccessTokenSigner } from './tokens'

export type OAuthHandlerDeps = {
  store: OAuthStorePort
  config: AuthServerOAuthConfig
  signer: AccessTokenSigner
  subjectPort: SubjectSessionPort
  grantsPort: GrantsVersionPort
  loadKeys: () => Promise<readonly SigningKeyRecord[]>
  cimd: ClientResolverDeps['cimd']
  now?: () => Date
}

export type OAuthHandler = (request: OAuthHttpRequest) => Promise<OAuthHttpResponse | null>

const METADATA_MAX_AGE_SECONDS = 300

const OAUTH_PATHS = new Set<string>(Object.values(OAUTH_ENDPOINT_PATHS).filter(path => path !== OAUTH_ENDPOINT_PATHS.jwks))

const handleRegister = async (request: OAuthHttpRequest, deps: OAuthHandlerDeps): Promise<OAuthHttpResponse> => {
  const now = (deps.now ?? (() => new Date()))()
  const audit = buildRequestAuditContext(request.headers)

  try {
    if (request.method !== 'POST') throw new OAuthProtocolError('invalid_request', { description: 'POST required', reason: 'method' })
    if (!isJsonContentType(request)) throw new OAuthProtocolError('invalid_client_metadata', { description: 'application/json required', reason: 'content_type' })

    await enforceOAuthRateLimit(deps.store, audit, {
      rule: { eventTypes: ['register'], windowSeconds: 60, perIp: deps.config.registerRateLimitPerIp, perClient: null },
      now
    })

    const body = parseJsonBody(request.body)

    if (body === undefined) throw new OAuthProtocolError('invalid_client_metadata', { description: 'invalid JSON', reason: 'invalid_json' })

    const response = await registerDynamicClient(body, { store: deps.store, config: deps.config, now: deps.now })

    await recordOAuthAudit(deps.store, audit, {
      eventType: 'register',
      outcome: 'success',
      clientId: response.client_id,
      grantId: null,
      errorCode: null,
      details: { redirectUris: response.redirect_uris, clientName: response.client_name }
    })

    return jsonResponse(201, response)
  } catch (error) {
    if (isOAuthProtocolError(error)) {
      if (error.code !== 'slow_down') {
        await recordOAuthAudit(deps.store, audit, { eventType: 'register', outcome: 'rejected', clientId: null, grantId: null, errorCode: error.code, details: { reason: error.reason } })
      }

      return jsonResponse(error.statusCode, error.toBody())
    }

    throw error
  }
}

export const isOAuthPath = (pathname: string): boolean => OAUTH_PATHS.has(pathname)

export const createOAuthHandler = (deps: OAuthHandlerDeps): OAuthHandler => {
  const metadataHeaders = { 'Cache-Control': `public, max-age=${METADATA_MAX_AGE_SECONDS}` }

  return async request => {
    const path = request.url.pathname

    if (!isOAuthPath(path)) return null

    if (!deps.config.oauthEnabled) return jsonResponse(404, { error: 'not_found' })

    switch (path) {
      case OAUTH_ENDPOINT_PATHS.authorizationServerMetadata:
        return request.method === 'GET'
          ? jsonResponse(200, buildAuthorizationServerMetadata(deps.config), metadataHeaders)
          : jsonResponse(405, { error: 'invalid_request' }, { Allow: 'GET' })
      case OAUTH_ENDPOINT_PATHS.openidConfiguration:
        return request.method === 'GET'
          ? jsonResponse(200, buildOpenIdConfiguration(deps.config), metadataHeaders)
          : jsonResponse(405, { error: 'invalid_request' }, { Allow: 'GET' })
      case OAUTH_ENDPOINT_PATHS.register:
        return handleRegister(request, deps)
      case OAUTH_ENDPOINT_PATHS.authorize:
        return handleAuthorize(request, deps)
      case OAUTH_ENDPOINT_PATHS.token:
        return handleToken(request, deps)
      case OAUTH_ENDPOINT_PATHS.revoke:
        return handleRevoke(request, deps)
      case OAUTH_ENDPOINT_PATHS.introspect:
        return handleIntrospect(request, deps)
      case OAUTH_ENDPOINT_PATHS.consent:
        return handleConsent(request, deps)
      default:
        return jsonResponse(404, { error: 'not_found' })
    }
  }
}
