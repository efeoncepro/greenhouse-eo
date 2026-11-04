import 'server-only'

import { readSearchConsoleAnalytics } from '../../search-console/reader'
import { getSearchConsoleConnection } from '../../search-console/connection-store'
import type { SearchConsoleAnalyticsParams, SearchConsoleAnalyticsRow } from '../../search-console/contracts'
import { normalizeMarketKeyword } from '../keyword-market-data'
import { isPathInContentScope, type SeoContentScopeRuleV1 } from '../content-scope/contracts'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Host de la propiedad: una propiedad por URL (`https://blog.x.com/`) fija el host exacto; una propiedad de dominio
 * (`sc-domain:x.com`) cubre el dominio y sus subdominios, así que el host pedido debe pertenecerle.
 */
const assertHostBelongsToProperty = (siteUrl: string, hostname: string) => {
  if (siteUrl.startsWith('sc-domain:')) {
    const domain = siteUrl.slice('sc-domain:'.length).toLowerCase()
    const host = hostname.toLowerCase()

    if (host !== domain && !host.endsWith(`.${domain}`)) throw new Error('site_hostname_mismatch')

    return
  }

  if (new URL(siteUrl).hostname !== hostname) throw new Error('site_hostname_mismatch')
}

/**
 * TASK-2033 — expresión de página para la API de Search Console (RE2) con la MISMA semántica que
 * `isPathInContentScope`: la ruta, sin query ni fragmento ni barras finales, es la regla (`exact`) o empieza por la
 * regla seguida de `/` (`prefix`). Sin alcance, todo el host. El recorte lo hace Google: este módulo no filtra filas.
 */
export const organicValuePageExpression = (
  hostname: string,
  rules?: readonly SeoContentScopeRuleV1[],
  options: { includeSubdomains?: boolean } = {}
): string => {
  // Una propiedad de dominio pedida por su dominio raíz mide todos sus hosts (`berel.com`, `www.berel.com`), igual que
  // la serie diaria de Search Console que lee el capítulo: así los dos totales son el mismo universo.
  const host = `^https?://${options.includeSubdomains ? '([^/?#]+\\.)?' : ''}${escapeRegex(hostname)}`

  if (!rules || rules.length === 0) return `${host}/`

  const tail = '/*([?#].*)?$'

  const alternatives = rules.map(rule =>
    rule.kind === 'prefix' ? `${escapeRegex(rule.path)}(/.*|[?#].*)?$` : `${escapeRegex(rule.path)}${tail}`
  )

  return `${host}(${alternatives.join('|')})`
}

/** Extrae evidencia. No compra CPC, no cambia tracking ni crea una edición de Insights. */
export const collectOrganicTrafficValueInputs = async (input: {
  organizationId: string
  siteUrl: string
  hostname: string
  range: { startDate: string; endDate: string }
  maxPages?: number
  /** Reglas del alcance de contenido (TASK-2033): controles y detalle miden sólo ese contenido. */
  scopeRules?: readonly SeoContentScopeRuleV1[]
}) => {
  assertHostBelongsToProperty(input.siteUrl, input.hostname)
  const connection = await getSearchConsoleConnection(input.organizationId)

  if (!connection || connection.status !== 'active' || connection.siteUrl !== input.siteUrl)
    throw new Error('connected_site_does_not_match')

  const scopeRules = input.scopeRules && input.scopeRules.length > 0 ? input.scopeRules : undefined

  const common: SearchConsoleAnalyticsParams = {
    range: input.range,
    type: 'web',
    dataState: 'final',
    aggregationType: 'byPage',
    dimensionFilterGroups: [
      {
        groupType: 'and',
        filters: [
          {
            dimension: 'page',
            operator: 'includingRegex',
            expression: organicValuePageExpression(input.hostname, scopeRules, {
              includeSubdomains: input.siteUrl === `sc-domain:${input.hostname.toLowerCase()}`
            })
          }
        ]
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

  // Defensa: si Google devolviera una página fuera del alcance pedido, el resultado no mide lo que dice medir.
  if (scopeRules && [...pageRows, ...queryRows].some(row => !isPathInContentScope(row.keys[0]!, scopeRules)))
    throw new Error('page_outside_content_scope')

  return {
    scope: scopeRules ? { rules: [...scopeRules] } : null,
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
