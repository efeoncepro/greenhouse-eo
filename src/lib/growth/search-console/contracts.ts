/**
 * TASK-1282 — Growth Search Console connection · contratos del dominio.
 *
 * Tipos compartidos por commands/reader/routes. El token (refresh/access) NUNCA
 * aparece en estos contratos: la conexión expone sólo metadata + `tokenSecretRef`.
 */

import 'server-only'

/** Scope read-only canónico. NUNCA pedir scopes de escritura sobre la propiedad. */
export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

/** TTL del state OAuth single-use (anti-CSRF / confused-deputy). */
export const SEARCH_CONSOLE_STATE_TTL_MS = 15 * 60 * 1000

export type SearchConsoleConnectionStatus = 'active' | 'revoked' | 'expired' | 'pending'

/**
 * Metadata de la conexión Search Console de una organización. Mirror seguro de la
 * fila `greenhouse_growth.search_console_connections` (sin token crudo).
 */
export interface SearchConsoleConnection {
  organizationId: string
  siteUrl: string
  scopes: string[]
  status: SearchConsoleConnectionStatus
  tokenSecretRef: string | null
  connectedByUserId: string | null
  connectedAt: string | null
  lastVerifiedAt: string | null
  lastErrorCode: string | null
}

/** Resultado del command connect/disconnect (discriminado por `ok`). */
export type SearchConsoleCommandResult =
  | { ok: true; connection: SearchConsoleConnection }
  | {
      ok: false
      errorCode:
        | 'disabled'
        | 'state_invalid'
        | 'oauth_failed'
        | 'site_not_accessible'
        | 'secret_write_failed'
        | 'not_connected'
    }

/** Una fila de Search Analytics (Query API). */
export interface SearchConsoleAnalyticsRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type SearchConsoleAnalyticsDimension = 'query' | 'page' | 'country' | 'device' | 'date'

export interface SearchConsoleAnalyticsParams {
  range: { startDate: string; endDate: string }
  dimensions?: SearchConsoleAnalyticsDimension[]
  rowLimit?: number
}

/** Resultado del reader (honest degradation: nunca inventa filas). */
export type SearchConsoleAnalyticsResult =
  | { ok: true; siteUrl: string; rows: SearchConsoleAnalyticsRow[] }
  | { ok: false; errorCode: 'disabled' | 'not_connected' | 'token_unhealthy' | 'query_failed'; status: SearchConsoleConnectionStatus | null }
