/**
 * Binders de prueba de terceros (TASK-1930): logos del muro de clientes y de partners, el logo y la foto de un caso, y
 * la cita de un testimonio. Todo sale de una evidencia `attested` con su documento de respaldo: la autorización de uso
 * se registra como evidencia de la `Proposal` (acción `record_proposal_evidence`) antes de ligar el slot.
 *
 * - Muro de logos: el logo sin autorización se omite; si quedan menos de los que la lámina aprobada muestra, el slot
 *   queda sin ligar (`below-minimum`).
 * - Cita: textual desde el hecho; el autor, sólo nombre y cargo o equipo. La frase destacada (`keyPhrase`) la elige
 *   quien escribe, pero sólo se conserva si es un fragmento literal de la cita ligada (`not-in-quote`).
 * - Foto del caso: sólo la foto real que trae la evidencia; nunca una foto de ejemplo ni una generada (`no-real-photo`).
 */

import { checkEvidence, oldestAsOf, type BindingIssueDraft } from './evidence'
import { bound, factsFor, textOf, unbound, type Binder } from './shared'

export { proofFiguresBinder } from './metric'

export const proofLogoBinder: Binder = input => {
  const count = input.rule.count ?? { min: 1, max: 1 }
  const facts = factsFor(input, 'logo', input.slot)

  if (facts.length > count.max) return unbound('too-many-facts')

  const issues: BindingIssueDraft[] = []
  const logos: { assetId: string; alt: string; evidenceRef: string; asOf: string }[] = []
  let firstReason: ReturnType<typeof unbound>['trace']['reason']

  for (const fact of facts) {
    const check = checkEvidence(input.sources, fact.evidenceRef, 'attested')

    if (!check.ok) {
      if (check.issue) issues.push(check.issue)
      firstReason ??= check.reason
      continue
    }

    const assetId = textOf(fact.logoAssetId)

    if (!assetId) {
      firstReason ??= 'no-logo'
      continue
    }

    logos.push({ assetId, alt: textOf(fact.name), evidenceRef: check.evidenceRef, asOf: check.asOf })
  }

  if (logos.length === 0) return unbound(firstReason ?? 'no-authorization', { remove: true }, issues)
  if (logos.length < count.min) return unbound('below-minimum', { remove: true }, issues)

  const values = logos.map(logo => ({ assetId: logo.assetId, alt: logo.alt }))
  const output = bound(count.max === 1 ? values[0] : values, 'proposal-evidence', logos.map(logo => logo.evidenceRef), oldestAsOf(logos.map(logo => logo.asOf)))

  return issues.length > 0 ? { ...output, issues } : output
}

/** Para comparar la frase destacada con la cita: sin comillas, sin negritas, espacios colapsados y en minúsculas. */
const normalize = (text: string): string =>
  text
    .replace(/[«»"“”]/g, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es')

export const proofQuoteBinder: Binder = input => {
  const facts = factsFor(input, 'quote')

  if (facts.length > 1) return unbound('too-many-facts')

  const [fact] = facts

  if (!fact) return unbound('no-authorization')

  const check = checkEvidence(input.sources, fact.evidenceRef, 'attested')

  if (!check.ok) return unbound(check.reason, { remove: true }, check.issue ? [check.issue] : undefined)

  const quote = textOf(fact.quote)

  if (!quote) return unbound('no-authorization')

  const evidence = [check.evidenceRef]

  if (input.rule.part === 'quote') return bound(quote, check.source, evidence, check.asOf)

  if (input.rule.part === 'author') {
    const name = textOf(fact.authorName)
    const role = textOf(fact.authorRole)

    if (!name) return unbound('no-authorization')

    return bound(role ? `${name} · ${role}` : name, check.source, evidence, check.asOf)
  }

  // `keyPhrase`: la frase la elige quien escribe, pero tiene que estar en la cita.
  const phrase = textOf(input.slots[input.slot])

  if (!phrase || !normalize(quote).includes(normalize(phrase))) return unbound('not-in-quote')

  return bound(phrase, check.source, evidence, check.asOf)
}

export const proofPhotoBinder: Binder = input => {
  const facts = factsFor(input, 'photo', input.slot)

  if (facts.length > 1) return unbound('too-many-facts')

  const [fact] = facts

  if (!fact) return unbound('no-real-photo')

  const check = checkEvidence(input.sources, fact.evidenceRef, 'attested')

  if (!check.ok) return unbound(check.reason, { remove: true }, check.issue ? [check.issue] : undefined)

  const assetId = textOf(fact.photoAssetId)

  if (!assetId) return unbound('no-real-photo')

  return bound({ assetId, alt: textOf(fact.alt) }, check.source, [check.evidenceRef], check.asOf)
}
