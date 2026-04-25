import { NextResponse } from 'next/server'

import type { ApiPlatformRateLimit } from './context'
import { normalizeApiPlatformError } from './errors'
import { API_PLATFORM_VERSION_HEADER, DEFAULT_API_PLATFORM_VERSION } from './versioning'

const applyBaseHeaders = ({
  response,
  requestId,
  version,
  rateLimit
}: {
  response: Response
  requestId: string
  version: string
  rateLimit?: ApiPlatformRateLimit
}) => {
  response.headers.set('cache-control', 'no-store')
  response.headers.set('x-greenhouse-request-id', requestId)
  response.headers.set(API_PLATFORM_VERSION_HEADER, version)

  if (rateLimit) {
    response.headers.set('x-ratelimit-limit-minute', String(rateLimit.limitPerMinute))
    response.headers.set('x-ratelimit-limit-hour', String(rateLimit.limitPerHour))
  }

  return response
}

export const buildApiPlatformSuccessResponse = <T>({
  requestId,
  version,
  data,
  meta,
  status = 200,
  rateLimit
}: {
  requestId: string
  version: string
  data: T
  meta?: Record<string, unknown>
  status?: number
  rateLimit?: ApiPlatformRateLimit
}) => {
  const response = NextResponse.json(
    {
      requestId,
      servedAt: new Date().toISOString(),
      version,
      data,
      meta: meta ?? {}
    },
    { status }
  )

  return applyBaseHeaders({
    response,
    requestId,
    version,
    rateLimit
  })
}

export const buildApiPlatformErrorResponse = ({
  requestId,
  version = DEFAULT_API_PLATFORM_VERSION,
  error,
  rateLimit
}: {
  requestId: string
  version?: string
  error: unknown
  rateLimit?: ApiPlatformRateLimit
}) => {
  const normalizedError = normalizeApiPlatformError(error)

  const response = NextResponse.json(
    {
      requestId,
      servedAt: new Date().toISOString(),
      version,
      data: null,
      errors: [
        {
          code: normalizedError.errorCode,
          message: normalizedError.message,
          details: normalizedError.details
        }
      ],
      meta: {}
    },
    { status: normalizedError.statusCode }
  )

  return applyBaseHeaders({
    response,
    requestId,
    version,
    rateLimit
  })
}
