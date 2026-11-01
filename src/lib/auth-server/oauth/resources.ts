/**
 * Audiencias de recurso del emisor (TASK-2095, enmienda D1-bis del carril de agentes de Rooms).
 *
 * Dos resource servers: el gateway MCP (siempre) y la API de Rooms (solo con `AUTH_SERVER_ROOMS_AUDIENCE`). Cada
 * clase de scope pertenece a exactamente una audiencia; el `aud` de un token se DERIVA de sus clases (que ya se
 * persisten en codes, refresh y access tokens) y se contrasta con el `resource` pedido (RFC 8707). Un token nunca
 * mezcla audiencias.
 */

import type { AuthServerOAuthConfig } from './config'
import { OAuthProtocolError } from './errors'
import { isRoomsScope } from './scopes'

type AudienceConfig = Pick<AuthServerOAuthConfig, 'mcpAudience' | 'roomsAudience'>

/** Audiencias activas en este emisor. */
export const knownAudiences = (config: AudienceConfig): string[] =>
  config.roomsAudience ? [config.mcpAudience, config.roomsAudience] : [config.mcpAudience]

export const isKnownAudience = (config: AudienceConfig, audience: string): boolean => knownAudiences(config).includes(audience)

export const isRoomsAudience = (config: AudienceConfig, audience: string | null | undefined): boolean =>
  Boolean(config.roomsAudience) && audience === config.roomsAudience

/**
 * Audiencia de un conjunto de clases. Lanza `invalid_scope` si mezcla familias y `invalid_target` si pide Rooms con
 * la audiencia apagada. Sin scopes (no debería ocurrir) cae al gateway.
 */
export const resolveAudienceForScopes = (config: AudienceConfig, scopes: readonly string[], redirectable = false): string => {
  const rooms = scopes.filter(isRoomsScope).length

  if (rooms === 0) return config.mcpAudience

  if (rooms !== scopes.length) {
    throw new OAuthProtocolError('invalid_scope', { description: 'scopes belong to different resources', reason: 'scope_audience_mixed', redirectable })
  }

  if (!config.roomsAudience) {
    throw new OAuthProtocolError('invalid_target', { description: 'unknown resource', reason: 'rooms_audience_disabled', redirectable })
  }

  return config.roomsAudience
}

/** `resource` pedido (RFC 8707) contra la audiencia derivada: ausente = la derivada; distinto = `invalid_target`. */
export const assertRequestedResource = (config: AudienceConfig, requested: string | null | undefined, derived: string, redirectable = false): void => {
  if (!requested) return

  if (!isKnownAudience(config, requested) || requested !== derived) {
    throw new OAuthProtocolError('invalid_target', { description: 'unknown resource', reason: 'resource_mismatch', redirectable })
  }
}

/** TTL del access token por audiencia: Rooms más corto (lo porta una CLI en el equipo de la persona). */
export const accessTokenTtlFor = (config: Pick<AuthServerOAuthConfig, 'accessTokenTtlSeconds' | 'roomsAccessTokenTtlSeconds' | 'mcpAudience' | 'roomsAudience'>, audience: string): number =>
  isRoomsAudience(config, audience) ? (config.roomsAccessTokenTtlSeconds ?? 5 * 60) : config.accessTokenTtlSeconds
