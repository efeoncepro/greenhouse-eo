/**
 * TASK-1848 — construcción pura de `InsightWebModelV1` desde el plan congelado y los hechos del
 * snapshot sellado (sin DB, sin `server-only`: se prueba sin mocks). Las cifras salen de
 * `formatFactValue`, la MISMA función que validó el plan: el web model no inventa formato.
 */

import { funnelGeometry } from '@/lib/artifact-composer/pure'

import type { ChartSpecV1 } from '../contracts/chart-spec'
import type { EvidenceFactV1 } from '../contracts/evidence'
import type { EditorialPlanV1, PlanFigureReadingV1 } from '../contracts/plan'
import {
  INSIGHT_WEB_MODEL_VERSION,
  type InsightWebChartDerivedV1,
  type InsightWebChartV1,
  type InsightWebClaimV1,
  type InsightWebFactV1,
  type InsightWebModelV1,
  type InsightWebReadingV1
} from '../contracts/web-model'
import { formatFactValue } from '../editorial/format'
import { asOfLabelOf, sourceLabelOf, unitLabelOf } from '../presentation/vocabulary'

const projectFact = (fact: EvidenceFactV1, locale: string): InsightWebFactV1 => ({
  factId: fact.factId,
  module: fact.module,
  label: fact.label,
  value: fact.value,
  unit: fact.unit,
  display: formatFactValue(fact.value, fact.unit, locale),
  observation: fact.observation,
  // TASK-1957 — `fact.source` es la tabla lectora (dato interno del snapshot): al lector viaja sólo el nombre legible.
  source: sourceLabelOf(fact),
  unitLabel: unitLabelOf(fact.unit),
  asOf: fact.freshness.asOf,
  asOfLabel: asOfLabelOf(fact.freshness.asOf, locale),
  absentReason: fact.value === null ? 'no_data' : null
})

const projectClaim = (claim: { claimId: string; text: string; factIds: string[]; role?: 'finding' | 'backing' }): InsightWebClaimV1 => ({
  claimId: claim.claimId,
  text: claim.text,
  factIds: [...claim.factIds],
  ...(claim.role ? { role: claim.role } : {})
})

/** Una celda del equivalente tabular es un factId: se resuelve a su cifra formateada. */
const resolveCell = (cell: string | null, facts: Record<string, InsightWebFactV1>): string | null => {
  if (cell === null) return null

  return facts[cell]?.display ?? null
}

const projectReading = (reading: PlanFigureReadingV1): InsightWebReadingV1 => ({
  chartId: reading.chartId,
  ...(reading.keyFigure
    ? { keyFigure: { factId: reading.keyFigure.factId, value: reading.keyFigure.value, caption: projectClaim(reading.keyFigure.caption) } }
    : {}),
  ...(reading.conclusion ? { conclusion: projectClaim(reading.conclusion) } : {}),
  ...(reading.meaning ? { meaning: projectClaim(reading.meaning) } : {}),
  nextStep: reading.nextStep ? projectClaim(reading.nextStep) : null
})

/**
 * Cifras que el render no puede calcular (sería re-derivar): se obtienen con la MISMA geometría que dibuja el PDF y se
 * formatean con `formatFactValue`. Si la geometría rechaza los datos (una etapa que crece), no se deriva nada: el
 * render muestra las etapas sin tasas, nunca una tasa inventada.
 */
const deriveChart = (spec: ChartSpecV1, facts: Record<string, InsightWebFactV1>, locale: string): InsightWebChartDerivedV1 | undefined => {
  if (spec.data?.kind !== 'funnel') return undefined

  const stages = spec.data.stages.map(stage => ({ stageId: stage.stageId, label: stage.label, value: facts[stage.factId]?.value ?? null }))

  if (stages.some(stage => stage.value === null)) return undefined

  try {
    const geometry = funnelGeometry(stages as Array<{ stageId: string; label: string; value: number }>)

    return {
      funnelStepRates: geometry.map(stage => ({
        stageId: stage.stageId,
        display: stage.stepRatePct === null ? null : formatFactValue(stage.stepRatePct, 'percent', locale)
      }))
    }
  } catch {
    return undefined
  }
}

export interface BuildInsightWebModelInput {
  plan: EditorialPlanV1
  facts: EvidenceFactV1[]
}

export const buildInsightWebModel = ({ plan, facts }: BuildInsightWebModelInput): InsightWebModelV1 => {
  const locale = plan.locale
  const factMap: Record<string, InsightWebFactV1> = {}

  for (const fact of facts) factMap[fact.factId] = projectFact(fact, locale)

  const chapters = plan.chapters.map(chapter => ({
    chapterId: chapter.chapterId,
    module: chapter.module,
    title: chapter.title,
    claims: chapter.claims.map(projectClaim),
    charts: chapter.charts.map((spec): InsightWebChartV1 => {
      const derived = deriveChart(spec, factMap, locale)

      return {
        spec,
        table: {
          columns: [...spec.tabularEquivalent.columns],
          rows: spec.tabularEquivalent.rows.map(row => row.map(cell => resolveCell(cell, factMap)))
        },
        ...(derived ? { derived } : {}),
        ...(unitLabelOf(spec.unit) ? { unitLabel: unitLabelOf(spec.unit) } : {})
      }
    }),
    tables: chapter.tables.map(table => ({ tableId: table.tableId, title: table.title, columns: [...table.columns], rows: table.rows.map(row => [...row]) })),
    limits: [...chapter.limits],
    ...(chapter.opening ? { opening: projectClaim(chapter.opening) } : {}),
    ...(chapter.readings?.length ? { readings: chapter.readings.map(projectReading) } : {})
  }))

  return {
    modelVersion: INSIGHT_WEB_MODEL_VERSION,
    locale,
    executiveSummary: plan.executiveSummary.map(projectClaim),
    chapters,
    // `ownerRef` es una referencia interna de responsabilidad: no viaja al visitante del enlace.
    actions: plan.actions.map(action => ({ actionId: action.actionId, text: action.text, factIds: [...action.factIds] })),
    limits: [...plan.limits],
    methodology: [...plan.methodology],
    // `evidenceRef` apunta al origen interno (runId, spaceId…): sólo viaja la etiqueta.
    references: plan.references.map(reference => ({ referenceId: reference.referenceId, label: reference.label })),
    facts: factMap,
    // Campos editoriales v2 (TASK-1888): sólo si el plan sellado los trae; un plan v1 se proyecta igual que en 1.0.
    ...(plan.essentials?.length ? { essentials: plan.essentials.map(projectClaim) } : {}),
    ...(plan.decision ? { decision: projectClaim(plan.decision) } : {}),
    ...(plan.measurement ? { measurement: projectClaim(plan.measurement) } : {}),
    ...(plan.ask ? { ask: projectClaim(plan.ask) } : {}),
    ...(plan.scopeLines?.length ? { scopeLines: [...plan.scopeLines] } : {})
  }
}

const parseCivil = (value: string): Date => new Date(`${value}T00:00:00Z`)

/** "1 al 31 de agosto de 2026" en es-CL; rango en inglés para en-US. Fechas civiles, sin zona. */
export const formatInsightPeriodLabel = (start: string, endExclusive: string, locale: string): string => {
  const first = parseCivil(start)
  const last = new Date(parseCivil(endExclusive).getTime() - 86_400_000)
  const formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  try {
    return formatter.formatRange(first, last)
  } catch {
    return `${formatter.format(first)} – ${formatter.format(last)}`
  }
}
