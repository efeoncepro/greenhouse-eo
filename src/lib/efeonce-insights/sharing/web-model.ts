/**
 * TASK-1848 — construcción pura de `InsightWebModelV1` desde el plan congelado y los hechos del
 * snapshot sellado (sin DB, sin `server-only`: se prueba sin mocks). Las cifras salen de
 * `formatFactValue`, la MISMA función que validó el plan: el web model no inventa formato.
 */

import type { EvidenceFactV1 } from '../contracts/evidence'
import type { EditorialPlanV1 } from '../contracts/plan'
import {
  INSIGHT_WEB_MODEL_VERSION,
  type InsightWebChartV1,
  type InsightWebClaimV1,
  type InsightWebFactV1,
  type InsightWebModelV1
} from '../contracts/web-model'
import { formatFactValue } from '../editorial/format'

const projectFact = (fact: EvidenceFactV1, locale: string): InsightWebFactV1 => ({
  factId: fact.factId,
  module: fact.module,
  label: fact.label,
  value: fact.value,
  unit: fact.unit,
  display: formatFactValue(fact.value, fact.unit, locale),
  observation: fact.observation,
  source: fact.source,
  asOf: fact.freshness.asOf,
  absentReason: fact.value === null ? 'no_data' : null
})

const projectClaim = (claim: { claimId: string; text: string; factIds: string[] }): InsightWebClaimV1 => ({
  claimId: claim.claimId,
  text: claim.text,
  factIds: [...claim.factIds]
})

/** Una celda del equivalente tabular es un factId: se resuelve a su cifra formateada. */
const resolveCell = (cell: string | null, facts: Record<string, InsightWebFactV1>): string | null => {
  if (cell === null) return null

  return facts[cell]?.display ?? null
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
    charts: chapter.charts.map(
      (spec): InsightWebChartV1 => ({
        spec,
        table: {
          columns: [...spec.tabularEquivalent.columns],
          rows: spec.tabularEquivalent.rows.map(row => row.map(cell => resolveCell(cell, factMap)))
        }
      })
    ),
    tables: chapter.tables.map(table => ({ tableId: table.tableId, title: table.title, columns: [...table.columns], rows: table.rows.map(row => [...row]) })),
    limits: [...chapter.limits]
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
    facts: factMap
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
