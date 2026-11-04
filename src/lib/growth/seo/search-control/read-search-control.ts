import 'server-only'

import { getSearchConsoleConnection } from '../../search-console/connection-store'
import type { SearchConsoleAnalyticsParams, SearchConsoleAnalyticsRow } from '../../search-console/contracts'
import { readSearchConsoleAnalytics } from '../../search-console/reader'
import { isPathInContentScope, type SeoContentScopeRuleV1 } from '../content-scope/contracts'
import { seoProvenance } from '../lens'

import { searchConsoleHostOf, searchConsolePageExpression } from './page-expression'

/**
 * ISSUE-191 — el CONTROL de Search Console: clics e impresiones pedidos SIN la dimensión consulta.
 *
 * `seo_gsc_daily` materializa `query × page`, y al pedir la consulta Google omite las anonimizadas y aplica límites de
 * filas: su suma es un subconjunto del total (Berel, blog, octubre de 2026: 1.065 de 4.094 clics). Este reader lee en
 * vivo, con el reader autorizado de la organización, el total que Google sí reporta: totales, serie diaria y páginas,
 * con `aggregationType: 'byPage'` (la que exige un filtro por página y la del método de valor orgánico) y
 * `dataState: 'final'`. El detalle por consulta sigue saliendo de la tabla materializada, con su cobertura declarada.
 *
 * Con alcance de contenido (TASK-2033) Google recibe la expresión de página del alcance: el recorte lo hace la API,
 * y si devolviera una página fuera del alcance el reader falla (no mediría lo que dice medir).
 */
export const SEO_SEARCH_CONTROL_METHOD = { name: 'gsc_search_control', version: 'gsc_search_control_v1' } as const

export interface SeoSearchControlWindow {
  from: string
  /** Exclusivo, como el resto de los readers del módulo. */
  toExclusive: string
}

export interface SeoSearchControlPage {
  page: string
  clicks: number
  impressions: number
}

export type SeoSearchControlResult =
  | {
      ok: true
      siteUrl: string
      aggregation: 'byPage'
      dataState: 'final'
      totals: { clicks: number; impressions: number; ctr: number | null; position: number | null }
      series: Array<{ date: string; clicks: number; impressions: number }>
      pages: SeoSearchControlPage[]
      coveredDays: number
      servedFrom: string | null
      /** Exclusivo. */
      servedTo: string | null
      capturedAt: string
      provenance: ReturnType<typeof seoProvenance>[]
    }
  | { ok: false; errorCode: 'disabled' | 'not_connected' | 'token_unhealthy' | 'query_failed' | 'pagination_limit_reached' | 'page_outside_content_scope' }

const PAGE_SIZE = 25_000
const MAX_PAGES = 8

const dayBefore = (isoDate: string) => new Date(Date.parse(`${isoDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
const dayAfter = (isoDate: string) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

export const readSeoSearchControlForWindow = async (
  organizationId: string,
  window: SeoSearchControlWindow,
  options: { scope?: { rules: readonly SeoContentScopeRuleV1[] } } = {}
): Promise<SeoSearchControlResult> => {
  const connection = await getSearchConsoleConnection(organizationId)

  if (!connection || connection.status !== 'active' || !connection.siteUrl) return { ok: false, errorCode: 'not_connected' }
  const siteUrl = connection.siteUrl

  const rules = options.scope?.rules && options.scope.rules.length > 0 ? options.scope.rules : undefined
  const { hostname, includeSubdomains } = searchConsoleHostOf(siteUrl)

  const common: SearchConsoleAnalyticsParams = {
    range: { startDate: window.from, endDate: dayBefore(window.toExclusive) },
    type: 'web',
    dataState: 'final',
    aggregationType: 'byPage',
    dimensionFilterGroups: [{ groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: searchConsolePageExpression(hostname, rules, { includeSubdomains }) }] }]
  }

  type Read = { ok: true; rows: SearchConsoleAnalyticsRow[] } | Extract<SeoSearchControlResult, { ok: false }>

  const read = async (dimensions: SearchConsoleAnalyticsParams['dimensions'], paginate: boolean): Promise<Read> => {
    const rows: SearchConsoleAnalyticsRow[] = []

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await readSearchConsoleAnalytics(organizationId, { ...common, dimensions, rowLimit: PAGE_SIZE, startRow: page * PAGE_SIZE })

      if (!result.ok) return { ok: false, errorCode: result.errorCode }
      if (result.siteUrl !== siteUrl) return { ok: false, errorCode: 'not_connected' }
      rows.push(...result.rows)
      if (!paginate || result.rows.length < PAGE_SIZE) return { ok: true, rows }
    }

    return { ok: false, errorCode: 'pagination_limit_reached' }
  }

  const total = await read([], false)

  if (!total.ok) return total
  const byDate = await read(['date'], false)

  if (!byDate.ok) return byDate
  const byPage = await read(['page'], true)

  if (!byPage.ok) return byPage

  if (rules && byPage.rows.some(row => !isPathInContentScope(row.keys[0]!, rules))) return { ok: false, errorCode: 'page_outside_content_scope' }

  const clicks = total.rows[0]?.clicks ?? 0
  const impressions = total.rows[0]?.impressions ?? 0
  const series = byDate.rows.map(row => ({ date: row.keys[0]!, clicks: row.clicks, impressions: row.impressions })).sort((a, b) => (a.date < b.date ? -1 : 1))
  const capturedAt = new Date().toISOString()

  return {
    ok: true,
    siteUrl,
    aggregation: 'byPage',
    dataState: 'final',
    totals: {
      clicks,
      impressions,
      // CTR del período = clics / impresiones (nunca el promedio de CTR diarios), igual que el reader materializado.
      ctr: impressions > 0 ? clicks / impressions : null,
      position: total.rows[0] && impressions > 0 ? total.rows[0].position : null
    },
    series,
    pages: byPage.rows.map(row => ({ page: row.keys[0]!, clicks: row.clicks, impressions: row.impressions })),
    coveredDays: series.length,
    servedFrom: series[0]?.date ?? null,
    servedTo: series.length > 0 ? dayAfter(series[series.length - 1]!.date) : null,
    capturedAt,
    provenance: [seoProvenance({ section: '*', source: 'gsc', capturedAt })]
  }
}

/**
 * Páginas que más movieron los clics entre dos ventanas del control: diferencia absoluta de clics, desempate por la
 * ruta en bytes (determinista). Selección sobre lo que entregó el reader, no una fórmula nueva.
 */
export const rankSearchControlPageMovers = (
  current: readonly SeoSearchControlPage[],
  previous: readonly SeoSearchControlPage[],
  limit: number
): Array<{ key: string; clicks: number; previousClicks: number }> => {
  const keys = new Set([...current.map(page => page.page), ...previous.map(page => page.page)])
  const now = new Map(current.map(page => [page.page, page.clicks]))
  const before = new Map(previous.map(page => [page.page, page.clicks]))

  return [...keys]
    .map(key => ({ key, clicks: now.get(key) ?? 0, previousClicks: before.get(key) ?? 0 }))
    .filter(mover => mover.clicks !== mover.previousClicks)
    .sort((a, b) => Math.abs(b.clicks - b.previousClicks) - Math.abs(a.clicks - a.previousClicks) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .slice(0, limit)
}
