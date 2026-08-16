// TASK-1736 Slice 1 — Validación server-side de `availability` contra el catálogo estable de
// opciones que el Growth Form publica (parity endurecida: el form ya es un select con options,
// pero el parser aceptaba texto libre sin contrastarlo con el catálogo).
//
// Catálogo: unión de las opciones de ambos locales del SSOT de copy
// (`copy.apply.availabilityOptions`), que es EXACTAMENTE lo que `growth-form-contract.ts`
// publica como `options` del campo — mismo origen ⇒ cero drift.
//
// Fallback tolerante (documentado, delta deliberado sobre el `reject` de la field policy D5 del
// ADR): un valor fuera del catálogo se CONSERVA como texto acotado y NO rechaza la postulación —
// el intake público jamás pierde una application por esto. El rechazo duro queda diferido a
// cuando exista la evidencia application-scoped (Slice 2) para no perder el dato authored.

import { careers as careersEsCl } from '@/lib/copy/dictionaries/es-CL/careers'
import { careers as careersEnUs } from '@/lib/copy/dictionaries/en-US/careers'

import { normalizeNameStructural } from './normalize-name'

/** Catálogo estable server-side (es-CL + en-US). Cambiarlo = cambiar el SSOT de copy, no esto. */
export const HIRING_AVAILABILITY_CATALOG: readonly string[] = Array.from(
  new Set([...careersEsCl.apply.availabilityOptions, ...careersEnUs.apply.availabilityOptions])
)

export interface HiringAvailabilityResolution {
  /** Valor canónico del catálogo cuando matchea; el texto acotado original cuando no. */
  value: string | null
  inCatalog: boolean
}

const toMatchKey = (value: string): string => normalizeNameStructural(value).toLowerCase()

const CATALOG_BY_KEY = new Map(HIRING_AVAILABILITY_CATALOG.map(option => [toMatchKey(option), option]))

/**
 * Resuelve el `availability` entregado contra el catálogo: match exacto o mecánico-seguro
 * (case-insensitive + whitespace colapsado + NFC) devuelve el valor CANÓNICO del catálogo;
 * cualquier otro texto se conserva tal cual (fallback tolerante, nunca rechaza).
 */
export const resolveHiringAvailability = (raw: string | null | undefined): HiringAvailabilityResolution => {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''

  if (!trimmed) return { value: null, inCatalog: false }

  const canonical = CATALOG_BY_KEY.get(toMatchKey(trimmed))

  if (canonical) return { value: canonical, inCatalog: true }

  return { value: trimmed, inCatalog: false }
}
