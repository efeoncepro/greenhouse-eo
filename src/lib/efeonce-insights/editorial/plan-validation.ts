/**
 * TASK-1845 — validación del plan contra el snapshot: cada cifra escrita en una claim debe
 * corresponder a un hecho referenciado (valor, num/den, población o delta con su comparable);
 * cada factId debe existir; cada ChartSpec pasa su validación estructural. Rechaza
 * discrepancias: es lo que impide que la IA (o un bug) "mejore" un número.
 */

import { validateChartSpec } from '../contracts/chart-spec'
import type { EvidenceSnapshotContentV1 } from '../contracts/evidence'
import { INSIGHT_COVER_THEMES, PLAN_ESSENTIALS_MAX, type EditorialPlanV1, type PlanActionV1, type PlanClaimV1, type PlanCoverV1 } from '../contracts/plan'
import { validateChartSpecValues } from './chart-values'
import { allowedNumbersForFacts, extractNumberTokens, formatFactValue } from './format'

export interface PlanViolation {
  where: string
  /** `invalid_field`: un campo del contrato editorial v2 (TASK-1888) con forma inválida. */
  rule: 'unknown_fact' | 'unreferenced_number' | 'chart' | 'empty_claim' | 'invalid_field'
  detail: string
}

const WEEKS_PATTERN = /^([1-4])(?:-([1-4]))?$/

const actionFieldViolations = (action: PlanActionV1): string[] => {
  const problems: string[] = []

  for (const key of ['impact', 'effort'] as const) {
    const value = action[key]

    if (value !== undefined && ![1, 2, 3].includes(value)) problems.push(`${action.actionId}: ${key} debe ser 1, 2 o 3`)
  }

  if (action.weeks !== undefined) {
    const match = WEEKS_PATTERN.exec(action.weeks)

    if (!match || (match[2] !== undefined && Number(match[2]) < Number(match[1]))) {
      problems.push(`${action.actionId}: weeks debe ser «N» o «N-M» dentro de las 4 semanas`)
    }
  }

  return problems
}

/** Una portada navy nunca lleva el logo por defecto: sólo la variante apta para fondo oscuro, o ningún logo. */
const coverViolations = (cover: PlanCoverV1): string[] => {
  const problems: string[] = []

  if (!(INSIGHT_COVER_THEMES as readonly string[]).includes(cover.theme)) problems.push(`tema de portada inválido: ${String(cover.theme)}`)
  if ((cover.logoAssetId === null) !== (cover.logoVariant === null)) problems.push('logoAssetId y logoVariant van juntos')
  if (cover.theme === 'dark' && cover.logoVariant === 'default') problems.push('una portada navy no lleva el logo por defecto')
  if (cover.theme === 'light' && cover.logoVariant === 'on_dark') problems.push('una portada blanca no lleva la variante para fondo oscuro')

  return problems
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

  const invalid = (where: string, detail: string) => violations.push({ where, rule: 'invalid_field', detail })
  const values = new Map(snapshot.facts.map(fact => [fact.factId, fact.value]))

  plan.executiveSummary.forEach(claim => checkClaim('executiveSummary', claim))

  for (const chapter of plan.chapters) {
    chapter.claims.forEach(claim => checkClaim(chapter.chapterId, claim))

    for (const chart of chapter.charts) {
      // Estructura primero; los valores sólo se juzgan sobre un spec bien formado (TASK-1888).
      const structural = validateChartSpec(chart, knownIds)

      for (const violation of structural.length > 0 ? structural : validateChartSpecValues(chart, values)) {
        violations.push({ where: chapter.chapterId, rule: 'chart', detail: `${violation.chartId}: ${violation.rule} — ${violation.detail}` })
      }
    }

    // TASK-1888 — entrada de capítulo y lectura por figura: mismas reglas de cifras que cualquier claim.
    if (chapter.opening) checkClaim(`${chapter.chapterId}.opening`, chapter.opening)

    const chartIds = new Set(chapter.charts.map(chart => chart.chartId))
    const readChartIds = new Set<string>()

    for (const reading of chapter.readings ?? []) {
      const where = `${chapter.chapterId}.reading.${reading.chartId}`

      if (!chartIds.has(reading.chartId)) invalid(where, `la lectura apunta a ${reading.chartId}, que no es un gráfico del capítulo`)
      if (readChartIds.has(reading.chartId)) invalid(where, 'una sola lectura por gráfico')
      readChartIds.add(reading.chartId)

      if (reading.keyFigure) {
        const fact = byId.get(reading.keyFigure.factId)

        if (!fact) violations.push({ where, rule: 'unknown_fact', detail: `cifra principal referencia ${reading.keyFigure.factId}` })
        else if (reading.keyFigure.value !== formatFactValue(fact.value, fact.unit, plan.locale)) {
          violations.push({ where, rule: 'unreferenced_number', detail: `cifra principal "${reading.keyFigure.value}" no es el valor del hecho ${fact.factId}` })
        }

        checkClaim(where, reading.keyFigure.caption)
      }

      if (reading.conclusion) checkClaim(where, reading.conclusion)
      checkClaim(where, reading.meaning)
      if (reading.nextStep) checkClaim(where, reading.nextStep)
    }
  }

  for (const action of plan.actions) {
    checkClaim('actions', { claimId: action.actionId, text: action.text, factIds: action.factIds })
    actionFieldViolations(action).forEach(detail => invalid('actions', detail))
  }

  // TASK-1888 — campos de plan del contrato v2. Todos opcionales: un plan v1 sellado no los trae y valida igual.
  if (plan.essentials) {
    if (plan.essentials.length > PLAN_ESSENTIALS_MAX) invalid('essentials', `«Lo esencial» admite hasta ${PLAN_ESSENTIALS_MAX} hechos; trae ${plan.essentials.length}`)
    plan.essentials.forEach(claim => checkClaim('essentials', claim))
  }

  // Las líneas de alcance son copy del catálogo, sin hechos: cualquier cifra en ellas es una discrepancia.
  plan.scopeLines?.forEach((line, index) => checkClaim('scopeLines', { claimId: `scope.${index}`, text: line, factIds: [] }))

  for (const key of ['decision', 'measurement', 'ask'] as const) {
    const claim = plan[key]

    if (claim) checkClaim(key, claim)
  }

  if (plan.cover) coverViolations(plan.cover).forEach(detail => invalid('cover', detail))

  return violations
}
