import 'server-only'

/**
 * TASK-784 — Errors canonicos del modulo person-legal-profile.
 *
 * NUNCA incluir `value_full` o cualquier valor sensible en el mensaje del
 * error. Los mensajes salen al cliente via redactErrorForResponse, pero
 * defense-in-depth: nunca confiar en sanitizers downstream.
 */

export type PersonLegalProfileErrorCode =
  | 'invalid_input'
  | 'document_not_found'
  | 'address_not_found'
  | 'profile_not_found'
  | 'duplicate_active_document'
  | 'duplicate_active_address'
  | 'invalid_document_format'
  | 'invalid_country_code'
  | 'reason_required'
  | 'verification_status_invalid'
  | 'document_already_archived'
  | 'document_archived'
  | 'reveal_capability_missing'
  | 'reveal_disabled_for_status'
  | 'rejection_reason_too_short'
  | 'pepper_unavailable'

export class PersonLegalProfileError extends Error {
  public readonly code: PersonLegalProfileErrorCode
  public readonly statusCode: number

  constructor(message: string, code: PersonLegalProfileErrorCode, statusCode = 400) {
    super(message)
    this.name = 'PersonLegalProfileError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class PersonLegalProfileValidationError extends PersonLegalProfileError {
  constructor(message: string, code: PersonLegalProfileErrorCode = 'invalid_input', statusCode = 400) {
    super(message, code, statusCode)
    this.name = 'PersonLegalProfileValidationError'
  }
}
