/**
 * TASK-1229 — Growth Forms engine: fingerprint de dedupe.
 * El email/IP hash usa el `hashIdentifier` del port compartido
 * (`src/lib/growth/public-submission`); acá vive sólo el fingerprint de dedupe
 * (formId + campos clave), específico del motor. NUNCA persistir el valor crudo.
 */
import 'server-only'

import { createHash } from 'crypto'

const FORMS_HASH_SALT = process.env.GROWTH_FORMS_HASH_SALT ?? 'greenhouse-growth-forms-v1'

/** Fingerprint de dedupe: formId + email + campos clave normalizados. */
export const dedupeFingerprint = (formId: string, parts: Array<string | null | undefined>): string =>
  createHash('sha256')
    .update(`${FORMS_HASH_SALT}:${formId}:${parts.map(p => (p ?? '').trim().toLowerCase()).join('|')}`)
    .digest('hex')
