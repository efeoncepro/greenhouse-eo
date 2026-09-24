/**
 * TASK-1845 — validación del plan contra el snapshot: cada cifra escrita en una claim debe
 * corresponder a un hecho referenciado (valor, num/den, población o delta con su comparable);
 * cada factId debe existir; cada ChartSpec pasa su validación estructural. Rechaza
 * discrepancias: es lo que impide que la IA (o un bug) "mejore" un número.
 */

import { validateChartSpec } from '../contracts/chart-spec'
import type { EvidenceSnapshotContentV1 } from '../contracts/evidence'
import type { EditorialPlanV1, PlanClaimV1 } from '../contracts/plan'
import { allowedNumbersForFacts, extractNumberTokens } from './format'

export interface PlanViolation {
  where: string
  rule: 'unknown_fact' | 'unreferenced_number' | 'chart' | 'empty_claim'
  detail: string
}

const YEAR_OR_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/

/**
 * Las cifras DENTRO del nombre de un hecho referenciado («Keywords en primera página (≤10)»,
 * «RpA · Sky · 2026-08») son identidad del hecho —texto de la evidencia, escrito por el adapter—,
 * no afirmaciones de la claim. Se enmascara sólo la etiqueta LITERAL y sólo la de los hechos que
 * la claim referencia: una cifra fuera de la etiqueta, o la etiqueta de un hecho no referenciado,
 * se sigue validando. Una etiqueta sin letras no se enmascara (borraría esa cifra en todo el texto).
 * El espacio de reemplazo impide que dos fragmentos numéricos vecinos se fundan en un token.
 */
const maskReferencedLabels = (text: string, labels: string[]): string =>
  [...new Set(labels)]
    .filter(label => /\p{L}/u.test(label))
    .sort((left, right) => right.length - left.length)
    .reduce((masked, label) => masked.split(label).join(' '), text)

export const validateEditorialPlan = (plan: EditorialPlanV1, snapshot: EvidenceSnapshotContentV1): PlanViolation[] => {
  const byId = new Map(snapshot.facts.map(fact => [fact.factId, fact]))
  const knownIds = new Set(byId.keys())
  const violations: PlanViolation[] = []

  const checkClaim = (where: string, claim: PlanClaimV1) => {
    if (claim.text.trim().length === 0) violations.push({ where, rule: 'empty_claim', detail: claim.claimId })

    const facts = claim.factIds.map(id => byId.get(id)).filter((fact): fact is NonNullable<typeof fact> => fact !== undefined)

    for (const id of claim.factIds) {
      if (!knownIds.has(id)) violations.push({ where, rule: 'unknown_fact', detail: `${claim.claimId} referencia ${id}` })
    }

    const allowed = allowedNumbersForFacts(facts, byId, plan.locale)
    const dateTokens = new Set<string>()

    for (const fact of facts) {
      dateTokens.add(fact.window.start)
      dateTokens.add(fact.window.endExclusive)
      if (fact.freshness.asOf) dateTokens.add(fact.freshness.asOf)
    }

    for (const token of extractNumberTokens(maskReferencedLabels(claim.text, facts.map(fact => fact.label)))) {
      const normalized = token.trim()

      if (allowed.has(normalized)) continue
      if (YEAR_OR_DATE.test(normalized) && [...dateTokens].some(date => date.startsWith(normalized))) continue

      violations.push({ where, rule: 'unreferenced_number', detail: `${claim.claimId}: "${normalized}" no corresponde a ningún hecho referenciado` })
    }
  }

  plan.executiveSummary.forEach(claim => checkClaim('executiveSummary', claim))

  for (const chapter of plan.chapters) {
    chapter.claims.forEach(claim => checkClaim(chapter.chapterId, claim))

    for (const chart of chapter.charts) {
      for (const violation of validateChartSpec(chart, knownIds)) {
        violations.push({ where: chapter.chapterId, rule: 'chart', detail: `${violation.chartId}: ${violation.rule} — ${violation.detail}` })
      }
    }
  }

  for (const action of plan.actions) {
    checkClaim('actions', { claimId: action.actionId, text: action.text, factIds: action.factIds })
  }

  return violations
}
