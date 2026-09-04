/**
 * Configuración del emisor OAuth (TASK-1829). Se lee del entorno una vez; el SoT de las env vars es
 * `services/auth-server/deploy.sh`. Nada acá contiene secretos.
 */

import { EFEONCE_MCP_RESOURCE_AUDIENCE } from './scopes'

export type AuthServerOAuthConfig = {
  /** `issuer` publicado: IDÉNTICO al origen del well-known (RFC 8414 §3.3). */
  issuer: string
  /** Flag de la superficie OAuth; OFF ⇒ metadata y `/oauth/*` responden 404. */
  oauthEnabled: boolean
  /** `environment_id` del emisor en `external_identity_environments` (TASK-1631). */
  environmentId: string
  /** Audiencia única del recurso MCP. */
  mcpAudience: string
  /** TTLs (segundos). */
  authorizationCodeTtlSeconds: number
  accessTokenTtlSeconds: number
  refreshTokenSlidingTtlSeconds: number
  refreshTokenAbsoluteTtlSeconds: number
  cimdCacheTtlSeconds: number
  /** Rate limits (ventana 60 s). */
  tokenRateLimitPerIp: number
  tokenRateLimitPerClient: number
  registerRateLimitPerIp: number
  /** Política de loopback para clientes públicos (decisión 2026-09-04: alias `localhost` aceptado). */
  allowLocalhostAlias: boolean
}

export const AUTH_SERVER_OAUTH_DEFAULTS = {
  authorizationCodeTtlSeconds: 5 * 60,
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenSlidingTtlSeconds: 30 * 24 * 60 * 60,
  refreshTokenAbsoluteTtlSeconds: 90 * 24 * 60 * 60,
  cimdCacheTtlSeconds: 24 * 60 * 60,
  tokenRateLimitPerIp: 60,
  tokenRateLimitPerClient: 120,
  registerRateLimitPerIp: 10
} as const

const ENVIRONMENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/

const parseFlag = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

const parseOrigin = (value: string | undefined, fallback: string): string => {
  const raw = value?.trim() || fallback
  const url = new URL(raw)

  if (url.protocol !== 'https:' || url.search || url.hash || url.username || url.password) {
    throw new Error('AUTH_SERVER_ISSUER must be an https origin without query, fragment or userinfo')
  }

  // Sin trailing slash: `issuer` se compara byte a byte con el origen del well-known.
  return url.pathname === '/' ? url.origin : `${url.origin}${url.pathname.replace(/\/$/, '')}`
}

export const readAuthServerOAuthConfig = (env: NodeJS.ProcessEnv = process.env): AuthServerOAuthConfig => {
  const environmentId = env.AUTH_SERVER_ENVIRONMENT_ID?.trim() || 'efeonce-auth'

  if (!ENVIRONMENT_ID_PATTERN.test(environmentId)) {
    throw new Error('AUTH_SERVER_ENVIRONMENT_ID must match ^[a-z0-9][a-z0-9_-]{2,63}$')
  }

  return {
    issuer: parseOrigin(env.AUTH_SERVER_ISSUER, 'https://auth.efeonce.org'),
    oauthEnabled: parseFlag(env.AUTH_SERVER_OAUTH_ENABLED),
    environmentId,
    mcpAudience: env.AUTH_SERVER_MCP_AUDIENCE?.trim() || EFEONCE_MCP_RESOURCE_AUDIENCE,
    ...AUTH_SERVER_OAUTH_DEFAULTS,
    allowLocalhostAlias: true
  }
}
