/**
 * TASK-1226 — Growth AI Visibility Grader · Run lifecycle state machine (Slice 1).
 *
 * Funciones PURAS para transiciones de estado del run y para agregar el estado
 * del run a partir de las observaciones por-provider (degradación honesta: un
 * run con evidencia incompleta nunca es `succeeded`). Sin IO.
 */

import {
  type GrowthAiVisibilityObservationStatus,
  type GrowthAiVisibilityProviderErrorCode,
  type GrowthAiVisibilityRunStatus,
  isGrowthAiVisibilitySkipErrorCode
} from './contracts'

/**
 * Transiciones válidas del run. Append-only de hecho: una vez en estado terminal
 * (`succeeded`/`partial`/`failed`/`skipped`) no se vuelve a `running`.
 */
const RUN_STATUS_TRANSITIONS: Record<GrowthAiVisibilityRunStatus, readonly GrowthAiVisibilityRunStatus[]> = {
  pending: ['running', 'skipped', 'failed'],
  running: ['succeeded', 'partial', 'failed', 'skipped'],
  succeeded: [],
  partial: [],
  failed: [],
  skipped: []
}

/**
 * TASK-1234 — Umbrales de salud de ejecución async (minutos). Anclados al peor caso
 * de un run `internal_audit` (16 prompts × 4 providers × ~35s ≈ 37 min de pared):
 *  - PENDING_LAG: un run `pending` que lleva > 20 min sin reclamar ⇒ worker no drena.
 *  - STUCK_RUNNING: un run `running` que lleva > 90 min ⇒ crash/timeout mid-run (recovery).
 */
export const GROWTH_AI_VISIBILITY_PENDING_LAG_THRESHOLD_MINUTES = 20
export const GROWTH_AI_VISIBILITY_STUCK_RUNNING_THRESHOLD_MINUTES = 90

export const GROWTH_AI_VISIBILITY_TERMINAL_RUN_STATUSES: readonly GrowthAiVisibilityRunStatus[] = [
  'succeeded',
  'partial',
  'failed',
  'skipped'
]

export const isTerminalRunStatus = (status: GrowthAiVisibilityRunStatus): boolean =>
  GROWTH_AI_VISIBILITY_TERMINAL_RUN_STATUSES.includes(status)

export const canTransitionRunStatus = (
  from: GrowthAiVisibilityRunStatus,
  to: GrowthAiVisibilityRunStatus
): boolean => RUN_STATUS_TRANSITIONS[from].includes(to)

export const assertRunStatusTransition = (
  from: GrowthAiVisibilityRunStatus,
  to: GrowthAiVisibilityRunStatus
): void => {
  if (!canTransitionRunStatus(from, to)) {
    throw new Error(
      `Transición de estado de run inválida: ${from} → ${to} (growth.ai_visibility).`
    )
  }
}

/**
 * Agrega el estado del run desde las observaciones por-provider.
 * Reglas (degradación honesta):
 *  - 0 observaciones → `skipped` (nada que ejecutar / grader OFF).
 *  - todas `skipped` → `skipped`.
 *  - ninguna `succeeded` (todo failed/rate_limited/skipped) → `failed`.
 *  - todas `succeeded` → `succeeded`.
 *  - mezcla con al menos una `succeeded` y al menos una no-exitosa → `partial`.
 */
export const resolveRunStatusFromObservations = (
  statuses: readonly GrowthAiVisibilityObservationStatus[]
): GrowthAiVisibilityRunStatus => {
  if (statuses.length === 0) {
    return 'skipped'
  }

  const succeeded = statuses.filter(status => status === 'succeeded').length
  const skipped = statuses.filter(status => status === 'skipped').length

  if (skipped === statuses.length) {
    return 'skipped'
  }

  if (succeeded === 0) {
    return 'failed'
  }

  if (succeeded === statuses.length) {
    return 'succeeded'
  }

  return 'partial'
}

/**
 * Error canónico de dominio. Lleva un `errorCode` estable (clase de error de
 * provider) + `statusCode` HTTP sugerido. NUNCA debe construirse con el mensaje
 * crudo del provider como `message` client-facing — el raw va a observabilidad.
 */
export class GrowthAiVisibilityError extends Error {
  readonly errorCode: GrowthAiVisibilityProviderErrorCode
  readonly statusCode: number
  readonly isSkip: boolean

  constructor(
    errorCode: GrowthAiVisibilityProviderErrorCode,
    message: string,
    options?: { statusCode?: number; cause?: unknown }
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined)
    this.name = 'GrowthAiVisibilityError'
    this.errorCode = errorCode
    this.isSkip = isGrowthAiVisibilitySkipErrorCode(errorCode)
    this.statusCode = options?.statusCode ?? defaultStatusForErrorCode(errorCode)
  }
}

const defaultStatusForErrorCode = (code: GrowthAiVisibilityProviderErrorCode): number => {
  switch (code) {
    case 'grader_disabled':
    case 'provider_disabled':
    case 'missing_secret':
    case 'no_capability':
      return 503
    case 'rate_limited':
      return 429
    case 'timeout':
      return 504
    case 'invalid_response':
    case 'provider_error':
      return 502
    default:
      return 502
  }
}
