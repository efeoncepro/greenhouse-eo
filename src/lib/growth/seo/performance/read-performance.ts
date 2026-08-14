import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { resolveUnambiguousSeoTarget } from '../resolve-target'

import { SEO_GSC_HISTORY_DATASET, SEO_GSC_HISTORY_TABLE } from '../gsc-history-bq-mirror'

import type {
  SeoPerformanceDailyTotal,
  SeoPerformanceMetric,
  SeoPerformanceMode,
  SeoPerformancePoint,
  SeoPerformanceResult,
  SeoPerformanceSeries,
  SeoPerformanceSource,
  SeoPerformanceStanding,
  SeoPerformanceSummary,
  SeoPerformanceTotals,
  SeoRankDevice
} from '../contracts'
import { isSeoModuleEnabled } from '../flags'
import { readRankEvolution } from '../rank-evolution-reader'

/**
 * TASK-1307 — reader canónico de la pantalla ancla `/admin/growth/seo/performance`.
 *
 * Responde UNA pregunta ("¿cómo rinde este set de URLs/keywords y cómo evoluciona?") con
 * UNA lectura: la serie del chart y las filas de la tabla salen del mismo llamado. Partirlo
 * en dos readers habría duplicado la ventana, el ancla y la derivación del Δ — y abierto la
 * puerta a que chart y tabla discrepen sobre el mismo dato.
 *
 * ⚠️ Fuente por (modo × métrica) — regla única, ver `contracts.ts`. Las series de
 * DataForSEO y de Search Console NUNCA se promedian (contrato §5): una lectura completa
 * pertenece a una sola fuente, y la UI la declara con ●/◑.
 *
 * ⚠️ Los huecos son de PRIMERA CLASE. Un día sin medición viaja como `value: null` hasta el
 * chart, que lo dibuja como hueco. Rellenarlo con 0 sería una mentira grave acá: la
 * posición 0 no existe, y un 0 de clics dice "apareciste y nadie hizo clic" cuando la
 * verdad es "no se midió".
 *
 * Consumer-agnóstico (Full API Parity): lo consumen la UI, el lane ecosystem y la MCP tool
 * `get_seo_performance` — sin lógica duplicada por consumer.
 */

const DEFAULT_RANGE_DAYS = 90
const MIN_RANGE_DAYS = 7
const MAX_RANGE_DAYS = 365

/**
 * Techo de ítems por lectura. NO es el límite de legibilidad de la UI (8 series): es un
 * guard de recurso del reader, que también sirve a Nexa y MCP. La UI aplica el suyo.
 */
const MAX_ITEMS = 25

/** Días hacia atrás que definen la referencia del Δ que la tabla promete ("Δ 30 días"). */
const DELTA_LOOKBACK_DAYS = 30

/** Bajo esta cobertura la serie se declara rala y la UI muestra el banner honesto. */
const SPARSE_COVERAGE_RATIO = 0.5

/**
 * Columna de `seo_gsc_daily` que representa el eje. NO es un parámetro SQL (es un
 * identificador) — por eso sale de un mapa cerrado sobre el union `SeoPerformanceMode`,
 * nunca de una cadena del request.
 */
const GSC_COLUMN_BY_MODE: Record<SeoPerformanceMode, 'query' | 'page'> = {
  keyword: 'query',
  url: 'page'
}

export interface ReadSeoPerformanceOptions {
  mode?: SeoPerformanceMode
  /** El set elegido. Vacío ⇒ `no_items` (estado inicial legítimo, no un error). */
  items: string[]
  metric?: SeoPerformanceMetric
  rangeDays?: number
  device?: SeoRankDevice
  engine?: string
}

/**
 * La fuente de una lectura, derivada de (modo × métrica). Pura y exportada: es la regla de
 * honestidad del módulo y tiene que poder probarse sin base de datos.
 */
export const resolveSeoPerformanceSource = (
  mode: SeoPerformanceMode,
  metric: SeoPerformanceMetric
): SeoPerformanceSource =>
  mode === 'keyword' && metric === 'position' ? 'dataforseo_estimated' : 'gsc_measured'

interface MeasuredPoint {
  date: string
  value: number
}

/**
 * Punto de referencia para el Δ: el medido MÁS CERCANO a `lookbackDays` antes del último.
 *
 * Tomar simplemente el primero de la ventana compararía contra 90 días cuando el copy
 * promete 30. Puro y exportado para test.
 */
export const resolveDeltaReference = (measured: MeasuredPoint[], lookbackDays: number): MeasuredPoint | null => {
  if (measured.length < 2) {
    return null
  }

  const latestTime = new Date(measured[measured.length - 1].date).getTime()

  const gapFromTarget = (point: MeasuredPoint) =>
    Math.abs((latestTime - new Date(point.date).getTime()) / (1000 * 60 * 60 * 24) - lookbackDays)

  return measured
    .slice(0, -1)
    .reduce<MeasuredPoint | null>(
      (best, candidate) => (best === null || gapFromTarget(candidate) < gapFromTarget(best) ? candidate : best),
      null
    )
}

const toNumber = (value: string | number | null): number => {
  if (value === null) return 0
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const toNullableNumber = (value: string | number | null): number | null => {
  if (value === null) return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : null
}

const shiftIsoDate = (isoDate: string, deltaDays: number): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  date.setUTCDate(date.getUTCDate() + deltaDays)

  return date.toISOString().slice(0, 10)
}

interface GscDailyRow extends Record<string, unknown> {
  item: string
  date: string
  clicks: string | number | null
  impressions: string | number | null
  weighted_position: string | number | null
}

/**
 * Serie diaria por ítem desde Search Console.
 *
 * ⚠️ La posición se pondera POR IMPRESIONES (`SUM(position*impressions)/SUM(impressions)`),
 * nunca con un `AVG(position)` plano: GSC ya entrega su `position` ponderada dentro del
 * período, así que promediar filas planas le daría el mismo peso a una de 2 impresiones
 * que a una de 500. El error se ve razonable en pantalla, que es lo que lo hace peligroso.
 *
 * ⚠️ `capture_date` es DATE: la ventana se recorta con intervalos explícitos, nunca con
 * `EXTRACT(EPOCH FROM (date - date))`, que revienta en runtime (invariante SQL date-math).
 */
const readGscDailyFromPostgres = async (input: {
  organizationId: string
  mode: SeoPerformanceMode
  items: string[]
  anchor: string
  rangeDays: number
}): Promise<GscDailyRow[]> => {
  const column = GSC_COLUMN_BY_MODE[input.mode]

  return runGreenhousePostgresQuery<GscDailyRow>(
    `SELECT ${column} AS item,
            capture_date::text AS date,
            COALESCE(SUM(clicks), 0)::int AS clicks,
            COALESCE(SUM(impressions), 0)::bigint AS impressions,
            CASE WHEN COALESCE(SUM(impressions), 0) > 0
                 THEN SUM(position * impressions) / SUM(impressions)
                 ELSE NULL
            END AS weighted_position
       FROM greenhouse_growth.seo_gsc_daily
      WHERE organization_id = $1
        AND ${column} = ANY($2)
        AND capture_date > $3::date - ($4::int * INTERVAL '1 day')
        AND capture_date <= $3::date
      GROUP BY ${column}, capture_date
      ORDER BY ${column}, capture_date`,
    [input.organizationId, input.items, input.anchor, input.rangeDays]
  )
}

/**
 * La MISMA agregación contra el histórico BQ (`seo_gsc_history`, TASK-1655) — mismos
 * alias, misma ponderación por impresiones, mismo shape de fila: los dos stores tienen
 * que producir el mismo número para el mismo día o el split sería una mentira de dato.
 */
const readGscDailyFromBigQuery = async (input: {
  organizationId: string
  mode: SeoPerformanceMode
  items: string[]
  anchor: string
  rangeDays: number
}): Promise<GscDailyRow[]> => {
  const column = GSC_COLUMN_BY_MODE[input.mode]
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `SELECT ${column} AS item,
                   CAST(capture_date AS STRING) AS date,
                   SUM(clicks) AS clicks,
                   SUM(impressions) AS impressions,
                   CASE WHEN SUM(impressions) > 0
                        THEN SUM(CAST(position AS FLOAT64) * impressions) / SUM(impressions)
                        ELSE NULL
                   END AS weighted_position
              FROM \`${projectId}.${SEO_GSC_HISTORY_DATASET}.${SEO_GSC_HISTORY_TABLE}\`
             WHERE organization_id = @organization_id
               AND ${column} IN UNNEST(@items)
               AND capture_date > DATE_SUB(CAST(@anchor AS DATE), INTERVAL @range_days DAY)
               AND capture_date <= CAST(@anchor AS DATE)
             GROUP BY ${column}, capture_date
             ORDER BY ${column}, capture_date`,
    params: {
      organization_id: input.organizationId,
      items: input.items,
      anchor: input.anchor,
      range_days: input.rangeDays
    },
    types: { organization_id: 'STRING', items: ['STRING'], anchor: 'STRING', range_days: 'INT64' }
  })

  return (rows as Array<Record<string, unknown>>).map(row => ({
    item: String(row.item),
    date: String(row.date),
    clicks: typeof row.clicks === 'number' ? row.clicks : Number(row.clicks ?? 0),
    impressions: typeof row.impressions === 'number' ? row.impressions : Number(row.impressions ?? 0),
    weighted_position:
      row.weighted_position === null || row.weighted_position === undefined ? null : Number(row.weighted_position)
  }))
}

/**
 * Split OLTP/OLAP por COBERTURA, no por rango fijo (TASK-1655, patrón de
 * `readRankEvolution` adaptado): PG es la ventana caliente operativa y BQ el SoT del
 * histórico. Se decide por lo que PG realmente TIENE — si su primer día llega después
 * del inicio de la ventana pedida y BQ cubre más atrás, la lectura completa va a BQ.
 * Un corte por número fijo de días mentiría en las dos direcciones (PG recién nacido
 * con 5 días, o BQ vacío pre-backfill).
 */
const readGscDaily = async (input: {
  organizationId: string
  mode: SeoPerformanceMode
  items: string[]
  anchor: string
  rangeDays: number
  /** Primer día materializado en PG para la org (`null` = PG vacío). */
  pgMinDate: string | null
}): Promise<GscDailyRow[]> => {
  const windowStart = shiftIsoDate(input.anchor, -(input.rangeDays - 1))

  const pgCoversWindow = input.pgMinDate !== null && input.pgMinDate <= windowStart

  if (pgCoversWindow) {
    return readGscDailyFromPostgres(input)
  }

  // PG no llega al inicio de la ventana: intentar el histórico. Si BQ tampoco tiene
  // (pre-backfill), caer a PG — servir lo que hay es el comportamiento honesto previo.
  try {
    const bqRows = await readGscDailyFromBigQuery(input)

    if (bqRows.length > 0) {
      return bqRows
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_performance_reader_bq_fallback' },
      extra: { organizationId: input.organizationId, mode: input.mode, rangeDays: input.rangeDays }
    })
  }

  return readGscDailyFromPostgres(input)
}

/** Serie de un ítem, ya ordenada, agrupada desde las filas planas. */
type DailyByItem = Map<string, Array<{ date: string; clicks: number; impressions: number; position: number | null }>>

const groupGscRows = (rows: GscDailyRow[]): DailyByItem => {
  const byItem: DailyByItem = new Map()

  for (const row of rows) {
    const impressions = toNumber(row.impressions)

    // ⚠️ Un día con 0 impresiones para un query/page NO es una medición de cero: Search
    // Console sencillamente no emite fila cuando el ítem no apareció. Si llega una, es un
    // artefacto — y dejarla pintaría un punto plano en 0 donde la verdad es un HUECO.
    // Distinto del agregado de la organización (`read-overview-kpis`), donde 0 clics en el
    // día sí es un hecho medible del sitio completo.
    if (impressions <= 0) {
      continue
    }

    const bucket = byItem.get(row.item) ?? []

    bucket.push({
      date: row.date,
      clicks: toNumber(row.clicks),
      impressions,
      position: toNullableNumber(row.weighted_position)
    })
    byItem.set(row.item, bucket)
  }

  return byItem
}

const buildStanding = (
  item: string,
  positionPoints: SeoPerformancePoint[],
  volume: { clicks: number; impressions: number }
): SeoPerformanceStanding => {
  const measured = positionPoints
    .filter((point): point is { date: string; value: number } => point.value !== null)
    .map(point => ({ date: point.date, value: point.value }))

  const latest = measured.length > 0 ? measured[measured.length - 1] : null
  const reference = resolveDeltaReference(measured, DELTA_LOOKBACK_DAYS)

  return {
    item,
    position: latest?.value ?? null,
    // `actual − referencia`: negativo = la posición bajó de número = MEJORÓ.
    positionDelta30d: latest && reference ? latest.value - reference.value : null,
    clicks: volume.clicks,
    impressions: volume.impressions,
    // Sin impresiones no hay CTR que reportar: `null` (→ "Pendiente"), NUNCA 0%. Un 0% dice
    // "apareciste y nadie hizo clic"; la verdad es "no apareciste".
    ctr: volume.impressions > 0 ? volume.clicks / volume.impressions : null,
    trend: positionPoints.map(point => point.value)
  }
}

/**
 * Agregado diario del CONJUNTO desde las filas por-ítem ya leídas (sin query extra).
 *
 * ⚠️ La posición del conjunto se pondera POR IMPRESIONES, igual que en el resto del módulo:
 * `Σ(posición×impresiones)/Σ(impresiones)`. Un promedio plano de las posiciones de los
 * ítems le daría el mismo peso a uno con 2 impresiones que a uno con 500, y el número
 * resultante "se ve razonable" — que es justo lo que lo hace peligroso.
 */
const buildDailyTotals = (dailyByItem: DailyByItem): SeoPerformanceDailyTotal[] => {
  const byDate = new Map<string, { clicks: number; impressions: number; weighted: number }>()

  for (const days of dailyByItem.values()) {
    for (const day of days) {
      const bucket = byDate.get(day.date) ?? { clicks: 0, impressions: 0, weighted: 0 }

      bucket.clicks += day.clicks
      bucket.impressions += day.impressions
      bucket.weighted += (day.position ?? 0) * day.impressions
      byDate.set(day.date, bucket)
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      clicks: bucket.clicks,
      impressions: bucket.impressions,
      // Sin impresiones no hay posición ni CTR que reportar: `null` (→ "Pendiente"), no 0.
      position: bucket.impressions > 0 ? bucket.weighted / bucket.impressions : null,
      ctr: bucket.impressions > 0 ? bucket.clicks / bucket.impressions : null
    }))
}

const totalsFromDaily = (days: SeoPerformanceDailyTotal[]): SeoPerformanceTotals => {
  const clicks = days.reduce((total, day) => total + day.clicks, 0)
  const impressions = days.reduce((total, day) => total + day.impressions, 0)
  const weighted = days.reduce((total, day) => total + (day.position ?? 0) * day.impressions, 0)

  return {
    clicks,
    impressions,
    position: impressions > 0 ? weighted / impressions : null,
    ctr: impressions > 0 ? clicks / impressions : null
  }
}

const markSparse = (points: SeoPerformancePoint[], rangeDays: number): boolean =>
  points.filter(point => point.value !== null).length < Math.ceil(rangeDays * SPARSE_COVERAGE_RATIO)

export const readSeoPerformance = async (
  organizationId: string,
  options: ReadSeoPerformanceOptions
): Promise<SeoPerformanceResult> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const mode: SeoPerformanceMode = options.mode ?? 'keyword'
  const metric: SeoPerformanceMetric = options.metric ?? 'position'
  const device: SeoRankDevice = options.device ?? 'desktop'
  const rangeDays = Math.min(MAX_RANGE_DAYS, Math.max(MIN_RANGE_DAYS, Math.floor(options.rangeDays ?? DEFAULT_RANGE_DAYS)))

  const items = [...new Set(options.items.map(item => item.trim()).filter(Boolean))].slice(0, MAX_ITEMS)

  if (items.length === 0) {
    // "Todavía no elegiste nada" es un estado legítimo del flujo, no una falla: la UI abre
    // en él y pide elegir. Devolver `no_data` lo confundiría con "elegiste y no hay".
    return { ok: false, errorCode: 'no_items', status: null }
  }

  const source = resolveSeoPerformanceSource(mode, metric)

  try {
    // Ancla en el último día MATERIALIZADO, no en CURRENT_DATE: la captura corre con lag,
    // así que anclar en "hoy" terminaría la ventana en días vacíos y haría ver una caída
    // de tráfico que no ocurrió.
    const anchorRows = await runGreenhousePostgresQuery<{ anchor: string | null; pg_min: string | null }>(
      `SELECT MAX(capture_date)::text AS anchor,
              MIN(capture_date)::text AS pg_min
         FROM greenhouse_growth.seo_gsc_daily
        WHERE organization_id = $1`,
      [organizationId]
    )

    const anchor = anchorRows[0]?.anchor ?? null
    const pgMinDate = anchorRows[0]?.pg_min ?? null

    // Sin ningún día materializado no hay verdad medida que servir. `not_connected` lleva
    // al operador a la acción correcta (conectar / esperar la captura), a diferencia de un
    // `no_data` que sugeriría que el set elegido es el problema.
    if (!anchor) {
      return { ok: false, errorCode: 'not_connected', status: null }
    }

    const seoTargetId =
      source === 'dataforseo_estimated'
        ? // ISSUE-153: resolución canónica, NUNCA `LIMIT 1` inline. Con más de un mercado
          // activo y sin selector, esta lectura no adivina el país: degrada a null y los
          // ítems de rank salen por `itemsWithoutData` (la parte medida GSC no depende de esto).
          (await resolveUnambiguousSeoTarget(organizationId)).target?.seoTargetId ?? null
        : null

    // El volumen (clics/impresiones/CTR) SIEMPRE sale de Search Console: la tabla y la
    // banda de KPI lo muestran en las dos modalidades, porque los snapshots de rank no lo
    // tienen. La ventana previa es del mismo largo, inmediatamente anterior — es lo que
    // permite un delta real en vez de una card sin comparación.
    const [gscRows, previousRows, rankEvolution] = await Promise.all([
      readGscDaily({ organizationId, mode, items, anchor, rangeDays, pgMinDate }),
      readGscDaily({ organizationId, mode, items, anchor: shiftIsoDate(anchor, -rangeDays), rangeDays, pgMinDate }),
      source === 'dataforseo_estimated' && seoTargetId
        ? readRankEvolution(seoTargetId, { keywords: items, rangeDays, device, engine: options.engine })
        : null
    ])

    const dailyByItem = groupGscRows(gscRows)
    const dailyTotals = buildDailyTotals(dailyByItem)
    const previousTotals = totalsFromDaily(buildDailyTotals(groupGscRows(previousRows)))

    /**
     * ⚠️ Fallback entre fuentes (regla del operador 2026-08-07: "si no vienen de uno,
     * vienen del otro"). GSC TAMBIÉN mide posición por keyword (promedio ponderado), así
     * que cuando la serie exacta de DataForSEO es más JOVEN que la medida — el caso real
     * hoy: rank capture arrancó ayer, GSC tiene días/meses — servir la serie corta sería
     * esconder historia que el módulo sí tiene. Se sirve GSC (●) y se DECLARA en `source`.
     *
     * La regla del contrato §5 se mantiene intacta: la lectura completa pertenece a UNA
     * fuente; acá se ELIGE la más profunda, jamás se mezclan ni promedian.
     */
    const rankMeasuredDates = new Set<string>()

    if (rankEvolution?.ok) {
      for (const serie of rankEvolution.series) {
        for (const point of serie.points) {
          if (point.position !== null) {
            rankMeasuredDates.add(point.date)
          }
        }
      }
    }

    const gscMeasuredDates = new Set<string>()

    for (const days of dailyByItem.values()) {
      for (const day of days) {
        gscMeasuredDates.add(day.date)
      }
    }

    const useRankSeries =
      source === 'dataforseo_estimated' &&
      rankEvolution?.ok === true &&
      rankMeasuredDates.size > 0 &&
      // La serie exacta gana cuando cubre al menos la mitad de lo que cubre la medida;
      // más joven que eso, la película la cuenta mejor GSC.
      rankMeasuredDates.size * 2 >= gscMeasuredDates.size

    const effectiveSource: SeoPerformanceSource =
      source === 'dataforseo_estimated' && !useRankSeries ? 'gsc_measured' : source

    const summary: SeoPerformanceSummary = {
      current: totalsFromDaily(dailyTotals),
      // Una ventana previa sin volumen NO es "cero tráfico": es "no hay con qué comparar".
      previous: previousTotals.impressions > 0 || previousTotals.clicks > 0 ? previousTotals : null,
      series: dailyTotals
    }

    // La serie del CHART: puntos de la métrica pedida, en la fuente que le corresponde.
    const series: SeoPerformanceSeries[] = []
    // La serie de POSICIÓN por ítem, que alimenta la columna Pos. actual, el Δ30d y el
    // sparkline — independiente de qué métrica esté graficando el chart.
    const positionByItem = new Map<string, SeoPerformancePoint[]>()

    // La posición por ítem sigue a la fuente EFECTIVA: si el chart cae a GSC por el
    // fallback, la tabla y el Δ30d también — chart y tabla jamás cuentan fuentes distintas.
    if (useRankSeries && rankEvolution?.ok) {
      for (const serie of rankEvolution.series) {
        positionByItem.set(
          serie.keyword,
          serie.points.map(point => ({
            date: point.date,
            value: point.position,
            // AIO sólo viaja en la serie ◑ (DataForSEO): es un hecho del SERP capturado.
            // La serie ● (GSC) no lo trae — Search Console no reporta features del SERP.
            ...(point.aiOverview ? { aiOverview: true } : {})
          }))
        )
      }
    }

    for (const item of items) {
      const daily = dailyByItem.get(item) ?? []

      if (effectiveSource === 'gsc_measured') {
        const points: SeoPerformancePoint[] = daily.map(day => ({
          date: day.date,
          value:
            metric === 'position'
              ? day.position
              : metric === 'clicks'
                ? day.clicks
                : metric === 'impressions'
                  ? day.impressions
                  : // CTR diario: la razón del día. `null` sin impresiones (≠ 0%).
                    day.impressions > 0
                    ? day.clicks / day.impressions
                    : null
        }))

        if (points.length > 0) {
          series.push({ item, points, sparse: markSparse(points, rangeDays) })
        }

        // En modo URL la posición del standing también es la medida de GSC: DataForSEO no
        // tiene concepto de "posición de una página".
        if (!positionByItem.has(item)) {
          positionByItem.set(
            item,
            daily.map(day => ({ date: day.date, value: day.position }))
          )
        }
      } else {
        const points = positionByItem.get(item) ?? []

        if (points.length > 0) {
          series.push({ item, points, sparse: markSparse(points, rangeDays) })
        }
      }
    }

    const standings = items
      .map(item => {
        const daily = dailyByItem.get(item) ?? []

        return buildStanding(item, positionByItem.get(item) ?? [], {
          clicks: daily.reduce((total, day) => total + day.clicks, 0),
          impressions: daily.reduce((total, day) => total + day.impressions, 0)
        })
      })
      // Sin ninguna señal (ni posición ni volumen) la fila no aporta: el ítem se reporta en
      // `itemsWithoutData` en vez de ocupar una fila de ceros que parecería una medición.
      .filter(standing => standing.position !== null || standing.impressions > 0 || standing.clicks > 0)

    const withData = new Set(series.map(serie => serie.item))

    for (const standing of standings) {
      withData.add(standing.item)
    }

    const itemsWithoutData = items.filter(item => !withData.has(item))

    if (series.length === 0 && standings.length === 0) {
      return { ok: false, errorCode: 'no_data', status: null }
    }

    // El rango se reporta desde la fuente que alimenta el chart: decir "90 días de GSC"
    // cuando el chart pinta la serie de rank sería describir otra ventana.
    const range =
      useRankSeries && rankEvolution?.ok
        ? rankEvolution.range
        : { from: shiftIsoDate(anchor, -(rangeDays - 1)), to: anchor, days: rangeDays }

    return {
      ok: true,
      organizationId,
      seoTargetId,
      mode,
      metric,
      device,
      range,
      source: effectiveSource,
      series,
      standings,
      summary,
      itemsWithoutData
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_performance_reader' },
      extra: { organizationId, mode, metric, rangeDays, itemCount: items.length }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}
