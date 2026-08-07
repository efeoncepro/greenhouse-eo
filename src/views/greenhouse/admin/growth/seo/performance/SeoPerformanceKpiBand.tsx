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

/** El sparkline usa `MM-DD`: no hay ancho para la fecha completa (el eje real está en el chart). */
const toTrendSeries = (
  points: SeoPerformanceDailyTotal[],
  pick: (point: SeoPerformanceDailyTotal) => number | null
): MetricTrendPoint[] => points.map(point => ({ label: point.date.slice(5), value: pick(point) }))

const SeoPerformanceKpiBand = ({ summary, periodLabel }: SeoPerformanceKpiBandProps) => {
  const copy = GH_GROWTH_SEO_PERFORMANCE
  const { current, previous, series } = summary

  const deltaOf = (pick: (totals: SeoPerformanceTotals) => number | null): number | null => {
    if (!previous) {
      return null
    }

    const now = pick(current)
    const before = pick(previous)

    return now === null || before === null ? null : now - before
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
          series={toTrendSeries(series, point => point.position)}
          // El eje semántico invertido de esta pantalla: bajar de posición ES mejorar.
          deltaSemantics='lower-is-better'
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
          deltaOverride={deltaOf(totals => totals.clicks)}
          format='integer'
          series={toTrendSeries(series, point => point.clicks)}
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
          deltaOverride={deltaOf(totals => totals.impressions)}
          format='integer'
          series={toTrendSeries(series, point => point.impressions)}
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
          series={toTrendSeries(series, point => (point.ctr === null ? null : point.ctr * 100))}
          tone='success'
          density='auto'
          dataCapture='seo-performance-kpi-ctr'
        />
      </Grid>
    </Grid>
  )
}

export default SeoPerformanceKpiBand
