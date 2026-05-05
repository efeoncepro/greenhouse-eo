import 'server-only'

import type { SelfServiceRegime } from './resolve-self-service-context'

/**
 * TASK-753 — Schema-driven validators for self-service payment profile
 * submissions. Cliente-side puede usar las mismas reglas; servidor-side
 * SIEMPRE re-valida (defense in depth).
 *
 * Cada regime declara qué campos exige + reglas. Para extender (e.g. nuevo
 * país con IBAN canónico), agregar entrada al `REGIME_VALIDATORS`. Cero
 * branching inline en consumers.
 */

export interface SelfServiceSubmission {
  bankName?: string | null
  accountNumberFull?: string | null
  accountHolderName?: string | null

  // Chile-specific
  accountTypeCl?: 'cuenta_corriente' | 'cuenta_vista' | 'cuenta_rut' | 'chequera_electronica' | null
  rut?: string | null

  // Internacional-specific
  countryCode?: string | null
  swiftBic?: string | null
  ibanOrAccount?: string | null

  notes?: string | null
}

export interface ValidationError {
  field: string
  code: string
  message: string
}

export interface ValidationResult {
  ok: boolean
  errors: ValidationError[]
}

// ──────────────────────────────────────────────────────────────────────────────
// Validators
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verifies a Chilean RUT using módulo-11. Accepts formatted (12.345.678-9)
 * or plain (123456789). The dígito verificador can be 0-9 or 'K'.
 */
export const isValidChileanRut = (raw: string): boolean => {
  if (!raw) return false

  const cleaned = raw.replace(/\./g, '').replace(/-/g, '').toUpperCase().trim()

  if (cleaned.length < 2 || cleaned.length > 9) return false
  if (!/^\d+[0-9K]$/.test(cleaned)) return false

  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)

  let sum = 0
  let multiplier = 2

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = 11 - (sum % 11)
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)

  return dv === expected
}

/**
 * SWIFT/BIC: 8 or 11 alphanumeric chars.
 *   - 4 letters bank code
 *   - 2 letters country code (ISO 3166-1 alpha-2)
 *   - 2 alphanumeric location code
 *   - optional 3 alphanumeric branch code
 */
const SWIFT_REGEX = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/

export const isValidSwiftBic = (raw: string): boolean => {
  if (!raw) return false

  return SWIFT_REGEX.test(raw.toUpperCase().trim())
}

const CL_ACCOUNT_TYPES = [
  'cuenta_corriente',
  'cuenta_vista',
  'cuenta_rut',
  'chequera_electronica'
] as const

// ──────────────────────────────────────────────────────────────────────────────
// Regime-specific validators
// ──────────────────────────────────────────────────────────────────────────────

const validateChile = (input: SelfServiceSubmission): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!input.bankName || input.bankName.trim().length < 2) {
    errors.push({ field: 'bankName', code: 'required', message: 'Selecciona o ingresa el nombre del banco.' })
  }

  if (!input.accountTypeCl || !CL_ACCOUNT_TYPES.includes(input.accountTypeCl)) {
    errors.push({ field: 'accountTypeCl', code: 'required', message: 'Selecciona el tipo de cuenta.' })
  }

  if (!input.accountNumberFull || !/^\d{6,20}$/.test(input.accountNumberFull.replace(/\s/g, ''))) {
    errors.push({
      field: 'accountNumberFull',
      code: 'invalid_format',
      message: 'Número de cuenta inválido. Solo números, entre 6 y 20 dígitos.'
    })
  }

  if (!input.rut || !isValidChileanRut(input.rut)) {
    errors.push({
      field: 'rut',
      code: 'invalid_rut',
      message: 'RUT inválido. Revisa el dígito verificador.'
    })
  }

  if (!input.accountHolderName || input.accountHolderName.trim().length < 3) {
    errors.push({
      field: 'accountHolderName',
      code: 'required',
      message: 'Nombre del titular requerido.'
    })
  }

  return errors
}

const validateInternational = (input: SelfServiceSubmission): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!input.countryCode || !/^[A-Z]{2}$/.test(input.countryCode.toUpperCase())) {
    errors.push({ field: 'countryCode', code: 'required', message: 'Selecciona el país del banco (ISO 2 letras).' })
  }

  if (!input.bankName || input.bankName.trim().length < 2) {
    errors.push({ field: 'bankName', code: 'required', message: 'Ingresa el nombre del banco.' })
  }

  if (!input.swiftBic || !isValidSwiftBic(input.swiftBic)) {
    errors.push({
      field: 'swiftBic',
      code: 'invalid_swift',
      message: 'SWIFT/BIC inválido. Debe tener 8 u 11 caracteres alfanuméricos.'
    })
  }

  if (!input.ibanOrAccount || input.ibanOrAccount.replace(/\s/g, '').length < 4) {
    errors.push({
      field: 'ibanOrAccount',
      code: 'required',
      message: 'Ingresa el IBAN o número de cuenta.'
    })
  }

  if (!input.accountHolderName || input.accountHolderName.trim().length < 3) {
    errors.push({
      field: 'accountHolderName',
      code: 'required',
      message: 'Nombre legal del titular requerido.'
    })
  }

  return errors
}

const REGIME_VALIDATORS: Record<SelfServiceRegime, ((i: SelfServiceSubmission) => ValidationError[]) | null> = {
  chile_dependent: validateChile,
  honorarios_chile: validateChile,
  international: validateInternational,
  unset: null
}

export const validateSelfServiceSubmission = (
  regime: SelfServiceRegime,
  input: SelfServiceSubmission
): ValidationResult => {
  if (regime === 'unset') {
    return {
      ok: false,
      errors: [
        {
          field: '__regime__',
          code: 'regime_unset',
          message: 'No podemos identificar tu régimen. Contacta a finance.'
        }
      ]
    }
  }

  const validator = REGIME_VALIDATORS[regime]

  if (!validator) {
    return { ok: false, errors: [{ field: '__regime__', code: 'regime_unsupported', message: `Régimen ${regime} no soportado.` }] }
  }

  const errors = validator(input)

  return { ok: errors.length === 0, errors }
}

/**
 * Helper: normaliza un RUT a formato canónico `12.345.678-9`. Si no es válido,
 * retorna el input original sin tocar.
 */
export const formatChileanRut = (raw: string): string => {
  if (!raw) return raw

  const cleaned = raw.replace(/\./g, '').replace(/-/g, '').toUpperCase().trim()

  if (!/^\d+[0-9K]?$/.test(cleaned)) return raw

  // Too short to format meaningfully — return raw to avoid premature dashes.
  if (cleaned.length < 4) return cleaned

  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)

  // Group body in thousands
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${formatted}-${dv}`
}
