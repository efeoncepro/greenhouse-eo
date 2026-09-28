/**
 * Binders de cifras (TASK-1930): `metric` (cifra propia con evidencia `measured`), `proof-figures` (cifras de un caso
 * de tercero, con autorización `attested`), `metric-source` (la fuente visible, derivada de las cifras ya ligadas) y
 * `metric-delta` (la diferencia entre dos barras, calculada de sus valores ligados).
 *
 * La cifra sale del hecho (`value`, `label`, `numericValue`); la fuente visible, del `locator` de la evidencia (o del
 * `sourceLabel` del hecho fuera de una `Proposal`). Nunca del texto del plan: lo que el plan traiga en el slot se
 * reemplaza o se quita. Un slot es todo o nada: si una de sus cifras no se verifica, el slot queda sin ligar (quien
 * pidió cuatro cifras no recibe tres).
 */

import { checkEvidence, oldestAsOf, type BindingIssueDraft, type EvidenceNeed } from './evidence'
import { bound, factsFor, textOf, unbound, type Binder } from './shared'

interface BoundFigure {
  value: string | number
  label?: string
  numericValue?: number
  source: string
  asOf: string
}

const figuresBinder =
  (need: EvidenceNeed): Binder =>
  input => {
    const count = input.rule.count ?? { min: 1, max: 1 }
    const facts = factsFor(input, 'figure', input.slot)

    if (facts.length > count.max) return unbound('too-many-facts')

    const issues: BindingIssueDraft[] = []
    const figures: BoundFigure[] = []
    const refs: string[] = []
    let source: 'proposal-evidence' | 'intent' = 'proposal-evidence'
    let rejected: ReturnType<typeof unbound> | null = null

    for (const fact of facts) {
      const check = checkEvidence(input.sources, fact.evidenceRef, need)

      if (!check.ok) {
        if (check.issue) issues.push(check.issue)
        rejected ??= unbound(check.reason)
        continue
      }

      const sourceText = check.locator ?? textOf(fact.sourceLabel)

      if (!sourceText) {
        rejected ??= unbound('no-evidence')
        continue
      }

      if (input.rule.ratio) {
        const ratio = fact.numericValue

        if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
          rejected ??= unbound('no-evidence')
          continue
        }

        figures.push({ value: ratio, source: sourceText, asOf: check.asOf })
      } else {
        figures.push({
          value: textOf(fact.value),
          label: textOf(fact.label),
          ...(typeof fact.numericValue === 'number' && Number.isFinite(fact.numericValue) ? { numericValue: fact.numericValue } : {}),
          source: sourceText,
          asOf: check.asOf
        })
      }

      refs.push(check.evidenceRef)
      source = check.source === 'intent' ? 'intent' : 'proposal-evidence'
    }

    if (rejected) return { ...rejected, ...(issues.length > 0 ? { issues } : {}) }

    if (figures.length === 0) return unbound(need === 'attested' ? 'no-authorization' : 'no-evidence')

    if (figures.length < count.min) return unbound('below-minimum')

    const asOf = oldestAsOf(figures.map(figure => figure.asOf))

    return bound(count.max === 1 ? figures[0] : figures, source, refs, asOf)
  }

export const metricBinder: Binder = figuresBinder('measured')

export const proofFiguresBinder: Binder = figuresBinder('attested')

const itemsOf = (value: unknown): Record<string, unknown>[] =>
  (Array.isArray(value) ? value : [value]).filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)

/** La fuente visible del slot: las fuentes de las cifras ligadas del slot hermano, sin repetir. */
export const metricSourceBinder: Binder = input => {
  const of = input.rule.of ?? ''
  const sibling = input.siblings.get(of)

  if (!sibling || sibling.status !== 'bound') return unbound(sibling?.reason ?? 'no-evidence')

  const sourcesText = [...new Set(itemsOf(input.slots[of]).map(item => textOf(item.source)).filter(Boolean))]

  if (sourcesText.length === 0) return unbound('no-evidence')

  return bound(sourcesText.join(' · '), sibling.source ?? 'proposal-evidence', sibling.evidenceRefs ?? [], sibling.asOf)
}

/** «−25 %»: signo tipográfico, porcentaje entero y espacio antes del símbolo (es-CL). */
const formatDelta = (percent: number): string => {
  const rounded = Math.round(percent)
  const sign = rounded < 0 ? '−' : rounded > 0 ? '+' : ''

  return `${sign}${Math.abs(rounded)} %`
}

/** La diferencia entre las dos barras ligadas (antes → después), calculada de sus valores numéricos. */
export const metricDeltaBinder: Binder = input => {
  const of = input.rule.of ?? ''
  const sibling = input.siblings.get(of)

  if (!sibling || sibling.status !== 'bound') return unbound(sibling?.reason ?? 'no-evidence')

  const [before, after] = itemsOf(input.slots[of]).map(item => item.numericValue)

  if (typeof before !== 'number' || typeof after !== 'number' || before === 0) return unbound('no-evidence')

  return bound(formatDelta(((after - before) / before) * 100), sibling.source ?? 'proposal-evidence', sibling.evidenceRefs ?? [], sibling.asOf)
}
