/**
 * El contrato común de los binders de TASK-1930. Cada binder recibe la lámina, su regla del mapa y las fuentes ya
 * leídas, y devuelve el rastro del slot y qué hacer con su valor:
 *
 * - `{ set: valor }`: el slot se llena con un valor armado SÓLO con campos permitidos del hecho o del reader (nunca
 *   se copia un objeto del consumer: así ningún costo, margen ni dato personal extra llega a la lámina);
 * - `{ remove: true }`: el slot sin dato queda vacío y el validador del plan falla cerrado si era obligatorio;
 * - `{ keep: true }`: el valor del plan se conserva (el marcador `[MONTO]` o la muestra ilustrativa marcada).
 */

import type { DeckRecipe } from '../../types'
import type { DeckSlotBinderRule } from '../map'
import type { DeckBindingSources, DeckSlotFact, SlotBinding, SlotBindingSource, SlotUnboundReason } from '../types'

import type { BindingIssueDraft } from './evidence'

export interface BinderInput {
  sources: DeckBindingSources
  slideIndex: number
  recipe: DeckRecipe
  slot: string
  rule: DeckSlotBinderRule
  /** Los slots de la lámina tal como van quedando (los hermanos ya ligados incluidos). */
  slots: Record<string, unknown>
  /** El rastro de los slots hermanos ya ligados en esta lámina. */
  siblings: Map<string, SlotBinding>
}

export type BinderWrite = { set: unknown } | { remove: true } | { keep: true }

export interface BinderOutput {
  trace: Omit<SlotBinding, 'slideIndex' | 'recipeId' | 'slot' | 'binder'>
  write: BinderWrite
  issues?: BindingIssueDraft[]
}

export type Binder = (input: BinderInput) => BinderOutput

/** Los hechos de un tipo dirigidos a esta lámina (y a este slot, si el tipo lleva slot). */
export const factsFor = <K extends DeckSlotFact['kind']>(
  input: BinderInput,
  kind: K,
  slot?: string
): Extract<DeckSlotFact, { kind: K }>[] =>
  input.sources.facts.filter((fact): fact is Extract<DeckSlotFact, { kind: K }> => {
    if (fact.kind !== kind) return false

    const target = fact.target as { recipeId: string; slot?: string; slideIndex?: number }

    if (target.recipeId !== input.recipe.id) return false
    if (target.slideIndex !== undefined && target.slideIndex !== input.slideIndex) return false

    return slot === undefined || target.slot === slot
  })

export const unbound = (reason: SlotUnboundReason, write: BinderWrite = { remove: true }, issues?: BindingIssueDraft[]): BinderOutput => ({
  trace: { status: 'unbound', reason },
  write,
  ...(issues && issues.length > 0 ? { issues } : {})
})

export const bound = (
  value: unknown,
  source: SlotBindingSource,
  evidenceRefs: string[],
  asOf: string | undefined,
  extra: Partial<SlotBinding> = {}
): BinderOutput => ({
  trace: {
    status: 'bound',
    source,
    ...(evidenceRefs.length === 1 ? { evidenceRef: evidenceRefs[0] } : {}),
    ...(evidenceRefs.length > 0 ? { evidenceRefs } : {}),
    ...(asOf ? { asOf } : {}),
    ...extra
  },
  write: { set: value }
})

/** El texto de un valor del plan, o `''`. */
export const textOf = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
