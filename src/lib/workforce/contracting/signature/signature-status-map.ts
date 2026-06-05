import type { SignatureRequestStatus } from '@/lib/signatures/types'

import type { WorkforceContractingCaseStatus } from '../types'

// TASK-1024 — Pure map from the canonical signature_request status (TASK-490) to the contracting
// case transition the reactive consumer should apply. Side-effect-free → unit-testable.
//
// `outboxEvent`: the downstream event TASK-1025 (emails) / TASK-1026 (registro DT) consume.
// `completed` → fully_signed (signature_completed); `failed`/`expired` → terminal non-completion
// (signature_failed, with the precise case status preserved). `partially_signed` is defensive
// (single-signer contracts go sent → completed; only multi-signer futures would partial-sign).

export interface SignatureToContractingTransition {
  caseStatus: WorkforceContractingCaseStatus
  /** Outbox event the consumer emits (null = audit-only, no downstream notification). */
  outboxEvent: 'signature_completed' | 'signature_failed' | null
}

export const mapSignatureStatusToContractingTransition = (
  signatureStatus: SignatureRequestStatus
): SignatureToContractingTransition | null => {
  switch (signatureStatus) {
    case 'completed':
      return { caseStatus: 'fully_signed', outboxEvent: 'signature_completed' }
    case 'partially_signed':
      return { caseStatus: 'partially_signed', outboxEvent: null }
    case 'failed':
      return { caseStatus: 'signature_failed', outboxEvent: 'signature_failed' }
    case 'expired':
      return { caseStatus: 'expired', outboxEvent: 'signature_failed' }
    // draft / sent / cancelled → no contracting-side transition driven by the webhook.
    default:
      return null
  }
}
