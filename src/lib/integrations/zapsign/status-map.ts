import type { SignatureRequestStatus, SignatureSignerStatus } from '@/lib/signatures/types'

import type { ZapSignDocument } from './client'

/**
 * TASK-491 — Pure mapping of ZapSign provider statuses to the canonical signature state machine
 * (TASK-490). Kept side-effect-free so it's unit-testable in isolation and so the adapter +
 * webhook handler share one source of truth.
 *
 * ZapSign document statuses observed: `pending`, `signed`, `refused` (+ defensive `expired`,
 * `cancelled`). Signer statuses: `new` / `link-opened` (→ pending), `signed`, `refused` (→ declined).
 *
 * The canonical state machine is monotonic + out-of-order tolerant (`applyProviderStatus`), so an
 * unknown/transitional ZapSign status maps conservatively to `sent`/`partially_signed` and never
 * forces a regression.
 */

type ZapSignSignerLike = NonNullable<ZapSignDocument['signers']>[number]

export const mapZapSignSignerStatus = (raw: string | null | undefined): SignatureSignerStatus => {
  const status = (raw ?? '').toLowerCase()

  if (status === 'signed') return 'signed'
  if (status === 'refused') return 'declined'

  return 'pending'
}

export const mapZapSignDocumentStatus = (
  doc: Pick<ZapSignDocument, 'status' | 'signers'>
): SignatureRequestStatus => {
  const status = (doc.status ?? '').toLowerCase()

  if (status === 'signed') return 'completed'
  if (status === 'refused') return 'failed'
  if (status === 'expired') return 'expired'
  if (status === 'cancelled' || status === 'canceled') return 'cancelled'

  // pending / unknown: partial if any signer already signed, else still out for signature.
  const signers: ZapSignSignerLike[] = doc.signers ?? []
  const anySigned = signers.some(signer => mapZapSignSignerStatus(signer.status) === 'signed')

  return anySigned ? 'partially_signed' : 'sent'
}
