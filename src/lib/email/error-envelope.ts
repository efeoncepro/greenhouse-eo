import 'server-only'

import { NextResponse } from 'next/server'

/**
 * TASK-631 Fase 4 — Standardized error envelope (Stripe-style).
 *
 * All Greenhouse APIs that return errors should use `errorResponse()` to
 * produce a consistent shape: { error: { code, message, retryable, retry_after } }.
 * Clients can dispatch retry logic on `retryable` + `retry_after` without
 * parsing the human-readable message.
 */

export type ErrorCode =
  | 'idempotency_missing'
  | 'idempotency_malformed'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'rate_limited'
  | 'resend_api_error'
  | 'pdf_generation_failed'
  | 'quote_version_mismatch'
  | 'short_link_expired'
  | 'short_link_revoked'
  | 'short_link_org_mismatch'
  | 'no_recipients'
  | 'recipient_not_in_org'
  | 'config_missing'
  | 'internal_error'

interface ErrorEnvelope {
  error: {
    code: ErrorCode
    message: string
    retryable: boolean
    retry_after?: number
    details?: Record<string, unknown>
  }
}

const HTTP_STATUS_FOR_CODE: Record<ErrorCode, number> = {
  idempotency_missing: 400,
  idempotency_malformed: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 400,
  rate_limited: 429,
  resend_api_error: 502,
  pdf_generation_failed: 500,
  quote_version_mismatch: 409,
  short_link_expired: 410,
  short_link_revoked: 410,
  short_link_org_mismatch: 403,
  no_recipients: 400,
  recipient_not_in_org: 403,
  config_missing: 503,
  internal_error: 500
}

const RETRYABLE_CODES: Set<ErrorCode> = new Set([
  'rate_limited',
  'resend_api_error',
  'pdf_generation_failed',
  'internal_error'
])

interface ErrorResponseInput {
  code: ErrorCode
  message: string
  retryAfter?: number
  details?: Record<string, unknown>
}

export const errorResponse = (input: ErrorResponseInput): NextResponse<ErrorEnvelope> => {
  const status = HTTP_STATUS_FOR_CODE[input.code]
  const retryable = RETRYABLE_CODES.has(input.code)

  const envelope: ErrorEnvelope = {
    error: {
      code: input.code,
      message: input.message,
      retryable,
      ...(input.retryAfter !== undefined ? { retry_after: input.retryAfter } : {}),
      ...(input.details ? { details: input.details } : {})
    }
  }

  const headers: HeadersInit = {}

  if (input.retryAfter !== undefined) {
    headers['Retry-After'] = String(input.retryAfter)
  }

  return NextResponse.json(envelope, { status, headers })
}
