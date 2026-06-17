// TASK-1115 — Adaptive Card / content density contract. Capacidad COMPARTIDA (no un componente card nuevo):
// los card primitives existentes (MetricSummaryCard / GreenhouseChartCard / MetricTrendCard) la adoptan.
export {
  CARD_DENSITY_BREAKPOINTS,
  compareCardDensity,
  isCardDensity,
  isCardDensityAtLeast,
  resolveCardDensity,
  resolveCardDensityRequest
} from './card-density'
export type { CardDensity, CardDensityRequest } from './card-density'
export { useContainerDensity } from './useContainerDensity'
export type { UseContainerDensityResult } from './useContainerDensity'
