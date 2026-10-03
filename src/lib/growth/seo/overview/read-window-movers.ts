import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isSeoModuleEnabled } from '../flags'

/**
 * TASK-1962 — qué consultas o páginas movieron los clics entre dos ventanas civiles `[from, toExclusive)`.
 *
 * Fuente: `greenhouse_growth.seo_gsc_daily`, la MISMA tabla y la misma suma que `readSeoOverviewKpisForWindow`: la
 * suma de todos los grupos de una ventana es exactamente su total de clics, así que un consumer puede decir «de los
 * N clics que se perdieron, X vinieron de esta consulta» sin otra fuente. Es DESCOMPOSICIÓN medida del cambio, nunca
 * causalidad: dice dónde cambió, no por qué.
 *
 * Orden: mayor cambio absoluto de clics; desempate por la clave en bytes (`COLLATE "C"`), igual en SQL y en JS, para
 * que dos lecturas iguales devuelvan la misma lista (invariante de orden de SQL_DATE_MATH_AGENT_INVARIANTS).
 *
 * ⚠️ Search Console oculta las consultas anónimas: por consulta, la suma cubre sólo consultas con texto. La tabla ya
 * guarda sólo esas, así que el total de la ventana y la suma por consulta coinciden.
 */

export type SeoMoverDimension = 'query' | 'page'

export interface SeoWindowMover {
  /** La consulta, o la URL de la página. */
  key: string
  clicks: number
  previousClicks: number
  impressions: number
  previousImpressions: number
}

export type ReadSeoWindowMoversResult =
  | { ok: true; dimension: SeoMoverDimension; movers: SeoWindowMover[]; totalClicks: number; previousTotalClicks: number }
  | { ok: false; errorCode: 'disabled' | 'no_data' }

/** Identificador de columna desde un mapa cerrado: nunca una cadena del caller dentro del SQL. */
const COLUMN: Record<SeoMoverDimension, 'query' | 'page'> = { query: 'query', page: 'page' }

const MAX_LIMIT = 20

interface MoverRow extends Record<string, unknown> {
  key: string
  clicks: string
  previous_clicks: string
  impressions: string
  previous_impressions: string
}

export const readSeoWindowMovers = async (
  organizationId: string,
  input: {
    window: { from: string; toExclusive: string }
    previous: { from: string; toExclusive: string }
    dimension: SeoMoverDimension
    limit?: number
  }
): Promise<ReadSeoWindowMoversResult> => {
  if (!isSeoModuleEnabled()) return { ok: false, errorCode: 'disabled' }

  const column = COLUMN[input.dimension]
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(input.limit ?? 5)))

  const [totals] = await runGreenhousePostgresQuery<{ current: string | null; previous: string | null }>(
    `SELECT SUM(clicks) FILTER (WHERE capture_date >= $2::date AND capture_date < $3::date)::bigint AS current,
            SUM(clicks) FILTER (WHERE capture_date >= $4::date AND capture_date < $5::date)::bigint AS previous
       FROM greenhouse_growth.seo_gsc_daily
      WHERE organization_id = $1
        AND capture_date >= LEAST($2::date, $4::date)
        AND capture_date < GREATEST($3::date, $5::date)`,
    [organizationId, input.window.from, input.window.toExclusive, input.previous.from, input.previous.toExclusive]
  )

  // Sin datos en alguna de las dos ventanas no hay cambio que descomponer (nunca un «todo es nuevo» contra cero).
  if (totals?.current === null || totals?.current === undefined || totals.previous === null || totals.previous === undefined) {
    return { ok: false, errorCode: 'no_data' }
  }

  const rows = await runGreenhousePostgresQuery<MoverRow>(
    `WITH cur AS (
       SELECT ${column} AS key, SUM(clicks)::bigint AS clicks, SUM(impressions)::bigint AS impressions
         FROM greenhouse_growth.seo_gsc_daily
        WHERE organization_id = $1 AND capture_date >= $2::date AND capture_date < $3::date
        GROUP BY ${column}
     ), prev AS (
       SELECT ${column} AS key, SUM(clicks)::bigint AS clicks, SUM(impressions)::bigint AS impressions
         FROM greenhouse_growth.seo_gsc_daily
        WHERE organization_id = $1 AND capture_date >= $4::date AND capture_date < $5::date
        GROUP BY ${column}
     )
     SELECT COALESCE(cur.key, prev.key) AS key,
            COALESCE(cur.clicks, 0)::text AS clicks,
            COALESCE(prev.clicks, 0)::text AS previous_clicks,
            COALESCE(cur.impressions, 0)::text AS impressions,
            COALESCE(prev.impressions, 0)::text AS previous_impressions
       FROM cur FULL OUTER JOIN prev ON cur.key = prev.key
      WHERE COALESCE(cur.clicks, 0) <> COALESCE(prev.clicks, 0)
      ORDER BY ABS(COALESCE(cur.clicks, 0) - COALESCE(prev.clicks, 0)) DESC,
               COALESCE(cur.key, prev.key) COLLATE "C"
      LIMIT $6`,
    [organizationId, input.window.from, input.window.toExclusive, input.previous.from, input.previous.toExclusive, limit]
  )

  return {
    ok: true,
    dimension: input.dimension,
    totalClicks: Number(totals.current),
    previousTotalClicks: Number(totals.previous),
    movers: rows.map(row => ({
      key: row.key,
      clicks: Number(row.clicks),
      previousClicks: Number(row.previous_clicks),
      impressions: Number(row.impressions),
      previousImpressions: Number(row.previous_impressions)
    }))
  }
}
