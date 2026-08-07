import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type {
  SeoPerformanceCatalogItem,
  SeoPerformanceCatalogResult,
  SeoPerformanceCatalogSet,
  SeoPerformanceMode
} from '../contracts'
import { isSeoModuleEnabled } from '../flags'

/**
 * TASK-1307 — catálogo de ítems seleccionables del set (lo que ofrece el multi-select).
 *
 * ⚠️ En modo keyword la lista es la UNIÓN de dos universos que NO coinciden, y colapsarlos
 * dejaría al operador sin poder elegir justo lo que le importa:
 *   - keywords con volumen MEDIDO en Search Console (`seo_gsc_daily.query`), y
 *   - keywords TRACKEADAS por rank capture (`seo_rank_snapshots.keyword`), que pueden tener
 *     serie de posición exacta sin haber recibido una sola impresión todavía.
 * Una keyword recién trackeada existe en el segundo y no en el primero: sacarla de la lista
 * la volvería inseleccionable justo cuando su película recién empieza.
 *
 * `tracked` viaja al selector para que la UI pueda decir cuáles tienen posición exacta (◑)
 * y cuáles sólo volumen medido (●) — la misma leyenda del resto del módulo.
 *
 * En modo URL no hay unión posible: el eje de páginas sólo existe en Search Console.
 */

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500
const DEFAULT_WINDOW_DAYS = 90

export interface ReadSeoPerformanceCatalogOptions {
  mode?: SeoPerformanceMode
  /** Ventana de la que se derivan las impresiones que ordenan la lista. */
  windowDays?: number
  limit?: number
}

interface CatalogRow extends Record<string, unknown> {
  item: string
  impressions: string | number | null
}

const toNumber = (value: string | number | null): number => {
  if (value === null) return 0
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : 0
}

export const readSeoPerformanceCatalog = async (
  organizationId: string,
  options: ReadSeoPerformanceCatalogOptions = {}
): Promise<SeoPerformanceCatalogResult> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const mode: SeoPerformanceMode = options.mode ?? 'keyword'
  const windowDays = Math.max(7, Math.min(365, Math.floor(options.windowDays ?? DEFAULT_WINDOW_DAYS)))
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(options.limit ?? DEFAULT_LIMIT)))

  // Identificador, no parámetro: sale de un mapa cerrado sobre el union, nunca del request.
  const column = mode === 'keyword' ? 'query' : 'page'

  try {
    // Ancla en el último día materializado (mismo criterio que el resto del módulo): con
    // `CURRENT_DATE` la ventana terminaría en días vacíos por el lag de captura.
    const anchorRows = await runGreenhousePostgresQuery<{ anchor: string | null }>(
      `SELECT MAX(capture_date)::text AS anchor
         FROM greenhouse_growth.seo_gsc_daily
        WHERE organization_id = $1`,
      [organizationId]
    )

    const anchor = anchorRows[0]?.anchor ?? null

    const measuredRows = anchor
      ? await runGreenhousePostgresQuery<CatalogRow>(
          `SELECT ${column} AS item,
                  COALESCE(SUM(impressions), 0)::bigint AS impressions
             FROM greenhouse_growth.seo_gsc_daily
            WHERE organization_id = $1
              AND capture_date > $2::date - ($3::int * INTERVAL '1 day')
              AND capture_date <= $2::date
            GROUP BY ${column}
            ORDER BY impressions DESC
            LIMIT $4`,
          [organizationId, anchor, windowDays, limit]
        )
      : []

    const trackedKeywords =
      mode === 'keyword'
        ? await runGreenhousePostgresQuery<{ keyword: string }>(
            `SELECT DISTINCT s.keyword
               FROM greenhouse_growth.seo_rank_snapshots s
               JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = s.seo_target_id
              WHERE t.organization_id = $1
                AND t.status = 'active'
                AND s.capture_date > CURRENT_DATE - ($2::int - 1)
              ORDER BY s.keyword`,
            [organizationId, windowDays]
          )
        : []

    // Presets data-driven: los sets NOMBRADOS que el operador ya configuró en el target
    // activo (`seo_keyword_sets`). Miembros vigentes solamente (`effective_to IS NULL` —
    // la tabla es append-only, el "borrado" es cierre de vigencia). La UI ofrece estos
    // grupos como chips de un click; no inventa agrupaciones propias.
    const setRows =
      mode === 'keyword'
        ? await runGreenhousePostgresQuery<{ name: string; keyword: string }>(
            `SELECT s.name, m.keyword
               FROM greenhouse_growth.seo_keyword_set_members m
               JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
               JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = s.seo_target_id
              WHERE t.organization_id = $1
                AND t.status = 'active'
                AND m.effective_to IS NULL
              ORDER BY s.name, m.keyword`,
            [organizationId]
          )
        : []

    const setsByName = new Map<string, string[]>()

    for (const row of setRows) {
      const keywords = setsByName.get(row.name) ?? []

      keywords.push(row.keyword)
      setsByName.set(row.name, keywords)
    }

    const sets: SeoPerformanceCatalogSet[] = [...setsByName.entries()].map(([name, keywords]) => ({ name, keywords }))

    const tracked = new Set(trackedKeywords.map(row => row.keyword))
    const byItem = new Map<string, SeoPerformanceCatalogItem>()

    for (const row of measuredRows) {
      byItem.set(row.item, {
        item: row.item,
        impressions: toNumber(row.impressions),
        tracked: tracked.has(row.item)
      })
    }

    // Trackeadas sin volumen medido: entran con `impressions: 0`, que acá NO es una métrica
    // sino "todavía sin impresiones registradas" — la UI las muestra como trackeadas (◑).
    for (const keyword of tracked) {
      if (!byItem.has(keyword)) {
        byItem.set(keyword, { item: keyword, impressions: 0, tracked: true })
      }
    }

    const items = [...byItem.values()]
      .sort((a, b) => b.impressions - a.impressions || a.item.localeCompare(b.item))
      .slice(0, limit)

    if (items.length === 0) {
      return { ok: false, errorCode: 'no_data', status: null }
    }

    return { ok: true, organizationId, mode, items, ...(sets.length > 0 ? { sets } : {}) }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_performance_catalog_reader' },
      extra: { organizationId, mode, windowDays }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}
