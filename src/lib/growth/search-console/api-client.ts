/**
 * TASK-1282 — Cliente REST de la Google Search Console API.
 *
 * `googleapis` NO es dep del repo, así que llamamos los endpoints REST con `fetch` +
 * el access token (resuelto desde el refresh token per-org). Sólo lectura:
 *   - sites.list  → verificar que el consentidor realmente posee la propiedad (anti
 *     binding de una propiedad ajena; mirror de la verificación anti-tampering Notion).
 *   - searchanalytics.query → filas de Search Analytics (reader, Slice 2).
 *
 * Errores se propagan tipados (`SearchConsoleApiError`) con el status HTTP para que el
 * caller distinga `invalid_grant`/403 (revocado) de un fallo transitorio. El payload
 * crudo de Google NUNCA se devuelve al cliente: el caller lo sanitiza.
 */

import 'server-only'

import { type SearchConsoleAnalyticsParams, type SearchConsoleAnalyticsRow } from './contracts'

const SITES_ENDPOINT = 'https://searchconsole.googleapis.com/webmasters/v3/sites'

const SEARCH_ANALYTICS_ENDPOINT =
  'https://searchconsole.googleapis.com/webmasters/v3/sites'

export class SearchConsoleApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SearchConsoleApiError'
    this.status = status
  }
}

interface SitesListResponse {
  siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }>
}

/** Lista las propiedades que el token puede ver. */
export const listSearchConsoleSites = async (accessToken: string): Promise<string[]> => {
  const response = await fetch(SITES_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new SearchConsoleApiError(`sites.list failed (${response.status})`, response.status)
  }

  const body = (await response.json()) as SitesListResponse


  return (body.siteEntry ?? [])
    .map(entry => entry.siteUrl)
    .filter((value): value is string => typeof value === 'string')
}

/**
 * Verifica que `siteUrl` esté entre las propiedades del token con permiso de lectura.
 * Compara normalizando trailing slash (los `URL-prefix` properties traen slash final).
 */
export const tokenCanAccessSite = async (accessToken: string, siteUrl: string): Promise<boolean> => {
  const normalize = (value: string) => value.trim().replace(/\/+$/, '')
  const target = normalize(siteUrl)
  const sites = await listSearchConsoleSites(accessToken)


  return sites.some(site => normalize(site) === target)
}

interface SearchAnalyticsApiRow {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

/** Query a Search Analytics para una propiedad. */
export const querySearchAnalytics = async (
  accessToken: string,
  siteUrl: string,
  params: SearchConsoleAnalyticsParams
): Promise<SearchConsoleAnalyticsRow[]> => {
  const endpoint = `${SEARCH_ANALYTICS_ENDPOINT}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store',
    body: JSON.stringify({
      startDate: params.range.startDate,
      endDate: params.range.endDate,
      dimensions: params.dimensions ?? ['query'],
      rowLimit: params.rowLimit ?? 100
    })
  })

  if (!response.ok) {
    throw new SearchConsoleApiError(`searchAnalytics.query failed (${response.status})`, response.status)
  }

  const body = (await response.json()) as { rows?: SearchAnalyticsApiRow[] }


  return (body.rows ?? []).map(row => ({
    keys: row.keys ?? [],
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0
  }))
}
