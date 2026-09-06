/**
 * TASK-1631 — Errores del dominio external-access.
 *
 * Cada causa tiene su código: las rutas los traducen al contrato canónico es-CL
 * (`canonicalErrorResponse`) y nunca exponen `message` crudo al cliente.
 */

export type ExternalAccessErrorCode =
  | 'invalid_request'
  | 'not_found'
  | 'conflict'
  | 'organization_not_eligible'
  | 'environment_not_active'
  | 'binding_not_active'
  | 'invitation_not_open'
  | 'invitation_expired'
  | 'identity_collision'
  | 'canary_not_registered'
  | 'canary_expired'
  | 'capability_not_allowed'
  | 'canary_cleanup_blocked'
  // TASK-1837 — autoridad delegada, topes de reenvío/asientos.
  | 'forbidden'
  | 'rate_limited'
  | 'limit_reached'

const STATUS_BY_CODE: Record<ExternalAccessErrorCode, number> = {
  invalid_request: 422,
  not_found: 404,
  conflict: 409,
  organization_not_eligible: 422,
  environment_not_active: 409,
  binding_not_active: 409,
  invitation_not_open: 409,
  invitation_expired: 410,
  identity_collision: 409,
  canary_not_registered: 404,
  canary_expired: 410,
  capability_not_allowed: 403,
  canary_cleanup_blocked: 409,
  forbidden: 403,
  rate_limited: 429,
  limit_reached: 422
}

export class ExternalAccessError extends Error {
  readonly code: ExternalAccessErrorCode
  readonly statusCode: number
  /** Sólo identificadores y nombres de campo; nunca tokens, emails de terceros ni claims. */
  readonly details: Record<string, string | number | boolean | null> | undefined

  constructor(
    code: ExternalAccessErrorCode,
    message: string,
    details?: Record<string, string | number | boolean | null>
  ) {
    super(message)
    this.name = 'ExternalAccessError'
    this.code = code
    this.statusCode = STATUS_BY_CODE[code]
    this.details = details
  }
}

export const isExternalAccessError = (error: unknown): error is ExternalAccessError =>
  error instanceof ExternalAccessError
