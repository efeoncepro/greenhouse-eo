import 'server-only'

/**
 * Proposal Studio F0 — translator de errores tipados → contrato canónico HTTP (TASK-1392).
 *
 * Los routes son THIN: parsean input, pasan por `assertProposalStudioAccess` y delegan en los
 * primitives; TODO error sale por acá — es-CL canónico, sin contenido comercial, sin stack.
 */

import type { NextResponse } from 'next/server'

import { canonicalErrorResponse, type CanonicalErrorBody } from '@/lib/api/canonical-error-response'
import { captureWithDomain } from '@/lib/observability/capture'

import { InvalidTenderStateTransitionError } from '../tender-state-machine'
import {
  ProposalEntitlementError,
  ProposalForbiddenError,
  ProposalHumanGateError,
  ProposalInputError,
  ProposalNotFoundError,
  ProposalQuoteGateError,
  ProposalQuoteMismatchError
} from './errors'

export const proposalErrorResponse = (error: unknown): NextResponse<CanonicalErrorBody> => {
  if (error instanceof ProposalNotFoundError) {
    return canonicalErrorResponse('proposal_not_found')
  }

  if (error instanceof ProposalInputError || error instanceof ProposalQuoteMismatchError) {
    return canonicalErrorResponse('proposal_invalid_input')
  }

  if (error instanceof InvalidTenderStateTransitionError) {
    return canonicalErrorResponse('proposal_invalid_transition')
  }

  if (error instanceof ProposalHumanGateError) {
    return canonicalErrorResponse('proposal_human_gate_required')
  }

  if (error instanceof ProposalQuoteGateError) {
    return canonicalErrorResponse('proposal_quote_gate_failed')
  }

  if (error instanceof ProposalEntitlementError) {
    return canonicalErrorResponse('proposal_not_entitled')
  }

  if (error instanceof ProposalForbiddenError) {
    return canonicalErrorResponse('forbidden')
  }

  captureWithDomain(error, 'commercial', { tags: { source: 'proposal_studio_api' } })

  return canonicalErrorResponse('internal_error')
}
