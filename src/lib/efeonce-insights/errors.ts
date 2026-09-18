/**
 * TASK-1845 — errores tipados del dominio Insights. El transporte (App/Ecosystem/MCP) los
 * traduce a códigos canónicos sanitizados (arquitectura §7): forbidden, invalid_window,
 * unsupported_window, insufficient_data, method_mismatch, not_ready, quota_exceeded,
 * not_found, conflicto de idempotencia. Nunca raw errors ni evidencia en el mensaje.
 */

export type InsightsErrorCode =
  | 'invalid_request'
  | 'forbidden'
  | 'not_found'
  | 'invalid_window'
  | 'unsupported_window'
  | 'insufficient_data'
  | 'method_mismatch'
  | 'evidence_rejected'
  | 'not_ready'
  | 'invalid_transition'
  | 'human_gate_required'
  | 'idempotency_conflict'
  | 'generation_disabled'
  | 'issuance_disabled'
  | 'quota_exceeded'
  | 'render_disabled'
  | 'render_rejected'
  | 'sharing_disabled'
  | 'delivery_disabled'
  | 'schedules_disabled'

export class InsightsError extends Error {
  readonly code: InsightsErrorCode
  readonly statusCode: number
  readonly details: Record<string, unknown>

  constructor(code: InsightsErrorCode, message: string, statusCode: number, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'InsightsError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class InsightsInputError extends InsightsError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('invalid_request', message, 400, details)
    this.name = 'InsightsInputError'
  }
}

export class InsightsForbiddenError extends InsightsError {
  constructor(message = 'Acción no autorizada para este actor/organización', details: Record<string, unknown> = {}) {
    super('forbidden', message, 403, details)
    this.name = 'InsightsForbiddenError'
  }
}

export class InsightsNotFoundError extends InsightsError {
  constructor(resource: string, id: string) {
    super('not_found', `${resource} no encontrado`, 404, { resource, id })
    this.name = 'InsightsNotFoundError'
  }
}

export class InsightsInvalidWindowError extends InsightsError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('invalid_window', message, 400, details)
    this.name = 'InsightsInvalidWindowError'
  }
}

export class InsightsUnsupportedWindowError extends InsightsError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('unsupported_window', message, 422, details)
    this.name = 'InsightsUnsupportedWindowError'
  }
}

export class InsightsInsufficientDataError extends InsightsError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('insufficient_data', message, 422, details)
    this.name = 'InsightsInsufficientDataError'
  }
}

export class InsightsMethodMismatchError extends InsightsError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('method_mismatch', message, 422, details)
    this.name = 'InsightsMethodMismatchError'
  }
}

export class InsightsEvidenceRejectedError extends InsightsError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('evidence_rejected', message, 422, details)
    this.name = 'InsightsEvidenceRejectedError'
  }
}

export class InsightsNotReadyError extends InsightsError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('not_ready', message, 409, details)
    this.name = 'InsightsNotReadyError'
  }
}

export class InsightsInvalidTransitionError extends InsightsError {
  constructor(from: string, to: string, editionId: string) {
    super('invalid_transition', `Transición ${from} → ${to} no permitida`, 409, { from, to, editionId })
    this.name = 'InsightsInvalidTransitionError'
  }
}

export class InsightsHumanGateError extends InsightsError {
  constructor(from: string, to: string) {
    super('human_gate_required', `La transición ${from} → ${to} exige una persona autenticada`, 403, { from, to })
    this.name = 'InsightsHumanGateError'
  }
}

export class InsightsIdempotencyConflictError extends InsightsError {
  constructor(idempotencyKey: string, existingEditionId: string) {
    super('idempotency_conflict', 'La idempotency key ya se usó con un encargo distinto', 409, {
      idempotencyKey,
      existingEditionId
    })
    this.name = 'InsightsIdempotencyConflictError'
  }
}

export class InsightsGenerationDisabledError extends InsightsError {
  constructor() {
    super('generation_disabled', 'La generación de Insights no está habilitada en este runtime', 503)
    this.name = 'InsightsGenerationDisabledError'
  }
}

export class InsightsIssuanceDisabledError extends InsightsError {
  constructor() {
    super('issuance_disabled', 'La emisión de Insights no está habilitada en este runtime', 503)
    this.name = 'InsightsIssuanceDisabledError'
  }
}

export const isInsightsError = (error: unknown): error is InsightsError => error instanceof InsightsError

/** TASK-1846 — el render durable no está habilitado en este runtime (`INSIGHTS_RENDER_ENABLED`). */
export class InsightsRenderDisabledError extends InsightsError {
  constructor() {
    super('render_disabled', 'El render de Insights no está habilitado en este runtime', 503)
  }
}

/**
 * TASK-1846 — el encargo de render no puede componerse: output no renderizable todavía, plan que
 * excede los presupuestos del catálogo, manifest inválido. Fail-closed y con causa: NUNCA se trunca
 * copy en silencio para que "quepa".
 */
export class InsightsRenderRejectedError extends InsightsError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('render_rejected', message, 422, details)
  }
}

/** TASK-1848 — el sharing por enlace no está habilitado en este runtime (`INSIGHTS_SHARING_ENABLED`). */
export class InsightsSharingDisabledError extends InsightsError {
  constructor() {
    super('sharing_disabled', 'El sharing de Insights no está habilitado en este runtime', 503)
    this.name = 'InsightsSharingDisabledError'
  }
}

/** TASK-1848 — cuota por edición/organización agotada (enlaces activos, envíos, schedules). */
export class InsightsQuotaExceededError extends InsightsError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('quota_exceeded', message, 429, details)
    this.name = 'InsightsQuotaExceededError'
  }
}

/** TASK-1848 — el envío por correo no está habilitado en este runtime (`INSIGHTS_DELIVERY_ENABLED`). */
export class InsightsDeliveryDisabledError extends InsightsError {
  constructor() {
    super('delivery_disabled', 'El envío por correo de Insights no está habilitado en este runtime', 503)
    this.name = 'InsightsDeliveryDisabledError'
  }
}

/** TASK-1848 — la recurrencia no está habilitada en este runtime (`INSIGHTS_SCHEDULES_ENABLED`). */
export class InsightsSchedulesDisabledError extends InsightsError {
  constructor() {
    super('schedules_disabled', 'La recurrencia de Insights no está habilitada en este runtime', 503)
    this.name = 'InsightsSchedulesDisabledError'
  }
}
