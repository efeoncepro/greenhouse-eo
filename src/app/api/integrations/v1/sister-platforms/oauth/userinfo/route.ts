import { NextResponse } from 'next/server'

import {
  getOAuthRequestAuditMetadata,
  recordSisterPlatformOAuthAuditEvent,
  resolveSisterPlatformOAuthUserinfo,
  SisterPlatformOAuthError
} from '@/lib/sister-platforms/oauth-broker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const extractBearerToken = (request: Request) => {
  const authorization = request.headers.get('authorization')?.trim()

  if (!authorization?.toLowerCase().startsWith('bearer ')) return ''

  return authorization.slice('bearer '.length).trim()
}

export async function GET(request: Request) {
  const startedAt = Date.now()
  const auditMetadata = getOAuthRequestAuditMetadata(request)

  try {
    const accessToken = extractBearerToken(request)

    if (!accessToken) {
      throw new SisterPlatformOAuthError('Missing bearer token.', {
        statusCode: 401,
        errorCode: 'invalid_token'
      })
    }

    const result = await resolveSisterPlatformOAuthUserinfo({
      accessToken,
      auditMetadata
    })

    return NextResponse.json(result.identity, {
      status: 200,
      headers: {
        'cache-control': 'no-store'
      }
    })
  } catch (error) {
    const normalized =
      error instanceof SisterPlatformOAuthError
        ? error
        : new SisterPlatformOAuthError('Unexpected userinfo broker failure.', {
            statusCode: 500,
            errorCode: 'internal_error'
          })

    await recordSisterPlatformOAuthAuditEvent({
      eventType: 'userinfo_reject',
      outcome: normalized.statusCode >= 500 ? 'failure' : 'rejected',
      errorCode: normalized.errorCode,
      responseStatus: normalized.statusCode,
      durationMs: Date.now() - startedAt,
      auditMetadata
    }).catch(() => undefined)

    return NextResponse.json(
      {
        error: normalized.errorCode
      },
      { status: normalized.statusCode }
    )
  }
}
