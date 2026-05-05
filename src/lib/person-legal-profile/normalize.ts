import 'server-only'

import crypto from 'node:crypto'

import { PersonLegalProfileValidationError } from './errors'
import { resolvePiiNormalizationPepper } from './normalize-pepper'
import type { PersonDocumentType } from './types'

/**
 * TASK-784 — Validation + normalization para documentos de identidad.
 *
 * Cada document_type tiene su propio validator. La interface es uniforme:
 *   - normalize(input) → normalized_value (uppercase, sin separadores).
 *   - validate(normalized) → throws si formato invalido.
 *   - formatDisplay(normalized) → string presentable al usuario.
 *
 * Para Chile RUT, el digito verificador se valida con modulo 11.
 * Para otros documentos, validacion estructural minima (longitud + charset).
 *
 * NUNCA loggear el valor (normalized o raw). Para errors, mensajes solo
 * indican el tipo + razon ("CL_RUT digito verificador invalido"), no el valor.
 */

interface DocumentValidator {
  normalize(rawInput: string): string
  validate(normalizedValue: string): void
  formatDisplay(normalizedValue: string): string
}

/**
 * Calcula digito verificador modulo 11 para Chile.
 * https://es.wikipedia.org/wiki/Rol_%C3%9Anico_Tributario#C%C3%A1lculo_del_d%C3%ADgito_verificador
 */
const computeClRutCheckDigit = (numericPart: string): string => {
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

const CL_RUT_VALIDATOR: DocumentValidator = {
  normalize(rawInput: string): string {
    const cleaned = rawInput.replace(/[.\s-]/g, '').toUpperCase()

    if (!/^\d{1,9}[\dK]$/.test(cleaned)) {
      throw new PersonLegalProfileValidationError(
        'CL_RUT formato invalido (esperado: 7-9 digitos + digito verificador 0-9 o K)',
        'invalid_document_format'
      )
    }

    return cleaned
  },

  validate(normalizedValue: string): void {
    const numericPart = normalizedValue.slice(0, -1)
    const givenCheckDigit = normalizedValue.slice(-1)
    const expected = computeClRutCheckDigit(numericPart)

    if (expected !== givenCheckDigit) {
      throw new PersonLegalProfileValidationError(
        'CL_RUT digito verificador invalido',
        'invalid_document_format'
      )
    }
  },

  formatDisplay(normalizedValue: string): string {
    const numericPart = normalizedValue.slice(0, -1)
    const checkDigit = normalizedValue.slice(-1)

    // Reverse-iterate digits, group of 3
    const reversed = numericPart.split('').reverse()
    const groups: string[] = []

    for (let i = 0; i < reversed.length; i += 3) {
      groups.push(reversed.slice(i, i + 3).reverse().join(''))
    }

    return `${groups.reverse().join('.')}-${checkDigit}`
  }
}

const GENERIC_NUMERIC_VALIDATOR_FACTORY = (
  documentType: PersonDocumentType,
  minLen: number,
  maxLen: number
): DocumentValidator => ({
  normalize(rawInput: string): string {
    return rawInput.replace(/[.\s-]/g, '').toUpperCase()
  },

  validate(normalizedValue: string): void {
    if (normalizedValue.length < minLen || normalizedValue.length > maxLen) {
      throw new PersonLegalProfileValidationError(
        `${documentType} longitud invalida (esperado entre ${minLen} y ${maxLen} caracteres)`,
        'invalid_document_format'
      )
    }

    if (!/^[A-Z0-9]+$/.test(normalizedValue)) {
      throw new PersonLegalProfileValidationError(
        `${documentType} contiene caracteres invalidos (solo A-Z y 0-9 permitidos)`,
        'invalid_document_format'
      )
    }
  },

  formatDisplay(normalizedValue: string): string {
    return normalizedValue
  }
})

/**
 * Registry extensible. Por defecto cada document_type tiene un validator
 * generico estructural. Casos especificos (CL_RUT, BR_CPF, etc.) registran
 * validator dedicado con check digit / formato.
 *
 * Para agregar un nuevo document_type:
 *   1. Agregar al CHECK constraint de la migration.
 *   2. Agregar al PERSON_DOCUMENT_TYPES tuple en types.ts.
 *   3. Registrar validator aqui (o cae a generic).
 */
const VALIDATORS: Record<PersonDocumentType, DocumentValidator> = {
  CL_RUT: CL_RUT_VALIDATOR,
  CL_PASSPORT: GENERIC_NUMERIC_VALIDATOR_FACTORY('CL_PASSPORT', 6, 12),
  CL_DNE: GENERIC_NUMERIC_VALIDATOR_FACTORY('CL_DNE', 6, 12),
  AR_DNI: GENERIC_NUMERIC_VALIDATOR_FACTORY('AR_DNI', 7, 8),
  AR_CUIL: GENERIC_NUMERIC_VALIDATOR_FACTORY('AR_CUIL', 11, 11),
  AR_CUIT: GENERIC_NUMERIC_VALIDATOR_FACTORY('AR_CUIT', 11, 11),
  BR_CPF: GENERIC_NUMERIC_VALIDATOR_FACTORY('BR_CPF', 11, 11),
  BR_RG: GENERIC_NUMERIC_VALIDATOR_FACTORY('BR_RG', 5, 14),
  CO_CC: GENERIC_NUMERIC_VALIDATOR_FACTORY('CO_CC', 6, 10),
  CO_CE: GENERIC_NUMERIC_VALIDATOR_FACTORY('CO_CE', 6, 10),
  CO_NIT: GENERIC_NUMERIC_VALIDATOR_FACTORY('CO_NIT', 9, 10),
  MX_CURP: GENERIC_NUMERIC_VALIDATOR_FACTORY('MX_CURP', 18, 18),
  MX_RFC: GENERIC_NUMERIC_VALIDATOR_FACTORY('MX_RFC', 12, 13),
  PE_DNI: GENERIC_NUMERIC_VALIDATOR_FACTORY('PE_DNI', 8, 8),
  PE_CE: GENERIC_NUMERIC_VALIDATOR_FACTORY('PE_CE', 9, 12),
  UY_CI: GENERIC_NUMERIC_VALIDATOR_FACTORY('UY_CI', 7, 8),
  US_SSN: GENERIC_NUMERIC_VALIDATOR_FACTORY('US_SSN', 9, 9),
  US_PASSPORT: GENERIC_NUMERIC_VALIDATOR_FACTORY('US_PASSPORT', 6, 9),
  US_EIN: GENERIC_NUMERIC_VALIDATOR_FACTORY('US_EIN', 9, 9),
  EU_PASSPORT: GENERIC_NUMERIC_VALIDATOR_FACTORY('EU_PASSPORT', 6, 12),
  EU_NATIONAL_ID: GENERIC_NUMERIC_VALIDATOR_FACTORY('EU_NATIONAL_ID', 5, 16),
  GENERIC_PASSPORT: GENERIC_NUMERIC_VALIDATOR_FACTORY('GENERIC_PASSPORT', 4, 16),
  GENERIC_NATIONAL_ID: GENERIC_NUMERIC_VALIDATOR_FACTORY('GENERIC_NATIONAL_ID', 4, 20),
  GENERIC_TAX_ID: GENERIC_NUMERIC_VALIDATOR_FACTORY('GENERIC_TAX_ID', 4, 20)
}

export interface NormalizedDocument {
  /** Valor normalizado: uppercase, sin separadores. Para Chile incluye DV. */
  normalized: string
  /** Valor formateado para presentacion (ej. "12.345.678-K" para CL_RUT). */
  formatted: string
}

/**
 * Normaliza + valida un documento. Throws si formato invalido o digito
 * verificador no cuadra.
 *
 * Patron de uso:
 *   const { normalized, formatted } = normalizeDocument('CL_RUT', '12.345.678-K')
 *   const hash = await computeValueHash(normalized)
 *   const mask = formatDisplayMask('CL_RUT', formatted)
 */
export const normalizeDocument = (
  documentType: PersonDocumentType,
  rawInput: string
): NormalizedDocument => {
  if (typeof rawInput !== 'string' || rawInput.trim().length === 0) {
    throw new PersonLegalProfileValidationError(
      `${documentType} valor requerido`,
      'invalid_document_format'
    )
  }

  const validator = VALIDATORS[documentType]

  if (!validator) {
    throw new PersonLegalProfileValidationError(
      `${documentType} no tiene validator registrado`,
      'invalid_document_format'
    )
  }

  const normalized = validator.normalize(rawInput)

  validator.validate(normalized)

  return {
    normalized,
    formatted: validator.formatDisplay(normalized)
  }
}

/**
 * SHA-256(pepper || normalized_value). Pepper desde Secret Manager.
 *
 * El hash se usa para:
 *   - Detectar duplicate active document por (profile, type, country, hash)
 *     mediante index parcial.
 *   - Drift signal: misma persona declarando RUT distinto en 2 perfiles
 *     (potencial fraude o data quality issue).
 *
 * El hash NUNCA se devuelve en API publicas. Solo internal queries lo usan.
 */
export const computeValueHash = async (normalizedValue: string): Promise<string> => {
  const pepper = await resolvePiiNormalizationPepper()

  return crypto.createHash('sha256').update(`${pepper}${normalizedValue}`).digest('hex')
}

/**
 * Normalize country_code a ISO 3166-1 alpha-2 uppercase.
 * Throws si el input no matchea el patron.
 */
export const normalizeCountryCode = (input: string): string => {
  if (typeof input !== 'string') {
    throw new PersonLegalProfileValidationError(
      'country_code requerido',
      'invalid_country_code'
    )
  }

  const upper = input.trim().toUpperCase()

  if (!/^[A-Z]{2}$/.test(upper)) {
    throw new PersonLegalProfileValidationError(
      `country_code formato invalido (esperado ISO 3166-1 alpha-2): ${upper}`,
      'invalid_country_code'
    )
  }

  return upper
}
