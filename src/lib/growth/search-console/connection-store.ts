/**
 * TASK-1282 — Store de metadata de la conexión Search Console (per-org).
 *
 * Writer/reader canónico de `greenhouse_growth.search_console_connections`. El token
 * (refresh/access) NUNCA toca esta tabla: sólo `token_secret_ref` apunta a Secret
 * Manager. Reconectar = UPSERT por `organization_id` (UNIQUE). Reads scoped por org.
 */

import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { type SearchConsoleConnection, type SearchConsoleConnectionStatus } from './contracts'

type ConnectionRow = Record<string, unknown>

const toIso = (value: unknown): string | null => {
  if (!value) {
    return null
  }

  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString()
}

const mapRow = (row: ConnectionRow): SearchConsoleConnection => ({
  organizationId: String(row.organization_id),
  siteUrl: String(row.site_url),
  scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
  status: String(row.status) as SearchConsoleConnectionStatus,
  tokenSecretRef: (row.token_secret_ref as string | null) ?? null,
  connectedByUserId: (row.connected_by_user_id as string | null) ?? null,
  connectedAt: toIso(row.connected_at),
  lastVerifiedAt: toIso(row.last_verified_at),
  lastErrorCode: (row.last_error_code as string | null) ?? null
})

/** Lee la conexión de una org (scoped). `null` si no existe. */
export const getSearchConsoleConnection = async (
  organizationId: string
): Promise<SearchConsoleConnection | null> => {
  const rows = await runGreenhousePostgresQuery<ConnectionRow>(
    `SELECT organization_id, site_url, scopes, status, token_secret_ref,
            connected_by_user_id, connected_at, last_verified_at, last_error_code
       FROM greenhouse_growth.search_console_connections
      WHERE organization_id = $1`,
    [organizationId]
  )

  const row = rows[0]

  return row ? mapRow(row) : null
}

export interface UpsertSearchConsoleConnectionInput {
  organizationId: string
  siteUrl: string
  scopes: string[]
  tokenSecretRef: string
  connectedByUserId: string | null
}

/** UPSERT idempotente por org: marca `active`, ancla token_secret_ref + auditoría. */
export const upsertActiveSearchConsoleConnection = async (
  input: UpsertSearchConsoleConnectionInput
): Promise<SearchConsoleConnection> => {
  const rows = await runGreenhousePostgresQuery<ConnectionRow>(
    `INSERT INTO greenhouse_growth.search_console_connections
       (organization_id, site_url, scopes, status, token_secret_ref,
        connected_by_user_id, connected_at, last_verified_at, last_error_code, updated_at)
     VALUES ($1, $2, $3, 'active', $4, $5, NOW(), NOW(), NULL, NOW())
     ON CONFLICT (organization_id) DO UPDATE SET
       site_url = EXCLUDED.site_url,
       scopes = EXCLUDED.scopes,
       status = 'active',
       token_secret_ref = EXCLUDED.token_secret_ref,
       connected_by_user_id = EXCLUDED.connected_by_user_id,
       connected_at = NOW(),
       last_verified_at = NOW(),
       last_error_code = NULL,
       updated_at = NOW()
     RETURNING organization_id, site_url, scopes, status, token_secret_ref,
               connected_by_user_id, connected_at, last_verified_at, last_error_code`,
    [input.organizationId, input.siteUrl, input.scopes, input.tokenSecretRef, input.connectedByUserId]
  )

  return mapRow(rows[0])
}

/** Marca el status de la conexión (revoked/expired/pending) + opcional error code. */
export const setSearchConsoleConnectionStatus = async (
  organizationId: string,
  status: SearchConsoleConnectionStatus,
  errorCode: string | null = null
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.search_console_connections
        SET status = $2,
            last_error_code = $3,
            last_verified_at = NOW(),
            updated_at = NOW()
      WHERE organization_id = $1`,
    [organizationId, status, errorCode]
  )
}

/** Desconecta (status revoked, limpia el ref). El borrado del secret es out-of-band. */
export const disconnectSearchConsoleConnection = async (organizationId: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.search_console_connections
        SET status = 'revoked',
            token_secret_ref = NULL,
            last_error_code = NULL,
            updated_at = NOW()
      WHERE organization_id = $1`,
    [organizationId]
  )
}
