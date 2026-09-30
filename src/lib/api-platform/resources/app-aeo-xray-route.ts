import 'server-only'

import { runAppRoute } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { runXrayOperation } from './app-aeo-xray'

const BODY_LIMIT = 2 * 1024 * 1024

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader()

  if (!reader) return {}

  const decoder = new TextDecoder()
  let size = 0
  let text = ''

  try {
    while (true) {
      const next = await reader.read()

      if (next.done) break
      size += next.value.byteLength

      if (size > BODY_LIMIT) {
        await reader.cancel()
        throw new ApiPlatformError('X-Ray payload is too large.', { statusCode: 413, errorCode: 'bad_request' })
      }

      text += decoder.decode(next.value, { stream: true })
    }

    text += decoder.decode()

    return text.trim() ? JSON.parse(text) : {}
  } catch (error) {
    if (error instanceof ApiPlatformError) throw error
    throw new ApiPlatformError('Invalid JSON body.', { statusCode: 400, errorCode: 'bad_request' })
  } finally {
    reader.releaseLock()
  }
}

/**
 * TASK-1950: use App auth/rate/request auditing, not generic response persistence.
 * X-Ray commands audit inside their transaction and issue has its own revision-bound idempotency.
 * Persisting a command response would store the share bearer; replay could bypass current capabilities.
 */
export function runXrayAppRoute(
  request: Request,
  operation: Parameters<typeof runXrayOperation>[0]['operation'],
  id?: string
) {
  return runAppRoute({
    request,
    routeKey: `platform.app.growth.aeo_xray.${operation}`,
    handler: async context => {
      const body = request.method === 'GET' ? undefined : await readBody(request)

      if (operation === 'share' && request.headers.has('Idempotency-Key')) {
        throw new ApiPlatformError('Share tokens are returned once; replay is not supported.', {
          statusCode: 400,
          errorCode: 'bad_request'
        })
      }

      return {
        ...(await runXrayOperation({ context, operation, id, body })),
        headers: { 'Referrer-Policy': 'no-referrer' }
      }
    }
  })
}
