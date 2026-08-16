// TASK-1736 Slice 1 — Primitive canónico de intake de identidad del candidato.
// Contrato vinculante: ADR GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.
//
// Una sola puerta para AMBAS entradas públicas (Careers custom y Growth Forms nativo — las dos
// convergen en `submitPublicHiringApplication`) y para los consumers gobernados futuros (CLI/App
// API/Slices 2-3). Full API Parity: la regla vive acá, nunca duplicada por superficie.
//
// Qué hace Slice 1 y qué NO:
// - SÍ: separa evidencia (`submitted`, raw exacto del caller, jamás mutado acá) de la
//   representación `display` estructural (NFC + controles/bidi/zero-width fuera + whitespace
//   colapsado — los cambios mecánicos seguros de D2), clasifica el casing y calcula la propuesta
//   + search key versionadas.
// - NO: no aplica casing en el intake (ni siquiera `high_confidence`), no persiste evidencia ni
//   audit (tabla application-scoped = Slice 2), no reconcilia display de identidad existente
//   (`reconcileCandidateIdentityDisplayName` = Slice 2), no remedia historia (Slice 3).

import {
  CANDIDATE_NAME_NORMALIZATION_VERSION,
  normalizeNameStructural,
  proposeDisplayName,
  type CandidateNameCasingAssessment
} from './normalize-name'
import { buildCandidateSearchKey, type CandidateSearchKey } from './search-key'

export {
  CANDIDATE_NAME_NORMALIZATION_VERSION,
  classifyCandidateNameCasing,
  normalizeNameStructural,
  proposeDisplayName,
  type CandidateNameCasingAssessment,
  type CandidateNameCasingClass
} from './normalize-name'
export { buildCandidateSearchKey, CANDIDATE_SEARCH_KEY_VERSION, type CandidateSearchKey } from './search-key'
export {
  HIRING_AVAILABILITY_CATALOG,
  resolveHiringAvailability,
  type HiringAvailabilityResolution
} from './availability'

export interface CandidateIdentityIntakeInput {
  firstName: string
  lastName: string
}

/**
 * TASK-1736 A5 — Placeholder neutro del dominio para el edge degenerado en que la normalización
 * estructural deja el nombre VACÍO (input compuesto sólo por controles/zero-width). Espejo del
 * fallback de desk.ts (`Candidato ${publicId}` — acá sin publicId: el primitive es puro). Un
 * display JAMÁS nace invisible: materializar el submitted crudo re-introduciría los caracteres
 * de control que la estructural acaba de remover.
 */
export const CANDIDATE_DISPLAY_FALLBACK_PLACEHOLDER = 'Candidato'

export interface CandidateIdentityIntake {
  /** Evidencia: EXACTAMENTE lo que entregó el caller (post parser: trim exterior + cap). Inmutable acá. */
  submitted: {
    firstName: string
    lastName: string
    fullName: string
  }
  /**
   * Representación display estructural (D2 mecánico-seguro): NFC + remoción de controles/bidi/
   * zero-width + whitespace colapsado. El CASING NO se toca en el intake — la materialización del
   * casing `high_confidence` es reconciliación de display gobernada (Slice 2).
   */
  display: {
    fullName: string
  }
  /** Clasificación de casing + propuesta (sólo degenerados evidentes). Slice 1 no la aplica. */
  casing: CandidateNameCasingAssessment
  /** Derivada interna versionada; NUNCA se usa sola para fusionar/resolver una Person. */
  searchKey: CandidateSearchKey
  normalizationVersion: typeof CANDIDATE_NAME_NORMALIZATION_VERSION
}

/**
 * Primitive canónico: normaliza el nombre del intake sin destruir evidencia. PURO y determinista
 * (mismo input ⇒ mismo output; idempotente por construcción). Nunca lanza por contenido del
 * nombre: un caso raro degrada a `needs_review`, jamás bloquea el submit público (ADR §Resilience).
 */
export const normalizeCandidateIdentityInput = (input: CandidateIdentityIntakeInput): CandidateIdentityIntake => {
  const submittedFullName = `${input.firstName} ${input.lastName}`.trim()
  const structuralFullName = normalizeNameStructural(submittedFullName)

  // Edge degenerado (A5 — nombre compuesto sólo por controles/zero-width): el display cae al
  // placeholder NEUTRO del dominio, JAMÁS al submitted crudo (materializaría un display invisible
  // con los caracteres de control que la estructural removió). La clasificación se computa sobre
  // la estructural VACÍA ⇒ `mixed_ambiguous`/`needs_review` sin propuesta (decide un humano), y
  // la search key queda vacía (sin señal — nunca matchea otro placeholder).
  const structuralIsEmpty = structuralFullName.length === 0
  const displayFullName = structuralIsEmpty ? CANDIDATE_DISPLAY_FALLBACK_PLACEHOLDER : structuralFullName
  const representationSource = structuralIsEmpty ? structuralFullName : displayFullName

  return {
    submitted: {
      firstName: input.firstName,
      lastName: input.lastName,
      fullName: submittedFullName
    },
    display: { fullName: displayFullName },
    casing: proposeDisplayName(representationSource),
    searchKey: buildCandidateSearchKey(representationSource),
    normalizationVersion: CANDIDATE_NAME_NORMALIZATION_VERSION
  }
}
