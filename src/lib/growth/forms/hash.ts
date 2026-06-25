/**
 * TASK-1229 — Growth Forms engine: hashing determinista para dedupe + email hash.
 * Local al motor (sin acoplar al grader; la unificación de hashing/abuse vive en
 * la convergencia TASK-1251). NUNCA persistir el valor crudo del email.
 */
import 'server-only'

import { createHash } from 'crypto'

const FORMS_HASH_SALT = process.env.GROWTH_FORMS_HASH_SALT ?? 'greenhouse-growth-forms-v1'

export const hashValue = (value: string | null | undefined): string | null => {
  if (!value) return null
  
return createHash('sha256').update(`${FORMS_HASH_SALT}:${value.trim().toLowerCase()}`).digest('hex')
}

/** Fingerprint de dedupe: formId + email + campos clave normalizados. */
export const dedupeFingerprint = (formId: string, parts: Array<string | null | undefined>): string =>
  createHash('sha256')
    .update(`${FORMS_HASH_SALT}:${formId}:${parts.map(p => (p ?? '').trim().toLowerCase()).join('|')}`)
    .digest('hex')
