import 'server-only'

/**
 * TASK-1921 — traducción de errores del render de marca al contrato del API Platform. Sanitizado: el mensaje es del
 * dominio (sin intent ni rutas de fuentes), `details.code` conserva la causa y `details` sólo lleva issues saneados.
 */

import { ApiPlatformError, type ApiPlatformErrorCode } from '@/lib/api-platform/core/errors'
import { BrandRenderError, type BrandRenderErrorCode } from '@/lib/brand-surfaces/production/errors'
import { captureWithDomain } from '@/lib/observability/capture'

const MAP: Record<BrandRenderErrorCode, { statusCode: number; errorCode: ApiPlatformErrorCode }> = {
  invalid_request: { statusCode: 400, errorCode: 'bad_request' },
  render_rejected: { statusCode: 422, errorCode: 'bad_request' },
  missing_source: { statusCode: 422, errorCode: 'bad_request' },
  forbidden: { statusCode: 403, errorCode: 'forbidden' },
  not_found: { statusCode: 404, errorCode: 'not_found' },
  render_disabled: { statusCode: 503, errorCode: 'service_unavailable' },
  invalid_transition: { statusCode: 409, errorCode: 'bad_request' }
}

export const toBrandRenderApiPlatformError = (error: unknown): ApiPlatformError => {
  if (error instanceof ApiPlatformError) return error

  if (error instanceof BrandRenderError) {
    const mapped = MAP[error.code]

    return new ApiPlatformError(error.message, { statusCode: mapped.statusCode, errorCode: mapped.errorCode, details: { code: error.code, ...error.details } })
  }

  captureWithDomain(error, 'brand_render', { extra: { operation: 'toBrandRenderApiPlatformError' } })

  return new ApiPlatformError('El pedido de render de marca falló.', { statusCode: 500, errorCode: 'internal_error' })
}

export const withBrandRenderErrors = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run()
  } catch (error) {
    throw toBrandRenderApiPlatformError(error)
  }
}
