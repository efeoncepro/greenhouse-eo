import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1306 — KPIs norte + serie de visibilidad del cockpit Overview.
 *
 * Fuente: `greenhouse_growth.seo_gsc_daily` (lo MATERIALIZADO por TASK-1302), nunca un
 * read-through en vivo a Google — el panel muestra lo que efectivamente puede graficar.
 *
 * ⚠️ POSICIÓN MEDIA = PONDERADA POR IMPRESIONES: `SUM(position*impressions)/SUM(impressions)`.
 * Un `AVG(position)` plano es INCORRECTO y no por poco: le daría el mismo peso a una fila
 * de 2 impresiones que a una de 500, y GSC ya entrega su `position` ponderada dentro del
 * período. El error se ve "razonable" en pantalla, que es lo que lo hace peligroso.
 *
 * ⚠️ CTR = SUM(clicks)/SUM(impressions) del período, NO el promedio de los CTR diarios
 * (promediar razones da un número que no corresponde a ninguna realidad medible).
 *
 * ⚠️ `capture_date` es DATE: la resta de dos DATE en PG da INTEGER (días), así que la
 * aritmética de ventanas se hace con intervalos explícitos, nunca con EXTRACT(EPOCH ...)
 * sobre una diferencia de DATE (revienta en runtime — invariante SQL date-math).
 *
 * Comparación: la ventana previa es del mismo largo, inmediatamente anterior. Si NO tiene
 * datos, `previous` viene `null` y la UI dice "Primer período con datos" — nunca un delta
 * contra cero, que fabricaría un +100% inventado.
 */

export interface SeoOverviewKpiTotals {
  clicks: number
  impressions: number
  /** Posición media ponderada por impresiones. `null` si no hubo impresiones. */
  position: number | null
  /** CTR del período (0..1). `null` si no hubo impresiones. */
  ctr: number | null
}

export interface SeoOverviewSeriesPoint {
  date: string
  clicks: number
  impressions: number
  position: number | null
}

export interface SeoOverviewKpis {
  current: SeoOverviewKpiTotals
  /** Ventana previa del mismo largo. `null` si no hay datos para comparar. */
  previous: SeoOverviewKpiTotals | null
  series: SeoOverviewSeriesPoint[]
  rangeDays: number
}

interface TotalsRow extends Record<string, unknown> {
  clicks: string | number | null
  impressions: string | number | null
  weighted_position: string | number | null
}

interface SeriesRow extends Record<string, unknown> {
  capture_date: string
  clicks: string | number | null
  impressions: string | number | null
  weighted_position: string | number | null
}

const toNumber = (value: string | number | null): number => {
  if (value === null) {
    return 0
  }

  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const toNullableNumber = (value: string | number | null): number | null => {
  if (value === null) {
    return null
  }

  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : null
}

const buildTotals = (row: TotalsRow | undefined): SeoOverviewKpiTotals | null => {
  if (!row) {
    return null
  }

  const impressions = toNumber(row.impressions)
  const clicks = toNumber(row.clicks)

  // Sin impresiones no hay posición ni CTR que reportar: `null` (→ "Pendiente" en UI),
  // NUNCA 0. Un CTR de 0% dice "apareciste y nadie hizo clic"; la verdad es "no apareciste".
  if (impressions <= 0) {
    return { clicks, impressions, position: null, ctr: null }
  }

  return {
    clicks,
    impressions,
    position: toNullableNumber(row.weighted_position),
    ctr: clicks / impressions
  }
}

const hasAnyVolume = (totals: SeoOverviewKpiTotals | null): boolean =>
  totals !== null && (totals.impressions > 0 || totals.clicks > 0)

export const readSeoOverviewKpis = async (organizationId: string, rangeDays = 28): Promise<SeoOverviewKpis> => {
  // Ancla en el último día materializado, NO en CURRENT_DATE: la captura corre con lag,
  // así que anclar en "hoy" mostraría una ventana que termina en días vacíos y haría ver
  // una caída de tráfico que no ocurrió.
  const anchorRows = await runGreenhousePostgresQuery<{ anchor: string | null }>(
    `SELECT MAX(capture_date)::text AS anchor
       FROM greenhouse_growth.seo_gsc_daily
      WHERE organization_id = $1`,
    [organizationId]
  )

  const anchor = anchorRows[0]?.anchor ?? null

  if (!anchor) {
    return {
      current: { clicks: 0, impressions: 0, position: null, ctr: null },
      previous: null,
      series: [],
      rangeDays
    }
  }

  const totalsSql = `
    SELECT COALESCE(SUM(clicks), 0)::int AS clicks,
           COALESCE(SUM(impressions), 0)::bigint AS impressions,
           CASE WHEN COALESCE(SUM(impressions), 0) > 0
                THEN SUM(position * impressions) / SUM(impressions)
                ELSE NULL
           END AS weighted_position
      FROM greenhouse_growth.seo_gsc_daily
     WHERE organization_id = $1
       AND capture_date > $2::date - ($3::int * INTERVAL '1 day')
       AND capture_date <= $2::date`

  const [currentRows, previousRows] = await Promise.all([
    runGreenhousePostgresQuery<TotalsRow>(totalsSql, [organizationId, anchor, rangeDays]),
    runGreenhousePostgresQuery<TotalsRow>(
      `SELECT COALESCE(SUM(clicks), 0)::int AS clicks,
              COALESCE(SUM(impressions), 0)::bigint AS impressions,
              CASE WHEN COALESCE(SUM(impressions), 0) > 0
                   THEN SUM(position * impressions) / SUM(impressions)
                   ELSE NULL
              END AS weighted_position
         FROM greenhouse_growth.seo_gsc_daily
        WHERE organization_id = $1
          AND capture_date > $2::date - (($3::int * 2) * INTERVAL '1 day')
          AND capture_date <= $2::date - ($3::int * INTERVAL '1 day')`,
      [organizationId, anchor, rangeDays]
    )
  ])

  const seriesRows = await runGreenhousePostgresQuery<SeriesRow>(
    `SELECT capture_date::text AS capture_date,
            COALESCE(SUM(clicks), 0)::int AS clicks,
            COALESCE(SUM(impressions), 0)::bigint AS impressions,
            CASE WHEN COALESCE(SUM(impressions), 0) > 0
                 THEN SUM(position * impressions) / SUM(impressions)
                 ELSE NULL
            END AS weighted_position
       FROM greenhouse_growth.seo_gsc_daily
      WHERE organization_id = $1
        AND capture_date > $2::date - ($3::int * INTERVAL '1 day')
        AND capture_date <= $2::date
      GROUP BY capture_date
      ORDER BY capture_date`,
    [organizationId, anchor, rangeDays]
  )

  const previous = buildTotals(previousRows[0])

  return {
    current: buildTotals(currentRows[0]) ?? { clicks: 0, impressions: 0, position: null, ctr: null },
    // Una ventana previa sin volumen NO es "cero tráfico": es "no hay con qué comparar".
    previous: hasAnyVolume(previous) ? previous : null,
    series: seriesRows.map(row => ({
      date: row.capture_date,
      clicks: toNumber(row.clicks),
      impressions: toNumber(row.impressions),
      position: toNullableNumber(row.weighted_position)
    })),
    rangeDays
  }
}
