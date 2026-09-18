import 'server-only'

/**
 * TASK-1845 — traducción de errores del dominio Insights al contrato del API Platform
 * (App + Ecosystem comparten esta tabla: misma causa ⇒ mismo código/status en ambos lanes).
 * Sanitizado: el mensaje es del dominio (sin evidencia), `details.code` conserva la causa.
 */

import { ApiPlatformError, type ApiPlatformErrorCode } from '@/lib/api-platform/core/errors'
import { captureWithDomain } from '@/lib/observability/capture'
import { type InsightsError, isInsightsError } from '@/lib/efeonce-insights/errors'

const MAP: Record<InsightsError['code'], { statusCode: number; errorCode: ApiPlatformErrorCode }> = {
  invalid_request: { statusCode: 400, errorCode: 'bad_request' },
  invalid_window: { statusCode: 400, errorCode: 'bad_request' },
  forbidden: { statusCode: 403, errorCode: 'forbidden' },
  not_found: { statusCode: 404, errorCode: 'not_found' },
  unsupported_window: { statusCode: 422, errorCode: 'bad_request' },
  insufficient_data: { statusCode: 422, errorCode: 'bad_request' },
  method_mismatch: { statusCode: 422, errorCode: 'bad_request' },
  evidence_rejected: { statusCode: 422, errorCode: 'bad_request' },
  not_ready: { statusCode: 409, errorCode: 'bad_request' },
  invalid_transition: { statusCode: 409, errorCode: 'bad_request' },
  human_gate_required: { statusCode: 403, errorCode: 'forbidden' },
  idempotency_conflict: { statusCode: 409, errorCode: 'idempotency_conflict' },
  generation_disabled: { statusCode: 503, errorCode: 'service_unavailable' },
  issuance_disabled: { statusCode: 503, errorCode: 'service_unavailable' },
  quota_exceeded: { statusCode: 429, errorCode: 'rate_limited' },
  render_disabled: { statusCode: 503, errorCode: 'service_unavailable' },
  render_rejected: { statusCode: 422, errorCode: 'bad_request' },
  sharing_disabled: { statusCode: 503, errorCode: 'service_unavailable' }
}

export const toInsightsApiPlatformError = (error: unknown): ApiPlatformError => {
  if (error instanceof ApiPlatformError) return error

  if (isInsightsError(error)) {
    const mapped = MAP[error.code]

    return new ApiPlatformError(error.message, { statusCode: mapped.statusCode, errorCode: mapped.errorCode, details: { code: error.code, ...error.details } })
  }

  captureWithDomain(error, 'insights', { extra: { operation: 'toInsightsApiPlatformError' } })

  return new ApiPlatformError('Insights request failed.', { statusCode: 500, errorCode: 'internal_error' })
}

export const withInsightsErrors = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run()
  } catch (error) {
    throw toInsightsApiPlatformError(error)
  }
}
