/**
 * TASK-1339 — Growth CTA engine: hashes pseudónimos + fingerprint de dedupe.
 * El visitor/session/IP hash usa el `hashIdentifier` del port compartido
 * (`src/lib/growth/public-submission`) con salt propio del dominio CTA (los hashes
 * NO son joinables con los de forms a propósito; la reconciliación CTA↔form es por
 * submission id, no por visitante). NUNCA persistir el valor crudo.
 */
import 'server-only'

import { createHash } from 'crypto'

import { hashIdentifier } from '@/lib/growth/public-submission'

const CTA_HASH_SALT = process.env.GROWTH_CTA_HASH_SALT ?? 'greenhouse-growth-ctas-v1'

/** Hash pseudónimo de un identificador de visitante/sesión/IP. `null` si viene vacío. */
export const ctaIdentifierHash = (value: string | null | undefined): string | null =>
  hashIdentifier(value, CTA_HASH_SALT)

/**
 * Fingerprint de idempotencia del ingest (arch/task: visitor + kind + versión + ventana).
 * La ventana la aplica el lookup (`findRecentDuplicateEvent`), no el fingerprint.
 */
export const ctaEventDedupeFingerprint = (parts: {
  ctaVersionId: string
  eventKind: string
  visitorKeyHash: string | null
  ipHash: string | null
}): string =>
  createHash('sha256')
    .update(
      `${CTA_HASH_SALT}:${parts.ctaVersionId}:${parts.eventKind}:${parts.visitorKeyHash ?? ''}:${parts.ipHash ?? ''}`,
    )
    .digest('hex')
