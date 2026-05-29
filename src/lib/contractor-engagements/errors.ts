/**
 * TASK-790 — Contractor engagement domain error. Mirrors the repo validation
 * error pattern (statusCode + code). Messages are es-CL, safe to surface.
 */
export class ContractorEngagementValidationError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(message: string, code: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'ContractorEngagementValidationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}
