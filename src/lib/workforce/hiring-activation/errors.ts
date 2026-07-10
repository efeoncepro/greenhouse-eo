// TASK-770 — Errores del bridge hiring→HRIS. Mensajes es-CL seguros para el cliente +
// código estable (contrato canónico de error; la UI de 1368 localiza desde el código).

export class HiringActivationError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(message: string, code: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'HiringActivationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * Conflicto de identidad al materializar el member (espejo del MemberIdentityDriftError del
 * SCIM): NUNCA auto-merge — el request queda `blocked` y un humano resuelve.
 */
export class HiringActivationIdentityConflictError extends HiringActivationError {
  readonly kind: 'ambiguous_identity' | 'member_conflict' | 'member_already_active'

  constructor(
    kind: 'ambiguous_identity' | 'member_conflict' | 'member_already_active',
    message: string,
    details?: unknown,
  ) {
    super(message, `hiring_activation_${kind}`, 409, details)
    this.name = 'HiringActivationIdentityConflictError'
    this.kind = kind
  }
}

export const isHiringActivationError = (error: unknown): error is HiringActivationError =>
  error instanceof HiringActivationError
