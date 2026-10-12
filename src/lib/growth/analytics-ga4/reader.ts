import 'server-only'

import { Ga4ApiError, Ga4DataClient } from '@/lib/growth/ga4/api-client'
import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

import { getGa4Connection, setGa4ConnectionStatus } from './connection-store'
import { isGa4Enabled } from './flags'
import { refreshGa4AccessToken, resolveGa4OAuthConfig } from './oauth-client'

export type Ga4ReportDimension = 'date' | 'yearMonth' | 'landingPagePlusQueryString' | 'sessionDefaultChannelGroup' | 'sessionSourceMedium' | 'country' | 'deviceCategory'
export type Ga4ReportMetric = 'sessions' | 'engagedSessions' | 'averageSessionDuration' | 'userEngagementDuration' | 'totalUsers'

export interface Ga4AnalyticsParams {
  startDate: string
  endDate: string
  dimensions: Ga4ReportDimension[]
  metrics: Ga4ReportMetric[]
  landingPrefix?: string
  /**
   * TASK-2033 — varias reglas de página de entrada (alcance de contenido). Con reglas, gana sobre `landingPrefix`.
   * Forma estructural a propósito: este reader no depende del módulo SEO; el caller le pasa sus reglas.
   */
  landingMatch?: ReadonlyArray<Ga4LandingMatchRule>
}

export interface Ga4LandingMatchRule {
  kind: 'prefix' | 'exact'
  /** Ruta sin dominio, sin barra final y sin query (`/articulos`). */
  path: string
}

type Ga4StringFilterExpression = { filter: { fieldName: 'landingPagePlusQueryString'; stringFilter: { matchType: 'EXACT' | 'BEGINS_WITH'; value: string; caseSensitive: true } } }

/**
 * TASK-2033 — reglas de ruta → filtro de la Data API. `landingPagePlusQueryString` trae la ruta CON su query
 * («/articulos/x?utm_source=…»), así que «la ruta es X» son varias comparaciones: X, X con query, X con barra final.
 * Un prefijo es `X/…`, nunca `X…`: «/articulos-viejos» no entra por «/articulos». Distingue mayúsculas, igual que el
 * recorte de Search Console; sin `caseSensitive` la API compara sin distinguirlas.
 */
export const buildGa4LandingMatchFilter = (rules: ReadonlyArray<Ga4LandingMatchRule>): { orGroup: { expressions: Ga4StringFilterExpression[] } } | null => {
  if (rules.length === 0) return null

  const expression = (matchType: 'EXACT' | 'BEGINS_WITH', value: string): Ga4StringFilterExpression => ({
    filter: { fieldName: 'landingPagePlusQueryString', stringFilter: { matchType, value, caseSensitive: true } }
  })

  return {
    orGroup: {
      expressions: rules.flatMap(rule =>
        rule.kind === 'prefix'
          ? [expression('EXACT', rule.path), expression('BEGINS_WITH', `${rule.path}?`), expression('BEGINS_WITH', `${rule.path}/`)]
          : [expression('EXACT', rule.path), expression('BEGINS_WITH', `${rule.path}?`), expression('EXACT', `${rule.path}/`), expression('BEGINS_WITH', `${rule.path}/?`)]
      )
    }
  }
}

export type Ga4AnalyticsResult =
  | { ok: true; propertyId: string; rows: Array<{ dimensions: Record<string, string>; metrics: Record<string, number> }>; rowCount: number }
  | { ok: false; errorCode: 'disabled' | 'not_connected' | 'token_unhealthy' | 'query_failed' }

const validDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))

export const readGa4Analytics = async (organizationId: string, params: Ga4AnalyticsParams): Promise<Ga4AnalyticsResult> => {
  if (!isGa4Enabled()) return { ok: false, errorCode: 'disabled' }

  const connection = await getGa4Connection(organizationId)

  if (connection?.status !== 'active' || !connection.propertyId || !connection.tokenSecretRef) {
    return { ok: false, errorCode: 'not_connected' }
  }

  if (!validDate(params.startDate) || !validDate(params.endDate) || params.startDate > params.endDate ||
      params.dimensions.length === 0 || params.metrics.length === 0) {
    return { ok: false, errorCode: 'query_failed' }
  }

  const config = await resolveGa4OAuthConfig()

  if (!config) return { ok: false, errorCode: 'query_failed' }

  const refreshToken = await resolveSecretByRef(connection.tokenSecretRef)

  if (!refreshToken) {
    await setGa4ConnectionStatus(organizationId, 'revoked', 'token_secret_missing')

    return { ok: false, errorCode: 'token_unhealthy' }
  }

  try {
    const client = new Ga4DataClient({ getAccessToken: () => refreshGa4AccessToken(config, refreshToken) })

    const landingMatchFilter = buildGa4LandingMatchFilter(params.landingMatch ?? [])

    const requestBody = {
      dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
      dimensions: params.dimensions.map(name => ({ name })),
      metrics: params.metrics.map(name => ({ name })),
      ...(landingMatchFilter ? { dimensionFilter: landingMatchFilter } : params.landingPrefix ? {
        dimensionFilter: {
          filter: {
            fieldName: 'landingPagePlusQueryString',
            stringFilter: { matchType: 'BEGINS_WITH', value: params.landingPrefix }
          }
        }
      } : {}),
      limit: '10000'
    }

    const firstPage = await client.runReport(connection.propertyId, requestBody)
    const allRows = [...(firstPage.rows ?? [])]
    const rowCount = firstPage.rowCount ?? allRows.length

    if (rowCount > 100000) return { ok: false, errorCode: 'query_failed' }

    while (allRows.length < rowCount) {
      const next = await client.runReport(connection.propertyId, { ...requestBody, offset: String(allRows.length) })

      if (!next.rows?.length) return { ok: false, errorCode: 'query_failed' }

      allRows.push(...next.rows)
    }

    const rows = allRows.map(row => ({
      dimensions: Object.fromEntries(params.dimensions.map((name, index) => [name, row.dimensionValues?.[index]?.value ?? ''])),
      metrics: Object.fromEntries(params.metrics.map((name, index) => [name, Number(row.metricValues?.[index]?.value ?? 0)]))
    }))

    return { ok: true, propertyId: connection.propertyId, rows, rowCount }
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''

    if ((error instanceof Ga4ApiError && (error.status === 401 || error.status === 403)) || message.includes('invalid_grant')) {
      await setGa4ConnectionStatus(organizationId, 'revoked', 'invalid_grant')

      return { ok: false, errorCode: 'token_unhealthy' }
    }

    captureWithDomain(error, 'growth', { tags: { source: 'ga4_read_analytics' }, extra: { organizationId } })

    return { ok: false, errorCode: 'query_failed' }
  }
}
