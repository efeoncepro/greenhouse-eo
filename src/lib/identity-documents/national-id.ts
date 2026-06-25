/**
 * TASK-1253 — Core puro browser-safe de validación/normalización de `national_id`.
 *
 * ISOMÓRFICO: consumido por el servidor (`src/lib/growth/forms/validators`) **y**
 * por el renderer portable (`src/growth-forms-renderer`, bundle esbuild para
 * WordPress/Astro). Por eso este módulo (y todo lo que importe) **NUNCA** debe
 * importar `server-only`, `node:*` ni dependencias pesadas. El guard de pureza
 * (TASK-1253 Slice 2) lo enforce mecánicamente.
 *
 * El módulo-11 de Chile es la **misma** fuente de verdad que el dominio
 * person-legal-profile: `src/lib/person-legal-profile/normalize.ts` importa
 * `computeClRutCheckDigit` de aquí (dedup del algoritmo load-bearing).
 *
 * Contrato no-throwing: retorna `NationalIdResult`. NUNCA loggear el valor.
 */

export type NationalIdReasonCode =
  | 'national_id_required'
  | 'national_id_format'
  | 'national_id_check_digit'

export interface NationalIdResult {
  valid: boolean
  /** Uppercase, sin separadores. Para CL incluye dígito verificador. '' si vacío. */
  normalized: string
  /** Display ("12.345.678-K" para CL). Igual a `normalized` si no aplica formato. */
  formatted: string
  /** `null` si `valid`; snake_case estable si no. */
  reasonCode: NationalIdReasonCode | null
}

/**
 * Dígito verificador módulo-11 para Chile.
 * https://es.wikipedia.org/wiki/Rol_%C3%9Anico_Tributario#C%C3%A1lculo_del_d%C3%ADgito_verificador
 */
export const computeClRutCheckDigit = (numericPart: string): string => {
  const reversed = numericPart.split('').reverse().map(Number)
  const factors = [2, 3, 4, 5, 6, 7]
  let sum = 0

  for (let i = 0; i < reversed.length; i++) {
    sum += reversed[i]! * factors[i % 6]!
  }

  const remainder = 11 - (sum % 11)

  if (remainder === 11) return '0'
  if (remainder === 10) return 'K'

  return String(remainder)
}

const formatClRut = (normalized: string): string => {
  const body = normalized.slice(0, -1)
  const dv = normalized.slice(-1)
  const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${dotted}-${dv}`
}

/** Chile RUT con validación de dígito verificador (módulo-11). No-throwing. */
export const validateClRut = (raw: string): NationalIdResult => {
  const cleaned = raw.replace(/[.\s-]/g, '').toUpperCase()

  if (cleaned.length === 0) {
    return { valid: false, normalized: '', formatted: '', reasonCode: 'national_id_required' }
  }

  if (!/^\d{1,9}[\dK]$/.test(cleaned)) {
    return { valid: false, normalized: cleaned, formatted: cleaned, reasonCode: 'national_id_format' }
  }

  const numericPart = cleaned.slice(0, -1)
  const givenCheckDigit = cleaned.slice(-1)

  if (computeClRutCheckDigit(numericPart) !== givenCheckDigit) {
    return { valid: false, normalized: cleaned, formatted: formatClRut(cleaned), reasonCode: 'national_id_check_digit' }
  }

  return { valid: true, normalized: cleaned, formatted: formatClRut(cleaned), reasonCode: null }
}

/**
 * Validación estructural genérica (longitud + charset A-Z0-9). Ranura para países
 * sin validador dedicado todavía. Normaliza a uppercase sin separadores.
 */
export const validateGenericNationalId = (
  raw: string,
  opts?: { minLen?: number; maxLen?: number },
): NationalIdResult => {
  const cleaned = raw.replace(/[.\s-]/g, '').toUpperCase()
  const minLen = opts?.minLen ?? 4
  const maxLen = opts?.maxLen ?? 20

  if (cleaned.length === 0) {
    return { valid: false, normalized: '', formatted: '', reasonCode: 'national_id_required' }
  }

  if (cleaned.length < minLen || cleaned.length > maxLen || !/^[A-Z0-9]+$/.test(cleaned)) {
    return { valid: false, normalized: cleaned, formatted: cleaned, reasonCode: 'national_id_format' }
  }

  return { valid: true, normalized: cleaned, formatted: cleaned, reasonCode: null }
}

/**
 * Bounds estructurales por país (ISO 3166-1 alpha-2). CL usa el RUT real con
 * dígito verificador; el resto son ranuras estructurales hasta que cada país
 * reciba su validador dedicado (TASK-1253 follow-up).
 */
const GENERIC_BOUNDS: Record<string, { minLen: number; maxLen: number }> = {
  AR: { minLen: 7, maxLen: 11 },
  BR: { minLen: 11, maxLen: 14 },
  CO: { minLen: 6, maxLen: 10 },
  MX: { minLen: 12, maxLen: 18 },
  PE: { minLen: 8, maxLen: 12 },
  UY: { minLen: 7, maxLen: 8 },
  US: { minLen: 9, maxLen: 9 },
}

/**
 * Dispatch por país. `CL` → RUT con dígito verificador; resto → estructural con
 * bounds por país (o defaults si país desconocido).
 */
export const validateNationalIdByCountry = (country: string, raw: string): NationalIdResult => {
  const cc = (country ?? '').trim().toUpperCase()

  if (cc === 'CL') return validateClRut(raw)

  return validateGenericNationalId(raw, GENERIC_BOUNDS[cc])
}
