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

    const requestBody = {
      dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
      dimensions: params.dimensions.map(name => ({ name })),
      metrics: params.metrics.map(name => ({ name })),
      ...(params.landingPrefix ? {
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
