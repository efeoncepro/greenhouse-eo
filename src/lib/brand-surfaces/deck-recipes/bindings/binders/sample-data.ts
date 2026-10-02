/**
 * Binder `sample-data` (TASK-1930 · delta de TASK-1934): las láminas de muestra SEO/AEO (`decision-ai-answer`,
 * `decision-diagnosis-map`).
 *
 * Por defecto los datos son ilustrativos (`dataOrigin: 'illustrative'`): el plan conserva sus valores y la marca de
 * muestra es obligatoria (si falta, el binder pone la aprobada). Con datos reales del cliente —un hecho `sample-data`
 * con evidencia `measured`— los slots del grupo se llenan SÓLO desde ese hecho (`dataOrigin: 'client'`, `evidenceRef`)
 * y la marca se retira. La marca nunca se quita sin evidencia.
 *
 * Del hecho se copian sólo los slots del grupo y sólo texto, números y listas de ellos: nada más viaja a la lámina.
 */

import { bindingRulesOf, SAMPLE_MARKS } from '../map'

import { checkEvidence } from './evidence'
import { bound, factsFor, textOf, unbound, type Binder, type BinderOutput } from './shared'

const isPrimitive = (value: unknown): boolean => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))

/** Un valor de muestra aceptable: texto, número o lista de ellos (o de pares, como `[motor, score]`). */
const isSampleValue = (value: unknown): boolean => {
  if (isPrimitive(value)) return true
  if (!Array.isArray(value) || value.length === 0) return false

  return value.every(item => isPrimitive(item) || (Array.isArray(item) && item.length > 0 && item.every(isPrimitive)))
}

const illustrative = (write: BinderOutput['write']): BinderOutput => ({
  trace: { status: 'unbound', reason: 'illustrative-sample', dataOrigin: 'illustrative' },
  write
})

export const sampleDataBinder: Binder = input => {
  const markSlot = input.rule.mark ?? ''
  const isMark = input.slot === markSlot
  const facts = factsFor(input, 'sample-data')

  if (facts.length > 1) return unbound('too-many-facts')

  const [fact] = facts

  // La marca queda puesta: la del plan o, si falta, la aprobada.
  const markWrite = (): BinderOutput['write'] =>
    textOf(input.slots[markSlot]) ? { keep: true } : { set: SAMPLE_MARKS[input.recipe.id as keyof typeof SAMPLE_MARKS] }

  // Muestra: se conserva lo del plan y la marca va sí o sí.
  if (!fact) return illustrative(isMark ? markWrite() : { keep: true })

  const check = checkEvidence(input.sources, fact.evidenceRef, 'measured')

  // Datos «del cliente» sin evidencia válida: los datos se quitan (la lámina falla cerrada) y la marca se queda.
  if (!check.ok) return unbound(check.reason, isMark ? markWrite() : { remove: true }, check.issue ? [check.issue] : undefined)

  const client = { dataOrigin: 'client' as const }

  // Con datos reales la marca se retira: el rastro lleva la evidencia que lo permite.
  if (isMark) {
    return { trace: { status: 'bound', source: check.source, evidenceRef: check.evidenceRef, evidenceRefs: [check.evidenceRef], asOf: check.asOf, ...client }, write: { remove: true } }
  }

  const group = new Set(bindingRulesOf(input.recipe.id).map(([name]) => name))
  const value = group.has(input.slot) ? fact.values?.[input.slot] : undefined

  if (value === undefined || !isSampleValue(value)) return { ...unbound('no-evidence'), trace: { status: 'unbound', reason: 'no-evidence', ...client } }

  return bound(value, check.source, [check.evidenceRef], check.asOf, client)
}
