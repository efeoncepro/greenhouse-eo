/**
 * TASK-638 — Sanitización PII para prompts a Gemini.
 *
 * Antes de mandar texto al LLM, redactamos:
 *  - Emails (`local@domain.tld` → `<email>`)
 *  - UUIDs canónicos (8-4-4-4-12) → `<uuid>`
 *  - IDs largos (>= 24 hex chars) → `<long-id>`
 *  - Tokens tipo Bearer / API key fragments comunes → `<token>`
 *  - Chilean RUTs (`12.345.678-K`) → `<rut>`
 *
 * Reglas:
 *  - Determinista: input → output reproducible (sin estado externo).
 *  - No agresivo: mantenemos paths, identificadores cortos (`EO-RSR-1234`),
 *    códigos HTTP, mensajes de error. Solo redactamos lo que es plausible
 *    secret o PII.
 *  - Idempotente: aplicar dos veces no rompe el output.
 */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
const LONG_HEX_RE = /\b[a-f0-9]{24,}\b/gi
const BEARER_RE = /Bearer\s+[A-Za-z0-9._\-+/=]{16,}/g
const API_KEY_RE = /\b(?:sk|pk|gho|ghp|ghu|gh[s])[-_][A-Za-z0-9_-]{20,}\b/g
const RUT_RE = /\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/g

export const sanitizePiiText = (input: string): string => {
  if (!input) return input

  return input
    .replace(EMAIL_RE, '<email>')
    .replace(BEARER_RE, '<token>')
    .replace(API_KEY_RE, '<token>')
    .replace(UUID_RE, '<uuid>')
    .replace(LONG_HEX_RE, '<long-id>')
    .replace(RUT_RE, '<rut>')
}

/**
 * Aplica `sanitizePiiText` recursivamente a strings dentro de un objeto/array
 * arbitrario. Útil para sanitizar payloads completos (titles, summaries,
 * locations, evidence values) antes de mandarlos al LLM.
 *
 * No muta el input — retorna una copia limpia.
 */
export const sanitizePiiPayload = <T>(value: T): T => {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return sanitizePiiText(value) as unknown as T
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizePiiPayload(item)) as unknown as T
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizePiiPayload(val)
    }

    return result as unknown as T
  }

  return value
}
