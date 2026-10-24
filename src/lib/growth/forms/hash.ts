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

/**
 * Hash del aviso que el visitante vio en una presentación `inline_pill` (`ui_policy.inlinePill.note`), o `null` si la
 * versión no es una píldora o no declara aviso. Queda en el snapshot de consentimiento como evidencia: un destino que
 * suscribe por el acto de enviar (`consentBy: 'submission'`) sólo lo hace si el aviso existió.
 */
export const inlinePillNoticeHash = (uiPolicy: unknown): string | null => {
  if (!uiPolicy || typeof uiPolicy !== 'object') return null
  const policy = uiPolicy as { presentation?: unknown; inlinePill?: { note?: unknown } }
  const note = policy.presentation === 'inline_pill' ? policy.inlinePill?.note : undefined

  return typeof note === 'string' && note.trim() ? createHash('sha256').update(note.trim()).digest('hex') : null
}
