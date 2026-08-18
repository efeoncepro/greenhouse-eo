// TASK-1736 Slice 1 — Search key derivada y versionada del nombre del candidato (capa 3 del ADR
// GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1 §D1). PURO, sin IO.
//
// Approach (documentado): extiende la base `normalizeMatchValue`
// (`src/lib/identity/reconciliation/normalize.ts`) — lowercase + NFD + strip de marcas combinantes
// (translitera diacríticos latinos: "María" → "maria") + colapso de whitespace — pero SIN su
// filtro `[^a-z0-9...]`, que destruye toda escritura no latina (CJK/árabe/cirílico quedarían "").
// Acá la puntuación se reemplaza por espacio preservando CUALQUIER letra/dígito Unicode
// (`\p{L}\p{N}`), y se recompone NFC al final para estabilidad (p. ej. Hangul). La clave es
// interna, no visible en UI, y NUNCA se usa sola para fusionar/resolver una Person
// (email/`identity_profile_id` son lo único authoritative — ADR hard rule).

import { normalizeNameStructural } from './normalize-name'

/** Versión del algoritmo de search key. Cambiar el algoritmo ⇒ versión nueva + re-derivación. */
export const CANDIDATE_SEARCH_KEY_VERSION = 'v1' as const

export interface CandidateSearchKey {
  value: string
  version: typeof CANDIDATE_SEARCH_KEY_VERSION
}

export const buildCandidateSearchKey = (name: string): CandidateSearchKey => {
  const value = normalizeNameStructural(name)
    .toLowerCase()
    .normalize('NFD')
    // Translitera diacríticos removiendo marcas combinantes (á→a); en escrituras no latinas
    // remueve sólo diacríticos combinantes (p. ej. harakat árabes), sin transliterar letras.
    .replace(/\p{M}/gu, '')
    // Puntuación/símbolos → espacio; toda letra y dígito Unicode se preserva (no destruye CJK).
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()

  return { value, version: CANDIDATE_SEARCH_KEY_VERSION }
}
