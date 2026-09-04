/**
 * Scopes que el emisor `auth.efeonce.org` conoce (TASK-1829).
 *
 * Son los MISMOS strings que declara el gateway en `../efeonce-mcp/src/config.ts`: el servidor de
 * autorización no interpreta capability, sólo consentimiento por (subject, client, scope). La paridad
 * se prueba en `scopes.test.ts` contra el archivo hermano cuando existe y contra el snapshot versionado
 * siempre.
 *
 * Un scope por clase de radio de daño, NUNCA uno por capability (regla del gateway).
 */

export const EFEONCE_MCP_BASE_SCOPE = 'efeonce.mcp.read'

export const EFEONCE_MCP_READ_SCOPES = [
  EFEONCE_MCP_BASE_SCOPE,
  'efeonce.mcp.globe.read',
  'efeonce.mcp.hiring.read'
] as const

/** Scopes de escritura: exigen consentimiento explícito + step-up (`TASK-1830`) y NUNCA se publican como mínimo. */
export const EFEONCE_MCP_WRITE_SCOPES = ['efeonce.mcp.globe.credits.funding.ensure', 'efeonce.mcp.seo.write'] as const

export const EFEONCE_MCP_SCOPES = [...EFEONCE_MCP_READ_SCOPES, ...EFEONCE_MCP_WRITE_SCOPES] as const

export type EfeonceMcpScope = (typeof EFEONCE_MCP_SCOPES)[number]

const KNOWN = new Set<string>(EFEONCE_MCP_SCOPES)
const WRITE = new Set<string>(EFEONCE_MCP_WRITE_SCOPES)

export const isKnownScope = (scope: string): scope is EfeonceMcpScope => KNOWN.has(scope)

export const isWriteScope = (scope: string): boolean => WRITE.has(scope)

/** Audiencia canónica del recurso MCP (única; nunca un alias). */
export const EFEONCE_MCP_RESOURCE_AUDIENCE = 'https://mcp.efeonce.org/mcp'

/** Scopes publicados en `scopes_supported`: el mínimo funcional, no el catálogo (mcp-craft §security). */
export const PUBLISHED_SCOPES_SUPPORTED: readonly string[] = EFEONCE_MCP_READ_SCOPES

export const serializeScopes = (scopes: readonly string[]): string => scopes.join(' ')
