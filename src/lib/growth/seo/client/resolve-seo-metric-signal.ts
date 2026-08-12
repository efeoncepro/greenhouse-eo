import { GH_GROWTH_SEO_CLIENT } from '@/lib/copy/growth'

export type SeoMetricTone = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'

/**
 * TASK-1310 — un solo lugar decide el veredicto de la lectura ejecutiva.
 *
 * El dashboard y el informe web renderizan el MISMO modelo, pero cada uno derivaba
 * su propio título: el informe anunciaba "Aún no hay una posición media para leer"
 * con la posición impresa al lado, en el bloque más visible del entregable. El
 * veredicto se deriva acá para que ningún render vuelva a contradecir a su métrica.
 */
export const resolveSeoLeadTitle = (positionAverage: number | null): string =>
  positionAverage === null
    ? GH_GROWTH_SEO_CLIENT.summary.leadTitle
    : GH_GROWTH_SEO_CLIENT.summary.titleWithPosition(positionAverage.toFixed(1))

export const resolvePositionTone = (position: number | null): SeoMetricTone => {
  if (position === null) return 'default'
  if (position <= 10) return 'success'
  if (position <= 20) return 'warning'

  return 'error'
}

export const resolveCoverageTone = (shown: number, total: number): SeoMetricTone => {
  if (total <= 0) return 'default'
  if (shown / total >= 0.6) return 'success'
  if (shown / total >= 0.3) return 'warning'

  return 'error'
}

export const resolveOpportunityTone = (count: number | null): SeoMetricTone => {
  if (count === null) return 'default'

  return count > 0 ? 'warning' : 'success'
}
