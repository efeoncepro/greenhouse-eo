// TASK-1736 Slice 1 — Normalización estructural + clasificación de casing culturalmente segura del
// nombre del candidato. PURO (sin IO, sin server-only) para que el parser público y los tests lo
// consuman directo. Contrato vinculante: ADR
// GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1 (D1 tres capas, D2 policy de
// casing). Versionado: cambiar cualquier regla de este archivo exige una versión nueva
// (`CANDIDATE_NAME_NORMALIZATION_VERSION`), jamás editar la semántica de una versión publicada.
//
// Capas (D1):
// - `submitted` (evidencia): NO vive acá — el caller conserva el raw exacto; este módulo nunca lo muta.
// - `display` estructural: NFC + remoción de controles/bidi/zero-width + colapso de whitespace.
// - casing: SOLO clasificación + propuesta para degenerados evidentes; Slice 1 NO materializa casing.

/** Versión de la policy de normalización/casing. Cambio de reglas ⇒ versión nueva (ADR D1). */
export const CANDIDATE_NAME_NORMALIZATION_VERSION = 'v1' as const

export type CandidateNameCasingClass =
  | 'well_formed' // casing mixto plausible según reglas conservadoras; nada que proponer
  | 'degenerate_lower' // completamente en minúsculas, escritura latina — degenerado evidente
  | 'degenerate_upper' // completamente en mayúsculas, escritura latina — degenerado evidente
  | 'mixed_ambiguous' // casing mixto no clasificable ("dEsiree", "LaTonya") — decide un humano
  | 'non_latin' // contiene letras no latinas — el casing no aplica, jamás se translitera
  | 'mononym' // un solo token — cardinalidad inusual, decide un humano

export interface CandidateNameCasingAssessment {
  classification: CandidateNameCasingClass
  /** `high_confidence` = elegible para automatismo (D3); `needs_review` = fail-closed a humano. */
  confidence: 'high_confidence' | 'needs_review'
  /**
   * Propuesta de display SOLO para degenerados evidentes (`degenerate_lower`/`degenerate_upper`).
   * `null` para `well_formed` (no hay nada que cambiar) y para toda clase `needs_review`
   * (la policy no adivina). Slice 1 NO aplica esta propuesta en el intake; la materialización
   * gobernada es Slice 2 (`reconcileCandidateIdentityDisplayName`).
   */
  proposedDisplayName: string | null
}

// ── Normalización estructural (D2 — determinista, siempre segura) ────────────────────────────────

// Controles C0/C1, zero-width de riesgo (ZWSP/ZWNJ/ZWJ/WJ/BOM) y overrides/aislantes bidi.
// Posture v1: remoción silenciosa (el resto del contenido authored se conserva).
const DANGEROUS_CHARS_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200d\u2060\ufeff\u202a-\u202e\u2066-\u2069]/g

/**
 * Normalización estructural v1: Unicode NFC → remoción de controles/bidi/zero-width →
 * colapso de whitespace Unicode interno a un espacio simple → trim exterior.
 * Preserva diacríticos, casing, apóstrofes, guiones y cualquier escritura. NO toca el raw del caller.
 */
export const normalizeNameStructural = (raw: string): string =>
  raw.normalize('NFC').replace(DANGEROUS_CHARS_RE, '').replace(/\s+/g, ' ').trim()

// ── Clasificación de casing (D2 — conservadora, fail-closed a humano) ────────────────────────────

/**
 * Partículas que permanecen en minúscula en posición interior ("María de los Ángeles",
 * "van der Meer"). Unión de la lista ADR D2 + spec TASK-1736. Ampliar la lista = versión nueva.
 */
const LOWERCASE_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'van', 'der', 'von', 'da', 'di', 'le'])

const hasNonLatinLetter = (name: string): boolean => {
  for (const ch of name) {
    if (/\p{L}/u.test(ch) && !/\p{Script=Latin}/u.test(ch)) return true
  }

  return false
}

// Segmento bien formado (entre guiones): "Jean", "Ángeles", "O'Brien", "McDonald", "D'Angelo".
const isWellFormedSegment = (segment: string): boolean =>
  /^\p{Lu}[\p{Ll}'’]*$/u.test(segment) || // Capitalización simple (apóstrofe interior con minúscula)
  /^\p{Lu}['’]\p{Lu}\p{Ll}*$/u.test(segment) || // O'Brien / D'Angelo
  /^(?:Mc|Mac)\p{Lu}\p{Ll}*$/u.test(segment) // McDonald / MacDonald

const isWellFormedToken = (token: string, index: number): boolean => {
  if (index > 0 && LOWERCASE_PARTICLES.has(token)) return true

  const segments = token.split('-')

  return segments.every(segment => segment.length > 0 && isWellFormedSegment(segment))
}

/**
 * Clasifica el casing de un nombre YA estructuralmente normalizado. Orden de precedencia:
 * non_latin → mononym → degenerado evidente → well_formed/mixed_ambiguous.
 * Todo lo que no sea el patrón degenerado evidente o el bien formado conservador queda ambiguo
 * (la policy no adivina — ADR D2).
 */
export const classifyCandidateNameCasing = (name: string): CandidateNameCasingClass => {
  const normalized = normalizeNameStructural(name)

  if (!normalized) return 'mixed_ambiguous'

  // Escrituras no latinas: sólo normalización estructural; el casing no aplica y no se translitera.
  if (hasNonLatinLetter(normalized)) return 'non_latin'

  const tokens = normalized.split(' ')

  if (tokens.length < 2) return 'mononym'

  const hasUpper = /\p{Lu}/u.test(normalized)
  const hasLower = /\p{Ll}/u.test(normalized)

  if (hasLower && !hasUpper) return 'degenerate_lower'
  if (hasUpper && !hasLower) return 'degenerate_upper'

  return tokens.every((token, index) => isWellFormedToken(token, index)) ? 'well_formed' : 'mixed_ambiguous'
}

// ── Propuesta conservadora para degenerados evidentes ────────────────────────────────────────────

const VOWEL_RE = /[aeiouáéíóúàèìòùâêîôûäëïöüãõ]/

const capitalizeAlphaPart = (part: string): string =>
  part ? part.charAt(0).toUpperCase() + part.slice(1) : part

// Capitaliza un segmento (entre guiones) ya en minúsculas, con reglas conservadoras:
// - `mc` re-capitaliza la letra siguiente ("mcdonald" → "McDonald").
// - `mac` re-capitaliza SOLO si sigue consonante ("macdonald" → "MacDonald") — heurística
//   deliberadamente conservadora que protege nombres hispanos como "macarena"/"macías"
//   (→ "Macarena"/"Macías"); un "MacIntyre" real queda "Macintyre" y se corrige por el camino
//   humano gobernado (display corregible, ADR D1), nunca al revés.
// - Tras apóstrofe (recto o curvo) con prefijo de UNA letra, capitaliza la parte siguiente
//   ("o'brien" → "O'Brien", "d'angelo" → "D'Angelo"); prefijos largos no re-capitalizan
//   ("dell'orto" → "Dell'orto").
const capitalizeSegment = (segment: string): string => {
  const parts = segment.split(/(['’])/)

  const capitalized = parts.map((part, index) => {
    if (part === "'" || part === '’') return part

    const isFirstAlphaPart = index === 0
    const previousAlphaPart = index >= 2 ? parts[index - 2] : null

    if (isFirstAlphaPart) {
      if (part.startsWith('mc') && part.length > 2) return 'Mc' + capitalizeAlphaPart(part.slice(2))

      if (part.startsWith('mac') && part.length > 3 && !VOWEL_RE.test(part.charAt(3))) {
        return 'Mac' + capitalizeAlphaPart(part.slice(3))
      }

      return capitalizeAlphaPart(part)
    }

    return previousAlphaPart !== null && previousAlphaPart.length === 1 ? capitalizeAlphaPart(part) : part
  })

  return capitalized.join('')
}

const buildProposalFromDegenerate = (normalized: string): string => {
  const tokens = normalized.toLowerCase().split(' ')

  return tokens
    .map((token, index) => {
      // Partículas interiores permanecen en minúscula; el primer token SIEMPRE se capitaliza.
      if (index > 0 && LOWERCASE_PARTICLES.has(token)) return token

      return token.split('-').map(capitalizeSegment).join('-')
    })
    .join(' ')
}

/**
 * Evalúa el casing de un nombre y propone un display SOLO para los degenerados evidentes
 * (todo-minúsculas / todo-mayúsculas en escritura latina). Mixto/ambiguo/no-latino/mononym
 * retornan `needs_review` sin propuesta — decide un humano (ADR D2). PURO: no muta el input
 * ni persiste nada; Slice 1 no aplica la propuesta en el intake.
 */
export const proposeDisplayName = (name: string): CandidateNameCasingAssessment => {
  const normalized = normalizeNameStructural(name)
  const classification = classifyCandidateNameCasing(normalized)

  if (classification === 'degenerate_lower' || classification === 'degenerate_upper') {
    return {
      classification,
      confidence: 'high_confidence',
      proposedDisplayName: buildProposalFromDegenerate(normalized)
    }
  }

  if (classification === 'well_formed') {
    // Bien formado = high_confidence (elegible para D3), pero no hay nada que proponer.
    return { classification, confidence: 'high_confidence', proposedDisplayName: null }
  }

  return { classification, confidence: 'needs_review', proposedDisplayName: null }
}
