/**
 * Sanitización específica para prompts de conciliación bancaria.
 *
 * Las descripciones de cartola, referencias y evidence metadata son datos no
 * confiables: pueden contener PII, números bancarios o texto tipo prompt
 * injection. Esta capa conserva señales operativas útiles (monto, fecha,
 * moneda, tags normalizados) y redacta identificadores sensibles.
 */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
const LONG_HEX_RE = /\b[a-f0-9]{24,}\b/gi
const DOTTED_RUT_RE = /\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/g
const PLAIN_RUT_RE = /\b\d{7,8}-[\dkK]\b/g
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g
const ACCOUNT_LIKE_RE = /\b(?:cta|cuenta|account)\s*[:#-]?\s*(?:[a-z0-9*_-]{6,24}|(?:\d[ -]?){6,19})\b/gi
const BANK_REFERENCE_RE = /\b(?:ref|referencia|folio|operacion|operación|trx|transaccion|transacción)\s*[:#-]?\s*[a-z0-9._-]{6,40}\b/gi

export const sanitizeBankText = (input: string | null | undefined): string => {
  if (!input) return ''

  return input
    .replace(EMAIL_RE, '<email>')
    .replace(DOTTED_RUT_RE, '<rut>')
    .replace(PLAIN_RUT_RE, '<rut>')
    .replace(CARD_RE, '<card-or-account>')
    .replace(BANK_REFERENCE_RE, '<bank-reference>')
    .replace(ACCOUNT_LIKE_RE, '<bank-account-ref>')
    .replace(UUID_RE, '<uuid>')
    .replace(LONG_HEX_RE, '<long-id>')
    .replace(/\s+/g, ' ')
    .trim()
}

export const normalizePromptString = (input: string | null | undefined, maxLength = 180): string => {
  const sanitized = sanitizeBankText(input)

  return sanitized.length <= maxLength ? sanitized : `${sanitized.slice(0, maxLength)}...`
}

export const sanitizePromptPayload = <T>(value: T): T => {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return normalizePromptString(value, 320) as T
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizePromptPayload(item)) as T
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizePromptPayload(val)
    }

    return result as T
  }

  return value
}
