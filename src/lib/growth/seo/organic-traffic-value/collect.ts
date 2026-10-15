import 'server-only'

import { readSearchConsoleAnalytics } from '../../search-console/reader'
import { getSearchConsoleConnection } from '../../search-console/connection-store'
import type { SearchConsoleAnalyticsParams, SearchConsoleAnalyticsRow } from '../../search-console/contracts'
import { normalizeMarketKeyword } from '../keyword-market-data'

/** Extrae evidencia. No compra CPC, no cambia tracking ni crea una edición de Insights. */
export const collectOrganicTrafficValueInputs = async (input: {
  organizationId: string
  siteUrl: string
  hostname: string
  range: { startDate: string; endDate: string }
  maxPages?: number
}) => {
  if (new URL(input.siteUrl).hostname !== input.hostname) throw new Error('site_hostname_mismatch')
  const connection = await getSearchConsoleConnection(input.organizationId)

  if (!connection || connection.status !== 'active' || connection.siteUrl !== input.siteUrl)
    throw new Error('connected_site_does_not_match')
  const escapedHost = input.hostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const common: SearchConsoleAnalyticsParams = {
    range: input.range,
    type: 'web',
    dataState: 'final',
    aggregationType: 'byPage',
    dimensionFilterGroups: [
      {
        groupType: 'and',
        filters: [{ dimension: 'page', operator: 'includingRegex', expression: `^https?://${escapedHost}/` }]
      }
    ]
  }

  const read = async (dimensions: SearchConsoleAnalyticsParams['dimensions'], paginate: boolean) => {
    const rows: SearchConsoleAnalyticsRow[] = []
    const pageSize = 25000
    const maxPages = input.maxPages ?? 20

    if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 100) throw new Error('invalid_max_pages')

    for (let page = 0; page < maxPages; page += 1) {
      const result = await readSearchConsoleAnalytics(input.organizationId, {
        ...common,
        dimensions,
        rowLimit: pageSize,
        startRow: page * pageSize
      })

      if (!result.ok) throw new Error(`search_console_${result.errorCode}`)
      if (result.siteUrl !== input.siteUrl) throw new Error('connected_site_does_not_match')
      rows.push(...result.rows)
      if (!paginate || result.rows.length < pageSize) return rows
    }

    throw new Error('pagination_limit_reached')
  }

  const totalRows = await read([], false)
  const pageRows = await read(['page'], true)
  const queryRows = await read(['page', 'query', 'country'], true)

  return {
    organizationId: input.organizationId,
    siteUrl: input.siteUrl,
    hostname: input.hostname,
    range: input.range,
    capturedAt: new Date().toISOString(),
    queryPaginationExhausted: true,
    providerCompleteness: 'top_rows_only_privacy_and_provider_limits_apply' as const,
    totalClicks: totalRows[0]?.clicks ?? 0,
    controls: pageRows.map(row => ({ page: row.keys[0], clicks: row.clicks })),
    rows: queryRows
      .filter(row => row.clicks > 0)
      .map(row => ({
        page: row.keys[0],
        query: row.keys[1],
        normalizedQuery: normalizeMarketKeyword(row.keys[1]),
        country: row.keys[2].toLowerCase(),
        clicks: row.clicks
      }))
  }
}
