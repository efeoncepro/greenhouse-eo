import 'server-only'

import { query } from '@/lib/db'
import { SEO_MODULE_KEYS_READ } from '@/lib/growth/seo/entitlement'
import { MARKET_DATA_FRESHNESS_DAYS } from '@/lib/growth/seo/keyword-market-data'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1661 — Frescura del dato de mercado por keyword.
 *
 * Un volumen de búsqueda sin fecha envejece en silencio: se sigue leyendo como vigente y nadie
 * se entera. Esta señal responde "¿cuántas keywords seguidas tienen su dato de mercado al día?"
 * por target elegible.
 *
 * ⚠️ **El umbral es el CICLO DEL PROVEEDOR, no una preferencia nuestra.** DataForSEO refresca
 * mensualmente siguiendo Google Ads, así que la ventana de frescura sale de la MISMA constante
 * que usa el pre-check de gasto (`MARKET_DATA_FRESHNESS_DAYS`): si alguien la cambia, la señal
 * y el gasto se mueven juntos y no pueden divergir.
 *
 * Umbrales:
 *   - todas las keywords seguidas con dato vigente → `ok`
 *   - cobertura parcial → `warning`
 *   - ningún target con dato de mercado → `warning` (NO `error`): con el flag OFF ese es el
 *     estado correcto y esperado, no una falla. Marcarlo `error` entrenaría al equipo a ignorar
 *     la señal justo cuando empiece a significar algo.
 *
 * Date-math (gate TASK-893): `capture_date` es DATE y `CURRENT_DATE` también, así que la resta
 * da `integer` directo — NUNCA `EXTRACT(EPOCH FROM (date - date))`, que revienta en runtime.
 */
export const SEO_MARKET_DATA_FRESHNESS_SIGNAL_ID = 'seo.market_data.freshness'

const QUERY_SQL = `
  WITH tracked AS (
    SELECT
      t.seo_target_id,
      t.location_code,
      t.language_code,
      lower(regexp_replace(btrim(m.keyword), '\\s+', ' ', 'g')) AS normalized_keyword
    FROM greenhouse_growth.seo_targets t
    JOIN greenhouse_growth.seo_keyword_sets s
      ON s.seo_target_id = t.seo_target_id
    JOIN greenhouse_growth.seo_keyword_set_members m
      ON m.keyword_set_id = s.keyword_set_id
     AND m.effective_to IS NULL
    WHERE t.status = 'active'
      AND EXISTS (
        SELECT 1
          FROM greenhouse_client_portal.module_assignments ma
         WHERE ma.organization_id = t.organization_id
           AND ma.module_key = ANY($1::text[])
           AND ma.effective_to IS NULL
           AND ma.status IN ('active', 'pilot')
      )
  )
  SELECT
    tr.seo_target_id,
    COUNT(*)::int AS tracked_keywords,
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1
          FROM greenhouse_growth.seo_keyword_market_data md
         WHERE md.normalized_keyword = tr.normalized_keyword
           AND md.location_code = tr.location_code
           AND md.language_code = tr.language_code
           AND (CURRENT_DATE - md.capture_date) < $2
      )
    )::int AS fresh_keywords
  FROM tracked tr
  GROUP BY tr.seo_target_id
`

type FreshnessRow = {
  seo_target_id: string
  tracked_keywords: number
  fresh_keywords: number
}

export const getSeoMarketDataFreshnessSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const label = 'Frescura del dato de mercado SEO'

  try {
    const rows = await query<FreshnessRow>(QUERY_SQL, [[...SEO_MODULE_KEYS_READ], MARKET_DATA_FRESHNESS_DAYS])

    const totalTargets = rows.length
    const trackedKeywords = rows.reduce((sum, row) => sum + Number(row.tracked_keywords ?? 0), 0)
    const freshKeywords = rows.reduce((sum, row) => sum + Number(row.fresh_keywords ?? 0), 0)
    const staleTargets = rows.filter(row => Number(row.fresh_keywords ?? 0) < Number(row.tracked_keywords ?? 0)).length

    const severity: ReliabilitySignal['severity'] =
      totalTargets === 0 || trackedKeywords === 0 ? 'ok' : staleTargets === 0 ? 'ok' : 'warning'

    const summary =
      totalTargets === 0 || trackedKeywords === 0
        ? 'Sin keywords seguidas en targets SEO elegibles: no hay dato de mercado que refrescar.'
        : staleTargets === 0
          ? `Dato de mercado vigente en ${trackedKeywords} keyword(s) de ${totalTargets} target(s).`
          : `${freshKeywords}/${trackedKeywords} keyword(s) con dato de mercado vigente (<${MARKET_DATA_FRESHNESS_DAYS}d) en ${staleTargets} target(s) con cobertura parcial. Con GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED apagado esto es lo esperado; con el flag ON, revisar el scheduler ops-seo-keyword-market-data y el gate de costo.`

    return {
      signalId: SEO_MARKET_DATA_FRESHNESS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoMarketDataFreshnessSignal',
      label,
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `keywords vigentes del set × seo_keyword_market_data — (CURRENT_DATE - capture_date) < ${MARKET_DATA_FRESHNESS_DAYS}`
        },
        { kind: 'metric', label: 'targets', value: String(totalTargets) },
        { kind: 'metric', label: 'trackedKeywords', value: String(trackedKeywords) },
        { kind: 'metric', label: 'freshKeywords', value: String(freshKeywords) },
        { kind: 'metric', label: 'staleTargets', value: String(staleTargets) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_market_data_freshness' }
    })

    return {
      signalId: SEO_MARKET_DATA_FRESHNESS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoMarketDataFreshnessSignal',
      label,
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }
      ]
    }
  }
}
