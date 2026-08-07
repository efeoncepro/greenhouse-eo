'use client'

import Grid from '@mui/material/Grid'

import { MetricTrendCard } from '@/components/greenhouse/primitives'
import type { MetricTrendPoint } from '@/components/greenhouse/primitives/MetricTrendCard'
import { GH_GROWTH_SEO_PERFORMANCE } from '@/lib/copy/growth'
import type { SeoPerformanceDailyTotal, SeoPerformanceSummary, SeoPerformanceTotals } from '@/lib/growth/seo/contracts'

/**
 * TASK-1307 — la banda superior del concepto visual aprobado ("Evidencia narrativa"): el
 * titular del conjunto, legible de un vistazo antes de bajar al gráfico.
 *
 * Mismo primitive y mismo tier que los KPIs norte del cockpit (TASK-1306): `MetricTrendCard`
 * con sparkline por KPI, contador animado y densidad adaptable. Lo que cambia es el ALCANCE
 * — allá es el sitio completo, acá es el conjunto elegido — y por eso la card se alimenta
 * del `summary` del reader, que agrega los MISMOS ítems que están en el chart y en la tabla.
 *
 * ⚠️ El de posición es el único con `deltaSemantics='lower-is-better'`: pasar de 8 a 3 es
 * mejorar, así que el −5 se pinta verde con flecha abajo y el lector de pantalla oye
 * "mejora". El signo y la flecha siguen al número real; lo que cambia es el juicio.
 *
 * ⚠️ El delta compara contra la VENTANA ANTERIOR del mismo largo, no contra los dos últimos
 * puntos de la serie: el hero value es el agregado del período, así que el delta derivado
 * mentiría (mostraría la caída de un día como si fuera la del período). Sin ventana previa
 * con datos, `deltaOverride={null}` suprime el delta en vez de inventar un +100%.
 */

export interface SeoPerformanceKpiBandProps {
  summary: SeoPerformanceSummary
  periodLabel: string
}

/**
 * Techo de puntos del sparkline. `MetricTrendCard` dibuja un marcador por punto real —
 * su cadencia de diseño es mensual (~12 puntos). Alimentarlo con 180 puntos diarios
 * produce una nube de marcadores ilegible (defecto detectado por el operador con la
 * serie de 16 meses): un sparkline comunica FORMA, y la forma sobrevive a la agregación.
 */
const MAX_SPARKLINE_POINTS = 26

/**
 * Agrega la serie diaria en buckets del tamaño necesario para no exceder el techo
 * (180d → semanal, 90d → ~4 días, 28d → ~2 días). Las reglas de agregación son las del
 * módulo, no promedios ingenuos: clics/impresiones se SUMAN; la posición se pondera POR
 * IMPRESIONES dentro del bucket; el CTR es la razón del bucket. Un bucket sin
 * impresiones da `null` (hueco), nunca 0.
 */
const toBucketedTrendSeries = (
  points: SeoPerformanceDailyTotal[],
  pick: (bucket: { clicks: number; impressions: number; position: number | null; ctr: number | null }) => number | null
): MetricTrendPoint[] => {
  if (points.length === 0) return []

  const bucketSize = Math.max(1, Math.ceil(points.length / MAX_SPARKLINE_POINTS))
  const buckets: MetricTrendPoint[] = []

  for (let index = 0; index < points.length; index += bucketSize) {
    const slice = points.slice(index, index + bucketSize)
    const clicks = slice.reduce((total, day) => total + day.clicks, 0)
    const impressions = slice.reduce((total, day) => total + day.impressions, 0)
    const weighted = slice.reduce((total, day) => total + (day.position ?? 0) * day.impressions, 0)

    buckets.push({
      // El label es el inicio del bucket (`MM-DD`): no hay ancho para más.
      label: slice[0].date.slice(5),
      value: pick({
        clicks,
        impressions,
        position: impressions > 0 ? weighted / impressions : null,
        ctr: impressions > 0 ? clicks / impressions : null
      })
    })
  }

  return buckets
}

const SeoPerformanceKpiBand = ({ summary, periodLabel: rawPeriodLabel }: SeoPerformanceKpiBandProps) => {
  const copy = GH_GROWTH_SEO_PERFORMANCE
  const { current, previous, series } = summary

  // El período de comparación del delta se DECLARA (regla dura de dataviz: un delta sin
  // "contra qué" no es información). Sin ventana previa no hay delta, y no se promete.
  const periodLabel = previous ? `${rawPeriodLabel} · ${copy.kpis.comparison}` : rawPeriodLabel

  const deltaOf = (pick: (totals: SeoPerformanceTotals) => number | null): number | null => {
    if (!previous) {
      return null
    }

    const now = pick(current)
    const before = pick(previous)

    return now === null || before === null ? null : now - before
  }

  /**
   * Delta PORCENTUAL para las métricas de volumen. Un absoluto grande ("−12.779") no
   * comunica magnitud sin hacer la división de cabeza; "−32%" sí (hallazgo del operador —
   * y la anatomía canónica de KPI card: comparación como % + flecha + período). La
   * posición y el CTR conservan su delta absoluto: son números chicos donde el absoluto
   * ES la lectura (−0.4 posiciones, +0.2 puntos).
   */
  const deltaPercentOf = (pick: (totals: SeoPerformanceTotals) => number | null): number | null => {
    if (!previous) return null

    const now = pick(current)
    const before = pick(previous)

    if (now === null || before === null || before === 0) return null

    return ((now - before) / before) * 100
  }

  return (
    <Grid container spacing={6} data-capture='seo-performance-kpis'>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <MetricTrendCard
          title={copy.table.colPosition}
          periodLabel={periodLabel}
          // `null` (no `0`) sin impresiones: la posición 0 no existe.
          value={current.position}
          deltaOverride={deltaOf(totals => totals.position)}
          format='decimal'
          series={toBucketedTrendSeries(series, bucket => bucket.position)}
          // El eje semántico invertido de esta pantalla: bajar de posición ES mejorar —
          // y el sparkline TAMBIÉN se invierte (`invertY`) para que "arriba = mejor" sea
          // una sola lectura en toda la pantalla, igual que el chart hero de abajo.
          deltaSemantics='lower-is-better'
          invertY
          tone='success'
          density='auto'
          dataCapture='seo-performance-kpi-position'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <MetricTrendCard
          title={copy.metric.clicks}
          periodLabel={periodLabel}
          value={current.clicks}
          deltaOverride={deltaPercentOf(totals => totals.clicks)}
          deltaUnit='%'
          format='integer'
          series={toBucketedTrendSeries(series, bucket => bucket.clicks)}
          tone='success'
          density='auto'
          dataCapture='seo-performance-kpi-clicks'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <MetricTrendCard
          title={copy.metric.impressions}
          periodLabel={periodLabel}
          value={current.impressions}
          deltaOverride={deltaPercentOf(totals => totals.impressions)}
          deltaUnit='%'
          format='integer'
          series={toBucketedTrendSeries(series, bucket => bucket.impressions)}
          tone='success'
          density='auto'
          dataCapture='seo-performance-kpi-impressions'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <MetricTrendCard
          title={copy.metric.ctr}
          periodLabel={periodLabel}
          value={current.ctr === null ? null : current.ctr * 100}
          deltaOverride={deltaOf(totals => (totals.ctr === null ? null : totals.ctr * 100))}
          format='percentage'
          series={toBucketedTrendSeries(series, bucket => (bucket.ctr === null ? null : bucket.ctr * 100))}
          tone='success'
          density='auto'
          dataCapture='seo-performance-kpi-ctr'
        />
      </Grid>
    </Grid>
  )
}

export default SeoPerformanceKpiBand
