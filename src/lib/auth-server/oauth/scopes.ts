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

/**
 * Scopes de escritura: exigen consentimiento explícito + step-up (`TASK-1830`) y NUNCA se publican como mínimo.
 * `efeonce.mcp.identity.write` (TASK-1837): clase «administrar a las personas de mi organización» — invitar/reenviar
 * por la lane delegada; la autoridad real la decide Greenhouse por la membership `designatedAdmin`, el scope sólo
 * responde si ESTE cliente puede pedir esa clase de acción.
 */
/**
 * `efeonce.mcp.client_services.write` (TASK-1852): clase «abrir/compensar acceso de cliente a servicios
 * contratados» (habilitación por organización). La autoridad la decide Greenhouse (administrador interno con
 * `client_portal.module.enable`, releído en cada llamada); el scope sólo responde si el cliente puede pedir la
 * clase. Hoy se ejerce por el issuer Entra (RFC 8693 → `client_services.enablement.write`); el contexto interno v2
 * de Efeonce ID sigue base-only (D9), así que aquí se declara la clase y NO se publica como mínimo.
 */
/**
 * `efeonce.mcp.insights.write` (TASK-1845): clase «crear una edición de Efeonce Insights» — la única escritura del
 * dominio hoy (`create_insight_edition`). Autoridad real en Greenhouse (`insights.edition.create` sobre la
 * organización con `insights_v1` asignado, releída por llamada); el scope sólo responde si ESTE cliente puede pedir
 * esa clase. Las lecturas del catálogo y de ediciones viajan con el scope base.
 */
/**
 * `efeonce.mcp.brand.write` (TASK-1921): clase «encolar el render de una pieza de la marca propia de Efeonce» (La órbita
 * y Glitch; `request_brand_render`). Clase propia porque su impacto no es el de Insights: produce piezas de la marca de
 * Efeonce, no entregables de un cliente — conceder Insights nunca debe conceder esto. La autoridad real vive en
 * Greenhouse (`brand_render.request.create`, sólo actores internos, organización de la marca); lecturas con el scope
 * base. Nunca aprueba ni publica.
 */
export const EFEONCE_MCP_WRITE_SCOPES = [
  'efeonce.mcp.globe.credits.funding.ensure',
  'efeonce.mcp.seo.write',
  'efeonce.mcp.identity.write',
  'efeonce.mcp.client_services.write',
  'efeonce.mcp.insights.write',
  'efeonce.mcp.brand.write'
] as const

export const EFEONCE_MCP_SCOPES = [...EFEONCE_MCP_READ_SCOPES, ...EFEONCE_MCP_WRITE_SCOPES] as const

export type EfeonceMcpScope = (typeof EFEONCE_MCP_SCOPES)[number]

/**
 * Clases de la audiencia Rooms (TASK-2095, ADR del carril de agentes D2 + enmienda D1-bis). Viven SOLO en la
 * audiencia Rooms y son RESTRINGIDAS: solo las recibe un cliente que las liste en `allowed_scopes` (un cliente con
 * `allowed_scopes` abierto, como CIMD o DCR, nunca). No son scopes del gateway: no entran en la paridad con
 * `efeonce-mcp` hasta que exista el provider `rooms` (TASK-2088).
 */
export const EFEONCE_ROOMS_SCOPES = [
  'efeonce.mcp.rooms.read',
  'efeonce.mcp.rooms.read.client',
  'efeonce.mcp.rooms.author',
  'efeonce.mcp.rooms.release',
  'efeonce.mcp.rooms.access'
] as const

/** Escrituras de Rooms: step-up al consentir, como cualquier clase de escritura. */
export const EFEONCE_ROOMS_WRITE_SCOPES = ['efeonce.mcp.rooms.author', 'efeonce.mcp.rooms.release', 'efeonce.mcp.rooms.access'] as const

export type EfeonceRoomsScope = (typeof EFEONCE_ROOMS_SCOPES)[number]

const KNOWN = new Set<string>([...EFEONCE_MCP_SCOPES, ...EFEONCE_ROOMS_SCOPES])
const WRITE = new Set<string>([...EFEONCE_MCP_WRITE_SCOPES, ...EFEONCE_ROOMS_WRITE_SCOPES])
const ROOMS = new Set<string>(EFEONCE_ROOMS_SCOPES)

export const isKnownScope = (scope: string): scope is EfeonceMcpScope | EfeonceRoomsScope => KNOWN.has(scope)

export const isWriteScope = (scope: string): boolean => WRITE.has(scope)

export const isRoomsScope = (scope: string): scope is EfeonceRoomsScope => ROOMS.has(scope)

/** Restringida = nunca se concede por `allowed_scopes` abierto; el cliente debe listarla. */
export const isRestrictedScope = (scope: string): boolean => ROOMS.has(scope)

/** Audiencia canónica del recurso MCP (única; nunca un alias). */
export const EFEONCE_MCP_RESOURCE_AUDIENCE = 'https://mcp.efeonce.org/mcp'

/** Scopes publicados en `scopes_supported`: el mínimo funcional, no el catálogo (mcp-craft §security). */
export const PUBLISHED_SCOPES_SUPPORTED: readonly string[] = EFEONCE_MCP_READ_SCOPES

export const serializeScopes = (scopes: readonly string[]): string => scopes.join(' ')

/**
 * TASK-1844 starts with one consent class; never widen v2 through a different client registration.
 * TASK-2095 (D10): the Rooms audience is its own authorization — a v2 context may carry only Rooms classes there,
 * because Rooms (not Greenhouse) decides the person's authority. The audience split itself is enforced by
 * `resolveAudienceForScopes`, so a request never mixes both families.
 */
export const areInternalContextScopesAllowed = (version: 1 | 2 | undefined, scopes: readonly string[]): boolean =>
  version !== 2 ||
  (scopes.length === 1 && scopes[0] === EFEONCE_MCP_BASE_SCOPE) ||
  (scopes.length > 0 && scopes.every(isRoomsScope))
