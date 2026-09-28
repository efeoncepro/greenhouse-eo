/**
 * El núcleo del binding (TASK-1930): `bindDeckSlotsWith(plan, sources)` sobre fuentes YA leídas. Determinista: el mismo
 * plan con las mismas fuentes da el mismo resultado (la evidencia es inmutable y se supersede con filas nuevas).
 *
 * Por cada lámina, cada slot de datos del mapa pasa por su binder (una lámina esqueleto sólo recibe rastro); los derivados (`metric-source`, `metric-delta`)
 * corren después de los slots de los que salen. Al final:
 * 1. la regla de audiencia se verifica otra vez con el gate canónico `assertEvidenceAllowedForAudience` sobre toda
 *    evidencia ligada (defensa en profundidad: los binders ya la filtraron);
 * 2. el plan ligado pasa por `validateDeckPlan`: un slot obligatorio sin dato es `slot-required-missing` y el deck no
 *    compone. El binder nunca «completa» un slot para que pase.
 */

import { assertEvidenceAllowedForAudience, type ProposalRenderProjection } from '@/lib/commercial/tenders/proposals/render-projection'

import { getDeckRecipe } from '../catalog'
import type { DeckPlan, DeckPlanIssue } from '../types'
import { validateDeckPlan } from '../validate'

import { clientLogoBinder } from './binders/client-logo'
import { metricBinder, metricDeltaBinder, metricSourceBinder } from './binders/metric'
import { moneyBinder } from './binders/money'
import { proofFiguresBinder, proofLogoBinder, proofPhotoBinder, proofQuoteBinder } from './binders/proof'
import { sampleDataBinder } from './binders/sample-data'
import type { Binder } from './binders/shared'
import { teamBinder } from './binders/team'
import { bindingRulesOf, DECK_SLOT_BINDING_MAP, isExclusion } from './map'
import type { DeckBindingSources, DeckSlotBinderKind, DeckSlotBindingResult, SlotBinding } from './types'

/** Los códigos propios del binding. Los de slots vacíos o inválidos los da el validador del plan. */
export const DECK_SLOT_BINDING_ISSUE_CODES = {
  'binding-evidence-unknown': 'error',
  'binding-internal-evidence': 'error',
  'binding-fact-unused': 'warning'
} as const

export type DeckSlotBindingIssueCode = keyof typeof DECK_SLOT_BINDING_ISSUE_CODES

const BINDERS: Record<DeckSlotBinderKind, Binder> = {
  'client-logo': clientLogoBinder,
  metric: metricBinder,
  'metric-source': metricSourceBinder,
  'metric-delta': metricDeltaBinder,
  'proof-logo': proofLogoBinder,
  'proof-figures': proofFiguresBinder,
  'proof-quote': proofQuoteBinder,
  'proof-photo': proofPhotoBinder,
  money: moneyBinder,
  team: teamBinder,
  'sample-data': sampleDataBinder
}

const DERIVED = new Set<DeckSlotBinderKind>(['metric-source', 'metric-delta'])

const issue = (code: DeckSlotBindingIssueCode, detail: string, at: { slideIndex?: number; recipeId?: string; slot?: string } = {}): DeckPlanIssue => ({
  code,
  severity: DECK_SLOT_BINDING_ISSUE_CODES[code],
  source: 'binding',
  ...at,
  detail
})

/** ¿Algún slot con binder de la receta del plan recibe este hecho? */
const factIsUsable = (plan: DeckPlan, target: { recipeId: string; slot?: string; slideIndex?: number }): boolean =>
  plan.slides.some((slide, index) => {
    if (slide.recipeId !== target.recipeId) return false
    if (target.slideIndex !== undefined && target.slideIndex !== index) return false
    if (target.slot === undefined) return true

    const entry = DECK_SLOT_BINDING_MAP[target.recipeId]?.[target.slot]

    return entry !== undefined && !isExclusion(entry)
  })

export const bindDeckSlotsWith = (plan: DeckPlan, sources: DeckBindingSources): DeckSlotBindingResult => {
  const boundPlan = structuredClone(plan)
  const bindings: SlotBinding[] = []
  const bindingIssues: DeckPlanIssue[] = []

  boundPlan.slides.forEach((slide, slideIndex) => {
    const recipe = typeof slide?.recipeId === 'string' ? getDeckRecipe(slide.recipeId) : null

    if (!recipe) return

    const rules = bindingRulesOf(recipe.id)

    if (rules.length === 0) return

    const ordered = [...rules.filter(([, rule]) => !DERIVED.has(rule.binder)), ...rules.filter(([, rule]) => DERIVED.has(rule.binder))]
    const slots: Record<string, unknown> = { ...(slide.slots ?? {}) }
    const siblings = new Map<string, SlotBinding>()

    for (const [slot, rule] of ordered) {
      const output = BINDERS[rule.binder]({ sources, slideIndex, recipe, slot, rule, slots, siblings })

      if ('set' in output.write) {
        slots[slot] = output.write.set
      } else if ('remove' in output.write) {
        delete slots[slot]
      }

      const trace: SlotBinding = { slideIndex, recipeId: recipe.id, slot, binder: rule.binder, ...output.trace }

      siblings.set(slot, trace)
      bindings.push(trace)

      for (const draft of output.issues ?? []) bindingIssues.push(issue(draft.code, draft.detail, { slideIndex, recipeId: recipe.id, slot }))
    }

    // Una lámina esqueleto (sin slots escritos) sigue siéndolo: el rastro dice qué se ligaría, pero el binding corre
    // después de escribir la voz y no convierte un esqueleto en una lámina a medias.
    if (slide.slots !== undefined) slide.slots = slots
  })

  for (const fact of sources.facts) {
    if (!factIsUsable(boundPlan, fact.target as { recipeId: string; slot?: string; slideIndex?: number })) {
      bindingIssues.push(
        issue('binding-fact-unused', `El hecho «${fact.factId}» apunta a «${fact.target.recipeId}${'slot' in fact.target ? `.${fact.target.slot}` : ''}», que el plan no tiene o no liga: no se usó.`)
      )
    }
  }

  // Defensa en profundidad: toda evidencia ligada pasa por el gate canónico de audiencia de Proposal Studio.
  if (sources.proposal && sources.audience === 'client_facing') {
    const referenced = [...new Set(bindings.filter(entry => entry.source === 'proposal-evidence').flatMap(entry => entry.evidenceRefs ?? []))]

    assertEvidenceAllowedForAudience(
      {
        audience: 'client_facing',
        allowedEvidence: sources.proposal.evidence.filter(entry => entry.audience === 'client_facing') as unknown as ProposalRenderProjection['allowedEvidence']
      },
      referenced,
      'client_facing'
    )
  }

  const validation = validateDeckPlan(boundPlan)
  const issues = [...validation.issues, ...bindingIssues]

  return { ok: !issues.some(entry => entry.severity === 'error'), plan: boundPlan, bindings, issues }
}
