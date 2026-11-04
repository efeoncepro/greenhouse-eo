import 'server-only'

import { getSearchConsoleConnection } from '../../search-console/connection-store'
import type { SeoContentScopeRuleV1 } from '../content-scope/contracts'
import { readKeywordMarketData } from '../keyword-market-data'
import { searchConsoleHostOf } from '../search-control/page-expression'

import type { ORGANIC_TRAFFIC_VALUE_METHOD} from './calculate';
import { calculateOrganicTrafficValue, type OrganicValueCpc } from './calculate'
import { collectOrganicTrafficValueInputs } from './collect'

/**
 * Valor publicitario equivalente estimado de una ventana (método `gsc_clicks_country_cpc_v1`), para consumers de
 * lectura como Insights. Extrae Search Console en vivo con el reader autorizado (controles + detalle page/query/country,
 * con el alcance de contenido si se declara) y valora SÓLO con los CPC ya capturados del mercado del target: este
 * reader NUNCA compra datos. Lo que no tiene CPC queda sin valorar; no se extrapola.
 *
 * Valora un solo mercado (el del target SEO): las consultas de otros países quedan sin valorar, igual que en el piloto.
 */

/** País de Search Console (ISO 3166-1 alfa-3 en minúsculas) por mercado ISO alfa-2 del registro de Growth. */
const GSC_COUNTRY_BY_MARKET: Readonly<Record<string, string>> = {
  AR: 'arg', BO: 'bol', BR: 'bra', CL: 'chl', CO: 'col', CR: 'cri', CU: 'cub', DO: 'dom', EC: 'ecu', ES: 'esp', GT: 'gtm',
  HN: 'hnd', HT: 'hti', MX: 'mex', NI: 'nic', PA: 'pan', PE: 'per', PR: 'pri', PY: 'pry', SV: 'slv', US: 'usa', UY: 'ury', VE: 'ven'
}

export const gscCountryOfMarket = (market: string): string | null => GSC_COUNTRY_BY_MARKET[market.toUpperCase()] ?? null

/** Patrón de marca desde la etiqueta del dominio raíz (`berel.com` → `\bberel\b`). Sólo desglosa; no altera el valor. */
export const brandPatternOfDomain = (rootDomain: string): RegExp => {
  const label = rootDomain.toLowerCase().replace(/^www\./, '').split('.')[0] ?? rootDomain

  return new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
}

export interface OrganicTrafficValueWindowInput {
  organizationId: string
  window: { from: string; toExclusive: string }
  market: { code: string; locationCode: string; languageCode: string }
  rootDomain: string
  scope?: { rules: readonly SeoContentScopeRuleV1[] }
}

export type OrganicTrafficValueWindowResult =
  | {
      ok: true
      methodology: typeof ORGANIC_TRAFFIC_VALUE_METHOD
      siteUrl: string
      country: string
      summary: ReturnType<typeof calculateOrganicTrafficValue>['summary']
      gscCapturedAt: string
      /** Fecha de captura más reciente de los CPC usados: precios a esa fecha, no históricos del mes. */
      cpcAsOf: string | null
    }
  | { ok: false; errorCode: 'not_connected' | 'market_unsupported' | 'collection_failed' | 'reconciliation_failed' }

const dayBefore = (isoDate: string) => new Date(Date.parse(`${isoDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)

export const readOrganicTrafficValueForWindow = async (input: OrganicTrafficValueWindowInput): Promise<OrganicTrafficValueWindowResult> => {
  const country = gscCountryOfMarket(input.market.code)

  if (!country) return { ok: false, errorCode: 'market_unsupported' }

  const connection = await getSearchConsoleConnection(input.organizationId)

  if (!connection || connection.status !== 'active' || !connection.siteUrl) return { ok: false, errorCode: 'not_connected' }

  let collected: Awaited<ReturnType<typeof collectOrganicTrafficValueInputs>>

  try {
    collected = await collectOrganicTrafficValueInputs({
      organizationId: input.organizationId,
      siteUrl: connection.siteUrl,
      hostname: searchConsoleHostOf(connection.siteUrl).hostname,
      range: { startDate: input.window.from, endDate: dayBefore(input.window.toExclusive) },
      ...(input.scope?.rules.length ? { scopeRules: input.scope.rules } : {})
    })
  } catch {
    return { ok: false, errorCode: 'collection_failed' }
  }

  const keywords = [...new Set(collected.rows.filter(row => row.country === country).map(row => row.normalizedQuery))]
  const market = await readKeywordMarketData({ keywords, locationCode: input.market.locationCode, languageCode: input.market.languageCode })
  const cpc: OrganicValueCpc[] = []

  for (const datum of market.byKeyword.values()) {
    // Sin fecha de captura no hay procedencia del precio: no se usa (queda sin valorar).
    if (!datum.capturedAt) continue
    cpc.push({ normalizedQuery: datum.normalizedKeyword, country, cpcUsd: datum.cpcUsd, capturedAt: datum.capturedAt, providerUpdatedAt: datum.providerLastUpdatedAt })
  }

  let result: ReturnType<typeof calculateOrganicTrafficValue>

  try {
    // Controles que no reconcilian, filas duplicadas o un detalle mayor que su control son errores del cálculo: el
    // resultado no se presenta como completo.
    result = calculateOrganicTrafficValue({ ...collected, gscCapturedAt: collected.capturedAt, brandPattern: brandPatternOfDomain(input.rootDomain), cpc })
  } catch {
    return { ok: false, errorCode: 'reconciliation_failed' }
  }

  return {
    ok: true,
    methodology: result.methodology,
    siteUrl: collected.siteUrl,
    country,
    summary: result.summary,
    gscCapturedAt: collected.capturedAt,
    cpcAsOf: cpc.map(row => row.capturedAt).sort().at(-1) ?? null
  }
}
