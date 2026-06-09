import { axisChartCategorical } from '@core/theme/axis-chart'

import type { CscPhase } from '@/lib/ico-engine/metric-registry'

/**
 * Chart colors per CSC phase — UI concern for ICO donut/trend visualizations.
 *
 * Lives in the UI layer (NOT `metric-registry`, which is domain code bundled into
 * the headless ico-batch worker). The worker's Docker build excludes `src/@core`
 * (the Vuexy/AXIS theme layer) by design; importing `@core/theme/axis-chart` into
 * worker-bundled domain code makes the bundle fail (TASK-1048 / ICO batch incident
 * 2026-06-08). The CSC color map is a presentation concern consumed only by UI
 * views, so it belongs here — `metric-registry` keeps the phase definition + labels
 * (pure domain, no `@core`).
 *
 * TASK-1053: subset of the canonical categorical chart palette (axis-chart
 * "Deep-bright"). NOT UI semantic colors; replaced the legacy hexes
 * (#7367F0/#00BAD1/#bb1954).
 */
export const CSC_CHART_COLORS: Record<CscPhase, string> = {
  briefing: axisChartCategorical[0],
  produccion: axisChartCategorical[1],
  revision_interna: axisChartCategorical[2],
  cambios_cliente: axisChartCategorical[3],
  entrega: axisChartCategorical[4]
}
