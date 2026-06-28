import type { Metadata } from 'next'

import { SAMPLE_CLIENT_REPORT } from '@/components/growth/ai-visibility/report-artifact/fixtures'
import { modelFromClientReport, type ReportArtifactModel } from '@/components/growth/ai-visibility/report-artifact/model'
import type { TrendDirection } from '@/lib/growth/ai-visibility/report/contracts'
import AiVisibilityClientReportView from '@/views/greenhouse/growth/ai-visibility/client/AiVisibilityClientReportView'

// TASK-1248 — AI Visibility client report (Split Workbench) GVC harness.
// Mockup route — excluido de route-reachability; alimenta el workbench con el fixture canónico
// (`SAMPLE_CLIENT_REPORT` → `modelFromClientReport`) sin depender de data por-org (la ruta real
// /growth/ai-visibility/report es client-scoped y muestra empty sin un grader run).
//
// El fixture canónico nace en `sin_historico` (primera medición). Para PREVISUALIZAR cómo se ve la
// tendencia dibujada, este harness enriquece SOLO la vista mock con un trend `con_tendencia`
// run-over-run (anterior → actual). Sigue siendo V1-honest: 2 puntos reales (no una serie fabricada
// de N semanas). La ruta productiva usa el trend honesto del reader, sin este override.

const base = modelFromClientReport(SAMPLE_CLIENT_REPORT)

const directionOf = (delta: number | null): TrendDirection =>
  delta === null ? 'sin_dato' : delta > 0 ? 'subio' : delta < 0 ? 'bajo' : 'sin_cambio'

// Deltas ilustrativos por dimensión (mockup): la mayoría sube, algunas bajan, sin_dato se mantiene null.
const MOCK_DELTAS: Record<string, number> = {
  ai_visibility: 6,
  entity_clarity: 4,
  category_ownership: -3,
  competitive_sov: 5,
  citation_quality: 8,
  revenue_intent_coverage: 2
}

const dimensionTrends = base.dimensions.map(dim => {
  const current = dim.score
  const delta = current === null ? null : (MOCK_DELTAS[dim.key] ?? 3)
  const previous = current === null || delta === null ? null : Math.max(0, Math.min(100, current - delta))

  return { key: dim.key, current, previous, delta, direction: directionOf(delta) }
})

const overallCurrent = base.overallScore
const overallPrevious = overallCurrent === null ? null : Math.max(0, overallCurrent - 5)
const overallDelta = overallCurrent === null || overallPrevious === null ? null : overallCurrent - overallPrevious

const model: ReportArtifactModel = {
  ...base,
  trend: {
    status: 'con_tendencia',
    reason: 'Comparado con la medición anterior (mock).',
    previousAsOf: '2026-05-24',
    overall: { current: overallCurrent, previous: overallPrevious, delta: overallDelta, direction: directionOf(overallDelta) },
    dimensions: dimensionTrends
  }
}

export const metadata: Metadata = {
  title: 'Visibilidad en IA — mockup'
}

const Page = () => (
  <AiVisibilityClientReportView model={model} organizationName='Efeonce (mock)' asOfLabel='2026-06-24' />
)

export default Page
