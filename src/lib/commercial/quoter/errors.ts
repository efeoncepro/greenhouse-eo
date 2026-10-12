import 'server-only'

/**
 * Closed registry of the rejections of the quoter registry (TASK-2025).
 *
 * These are the rejections of the STATEFUL side: a document already held, a pointer that moved, a quote that did
 * not calculate. The rejections of the engine keep their own registry (`PricingV3Error`, in
 * `src/lib/finance/pricing-v3/errors.ts`) and pass through untouched: nothing here renames or wraps their codes.
 *
 * A code names the cause. `detail` carries identifiers, versions, states and digests only: never the text of a
 * document, a pointer or an artifact, which hold internal costs and margins. Turning a code into an HTTP status is
 * the job of the API tasks, not of this folder.
 */
export const QUOTER_ERROR_CODES = [
  // Source documents and pointer
  'source_document_exists',
  'source_document_not_found',
  'pointer_conflict',
  'pointer_names_unknown_document',
  // What is stored no longer matches its digest: never a caller error
  'stored_digest_mismatch',
  // Quote aggregate
  'quote_not_found',
  'version_not_found',
  'quote_not_calculated',
  'artifact_already_registered',
  'version_conflict',
  'invalid_transition',
  'recipient_required',
  'recipient_locked',
  'recipient_organization_invalid',
  'number_already_assigned',
  'exception_already_approved',
  'document_locked',
  // Acts that only an identified person performs
  'human_actor_required',
  // Authorization and ownership
  'forbidden',
  'owner_organization_unavailable'
] as const

export type QuoterErrorCode = (typeof QUOTER_ERROR_CODES)[number]

export type QuoterErrorDetail = Record<string, string | number | boolean | null>

export class QuoterError extends Error {
  readonly code: QuoterErrorCode
  readonly detail: QuoterErrorDetail

  constructor(code: QuoterErrorCode, detail: QuoterErrorDetail = {}) {
    // The message is the code itself, so a log line or an assertion never depends on prose.
    super(code)
    this.name = 'QuoterError'
    this.code = code
    this.detail = detail
  }
}

export const isQuoterError = (error: unknown): error is QuoterError => error instanceof QuoterError
