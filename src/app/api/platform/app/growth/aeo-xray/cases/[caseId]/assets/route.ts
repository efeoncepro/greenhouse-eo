import { z } from 'zod'

import { runAppRoute } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { resolveXrayAuthority } from '@/lib/aeo-xray/authz'
import { uploadXrayAsset, XRAY_ASSET_MAX_BYTES } from '@/lib/aeo-xray/assets'
import { XrayError } from '@/lib/aeo-xray/types'

export const dynamic = 'force-dynamic'

/** Raw PNG/JPEG/WebP; decoded, stripped of metadata and stored privately under a fresh asset ID. */
export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params

  return runAppRoute({
    request,
    routeKey: 'platform.app.growth.aeo_xray.assets.create',
    handler: async context => {
      const authority = await resolveXrayAuthority(context, 'update')

      if (!z.string().uuid().safeParse(caseId).success) {
        throw new ApiPlatformError('Invalid case ID.', { statusCode: 400, errorCode: 'bad_request' })
      }

      const reader = request.body?.getReader()

      if (!reader) throw new ApiPlatformError('Image body required.', { statusCode: 400, errorCode: 'bad_request' })
      const chunks: Uint8Array[] = []
      let size = 0

      try {
        while (true) {
          const next = await reader.read()

          if (next.done) break
          size += next.value.byteLength

          if (size > XRAY_ASSET_MAX_BYTES) {
            await reader.cancel()
            throw new ApiPlatformError('Image is too large.', { statusCode: 413, errorCode: 'bad_request' })
          }

          chunks.push(next.value)
        }

        return { data: await uploadXrayAsset(authority, caseId, Buffer.concat(chunks)), status: 201 }
      } catch (error) {
        if (error instanceof ApiPlatformError) throw error

        if (error instanceof XrayError) {
          throw new ApiPlatformError('Image could not be accepted.', {
            statusCode: error.status,
            errorCode: error.status === 404 ? 'not_found' : 'bad_request'
          })
        }

        throw new ApiPlatformError('Image storage is temporarily unavailable.', {
          statusCode: 503,
          errorCode: 'service_unavailable'
        })
      } finally {
        reader.releaseLock()
      }
    }
  })
}
