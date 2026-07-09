/**
 * Pure E.164 phone utilities shared by Growth Forms renderer, server validators,
 * and first-party Next.js forms that need Growth Forms parity without importing
 * the full validator registry.
 */

export interface PhoneValidatorParams {
  /** ISO 3166-1 alpha-2; default `CL`. */
  country?: string
}

export interface E164PhoneValidationResult {
  valid: boolean
  normalized: string
  formatted: string
  reasonCode: 'field_required' | 'phone_format' | null
}

/**
 * Calling codes E.164 for countries supported by the Growth Forms phone mask.
 */
export const CALLING_CODES: Record<string, string> = {
  CL: '56',
  AR: '54',
  BO: '591',
  BR: '55',
  CA: '1',
  CO: '57',
  CR: '506',
  EC: '593',
  ES: '34',
  GB: '44',
  GT: '502',
  MX: '52',
  PA: '507',
  PE: '51',
  PY: '595',
  US: '1',
  UY: '598',
  VE: '58',
}

const asString = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(',')
  if (typeof value === 'boolean') return value ? 'true' : ''

  return value == null ? '' : String(value)
}

export const validateE164PhoneValue = (
  raw: unknown,
  params?: PhoneValidatorParams,
): E164PhoneValidationResult => {
  const input = asString(raw).trim()

  if (input.length === 0) {
    return { valid: false, normalized: '', formatted: '', reasonCode: 'field_required' }
  }

  const hasPlus = input.startsWith('+')
  let digits = input.replace(/\D/g, '')

  if (!hasPlus) {
    const cc = CALLING_CODES[(params?.country ?? 'CL').toUpperCase()] ?? ''

    if (cc && !digits.startsWith(cc)) digits = `${cc}${digits}`
  }

  const e164 = `+${digits}`

  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    return { valid: false, normalized: e164, formatted: e164, reasonCode: 'phone_format' }
  }

  return { valid: true, normalized: e164, formatted: e164, reasonCode: null }
}
