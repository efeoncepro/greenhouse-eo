/**
 * TASK-1282 (Slice 2) — Reader canónico de Search Analytics per-org.
 *
 * Un primitive, muchos consumers (grader/medición EPIC-020, UI follow-up, Nexa/MCP).
 * Resuelve el refresh token per-org desde Secret Manager (NUNCA de PG), obtiene un
 * access token fresco y consulta Search Analytics para la propiedad de la org. Honest
 * degradation: si Google revocó el acceso (`invalid_grant`/403) marca la conexión
 * `revoked` y devuelve `token_unhealthy` — NUNCA inventa filas ni muestra $0 silencioso.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

import { querySearchAnalytics, SearchConsoleApiError } from './api-client'
import {
  getSearchConsoleConnection,
  setSearchConsoleConnectionStatus
} from './connection-store'
import { type SearchConsoleAnalyticsParams, type SearchConsoleAnalyticsResult } from './contracts'
import { isSearchConsoleEnabled } from './flags'
import { refreshAccessToken, resolveSearchConsoleOAuthConfig } from './oauth-client'

const isRevocationError = (error: unknown): boolean => {
  if (error instanceof SearchConsoleApiError) {
    return error.status === 401 || error.status === 403
  }

  const message = error instanceof Error ? error.message.toLowerCase() : ''

  return message.includes('invalid_grant') || message.includes('invalid grant')
}

export const readSearchConsoleAnalytics = async (
  organizationId: string,
  params: SearchConsoleAnalyticsParams
): Promise<SearchConsoleAnalyticsResult> => {
  if (!isSearchConsoleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const connection = await getSearchConsoleConnection(organizationId)

  if (!connection || connection.status !== 'active' || !connection.tokenSecretRef || !connection.siteUrl) {
    return { ok: false, errorCode: 'not_connected', status: connection?.status ?? null }
  }

  const siteUrl = connection.siteUrl

  const config = await resolveSearchConsoleOAuthConfig()

  if (!config) {
    return { ok: false, errorCode: 'disabled', status: connection.status }
  }

  const refreshToken = await resolveSecretByRef(connection.tokenSecretRef)

  if (!refreshToken) {
    await setSearchConsoleConnectionStatus(organizationId, 'revoked', 'token_secret_missing')

    return { ok: false, errorCode: 'token_unhealthy', status: 'revoked' }
  }

  try {
    const accessToken = await refreshAccessToken(config, refreshToken)
    const rows = await querySearchAnalytics(accessToken, siteUrl, params)

    await setSearchConsoleConnectionStatus(organizationId, 'active', null)

    return { ok: true, siteUrl, rows }
  } catch (error) {
    if (isRevocationError(error)) {
      await setSearchConsoleConnectionStatus(organizationId, 'revoked', 'invalid_grant')
      captureWithDomain(error, 'growth', {
        tags: { source: 'search_console_reader', stage: 'revoked' },
        extra: { organizationId }
      })

      return { ok: false, errorCode: 'token_unhealthy', status: 'revoked' }
    }

    captureWithDomain(error, 'growth', {
      tags: { source: 'search_console_reader', stage: 'query' },
      extra: { organizationId }
    })

    return { ok: false, errorCode: 'query_failed', status: connection.status }
  }
}
