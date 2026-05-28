import { NextResponse } from 'next/server'

import { getOptionalServerSession } from '@/lib/auth/require-server-session'
import {
  getOAuthRequestAuditMetadata,
  issueSisterPlatformAuthorizationCode,
  recordSisterPlatformOAuthAuditEvent,
  SisterPlatformOAuthError,
  validateSisterPlatformAuthorizeRequest
} from '@/lib/sister-platforms/oauth-broker'
import { getTenantAccessRecordByUserId } from '@/lib/tenant/access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const buildLoginRedirect = (url: URL) => {
  const redirectTo = `${url.pathname}${url.search}`
  const loginUrl = new URL('/login', url.origin)

  loginUrl.searchParams.set('redirectTo', redirectTo)

  return NextResponse.redirect(loginUrl, { status: 303 })
}

const buildOAuthRedirect = ({
  redirectUri,
  state,
  code,
  error
}: {
  redirectUri: string
  state: string
  code?: string
  error?: string
}) => {
  const target = new URL(redirectUri)

  if (code) target.searchParams.set('code', code)
  if (error) target.searchParams.set('error', error)
  target.searchParams.set('state', state)

  return NextResponse.redirect(target, { status: 303 })
}

const jsonError = (error: SisterPlatformOAuthError) =>
  NextResponse.json(
    {
      error: error.errorCode,
      message: 'Sister platform authorization request rejected.'
    },
    { status: error.statusCode }
  )

export async function GET(request: Request) {
  const startedAt = Date.now()
  const url = new URL(request.url)
  const auditMetadata = getOAuthRequestAuditMetadata(request)
  let safeOAuthRedirect: { redirectUri: string; state: string } | null = null

  try {
    const authorizeRequest = await validateSisterPlatformAuthorizeRequest(url)

    safeOAuthRedirect = {
      redirectUri: authorizeRequest.redirectUri,
      state: authorizeRequest.state
    }

    const session = await getOptionalServerSession()

    if (!session?.user?.userId) {
      return buildLoginRedirect(url)
    }

    const tenant = await getTenantAccessRecordByUserId(session.user.userId)

    if (!tenant) {
      throw new SisterPlatformOAuthError('Session user is no longer available.', {
        statusCode: 403,
        errorCode: 'user_not_found'
      })
    }

    const issued = await issueSisterPlatformAuthorizationCode({
      authorizeRequest,
      tenant,
      auditMetadata
    })

    await recordSisterPlatformOAuthAuditEvent({
      client: authorizeRequest.client,
      userId: tenant.userId,
      identityProfileId: tenant.identityProfileId,
      authorizationCodeId: issued.authorizationCodeId,
      eventType: 'authorize_success',
      outcome: 'success',
      redirectUri: authorizeRequest.redirectUri,
      requestedScopes: authorizeRequest.requestedScopes,
      responseStatus: 303,
      durationMs: Date.now() - startedAt,
      auditMetadata,
      metadata: {
        expiresAt: issued.expiresAt
      }
    })

    return buildOAuthRedirect({
      redirectUri: authorizeRequest.redirectUri,
      state: authorizeRequest.state,
      code: issued.code
    })
  } catch (error) {
    const normalized =
      error instanceof SisterPlatformOAuthError
        ? error
        : new SisterPlatformOAuthError('Unexpected authorization broker failure.', {
            statusCode: 500,
            errorCode: 'internal_error'
          })

    const clientId = url.searchParams.get('client_id')?.trim() || null
    const redirectUri = url.searchParams.get('redirect_uri')?.trim() || ''

    await recordSisterPlatformOAuthAuditEvent({
      eventType: normalized.errorCode === 'invalid_redirect_uri' ? 'redirect_rejected' : 'authorize_reject',
      outcome: normalized.statusCode >= 500 ? 'failure' : 'rejected',
      errorCode: normalized.errorCode,
      redirectUri: redirectUri || null,
      requestedScopes: url.searchParams.get('scope')?.split(/\s+/).filter(Boolean) ?? null,
      responseStatus: normalized.statusCode,
      durationMs: Date.now() - startedAt,
      auditMetadata,
      metadata: {
        clientId
      }
    }).catch(() => undefined)

    if (safeOAuthRedirect && normalized.statusCode < 500) {
      return buildOAuthRedirect({
        redirectUri: safeOAuthRedirect.redirectUri,
        state: safeOAuthRedirect.state,
        error: normalized.errorCode === 'user_scope_not_allowed' ? 'access_denied' : normalized.errorCode
      })
    }

    return jsonError(normalized)
  }
}
