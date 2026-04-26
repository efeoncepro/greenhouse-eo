import { NextResponse } from 'next/server'

import type { ApiPlatformRateLimit } from './context'
import { normalizeApiPlatformError } from './errors'
import { API_PLATFORM_VERSION_HEADER, DEFAULT_API_PLATFORM_VERSION } from './versioning'

const applyBaseHeaders = ({
  response,
  requestId,
  version,
  rateLimit,
  headers,
  cacheControl,
  etag,
  lastModified
}: {
  response: Response
  requestId: string
  version: string
  rateLimit?: ApiPlatformRateLimit
  headers?: Record<string, string>
  cacheControl?: string
  etag?: string
  lastModified?: string
}) => {
  response.headers.set('cache-control', cacheControl ?? 'no-store')
  response.headers.set('x-greenhouse-request-id', requestId)
  response.headers.set(API_PLATFORM_VERSION_HEADER, version)

  if (rateLimit) {
    response.headers.set('x-ratelimit-limit-minute', String(rateLimit.limitPerMinute))
    response.headers.set('x-ratelimit-limit-hour', String(rateLimit.limitPerHour))
    response.headers.set('x-ratelimit-limit', String(rateLimit.limitPerMinute))

    if (typeof rateLimit.remainingPerMinute === 'number') {
      response.headers.set('x-ratelimit-remaining-minute', String(rateLimit.remainingPerMinute))
      response.headers.set('x-ratelimit-remaining', String(rateLimit.remainingPerMinute))
    }

    if (typeof rateLimit.remainingPerHour === 'number') {
      response.headers.set('x-ratelimit-remaining-hour', String(rateLimit.remainingPerHour))
    }

    if (rateLimit.resetAt) {
      response.headers.set('x-ratelimit-reset', String(Math.ceil(new Date(rateLimit.resetAt).getTime() / 1000)))
    }

    if (typeof rateLimit.retryAfterSeconds === 'number') {
      response.headers.set('retry-after', String(rateLimit.retryAfterSeconds))
    }
  }

  if (etag) {
    response.headers.set('etag', etag)
  }

  if (lastModified) {
    response.headers.set('last-modified', lastModified)
  }

  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
  }

  return response
}

export const buildApiPlatformSuccessResponse = <T>({
  requestId,
  version,
  data,
  meta,
  status = 200,
  rateLimit,
  headers,
  cacheControl,
  etag,
  lastModified
}: {
  requestId: string
  version: string
  data: T
  meta?: Record<string, unknown>
  status?: number
  rateLimit?: ApiPlatformRateLimit
  headers?: Record<string, string>
  cacheControl?: string
  etag?: string
  lastModified?: string
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
    rateLimit,
    headers,
    cacheControl,
    etag,
    lastModified
  })
}

export const buildApiPlatformNotModifiedResponse = ({
  requestId,
  version,
  rateLimit,
  headers,
  cacheControl,
  etag,
  lastModified
}: {
  requestId: string
  version: string
  rateLimit?: ApiPlatformRateLimit
  headers?: Record<string, string>
  cacheControl?: string
  etag?: string
  lastModified?: string
}) => {
  const response = new Response(null, { status: 304 })

  return applyBaseHeaders({
    response,
    requestId,
    version,
    rateLimit,
    headers,
    cacheControl,
    etag,
    lastModified
  })
}

export const buildApiPlatformErrorResponse = ({
  requestId,
  version = DEFAULT_API_PLATFORM_VERSION,
  error,
  rateLimit,
  headers
}: {
  requestId: string
  version?: string
  error: unknown
  rateLimit?: ApiPlatformRateLimit
  headers?: Record<string, string>
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
    rateLimit,
    headers
  })
}
