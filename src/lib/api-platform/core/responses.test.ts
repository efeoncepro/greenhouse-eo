import { describe, expect, it } from 'vitest'

import { ApiPlatformError } from './errors'
import { buildApiPlatformErrorResponse, buildApiPlatformSuccessResponse } from './responses'

describe('api platform responses', () => {
  it('wraps success payloads with the standard envelope and headers', async () => {
    const response = buildApiPlatformSuccessResponse({
      requestId: 'req-123',
      version: '2026-04-25',
      data: {
        ok: true
      },
      meta: {
        scope: {
          scopeType: 'internal'
        }
      }
    })

    expect(response.headers.get('x-greenhouse-request-id')).toBe('req-123')
    expect(response.headers.get('x-greenhouse-api-version')).toBe('2026-04-25')

    const body = await response.json()

    expect(body.requestId).toBe('req-123')
    expect(body.data).toEqual({ ok: true })
    expect(body.meta.scope.scopeType).toBe('internal')
  })

  it('wraps errors with the standard error envelope', async () => {
    const response = buildApiPlatformErrorResponse({
      requestId: 'req-456',
      version: '2026-04-25',
      error: new ApiPlatformError('Forbidden', {
        statusCode: 403,
        errorCode: 'forbidden'
      })
    })

    expect(response.status).toBe(403)

    const body = await response.json()

    expect(body.requestId).toBe('req-456')
    expect(body.errors[0]).toMatchObject({
      code: 'forbidden',
      message: 'Forbidden'
    })
  })
})
