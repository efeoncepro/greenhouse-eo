import 'server-only'

import { NextResponse } from 'next/server'

import { redactErrorForResponse } from '@/lib/observability/redact'

import { ContractorEngagementValidationError } from './errors'

/**
 * TASK-790 — Canonical API error mapping for contractor engagements.
 *
 * Domain validation errors carry es-CL safe messages + a stable code → surfaced
 * verbatim (compliant with the canonical error contract: es-CL prose, no English,
 * no raw stack). Unexpected errors are sanitized via `redactErrorForResponse`
 * and never leak `error.message`/`error.stack` to the client.
 */
export const toContractorEngagementErrorResponse = (
  error: unknown
): NextResponse<{ error: string; code: string; actionable: boolean }> => {
  if (error instanceof ContractorEngagementValidationError) {
    return NextResponse.json(
      { error: error.message, code: error.code, actionable: false },
      { status: error.statusCode }
    )
  }

  return NextResponse.json(
    {
      error: 'No se pudo completar la operación del engagement contractor.',
      code: 'contractor_engagement_internal_error',
      actionable: true,
      detail: redactErrorForResponse(error)
    },
    { status: 500 }
  )
}
