/**
 * TASK-353 — Hiring / ATS domain errors. Espeja el patrón de validación del repo
 * (statusCode + code + details safe). Mensajes es-CL, seguros para surface al cliente.
 * Arch: GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md.
 */
export class HiringValidationError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(message: string, code: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'HiringValidationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class HiringNotFoundError extends Error {
  readonly statusCode = 404
  readonly code: string

  constructor(message: string, code = 'hiring_not_found') {
    super(message)
    this.name = 'HiringNotFoundError'
    this.code = code
  }
}

export const isHiringError = (error: unknown): error is HiringValidationError | HiringNotFoundError =>
  error instanceof HiringValidationError || error instanceof HiringNotFoundError
