'use client'

import Grid from '@mui/material/Grid'

import { MetricTrendCard } from '@/components/greenhouse/primitives'
import type { MetricTrendPoint } from '@/components/greenhouse/primitives/MetricTrendCard'
import { GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'
import type { SeoOverviewKpis, SeoOverviewSeriesPoint } from '@/lib/growth/seo/overview/read-overview-kpis'

/**
 * TASK-1306 — los 4 KPIs norte del cockpit (región 2 del wireframe).
 *
 * Los 4 salen de datos MEDIDOS (Search Console). El de posición es el único con
 * `deltaSemantics='lower-is-better'`: pasar de 8 a 3 es mejorar, así que el −5 se pinta
 * verde con flecha abajo y el lector de pantalla oye "mejora". El resto usa la semántica
 * normal (más clics es mejor).
 *
 * Sin ventana previa comparable, `MetricTrendCard` no dibuja delta (deriva el suyo de la
 * serie): es lo correcto — un delta contra una ventana vacía sería un +100% inventado.
 */

interface Props {
  kpis: SeoOverviewKpis
  periodLabel: string
}

/** La serie del sparkline usa el día como label corto (el eje real vive en el chart grande). */
const toTrendSeries = (
  points: SeoOverviewSeriesPoint[],
  pick: (point: SeoOverviewSeriesPoint) => number | null
): MetricTrendPoint[] =>
  points.map(point => ({
    // `2026-08-04` → `08-04`: el sparkline no tiene espacio para la fecha completa.
    label: point.date.slice(5),
    value: pick(point)
  }))

const SeoKpiRow = ({ kpis, periodLabel }: Props) => {
  const { current, previous, series } = kpis

  // Delta contra la VENTANA ANTERIOR del mismo largo, no contra el día previo: el hero
  // value es el agregado del período, así que compararlo con dos días sueltos sugeriría
  // una caída del período que no ocurrió.
  // `null` (no `undefined`) cuando no hay ventana previa → la card no dibuja delta.
  const deltaOf = (pick: (totals: typeof current) => number | null): number | null => {
    if (!previous) {
      return null
    }

    const now = pick(current)
    const before = pick(previous)

    return now === null || before === null ? null : now - before
  }

  const ctrSeries = toTrendSeries(series, point =>
    point.impressions > 0 ? (point.clicks / point.impressions) * 100 : null
  )

  return (
    <Grid container spacing={6} data-capture='seo-overview-kpis'>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <MetricTrendCard
          title={GH_GROWTH_SEO_OVERVIEW.kpis.clicks.title}
          periodLabel={periodLabel}
          value={current.clicks}
          deltaOverride={deltaOf(totals => totals.clicks)}
          format='integer'
          series={toTrendSeries(series, point => point.clicks)}
          tone='success'
          density='auto'
          dataCapture='seo-overview-kpi-clicks'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <MetricTrendCard
          title={GH_GROWTH_SEO_OVERVIEW.kpis.impressions.title}
          periodLabel={periodLabel}
          value={current.impressions}
          deltaOverride={deltaOf(totals => totals.impressions)}
          format='integer'
          series={toTrendSeries(series, point => point.impressions)}
          tone='success'
          density='auto'
          dataCapture='seo-overview-kpi-impressions'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <MetricTrendCard
          title={GH_GROWTH_SEO_OVERVIEW.kpis.position.title}
          // SIN `metricName`: es el "nombre largo al lado del título", no un lugar para
          // una explicación — la frase completa desbordaba la card ("Posición promedio p…").
          // La inversión se explica en el subtítulo del chart y en el aria del delta.
          periodLabel={periodLabel}
          // `null` (no `0`) cuando no hubo impresiones: "posición 0" no existe.
          value={current.position}
          deltaOverride={deltaOf(totals => totals.position)}
          format='decimal'
          series={toTrendSeries(series, point => point.position)}
          // El eje semántico invertido de esta task: bajar de posición ES mejorar.
          deltaSemantics='lower-is-better'
          tone='success'
          density='auto'
          dataCapture='seo-overview-kpi-position'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <MetricTrendCard
          title={GH_GROWTH_SEO_OVERVIEW.kpis.ctr.title}
          periodLabel={periodLabel}
          value={current.ctr === null ? null : current.ctr * 100}
          deltaOverride={deltaOf(totals => (totals.ctr === null ? null : totals.ctr * 100))}
          format='percentage'
          series={ctrSeries}
          tone='success'
          density='auto'
          dataCapture='seo-overview-kpi-ctr'
        />
      </Grid>
    </Grid>
  )
}

export default SeoKpiRow
