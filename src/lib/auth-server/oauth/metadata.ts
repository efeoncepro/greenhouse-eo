/**
 * Metadata del authorization server (RFC 8414) y OIDC Discovery (TASK-1829).
 *
 * `issuer` es IDÉNTICO al origen del well-known: los clientes MCP (revisión 2026-07-28) DEBEN
 * rechazar el documento si difiere, y Codex ya lo hace. Nunca espejamos un issuer ajeno.
 */

import type { AuthServerOAuthConfig } from './config'
import { PUBLISHED_SCOPES_SUPPORTED } from './scopes'

export const OAUTH_ENDPOINT_PATHS = {
  authorize: '/oauth/authorize',
  token: '/oauth/token',
  register: '/oauth/register',
  revoke: '/oauth/revoke',
  introspect: '/oauth/introspect',
  consent: '/oauth/consent',
  jwks: '/.well-known/jwks.json',
  authorizationServerMetadata: '/.well-known/oauth-authorization-server',
  openidConfiguration: '/.well-known/openid-configuration'
} as const

export const TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED = ['none', 'client_secret_basic', 'client_secret_post'] as const

export type AuthorizationServerMetadata = {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
  registration_endpoint: string
  revocation_endpoint: string
  introspection_endpoint: string
  scopes_supported: string[]
  response_types_supported: string[]
  response_modes_supported: string[]
  grant_types_supported: string[]
  code_challenge_methods_supported: string[]
  token_endpoint_auth_methods_supported: string[]
  revocation_endpoint_auth_methods_supported: string[]
  introspection_endpoint_auth_methods_supported: string[]
  subject_types_supported: string[]
  client_id_metadata_document_supported: boolean
  authorization_response_iss_parameter_supported: boolean
  service_documentation?: string
}

export type OpenIdConfiguration = AuthorizationServerMetadata & {
  id_token_signing_alg_values_supported: string[]
  claims_supported: string[]
}

export const buildAuthorizationServerMetadata = (config: AuthServerOAuthConfig): AuthorizationServerMetadata => {
  const at = (path: string) => `${config.issuer}${path}`

  return {
    issuer: config.issuer,
    authorization_endpoint: at(OAUTH_ENDPOINT_PATHS.authorize),
    token_endpoint: at(OAUTH_ENDPOINT_PATHS.token),
    jwks_uri: at(OAUTH_ENDPOINT_PATHS.jwks),
    registration_endpoint: at(OAUTH_ENDPOINT_PATHS.register),
    revocation_endpoint: at(OAUTH_ENDPOINT_PATHS.revoke),
    introspection_endpoint: at(OAUTH_ENDPOINT_PATHS.introspect),
    scopes_supported: [...PUBLISHED_SCOPES_SUPPORTED],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: [...TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED],
    revocation_endpoint_auth_methods_supported: [...TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED],
    introspection_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    subject_types_supported: ['public'],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true
  }
}

export const buildOpenIdConfiguration = (config: AuthServerOAuthConfig): OpenIdConfiguration => ({
  ...buildAuthorizationServerMetadata(config),
  id_token_signing_alg_values_supported: ['ES256'],
  claims_supported: ['iss', 'sub', 'aud', 'azp', 'scope', 'gv', 'exp', 'iat', 'jti']
})
